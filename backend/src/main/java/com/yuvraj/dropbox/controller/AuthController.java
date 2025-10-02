package com.yuvraj.dropbox.controller;

import com.yuvraj.dropbox.auth.JwtUtil;
import com.yuvraj.dropbox.model.User;
import com.yuvraj.dropbox.repository.UserRepository;
import com.yuvraj.dropbox.dto.LoginRequest;
import com.yuvraj.dropbox.dto.RegisterRequest;
import com.yuvraj.dropbox.dto.AuthResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;

import java.io.File;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/auth")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @Value("${dropbox.upload.dir}")
    private String uploadDir;

    @PostMapping("/register")
    public Map<String, String> register(@RequestBody RegisterRequest request) throws Exception {
        if (userRepository.findByUsername(request.getUsername()) != null)
            throw new RuntimeException("Username already exists");

        User user = new User();  // default constructor
        user.setUsername(request.getUsername());
        user.setPassword(request.getPassword());
        user.setEmail(request.getEmail());
        userRepository.save(user);

        // Create folder
        File userFolder = new File(uploadDir, user.getUuid());
        if (!userFolder.exists()) userFolder.mkdirs();

        Map<String, String> response = new HashMap<>();
        response.put("uuid", user.getUuid());
        response.put("username", user.getUsername());
        return response;
    }

    @PostMapping("/login")
    public AuthResponse login(@RequestBody LoginRequest loginRequest) {
        User user = userRepository.findByUsername(loginRequest.getUsername());
        if (user == null || !user.getPassword().equals(loginRequest.getPassword())) {
            throw new RuntimeException("Invalid username or password");
        }

        // Generate token with expiry
        String token = JwtUtil.generateToken(user.getUuid());
        long expirySeconds = JwtUtil.getExpirySeconds(); // make this configurable

        AuthResponse response = new AuthResponse();
        response.setToken(token);
        response.setUuid(user.getUuid());
        response.setUsername(user.getUsername());
        response.setExpiresIn(expirySeconds); // in seconds
        return response;
    }


}
