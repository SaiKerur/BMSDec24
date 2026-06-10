package org.example.bmsdec24.controllers.api;

import org.example.bmsdec24.dtos.TicketValidationResponseDto;
import org.example.bmsdec24.exceptions.InvalidTicketException;
import org.example.bmsdec24.models.Booking;
import org.example.bmsdec24.models.Role;
import org.example.bmsdec24.models.TicketStatus;
import org.example.bmsdec24.models.User;
import org.example.bmsdec24.repos.BookingRepository;
import org.example.bmsdec24.security.BookingAccessService;
import org.example.bmsdec24.security.JwtAuthenticationFilter;
import org.example.bmsdec24.security.JwtProperties;
import org.example.bmsdec24.security.JwtService;
import org.example.bmsdec24.services.TicketService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Date;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = {TicketRestController.class, BookingRestController.class})
@Import({
        JwtService.class,
        JwtAuthenticationFilter.class,
        org.example.bmsdec24.config.SecurityConfig.class,
        BookingAccessService.class
})
class TicketRestControllerWebTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    @MockBean
    private TicketService ticketService;

    @MockBean
    private org.example.bmsdec24.services.BookingService bookingService;

    @MockBean
    private BookingRepository bookingRepository;

    @MockBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;

    @Test
    void validateTicket_returnsAcceptedForPartner() throws Exception {
        TicketValidationResponseDto response = new TicketValidationResponseDto();
        response.setValid(true);
        response.setStatus(TicketStatus.VALIDATED);
        response.setBookingReference("BMS-ABC123");
        response.setValidatedAt(new Date());
        response.setMessage("Ticket accepted");
        when(ticketService.validateTicket("qr-test", null)).thenReturn(response);

        String token = jwtService.generateAccessToken(4, "partner@test.com", Role.PARTNER);

        mockMvc.perform(post("/api/tickets/validate")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"qrPayload\":\"qr-test\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valid").value(true))
                .andExpect(jsonPath("$.bookingReference").value("BMS-ABC123"));
    }

    @Test
    void validateTicket_forbiddenForUser() throws Exception {
        String token = jwtService.generateAccessToken(1, "user@test.com", Role.USER);

        mockMvc.perform(post("/api/tickets/validate")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"bookingReference\":\"BMS-ABC123\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void getTicket_returnsTicketForOwner() throws Exception {
        Booking booking = new Booking();
        User owner = new User();
        owner.setId(1);
        booking.setUser(owner);
        when(bookingRepository.findDetailedById(5)).thenReturn(Optional.of(booking));

        org.example.bmsdec24.dtos.TicketResponseDto ticket = new org.example.bmsdec24.dtos.TicketResponseDto();
        ticket.setId(1);
        ticket.setBookingId(5);
        ticket.setBookingReference("BMS-XYZ789");
        ticket.setQrPayload("qr-owner");
        ticket.setStatus(TicketStatus.ISSUED);
        when(ticketService.getTicketForBooking(5)).thenReturn(ticket);

        String token = jwtService.generateAccessToken(1, "user@test.com", Role.USER);

        mockMvc.perform(get("/api/bookings/5/ticket")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.bookingReference").value("BMS-XYZ789"))
                .andExpect(jsonPath("$.status").value("ISSUED"));
    }

    @Test
    void issueTicket_rejectsPendingBooking() throws Exception {
        Booking booking = new Booking();
        User owner = new User();
        owner.setId(1);
        booking.setUser(owner);
        when(bookingRepository.findDetailedById(5)).thenReturn(Optional.of(booking));
        when(ticketService.issueTicket(5)).thenThrow(
                new InvalidTicketException("Ticket can only be issued for CONFIRMED bookings"));

        String token = jwtService.generateAccessToken(1, "user@test.com", Role.USER);

        mockMvc.perform(post("/api/bookings/5/issue-ticket")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("INVALID_TICKET"));
    }
}
