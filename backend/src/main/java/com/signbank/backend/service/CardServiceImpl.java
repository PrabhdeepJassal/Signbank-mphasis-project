package com.signbank.backend.service;

import com.signbank.backend.dto.response.CardReplacementResponse;
import com.signbank.backend.dto.response.CardResponse;
import com.signbank.backend.entity.*;
import com.signbank.backend.repository.*;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class CardServiceImpl implements CardService {

    private final CardRepository cardRepository;
    private final UserRepository userRepository;
    private final CardReplacementRepository replacementRepository;
    private final InteractionLogRepository logRepository;
    private final CommandRepository commandRepository;
    private final GestureRepository gestureRepository;

    public CardServiceImpl(CardRepository cardRepository,
                           UserRepository userRepository,
                           CardReplacementRepository replacementRepository,
                           InteractionLogRepository logRepository,
                           CommandRepository commandRepository,
                           GestureRepository gestureRepository) {
        this.cardRepository = cardRepository;
        this.userRepository = userRepository;
        this.replacementRepository = replacementRepository;
        this.logRepository = logRepository;
        this.commandRepository = commandRepository;
        this.gestureRepository = gestureRepository;
    }

    // ── Get all cards for a user ─────────────────────────────────────────────
    @Override
    public List<CardResponse> getCards(String username) {
        List<Card> cards = cardRepository.findByUser_Username(username);
        if (cards.isEmpty()) {
            User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found: " + username));
            cards = createDefaultCards(user);
        }
        return cards.stream().map(this::toResponse).collect(Collectors.toList());
    }

    // ── Toggle Block / Unblock ────────────────────────────────────────────────
    @Override
    public CardResponse toggleBlockStatus(String username, String cardType) {
        Card card = findOrCreate(username, cardType.toUpperCase());
        String newStatus = card.getCardStatus().equals("ACTIVE") ? "BLOCKED" : "ACTIVE";
        card.setCardStatus(newStatus);
        cardRepository.save(card);

        String action = newStatus.equals("BLOCKED") ? "Block Card" : "Unblock Card";
        String msg = cardType + " card has been " + newStatus + " successfully";

        // Save interaction log
        saveInteractionLog(username, action, cardType,
            msg + " | Card: " + card.getCardNumber());

        CardResponse res = toResponse(card);
        res.setMessage(msg);
        return res;
    }

    // ── Request Card Replacement ──────────────────────────────────────────────
    @Override
    public CardResponse requestReplacement(String username, String cardType, String reason) {
        Card card = findOrCreate(username, cardType.toUpperCase());
        card.setReplaceRequested(true);
        cardRepository.save(card);

        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("User not found: " + username));

        // Persist replacement history entry
        CardReplacement replacement = new CardReplacement();
        replacement.setReplacementId("RH-" + System.currentTimeMillis());
        replacement.setUser(user);
        replacement.setCardType(cardType.toUpperCase());
        replacement.setReason(reason != null ? reason : "UNSPECIFIED");
        replacement.setStatus("Processing");
        replacement.setRequestedAt(LocalDateTime.now());
        replacementRepository.save(replacement);

        // Save interaction log
        saveInteractionLog(username, "Replace Card", cardType,
            cardType + " card replacement requested | Reason: " + (reason != null ? reason : "N/A"));

        CardResponse res = toResponse(card);
        res.setMessage(cardType + " card replacement has been requested successfully");
        return res;
    }

    // ── Backward-compat override (no reason) ─────────────────────────────────
    @Override
    public CardResponse requestReplacement(String username, String cardType) {
        return requestReplacement(username, cardType, null);
    }

    // ── Get Replacement History ───────────────────────────────────────────────
    @Override
    public List<CardReplacementResponse> getReplacementHistory(String username, String cardType) {
        List<CardReplacement> entries = (cardType != null && !cardType.isBlank())
            ? replacementRepository.findByUsernameAndCardType(username, cardType.toUpperCase())
            : replacementRepository.findByUsername(username);

        return entries.stream().map(r -> new CardReplacementResponse(
            r.getReplacementId(),
            r.getCardType(),
            r.getReason(),
            r.getStatus(),
            r.getRequestedAt()
        )).collect(Collectors.toList());
    }

    // ── Save Set-Limit Interaction Log (called from OperatorController) ───────
    public void saveSetLimitLog(String username, double limit, String cardType) {
        saveInteractionLog(username, "Set Transaction Limit", cardType,
            "Transaction limit set to ₹" + String.format("%.0f", limit) +
            " for " + cardType + " card");
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private void saveInteractionLog(String username, String commandName, String cardType, String metadata) {
        try {
            User user = userRepository.findByUsername(username).orElse(null);
            if (user == null) return;

            // Try to find a matching command by name (best-effort)
            Command command = commandRepository.findAll().stream()
                .filter(c -> c.getCommandName().equalsIgnoreCase(commandName))
                .findFirst().orElse(null);

            // Try to find a relevant gesture (best-effort — use null if none found)
            Gesture gesture = gestureRepository.findAll().stream().findFirst().orElse(null);

            InteractionLog log = new InteractionLog();
            log.setInteractionId("IL-" + System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 6));
            log.setUser(user);
            log.setCommand(command);
            log.setGesture(gesture);
            log.setExecutedAt(LocalDateTime.now());
            log.setStatus("success");
            log.setMetadata(metadata);
            logRepository.save(log);
        } catch (Exception e) {
            // Non-critical — never let logging break the main operation
            System.err.println("[CardService] Failed to save interaction log: " + e.getMessage());
        }
    }

    private Card findOrCreate(String username, String cardType) {
        return cardRepository.findByUser_UsernameAndCardType(username, cardType)
            .orElseGet(() -> {
                User user = userRepository.findByUsername(username)
                    .orElseThrow(() -> new RuntimeException("User not found: " + username));
                Card card = new Card();
                card.setCardId(UUID.randomUUID().toString());
                card.setCardType(cardType);
                card.setCardStatus("ACTIVE");
                card.setCardNumber("**** **** **** " + (1000 + (int)(Math.random() * 9000)));
                card.setReplaceRequested(false);
                card.setUser(user);
                return cardRepository.save(card);
            });
    }

    private List<Card> createDefaultCards(User user) {
        Card credit = new Card();
        credit.setCardId(UUID.randomUUID().toString());
        credit.setCardType("CREDIT");
        credit.setCardStatus("ACTIVE");
        credit.setCardNumber("**** **** **** " + (1000 + (int)(Math.random() * 9000)));
        credit.setReplaceRequested(false);
        credit.setUser(user);

        Card debit = new Card();
        debit.setCardId(UUID.randomUUID().toString());
        debit.setCardType("DEBIT");
        debit.setCardStatus("ACTIVE");
        debit.setCardNumber("**** **** **** " + (1000 + (int)(Math.random() * 9000)));
        debit.setReplaceRequested(false);
        debit.setUser(user);

        return cardRepository.saveAll(List.of(credit, debit));
    }

    private CardResponse toResponse(Card card) {
        return new CardResponse(
            card.getCardId(),
            card.getCardType(),
            card.getCardStatus(),
            card.getCardNumber(),
            card.getReplaceRequested(),
            null
        );
    }
}