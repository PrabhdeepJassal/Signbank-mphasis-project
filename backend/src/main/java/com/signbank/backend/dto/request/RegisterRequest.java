package com.signbank.backend.dto.request;

import jakarta.validation.constraints.NotBlank;

public class RegisterRequest {
    @NotBlank
    private String username;

    @NotBlank
    private String password;


    @NotBlank
    private String email;


    @NotBlank
    private String gestureData;

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getGestureData() {
        return gestureData;
    }

    public void setGestureData(String gestureData) {
        this.gestureData = gestureData;
    }
}
