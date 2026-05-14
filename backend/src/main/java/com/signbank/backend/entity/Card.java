package com.signbank.backend.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "cards")
public class Card {

    @Id
    @Column(name = "card_id")
    private String cardId;

    @Column(name = "card_type", nullable = false)
    private String cardType; // "CREDIT" or "DEBIT"

    @Column(name = "card_status", nullable = false)
    private String cardStatus; // "ACTIVE" or "BLOCKED"

    @Column(name = "card_number")
    private String cardNumber; // masked e.g. **** **** **** 1234

    @Column(name = "replace_requested")
    private Boolean replaceRequested = false;
    
    @Column(name = "transaction_limit")
    private Double transactionLimit;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    public Card() {}

    public String getCardId() { return cardId; }
    public void setCardId(String cardId) { this.cardId = cardId; }

    public String getCardType() { return cardType; }
    public void setCardType(String cardType) { this.cardType = cardType; }

    public String getCardStatus() { return cardStatus; }
    public void setCardStatus(String cardStatus) { this.cardStatus = cardStatus; }

    public String getCardNumber() { return cardNumber; }
    public void setCardNumber(String cardNumber) { this.cardNumber = cardNumber; }

    public Boolean getReplaceRequested() { return replaceRequested; }
    public void setReplaceRequested(Boolean replaceRequested) { this.replaceRequested = replaceRequested; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
}