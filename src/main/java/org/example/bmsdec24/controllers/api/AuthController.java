package org.example.bmsdec24.controllers.api;

import org.example.bmsdec24.dtos.ApiErrorDto;
import org.example.bmsdec24.dtos.LoginRequestDto;
import org.example.bmsdec24.dtos.RefreshTokenRequestDto;
import org.example.bmsdec24.dtos.TokenResponseDto;
import org.example.bmsdec24.exceptions.InvalidCredentialsException;
import org.example.bmsdec24.exceptions.InvalidRequestException;
import org.example.bmsdec24.exceptions.InvalidTokenException;
import org.example.bmsdec24.security.AuthenticatedUser;
import org.example.bmsdec24.services.AuthService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ResponseEntity<TokenResponseDto> login(@RequestBody LoginRequestDto requestDto)
            throws InvalidCredentialsException, InvalidRequestException {
        if (requestDto == null || isBlank(requestDto.getEmail()) || isBlank(requestDto.getPassword())) {
            throw new InvalidRequestException("email and password are required");
        }
        return ResponseEntity.ok(authService.login(requestDto.getEmail(), requestDto.getPassword()));
    }

    @PostMapping("/refresh")
    public ResponseEntity<TokenResponseDto> refresh(@RequestBody RefreshTokenRequestDto requestDto)
            throws InvalidTokenException, InvalidRequestException {
        if (requestDto == null || isBlank(requestDto.getRefreshToken())) {
            throw new InvalidRequestException("refreshToken is required");
        }
        return ResponseEntity.ok(authService.refresh(requestDto.getRefreshToken()));
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(@AuthenticationPrincipal AuthenticatedUser user, Authentication authentication) {
        if (user == null || authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiErrorDto.of("UNAUTHORIZED", "Valid access token is required"));
        }
        return ResponseEntity.ok(Map.of(
                "userId", user.getUserId(),
                "email", user.getEmail(),
                "role", user.getRole().name()
        ));
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
