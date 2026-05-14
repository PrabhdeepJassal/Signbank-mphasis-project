package com.signbank.backend.dto.response;

import java.sql.Timestamp;
import java.time.LocalDateTime;

public class LogResponseDTO {


    private LocalDateTime time;
    private String name;
    private String role;
    private String gesture;
    private String action;

    public LogResponseDTO(LocalDateTime time, String action, String gesture, String role, String name) {
        this.time = time;
        this.action = action;
        this.gesture = gesture;
        this.role = role;
        this.name = name;
    }

    public LocalDateTime getTime() {
        return time;
    }

    public void setTime(LocalDateTime time) {
        this.time = time;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getGesture() {
        return gesture;
    }

    public void setGesture(String gesture) {
        this.gesture = gesture;
    }

    public String getAction() {
        return action;
    }

    public void setAction(String action) {
        this.action = action;
    }
}
