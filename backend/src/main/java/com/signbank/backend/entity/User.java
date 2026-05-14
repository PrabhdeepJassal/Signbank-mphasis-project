package com.signbank.backend.entity;

import jakarta.persistence.*;
import org.springframework.boot.jdbc.DataSourceBuilder;

import javax.sql.DataSource;
import java.time.LocalDateTime;
import java.sql.Timestamp;

@Entity
@Table(name = "users")
public class User {

    @Id
    @Column(name = "user_id")
    private String userId;

    @Column(nullable = false)
    private String username;

    @Column(name = "password_hash")
    private String passwordHash;

    @Column(nullable = false)
    private String email;

    @Column(name = "gesture_hash")
    private String gestureHash;

    @ManyToOne
    @JoinColumn(name = "role_id")
    private Role role;
    
    @Column(name = "transaction_limit")
    private Double transactionLimit;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    public User() {
    }

    public User(String userId, Role role, String passwordHash, String username, String email, String gestureHash, LocalDateTime createdAt) {
        this.userId = userId;
        this.role = role;
        this.passwordHash = passwordHash;
        this.username = username;
        this.email = email;
        this.gestureHash = gestureHash;
        this.createdAt = createdAt;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getGestureHash() {
        return gestureHash;
    }

    public void setGestureHash(String gestureHash) {
        this.gestureHash = gestureHash;
    }

    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = role;
    }
    public Double getTransactionLimit() {
        return transactionLimit;
    }

    public void setTransactionLimit(Double limit) {
        this.transactionLimit = limit;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
    

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
