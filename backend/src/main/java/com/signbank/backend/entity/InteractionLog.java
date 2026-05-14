package com.signbank.backend.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.sql.Timestamp;

@Entity
@Table(name = "interaction_log")
public class InteractionLog {

    @Id
    @Column(name = "interaction_id")
    private String interactionId;

    @ManyToOne
    @JoinColumn(name = "command_id")
    private Command command;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne
    @JoinColumn(name = "gesture_id")
    private Gesture gesture;

    @Column(name = "executed_at")
    private LocalDateTime executedAt;

    private String status;
    private String metadata;

    public InteractionLog() {
    }

    public InteractionLog(String interactionId, Command command, User user, Gesture gesture, LocalDateTime executedAt, String status, String metadata) {
        this.interactionId = interactionId;
        this.command = command;
        this.user = user;
        this.gesture = gesture;
        this.executedAt = executedAt;
        this.status = status;
        this.metadata = metadata;
    }

    public String getInteractionId() {
        return interactionId;
    }

    public void setInteractionId(String interactionId) {
        this.interactionId = interactionId;
    }

    public Command getCommand() {
        return command;
    }

    public void setCommand(Command command) {
        this.command = command;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public Gesture getGesture() {
        return gesture;
    }

    public void setGesture(Gesture gesture) {
        this.gesture = gesture;
    }

    public LocalDateTime getExecutedAt() {
        return executedAt;
    }

    public void setExecutedAt(LocalDateTime executedAt) {
        this.executedAt = executedAt;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getMetadata() {
        return metadata;
    }

    public void setMetadata(String metadata) {
        this.metadata = metadata;
    }
}
