package com.signbank.backend.service;

import com.signbank.backend.dto.request.TransactionRequest;
import com.signbank.backend.dto.response.TransactionResponse;
import com.signbank.backend.entity.Transaction;
import com.signbank.backend.entity.User;
import com.signbank.backend.repository.TransactionRepository;
import com.signbank.backend.repository.UserRepository;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final UserRepository userRepository;
    private final FraudDetectionEngine fraudEngine;

    public TransactionService(TransactionRepository transactionRepository,
                               UserRepository userRepository,
                               FraudDetectionEngine fraudEngine) {
        this.transactionRepository = transactionRepository;
        this.userRepository = userRepository;
        this.fraudEngine = fraudEngine;
    }

    public TransactionResponse createTransaction(String userId, TransactionRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found: " + userId));

        Transaction txn = new Transaction();
        txn.setTransactionId("TXN-" + System.currentTimeMillis());
        txn.setUser(user);
        txn.setAmount(request.getAmount());
        txn.setType(request.getType());
        txn.setDescription(request.getDescription());
        txn.setTimestamp(LocalDateTime.now());
        txn.setStatus("COMPLETED");
        Transaction saved = transactionRepository.save(txn);

        fraudEngine.evaluateTransaction(userId, request.getAmount(), request.getType());

        return toResponse(saved);
    }

    public List<TransactionResponse> getUserTransactions(String userId) {
        return transactionRepository.findByUser_UserIdOrderByTimestampDesc(userId)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    private TransactionResponse toResponse(Transaction txn) {
        return new TransactionResponse(
            txn.getTransactionId(),
            txn.getUser().getUserId(),
            txn.getAmount(),
            txn.getType(),
            txn.getDescription(),
            txn.getStatus(),
            txn.getTimestamp()
        );
    }
}
