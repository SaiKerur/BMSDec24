package org.example.bmsdec24.services;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jws;
import org.example.bmsdec24.dtos.TokenResponseDto;
import org.example.bmsdec24.exceptions.InvalidCredentialsException;
import org.example.bmsdec24.exceptions.InvalidTokenException;
import org.example.bmsdec24.models.User;
import org.example.bmsdec24.repos.UserRepository;
import org.example.bmsdec24.security.JwtService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthServiceImpl(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @Override
    public TokenResponseDto login(String email, String password) throws InvalidCredentialsException {
        if (email == null || email.isBlank() || password == null || password.isBlank()) {
            throw new InvalidCredentialsException("Email and password are required");
        }

        User user = userRepository.findByEmail(email);
        if (user == null || !passwordEncoder.matches(password, user.getPassword())) {
            throw new InvalidCredentialsException("Invalid email or password");
        }

        return buildTokenResponse(user);
    }

    @Override
    public TokenResponseDto refresh(String refreshToken) throws InvalidTokenException {
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new InvalidTokenException("Refresh token is required");
        }

        Claims claims;
        try {
            Jws<Claims> parsed = jwtService.parse(refreshToken);
            claims = parsed.getPayload();
        } catch (JwtException ex) {
            throw new InvalidTokenException("Refresh token is invalid or expired");
        }

        if (!jwtService.isRefreshToken(claims)) {
            throw new InvalidTokenException("Provided token is not a refresh token");
        }

        Integer userId = jwtService.extractUserId(claims);
        if (userId == null) {
            throw new InvalidTokenException("Refresh token is missing user information");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new InvalidTokenException("User not found for refresh token"));

        return buildTokenResponse(user);
    }

    private TokenResponseDto buildTokenResponse(User user) {
        String accessToken = jwtService.generateAccessToken(user.getId(), user.getEmail());
        String refresh = jwtService.generateRefreshToken(user.getId(), user.getEmail());

        TokenResponseDto response = new TokenResponseDto();
        response.setUserId(user.getId());
        response.setEmail(user.getEmail());
        response.setAccessToken(accessToken);
        response.setRefreshToken(refresh);
        response.setExpiresInSeconds(jwtService.getAccessTokenValiditySeconds());
        return response;
    }
}
