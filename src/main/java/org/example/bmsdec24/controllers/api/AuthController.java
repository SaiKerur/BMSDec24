package org.example.bmsdec24.controllers.api;

import org.example.bmsdec24.dtos.LoginRequestDto;
import org.example.bmsdec24.dtos.RefreshTokenRequestDto;
import org.example.bmsdec24.dtos.TokenResponseDto;
import org.example.bmsdec24.exceptions.InvalidCredentialsException;
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
    public ResponseEntity<TokenResponseDto> login(@RequestBody LoginRequestDto requestDto) {
        try {
            TokenResponseDto response = authService.login(requestDto.getEmail(), requestDto.getPassword());
            return ResponseEntity.ok(response);
        } catch (InvalidCredentialsException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/refresh")
    public ResponseEntity<TokenResponseDto> refresh(@RequestBody RefreshTokenRequestDto requestDto) {
        try {
            TokenResponseDto response = authService.refresh(requestDto.getRefreshToken());
            return ResponseEntity.ok(response);
        } catch (InvalidTokenException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> me(@AuthenticationPrincipal AuthenticatedUser user, Authentication authentication) {
        if (user == null || authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(Map.of(
                "userId", user.getUserId(),
                "email", user.getEmail()
        ));
    }
}
