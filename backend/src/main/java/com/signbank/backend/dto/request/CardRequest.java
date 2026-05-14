package com.signbank.backend.dto.request;

public class CardRequest {
    private String username;
    private String cardType; // "CREDIT" or "DEBIT"

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getCardType() { return cardType; }
    public void setCardType(String cardType) { this.cardType = cardType; }
}