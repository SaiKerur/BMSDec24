package org.example.bmsdec24.services;

import org.example.bmsdec24.dtos.TokenResponseDto;
import org.example.bmsdec24.exceptions.InvalidCredentialsException;
import org.example.bmsdec24.exceptions.InvalidTokenException;

public interface AuthService {

    TokenResponseDto login(String email, String password) throws InvalidCredentialsException;

    TokenResponseDto refresh(String refreshToken) throws InvalidTokenException;
}
