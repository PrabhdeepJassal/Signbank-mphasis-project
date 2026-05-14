package com.signbank.backend.dto.response;

import java.time.LocalDateTime;

public class CardReplacementResponse {
    private String replacementId;
    private String cardType;
    private String reason;
    private String status;
    private LocalDateTime requestedAt;

    public CardReplacementResponse() {}

    public CardReplacementResponse(String replacementId, String cardType, String reason,
                                   String status, LocalDateTime requestedAt) {
        this.replacementId = replacementId;
        this.cardType = cardType;
        this.reason = reason;
        this.status = status;
        this.requestedAt = requestedAt;
    }

    public String getReplacementId() { return replacementId; }
    public void setReplacementId(String replacementId) { this.replacementId = replacementId; }

    public String getCardType() { return cardType; }
    public void setCardType(String cardType) { this.cardType = cardType; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getRequestedAt() { return requestedAt; }
    public void setRequestedAt(LocalDateTime requestedAt) { this.requestedAt = requestedAt; }
}