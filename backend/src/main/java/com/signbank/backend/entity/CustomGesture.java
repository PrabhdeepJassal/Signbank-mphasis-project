package com.signbank.backend.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "custom_gestures")
public class CustomGesture {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(name = "slot_number", nullable = false)
    private Integer slotNumber;

    @Column(name = "gesture_name", nullable = false)
    private String gestureName;

    @Column(name = "gesture_vector", columnDefinition = "TEXT", nullable = false)
    private String gestureVector;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public CustomGesture() {}

    public CustomGesture(String userId, Integer slotNumber, String gestureName, String gestureVector) {
        this.userId = userId;
        this.slotNumber = slotNumber;
        this.gestureName = gestureName;
        this.gestureVector = gestureVector;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public Integer getSlotNumber() { return slotNumber; }
    public void setSlotNumber(Integer slotNumber) { this.slotNumber = slotNumber; }

    public String getGestureName() { return gestureName; }
    public void setGestureName(String gestureName) { this.gestureName = gestureName; }

    public String getGestureVector() { return gestureVector; }
    public void setGestureVector(String gestureVector) { this.gestureVector = gestureVector; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
