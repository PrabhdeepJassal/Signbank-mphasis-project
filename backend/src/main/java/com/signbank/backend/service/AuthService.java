package com.signbank.backend.service;

import com.signbank.backend.security.JwtUtil;
import com.signbank.backend.dto.request.AuthRequest;
import com.signbank.backend.dto.response.AuthResponse;
import com.signbank.backend.dto.request.RegisterRequest;
import com.signbank.backend.entity.User;
import com.signbank.backend.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final GestureService gestureService;
    private final JwtUtil jwtUtil;
    private final PasswordEncoder passwordEncoder;

    public AuthService(UserRepository userRepository, GestureService gestureService, JwtUtil jwtUtil, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.gestureService = gestureService;
        this.jwtUtil = jwtUtil;
        this.passwordEncoder = passwordEncoder;
    }

    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Username already exists");
        }

        User user = new User();

        user.setUserId("U" + System.currentTimeMillis());// REQUIRED
        user.setUsername(request.getUsername());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
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

        boolean passwordOk = passwordEncoder.matches(request.getPassword(), user.getPasswordHash());
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
