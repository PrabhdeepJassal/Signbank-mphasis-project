package com.signbank.backend.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "card_replacements")
public class CardReplacement {

    @Id
    @Column(name = "replacement_id")
    private String replacementId;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "card_type", nullable = false)
    private String cardType;   // CREDIT or DEBIT

    @Column(name = "reason")
    private String reason;     // LOST, DAMAGED, STOLEN

    @Column(name = "status")
    private String status;     // Processing, Shipped, Delivered

    @Column(name = "requested_at")
    private LocalDateTime requestedAt;

    public CardReplacement() {}

    public String getReplacementId() { return replacementId; }
    public void setReplacementId(String replacementId) { this.replacementId = replacementId; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public String getCardType() { return cardType; }
    public void setCardType(String cardType) { this.cardType = cardType; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getRequestedAt() { return requestedAt; }
    public void setRequestedAt(LocalDateTime requestedAt) { this.requestedAt = requestedAt; }
}