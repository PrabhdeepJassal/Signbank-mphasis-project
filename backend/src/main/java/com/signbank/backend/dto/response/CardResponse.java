package com.signbank.backend.dto.response;

public class CardResponse {
    private String cardId;
    private String cardType;
    private String cardStatus;
    private String cardNumber;
    private Boolean replaceRequested;
    private String message;

    public CardResponse() {}

    public CardResponse(String cardId, String cardType, String cardStatus,
                        String cardNumber, Boolean replaceRequested, String message) {
        this.cardId           = cardId;
        this.cardType         = cardType;
        this.cardStatus       = cardStatus;
        this.cardNumber       = cardNumber;
        this.replaceRequested = replaceRequested;
        this.message          = message;
    }

    public String getCardId()           { return cardId; }
    public String getCardType()         { return cardType; }
    public String getCardStatus()       { return cardStatus; }
    public String getCardNumber()       { return cardNumber; }
    public Boolean getReplaceRequested(){ return replaceRequested; }
    public String getMessage()          { return message; }

    public void setCardId(String cardId)                     { this.cardId = cardId; }
    public void setCardType(String cardType)                 { this.cardType = cardType; }
    public void setCardStatus(String cardStatus)             { this.cardStatus = cardStatus; }
    public void setCardNumber(String cardNumber)             { this.cardNumber = cardNumber; }
    public void setReplaceRequested(Boolean r)               { this.replaceRequested = r; }
    public void setMessage(String message)                   { this.message = message; }
}