package org.example.bmsdec24.services;

import org.example.bmsdec24.dtos.TicketResponseDto;
import org.example.bmsdec24.dtos.TicketValidationResponseDto;
import org.example.bmsdec24.exceptions.InvalidTicketException;
import org.example.bmsdec24.exceptions.TicketNotFoundException;
import org.example.bmsdec24.models.Booking;
import org.example.bmsdec24.models.BookingStatus;
import org.example.bmsdec24.models.Ticket;
import org.example.bmsdec24.models.TicketStatus;
import org.example.bmsdec24.repos.BookingRepository;
import org.example.bmsdec24.repos.TicketRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.Date;
import java.util.Optional;

@Service
public class TicketServiceImpl implements TicketService {

    private static final String REF_PREFIX = "BMS-";
    private static final String REF_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final int REF_SUFFIX_LENGTH = 6;

    private final TicketRepository ticketRepository;
    private final BookingRepository bookingRepository;
    private final SecureRandom secureRandom = new SecureRandom();

    public TicketServiceImpl(TicketRepository ticketRepository, BookingRepository bookingRepository) {
        this.ticketRepository = ticketRepository;
        this.bookingRepository = bookingRepository;
    }

    @Transactional
    @Override
    public TicketResponseDto issueTicket(int bookingId) throws InvalidTicketException {
        Optional<Ticket> existing = ticketRepository.findDetailedByBooking_Id(bookingId);
        if (existing.isPresent()) {
            return TicketResponseDto.from(existing.get());
        }

        Booking booking = bookingRepository.findDetailedById(bookingId)
                .orElseThrow(() -> new InvalidTicketException("No booking found with id: " + bookingId));

        if (booking.getStatus() != BookingStatus.CONFIRMED) {
            throw new InvalidTicketException(
                    "Ticket can only be issued for CONFIRMED bookings. Booking " + bookingId
                            + " is " + booking.getStatus());
        }

        Date issuedAt = new Date();
        String bookingReference = generateUniqueBookingReference();
        String qrPayload = buildQrPayload(bookingReference, bookingId, issuedAt);

        Ticket ticket = new Ticket();
        ticket.setBooking(booking);
        ticket.setBookingReference(bookingReference);
        ticket.setQrPayload(qrPayload);
        ticket.setStatus(TicketStatus.ISSUED);
        ticket.setIssuedAt(issuedAt);
        ticket = ticketRepository.save(ticket);

        return TicketResponseDto.from(
                ticketRepository.findDetailedByBooking_Id(ticket.getBooking().getId()).orElse(ticket));
    }

    @Transactional(readOnly = true)
    @Override
    public TicketResponseDto getTicketForBooking(int bookingId) throws TicketNotFoundException {
        Ticket ticket = ticketRepository.findDetailedByBooking_Id(bookingId)
                .orElseThrow(() -> new TicketNotFoundException(
                        "No ticket found for booking " + bookingId + ". Issue one with POST /api/bookings/"
                                + bookingId + "/issue-ticket after payment success."));
        return TicketResponseDto.from(ticket);
    }

    @Transactional
    @Override
    public TicketValidationResponseDto validateTicket(String qrPayload, String bookingReference)
            throws InvalidTicketException, TicketNotFoundException {
        if ((qrPayload == null || qrPayload.isBlank()) && (bookingReference == null || bookingReference.isBlank())) {
            throw new InvalidTicketException("Either qrPayload or bookingReference is required");
        }

        Ticket ticket = resolveTicket(qrPayload, bookingReference);

        if (ticket.getStatus() == TicketStatus.REVOKED) {
            throw new InvalidTicketException("Ticket " + ticket.getBookingReference() + " has been revoked");
        }

        if (ticket.getBooking() != null && ticket.getBooking().getStatus() != BookingStatus.CONFIRMED) {
            throw new InvalidTicketException(
                    "Booking " + ticket.getBooking().getId() + " is not CONFIRMED and cannot be validated");
        }

        TicketValidationResponseDto response = new TicketValidationResponseDto();
        response.setBookingReference(ticket.getBookingReference());
        response.setBookingId(ticket.getBooking() == null ? 0 : ticket.getBooking().getId());
        response.setMovieName(ticket.getBooking() == null ? null : ticket.getBooking().getMovieName());
        response.setTheatreName(ticket.getBooking() == null ? null : ticket.getBooking().getTheatreName());
        response.setSeatCount(ticket.getBooking() == null || ticket.getBooking().getSeats() == null
                ? 0 : ticket.getBooking().getSeats().size());

        if (ticket.getStatus() == TicketStatus.VALIDATED) {
            response.setValid(false);
            response.setStatus(TicketStatus.VALIDATED);
            response.setValidatedAt(ticket.getValidatedAt());
            response.setMessage("Ticket already used at gate");
            return response;
        }

        Date validatedAt = new Date();
        ticket.setStatus(TicketStatus.VALIDATED);
        ticket.setValidatedAt(validatedAt);
        ticketRepository.save(ticket);

        response.setValid(true);
        response.setStatus(TicketStatus.VALIDATED);
        response.setValidatedAt(validatedAt);
        response.setMessage("Ticket accepted");
        return response;
    }

    @Transactional
    @Override
    public void revokeTicketForBooking(int bookingId) {
        ticketRepository.findDetailedByBooking_Id(bookingId).ifPresent(ticket -> {
            if (ticket.getStatus() != TicketStatus.REVOKED) {
                ticket.setStatus(TicketStatus.REVOKED);
                ticketRepository.save(ticket);
            }
        });
    }

    private Ticket resolveTicket(String qrPayload, String bookingReference) throws TicketNotFoundException {
        if (qrPayload != null && !qrPayload.isBlank()) {
            return ticketRepository.findDetailedByQrPayload(qrPayload.trim())
                    .orElseThrow(() -> new TicketNotFoundException("No ticket found for the supplied QR payload"));
        }
        return ticketRepository.findDetailedByBookingReference(bookingReference.trim())
                .orElseThrow(() -> new TicketNotFoundException(
                        "No ticket found for booking reference " + bookingReference.trim()));
    }

    private String generateUniqueBookingReference() {
        for (int attempt = 0; attempt < 20; attempt++) {
            String candidate = REF_PREFIX + randomSuffix();
            if (!ticketRepository.existsByBookingReference(candidate)) {
                return candidate;
            }
        }
        throw new IllegalStateException("Could not generate a unique booking reference");
    }

    private String randomSuffix() {
        StringBuilder suffix = new StringBuilder(REF_SUFFIX_LENGTH);
        for (int i = 0; i < REF_SUFFIX_LENGTH; i++) {
            suffix.append(REF_ALPHABET.charAt(secureRandom.nextInt(REF_ALPHABET.length())));
        }
        return suffix.toString();
    }

    private String buildQrPayload(String bookingReference, int bookingId, Date issuedAt) {
        String payload = bookingReference + "|" + bookingId + "|" + issuedAt.getTime();
        return Base64.getUrlEncoder().withoutPadding()
                .encodeToString(payload.getBytes(StandardCharsets.UTF_8));
    }
}
