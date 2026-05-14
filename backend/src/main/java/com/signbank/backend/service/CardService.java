package com.signbank.backend.service;

import com.signbank.backend.dto.response.CardReplacementResponse;
import com.signbank.backend.dto.response.CardResponse;

import java.util.List;

public interface CardService {
    List<CardResponse> getCards(String username);
    CardResponse toggleBlockStatus(String username, String cardType);
    CardResponse requestReplacement(String username, String cardType);
    CardResponse requestReplacement(String username, String cardType, String reason);
    List<CardReplacementResponse> getReplacementHistory(String username, String cardType);
}