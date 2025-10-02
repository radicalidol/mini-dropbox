package com.yuvraj.dropbox.auth;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;

import java.security.Key;
import java.util.Date;

public class JwtUtil {

    private static final String SECRET_KEY = "mySuperSecretKey12345678901234567890"; // at least 256 bits for HS256
    private static final Key KEY = Keys.hmacShaKeyFor(SECRET_KEY.getBytes());
    private static final long EXPIRY_MILLIS = 3600_000; // 1 hour

    public static String generateToken(String uuid) {
        long now = System.currentTimeMillis();
        return Jwts.builder()
                .setSubject(uuid)
                .setIssuedAt(new Date(now))
                .setExpiration(new Date(now + EXPIRY_MILLIS))
                .signWith(KEY, SignatureAlgorithm.HS256) // modern signWith
                .compact();
    }

    public static String validateTokenAndGetUUID(String token) {
        Jws<Claims> claimsJws = Jwts.parserBuilder()
                .setSigningKey(KEY) // modern parser
                .build()
                .parseClaimsJws(token);

        return claimsJws.getBody().getSubject();
    }
    public static long getExpirySeconds() {
        return EXPIRY_MILLIS/1000; // match token expiry
    }
}


