package org.example.bmsdec24.security;

import java.util.Objects;

public class AuthenticatedUser {

    private final int userId;
    private final String email;

    public AuthenticatedUser(int userId, String email) {
        this.userId = userId;
        this.email = email;
    }

    public int getUserId() {
        return userId;
    }

    public String getEmail() {
        return email;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof AuthenticatedUser other)) return false;
        return userId == other.userId && Objects.equals(email, other.email);
    }

    @Override
    public int hashCode() {
        return Objects.hash(userId, email);
    }

    @Override
    public String toString() {
        return "AuthenticatedUser{userId=" + userId + ", email='" + email + "'}";
    }
}
