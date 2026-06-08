package org.example.bmsdec24.security;

import org.example.bmsdec24.exceptions.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public final class SecurityUtils {

    private SecurityUtils() {
    }

    public static AuthenticatedUser requireCurrentUser() throws AccessDeniedException {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AccessDeniedException("Authentication is required");
        }
        Object principal = authentication.getPrincipal();
        if (!(principal instanceof AuthenticatedUser user)) {
            throw new AccessDeniedException("Authentication is required");
        }
        return user;
    }
}
