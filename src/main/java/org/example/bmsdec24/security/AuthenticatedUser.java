package org.example.bmsdec24.security;

import org.example.bmsdec24.models.Role;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;
import java.util.Objects;

public class AuthenticatedUser implements UserDetails {

    private final int userId;
    private final String email;
    private final Role role;
    private final List<GrantedAuthority> authorities;

    public AuthenticatedUser(int userId, String email, Role role) {
        this.userId = userId;
        this.email = email;
        this.role = role == null ? Role.USER : role;
        this.authorities = List.of(new SimpleGrantedAuthority("ROLE_" + this.role.name()));
    }

    public int getUserId() {
        return userId;
    }

    public String getEmail() {
        return email;
    }

    public Role getRole() {
        return role;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override
    public String getPassword() {
        return null;
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return true;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof AuthenticatedUser other)) return false;
        return userId == other.userId
                && Objects.equals(email, other.email)
                && role == other.role;
    }

    @Override
    public int hashCode() {
        return Objects.hash(userId, email, role);
    }

    @Override
    public String toString() {
        return "AuthenticatedUser{userId=" + userId + ", email='" + email + "', role=" + role + "}";
    }
}
