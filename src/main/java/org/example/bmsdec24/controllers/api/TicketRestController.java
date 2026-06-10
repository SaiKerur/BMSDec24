package org.example.bmsdec24.controllers.api;

import org.example.bmsdec24.dtos.TicketValidationResponseDto;
import org.example.bmsdec24.dtos.ValidateTicketRequestDto;
import org.example.bmsdec24.exceptions.AccessDeniedException;
import org.example.bmsdec24.exceptions.InvalidRequestException;
import org.example.bmsdec24.exceptions.InvalidTicketException;
import org.example.bmsdec24.exceptions.TicketNotFoundException;
import org.example.bmsdec24.security.AuthenticatedUser;
import org.example.bmsdec24.security.BookingAccessService;
import org.example.bmsdec24.security.SecurityUtils;
import org.example.bmsdec24.services.TicketService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/tickets")
public class TicketRestController {

    private final TicketService ticketService;
    private final BookingAccessService bookingAccessService;

    public TicketRestController(TicketService ticketService, BookingAccessService bookingAccessService) {
        this.ticketService = ticketService;
        this.bookingAccessService = bookingAccessService;
    }

    @PostMapping("/validate")
    public ResponseEntity<TicketValidationResponseDto> validateTicket(@RequestBody ValidateTicketRequestDto request)
            throws InvalidRequestException, InvalidTicketException, TicketNotFoundException, AccessDeniedException {
        validateValidateRequest(request);
        AuthenticatedUser currentUser = SecurityUtils.requireCurrentUser();
        bookingAccessService.requireOperationalRole(currentUser);
        return ResponseEntity.ok(ticketService.validateTicket(
                request.getQrPayload(),
                request.getBookingReference()));
    }

    private void validateValidateRequest(ValidateTicketRequestDto request) throws InvalidRequestException {
        if (request == null) {
            throw new InvalidRequestException("Request body is required with qrPayload or bookingReference");
        }
        boolean hasQr = request.getQrPayload() != null && !request.getQrPayload().isBlank();
        boolean hasRef = request.getBookingReference() != null && !request.getBookingReference().isBlank();
        if (!hasQr && !hasRef) {
            throw new InvalidRequestException("Either qrPayload or bookingReference must be provided");
        }
    }
}
