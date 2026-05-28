package org.example.bmsdec24.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;
import java.util.Map;

@Service
public class JwtService {

    public static final String CLAIM_USER_ID = "uid";
    public static final String CLAIM_TOKEN_TYPE = "ttype";
    public static final String TOKEN_TYPE_ACCESS = "access";
    public static final String TOKEN_TYPE_REFRESH = "refresh";

    private final JwtProperties jwtProperties;
    private final SecretKey signingKey;

    public JwtService(JwtProperties jwtProperties) {
        this.jwtProperties = jwtProperties;
        this.signingKey = buildKey(jwtProperties.getSecret());
    }

    public String generateAccessToken(int userId, String email) {
        Duration validity = Duration.ofMinutes(jwtProperties.getAccessTokenValidityMinutes());
        return generateToken(userId, email, TOKEN_TYPE_ACCESS, validity);
    }

    public String generateRefreshToken(int userId, String email) {
        Duration validity = Duration.ofDays(jwtProperties.getRefreshTokenValidityDays());
        return generateToken(userId, email, TOKEN_TYPE_REFRESH, validity);
    }

    public long getAccessTokenValiditySeconds() {
        return Duration.ofMinutes(jwtProperties.getAccessTokenValidityMinutes()).toSeconds();
    }

    public Jws<Claims> parse(String token) throws JwtException {
        return Jwts.parser()
                .verifyWith(signingKey)
                .requireIssuer(jwtProperties.getIssuer())
                .build()
                .parseSignedClaims(token);
    }

    public boolean isAccessToken(Claims claims) {
        return TOKEN_TYPE_ACCESS.equals(claims.get(CLAIM_TOKEN_TYPE, String.class));
    }

    public boolean isRefreshToken(Claims claims) {
        return TOKEN_TYPE_REFRESH.equals(claims.get(CLAIM_TOKEN_TYPE, String.class));
    }

    public Integer extractUserId(Claims claims) {
        Object raw = claims.get(CLAIM_USER_ID);
        if (raw instanceof Number number) {
            return number.intValue();
        }
        return null;
    }

    private String generateToken(int userId, String email, String tokenType, Duration validity) {
        Instant now = Instant.now();
        Instant expiry = now.plus(validity);
        return Jwts.builder()
                .issuer(jwtProperties.getIssuer())
                .subject(email)
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiry))
                .claims(Map.of(CLAIM_USER_ID, userId, CLAIM_TOKEN_TYPE, tokenType))
                .signWith(signingKey, Jwts.SIG.HS256)
                .compact();
    }

    private static SecretKey buildKey(String secret) {
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException("bms.security.jwt.secret must be configured");
        }
        byte[] keyBytes;
        try {
            keyBytes = Base64.getDecoder().decode(secret);
        } catch (IllegalArgumentException ex) {
            keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        }
        if (keyBytes.length < 32) {
            throw new IllegalStateException("bms.security.jwt.secret must decode to at least 32 bytes for HS256");
        }
        return Keys.hmacShaKeyFor(keyBytes);
    }
}
