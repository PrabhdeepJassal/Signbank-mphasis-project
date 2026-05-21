package com.signbank.backend.service;

import com.signbank.backend.security.JwtUtil;
import com.signbank.backend.dto.request.AuthRequest;
import com.signbank.backend.dto.response.AuthResponse;
import com.signbank.backend.dto.request.RegisterRequest;
import com.signbank.backend.entity.User;
import com.signbank.backend.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final GestureService gestureService;
    private final JwtUtil jwtUtil;

    public AuthService(UserRepository userRepository, GestureService gestureService, JwtUtil jwtUtil) {
        this.userRepository = userRepository;
        this.gestureService = gestureService;
        this.jwtUtil = jwtUtil;
    }

    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Username already exists");
        }

        User user = new User();

        user.setUserId("U" + System.currentTimeMillis());// REQUIRED
        user.setUsername(request.getUsername());
        user.setPasswordHash(request.getPassword());
        user.setEmail(request.getEmail());

        userRepository.save(user);


        String token = jwtUtil.generateToken(
                user.getUserId(),
                user.getRole().getRoleName().toUpperCase()
        );

        return new AuthResponse(token, "Registration successful");
    }

    public AuthResponse login(AuthRequest request) {
        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));

        boolean passwordOk = user.getPasswordHash() != null && user.getPasswordHash().equals(request.getPassword());
        if (!passwordOk) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }



        String token = jwtUtil.generateToken(
                user.getUserId(),
                user.getRole().getRoleName().toUpperCase()
        );


        return new AuthResponse(token, "Login successful");
    }
}
