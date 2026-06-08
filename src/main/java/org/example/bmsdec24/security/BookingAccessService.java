package org.example.bmsdec24.security;

import org.example.bmsdec24.exceptions.AccessDeniedException;
import org.example.bmsdec24.exceptions.InvalidBookingException;
import org.example.bmsdec24.exceptions.InvalidPaymentException;
import org.example.bmsdec24.models.Booking;
import org.example.bmsdec24.models.Payment;
import org.example.bmsdec24.models.Role;
import org.example.bmsdec24.models.User;
import org.example.bmsdec24.repos.BookingRepository;
import org.springframework.stereotype.Service;

@Service
public class BookingAccessService {

    private final BookingRepository bookingRepository;

    public BookingAccessService(BookingRepository bookingRepository) {
        this.bookingRepository = bookingRepository;
    }

    public void requireBookingAccess(int bookingId, AuthenticatedUser currentUser) throws AccessDeniedException {
        Booking booking = bookingRepository.findDetailedById(bookingId).orElse(null);
        requireBookingAccess(booking, bookingId, currentUser);
    }

    public void requireBookingAccess(Booking booking, AuthenticatedUser currentUser) throws AccessDeniedException {
        requireBookingAccess(booking, booking == null ? -1 : booking.getId(), currentUser);
    }

    public void requirePaymentAccess(Payment payment, AuthenticatedUser currentUser)
            throws AccessDeniedException, InvalidPaymentException {
        if (payment == null) {
            throw new InvalidPaymentException("Payment not found");
        }
        if (payment.getBooking() == null) {
            throw new InvalidPaymentException("Payment is not linked to any booking");
        }
        requireBookingAccess(payment.getBooking(), currentUser);
    }

    public void requireOperationalRole(AuthenticatedUser currentUser) throws AccessDeniedException {
        if (!hasOperationalRole(currentUser)) {
            throw new AccessDeniedException("ADMIN or PARTNER role is required for this operation");
        }
    }

    public boolean hasOperationalRole(AuthenticatedUser currentUser) {
        Role role = currentUser.getRole();
        return role == Role.ADMIN || role == Role.PARTNER;
    }

    private void requireBookingAccess(Booking booking, int bookingId, AuthenticatedUser currentUser)
            throws AccessDeniedException {
        if (booking == null) {
            throw new AccessDeniedException("You do not have access to booking " + bookingId);
        }
        if (hasOperationalRole(currentUser)) {
            return;
        }
        User owner = booking.getUser();
        if (owner == null || owner.getId() != currentUser.getUserId()) {
            throw new AccessDeniedException("You do not have access to booking " + bookingId);
        }
    }
}
