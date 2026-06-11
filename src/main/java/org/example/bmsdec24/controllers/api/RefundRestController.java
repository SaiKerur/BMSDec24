package org.example.bmsdec24.controllers.api;

import org.example.bmsdec24.dtos.RefundRequestDto;
import org.example.bmsdec24.dtos.RefundResponseDto;
import org.example.bmsdec24.exceptions.AccessDeniedException;
import org.example.bmsdec24.exceptions.InvalidRefundException;
import org.example.bmsdec24.exceptions.InvalidRequestException;
import org.example.bmsdec24.exceptions.RefundAlreadyProcessedException;
import org.example.bmsdec24.exceptions.RefundNotAllowedException;
import org.example.bmsdec24.models.Refund;
import org.example.bmsdec24.repos.RefundRepository;
import org.example.bmsdec24.security.AuthenticatedUser;
import org.example.bmsdec24.security.BookingAccessService;
import org.example.bmsdec24.security.SecurityUtils;
import org.example.bmsdec24.services.RefundService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/refunds")
public class RefundRestController {

    private final RefundService refundService;
    private final RefundRepository refundRepository;
    private final BookingAccessService bookingAccessService;

    public RefundRestController(RefundService refundService,
                                RefundRepository refundRepository,
                                BookingAccessService bookingAccessService) {
        this.refundService = refundService;
        this.refundRepository = refundRepository;
        this.bookingAccessService = bookingAccessService;
    }

    @GetMapping("/{refundId}")
    public ResponseEntity<RefundResponseDto> getRefund(@PathVariable int refundId)
            throws InvalidRequestException, InvalidRefundException, AccessDeniedException {
        if (refundId <= 0) {
            throw new InvalidRequestException("refundId must be a positive integer");
        }
        AuthenticatedUser currentUser = SecurityUtils.requireCurrentUser();
        Refund refund = refundRepository.findDetailedById(refundId)
                .orElseThrow(() -> new InvalidRefundException("No refund found with id: " + refundId));
        if (refund.getBooking() != null) {
            bookingAccessService.requireBookingAccess(refund.getBooking(), currentUser);
        }
        return ResponseEntity.ok(refundService.getRefund(refundId));
    }
}
