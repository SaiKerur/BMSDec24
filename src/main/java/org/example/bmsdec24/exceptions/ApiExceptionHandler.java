package org.example.bmsdec24.exceptions;

import org.example.bmsdec24.dtos.ApiErrorDto;
import org.example.bmsdec24.dtos.ResponseStatus;
import org.example.bmsdec24.dtos.SignupResponseDto;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(basePackages = "org.example.bmsdec24.controllers")
public class ApiExceptionHandler {

    @ExceptionHandler(InvalidRequestException.class)
    public ResponseEntity<ApiErrorDto> handleInvalidRequest(InvalidRequestException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiErrorDto.of("INVALID_REQUEST", message(ex, "The request is invalid")));
    }

    @ExceptionHandler(InvalidUserException.class)
    public ResponseEntity<ApiErrorDto> handleInvalidUser(InvalidUserException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ApiErrorDto.of("USER_NOT_FOUND", message(ex, "User not found")));
    }

    @ExceptionHandler(InvalidBookingException.class)
    public ResponseEntity<ApiErrorDto> handleInvalidBooking(InvalidBookingException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ApiErrorDto.of("BOOKING_NOT_FOUND", message(ex, "Booking not found")));
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiErrorDto> handleResourceNotFound(ResourceNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ApiErrorDto.of("RESOURCE_NOT_FOUND", message(ex, "Resource not found")));
    }

    @ExceptionHandler(SeatsNotAvailableException.class)
    public ResponseEntity<ApiErrorDto> handleSeatsNotAvailable(SeatsNotAvailableException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ApiErrorDto.of("SEATS_NOT_AVAILABLE", message(ex, "Requested seats are not available")));
    }

    @ExceptionHandler(BookingAlreadyProcessedException.class)
    public ResponseEntity<ApiErrorDto> handleBookingAlreadyProcessed(BookingAlreadyProcessedException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ApiErrorDto.of("BOOKING_ALREADY_PROCESSED", message(ex, "Booking cannot be modified")));
    }

    @ExceptionHandler(InvalidCredentialsException.class)
    public ResponseEntity<ApiErrorDto> handleInvalidCredentials(InvalidCredentialsException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ApiErrorDto.of("INVALID_CREDENTIALS", message(ex, "Invalid email or password")));
    }

    @ExceptionHandler(InvalidTokenException.class)
    public ResponseEntity<ApiErrorDto> handleInvalidToken(InvalidTokenException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ApiErrorDto.of("INVALID_TOKEN", message(ex, "Token is invalid or expired")));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiErrorDto> handleAccessDenied(AccessDeniedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiErrorDto.of("ACCESS_DENIED", message(ex, "You do not have permission to perform this action")));
    }

    @ExceptionHandler(UserAlreadyPresentException.class)
    public ResponseEntity<SignupResponseDto> handleUserAlreadyPresent(UserAlreadyPresentException ex) {
        SignupResponseDto dto = new SignupResponseDto();
        dto.setResponseStatus(ResponseStatus.FAILURE);
        dto.setMessage(message(ex, "User with this email already exists"));
        return ResponseEntity.status(HttpStatus.CONFLICT).body(dto);
    }

    @ExceptionHandler(InvalidPaymentException.class)
    public ResponseEntity<ApiErrorDto> handleInvalidPayment(InvalidPaymentException ex) {
        String msg = message(ex, "Payment request is invalid");
        HttpStatus status = isNotFoundPaymentMessage(msg) ? HttpStatus.NOT_FOUND : HttpStatus.CONFLICT;
        String code = status == HttpStatus.NOT_FOUND ? "PAYMENT_RESOURCE_NOT_FOUND" : "PAYMENT_NOT_ALLOWED";
        return ResponseEntity.status(status).body(ApiErrorDto.of(code, msg));
    }

    @ExceptionHandler(TicketNotFoundException.class)
    public ResponseEntity<ApiErrorDto> handleTicketNotFound(TicketNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ApiErrorDto.of("TICKET_NOT_FOUND", message(ex, "Ticket not found")));
    }

    @ExceptionHandler(InvalidTicketException.class)
    public ResponseEntity<ApiErrorDto> handleInvalidTicket(InvalidTicketException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ApiErrorDto.of("INVALID_TICKET", message(ex, "Ticket request is invalid")));
    }

    @ExceptionHandler(PaymentAlreadyProcessedException.class)
    public ResponseEntity<ApiErrorDto> handlePaymentAlreadyProcessed(PaymentAlreadyProcessedException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ApiErrorDto.of("PAYMENT_ALREADY_PROCESSED", message(ex, "Payment was already processed")));
    }

    @ExceptionHandler(PaymentGatewayException.class)
    public ResponseEntity<ApiErrorDto> handlePaymentGateway(PaymentGatewayException ex) {
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                .body(ApiErrorDto.of("PAYMENT_GATEWAY_ERROR", message(ex, "Payment gateway call failed")));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiErrorDto> handleIllegalArgument(IllegalArgumentException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiErrorDto.of("INVALID_ARGUMENT", message(ex, "Invalid argument")));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorDto> handleUnexpected(Exception ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiErrorDto.of("INTERNAL_ERROR", "An unexpected error occurred. Please try again later."));
    }

    private static String message(Exception ex, String fallback) {
        String msg = ex.getMessage();
        return msg == null || msg.isBlank() ? fallback : msg.trim();
    }

    private static boolean isNotFoundPaymentMessage(String message) {
        String lower = message.toLowerCase();
        return lower.contains("not found")
                || lower.contains("no booking found")
                || lower.contains("no payment found");
    }
}
