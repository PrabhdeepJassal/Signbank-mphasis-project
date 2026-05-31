package com.signbank.backend.controller;

import com.signbank.backend.dto.request.TransactionRequest;
import com.signbank.backend.dto.response.TransactionResponse;
import com.signbank.backend.service.TransactionService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.util.List;

@RestController
@RequestMapping("/api/transactions")
public class TransactionController {

    private final TransactionService transactionService;

    public TransactionController(TransactionService transactionService) {
        this.transactionService = transactionService;
    }

    @PostMapping
    public ResponseEntity<TransactionResponse> createTransaction(
            @RequestParam String userId,
            @Valid @RequestBody TransactionRequest request) {
        try {
            return ResponseEntity.ok(transactionService.createTransaction(userId, request));
        } catch (RuntimeException e) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, e.getMessage());
        }
    }

    @GetMapping
    public ResponseEntity<List<TransactionResponse>> getTransactions(
            @RequestParam String userId) {
        return ResponseEntity.ok(transactionService.getUserTransactions(userId));
    }
}
