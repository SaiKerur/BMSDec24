package org.example.bmsdec24.services;

import org.example.bmsdec24.exceptions.InvalidTicketException;
import org.example.bmsdec24.exceptions.TicketNotFoundException;
import org.example.bmsdec24.models.Booking;
import org.example.bmsdec24.models.BookingStatus;
import org.example.bmsdec24.models.Ticket;
import org.example.bmsdec24.models.TicketStatus;
import org.example.bmsdec24.repos.BookingRepository;
import org.example.bmsdec24.repos.TicketRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Date;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TicketServiceImplTest {

    @Mock
    private TicketRepository ticketRepository;

    @Mock
    private BookingRepository bookingRepository;

    @InjectMocks
    private TicketServiceImpl ticketService;

    @Test
    void issueTicket_createsTicketForConfirmedBooking() throws Exception {
        Booking booking = confirmedBooking(10);
        Ticket saved = savedTicket(booking);
        when(ticketRepository.findDetailedByBooking_Id(10))
                .thenReturn(Optional.empty(), Optional.of(saved));
        when(bookingRepository.findDetailedById(10)).thenReturn(Optional.of(booking));
        when(ticketRepository.existsByBookingReference(any())).thenReturn(false);
        when(ticketRepository.save(any(Ticket.class))).thenAnswer(invocation -> {
            Ticket ticket = invocation.getArgument(0);
            ticket.setId(1);
            return ticket;
        });

        var response = ticketService.issueTicket(10);

        assertEquals(TicketStatus.ISSUED, response.getStatus());
        assertNotNull(response.getBookingReference());
        assertTrue(response.getBookingReference().startsWith("BMS-"));
        assertNotNull(response.getQrPayload());
    }

    @Test
    void issueTicket_rejectsPendingBooking() {
        Booking booking = confirmedBooking(10);
        booking.setStatus(BookingStatus.PENDING);
        when(ticketRepository.findDetailedByBooking_Id(10)).thenReturn(Optional.empty());
        when(bookingRepository.findDetailedById(10)).thenReturn(Optional.of(booking));

        assertThrows(InvalidTicketException.class, () -> ticketService.issueTicket(10));
    }

    @Test
    void revokeTicketForBooking_marksIssuedTicketRevoked() {
        Ticket ticket = savedTicket(confirmedBooking(10));
        ticket.setStatus(TicketStatus.ISSUED);
        when(ticketRepository.findDetailedByBooking_Id(10)).thenReturn(Optional.of(ticket));

        ticketService.revokeTicketForBooking(10);

        ArgumentCaptor<Ticket> captor = ArgumentCaptor.forClass(Ticket.class);
        verify(ticketRepository).save(captor.capture());
        assertEquals(TicketStatus.REVOKED, captor.getValue().getStatus());
    }

    @Test
    void revokeTicketForBooking_isIdempotentWhenAlreadyRevoked() {
        Ticket ticket = savedTicket(confirmedBooking(10));
        ticket.setStatus(TicketStatus.REVOKED);
        when(ticketRepository.findDetailedByBooking_Id(10)).thenReturn(Optional.of(ticket));

        ticketService.revokeTicketForBooking(10);

        verify(ticketRepository, never()).save(any());
    }

    @Test
    void validateTicket_rejectsRevokedTicket() {
        Ticket ticket = savedTicket(confirmedBooking(10));
        ticket.setStatus(TicketStatus.REVOKED);
        when(ticketRepository.findDetailedByBookingReference("BMS-TEST01")).thenReturn(Optional.of(ticket));

        assertThrows(InvalidTicketException.class,
                () -> ticketService.validateTicket(null, "BMS-TEST01"));
    }

    @Test
    void validateTicket_marksFirstScanValid() throws Exception {
        Ticket ticket = savedTicket(confirmedBooking(10));
        ticket.setStatus(TicketStatus.ISSUED);
        when(ticketRepository.findDetailedByQrPayload("qr-abc")).thenReturn(Optional.of(ticket));

        var response = ticketService.validateTicket("qr-abc", null);

        assertTrue(response.isValid());
        assertEquals(TicketStatus.VALIDATED, response.getStatus());
        verify(ticketRepository).save(ticket);
    }

    @Test
    void validateTicket_rejectsDuplicateScan() throws Exception {
        Ticket ticket = savedTicket(confirmedBooking(10));
        ticket.setStatus(TicketStatus.VALIDATED);
        ticket.setValidatedAt(new Date());
        when(ticketRepository.findDetailedByQrPayload("qr-abc")).thenReturn(Optional.of(ticket));

        var response = ticketService.validateTicket("qr-abc", null);

        assertFalse(response.isValid());
        verify(ticketRepository, never()).save(any());
    }

    @Test
    void getTicketForBooking_notFoundWhenMissing() {
        when(ticketRepository.findDetailedByBooking_Id(99)).thenReturn(Optional.empty());

        assertThrows(TicketNotFoundException.class, () -> ticketService.getTicketForBooking(99));
    }

    private static Booking confirmedBooking(int id) {
        Booking booking = new Booking();
        booking.setId(id);
        booking.setStatus(BookingStatus.CONFIRMED);
        booking.setMovieName("Action Blast");
        booking.setTheatreName("Orion PVR");
        return booking;
    }

    private static Ticket savedTicket(Booking booking) {
        Ticket ticket = new Ticket();
        ticket.setId(1);
        ticket.setBooking(booking);
        ticket.setBookingReference("BMS-TEST01");
        ticket.setQrPayload("qr-abc");
        ticket.setStatus(TicketStatus.ISSUED);
        ticket.setIssuedAt(new Date());
        return ticket;
    }
}
