package com.signbank.backend.controller;

import com.signbank.backend.dto.request.LandmarkRequest;
import com.signbank.backend.dto.response.LandmarkResponse;
import com.signbank.backend.dto.request.SetLimitRequest;
import com.signbank.backend.dto.request.GestureEventRequest;
import com.signbank.backend.dto.response.GestureEventResponse;
import com.signbank.backend.entity.*;
import com.signbank.backend.repository.*;
import com.signbank.backend.service.GestureService;
import com.signbank.backend.service.OpenCvFingerTrackingService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@CrossOrigin(origins = "*")
public class GestureController {

    private final GestureService gestureService;
    private final OpenCvFingerTrackingService fingerTrackingService;
    private final InteractionLogRepository logRepository;
    private final UserRepository userRepository;
    private final CommandRepository commandRepository;
    private final GestureRepository gestureRepository;

    public GestureController(GestureService gestureService,
                             OpenCvFingerTrackingService fingerTrackingService,
                             InteractionLogRepository logRepository,
                             UserRepository userRepository,
                             CommandRepository commandRepository,
                             GestureRepository gestureRepository) {
        this.gestureService = gestureService;
        this.fingerTrackingService = fingerTrackingService;
        this.logRepository = logRepository;
        this.userRepository = userRepository;
        this.commandRepository = commandRepository;
        this.gestureRepository = gestureRepository;
    }

    @PostMapping("/api/gesture-events")
    public GestureEventResponse handleGesture(@RequestBody GestureEventRequest request) {
        return gestureService.handleGesture(request);
    }

    @PostMapping("/api/operator/analyse-finger")
    public ResponseEntity<LandmarkResponse> analyseFinger(
            @RequestBody LandmarkRequest request,
            @RequestParam(defaultValue = "default") String userId) {
        LandmarkResponse response = fingerTrackingService.analyseFinger(request, userId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/api/operator/set-limit")
    public ResponseEntity<Map<String, Object>> setTransactionLimit(
            @Valid @RequestBody SetLimitRequest request) {

        fingerTrackingService.confirmLimit(request.getUserId(), request.getLimit());

        // ── Save interaction log ──────────────────────────────────────────────
        saveSetLimitLog(request.getUserId(), request.getLimit());

        Map<String, Object> body = new HashMap<>();
        body.put("userId",  request.getUserId());
        body.put("limit",   request.getLimit());
        body.put("status",  "success");
        body.put("message", "Transaction limit set to ₹" + String.format("%.0f", request.getLimit()));
        return ResponseEntity.ok(body);
    }

    @GetMapping("/api/operator/set-limit")
    public ResponseEntity<Map<String, Object>> getTransactionLimit(@RequestParam String userId) {
        double limit = fingerTrackingService.getLimit(userId);
        Map<String, Object> body = new HashMap<>();
        body.put("userId", userId);
        body.put("limit",  limit);
        body.put("status", "success");
        return ResponseEntity.ok(body);
    }

    // ── Helper: save interaction log for set-limit ────────────────────────────
    private void saveSetLimitLog(String username, double limit) {
        try {
            User user = userRepository.findByUsername(username).orElse(null);
            if (user == null) return;

            Command command = commandRepository.findByCommandName("Set Transaction Limit").orElse(null);
            Gesture gesture = gestureRepository.findByGestureId("G006").orElse(null); // Thumbs Up

            InteractionLog log = new InteractionLog();
            log.setInteractionId("IL-" + System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 6));
            log.setUser(user);
            log.setCommand(command);
            log.setGesture(gesture);
            log.setExecutedAt(LocalDateTime.now());
            log.setStatus("success");
            log.setMetadata("Transaction limit set to ₹" + String.format("%.0f", limit));
            logRepository.save(log);
        } catch (Exception e) {
            System.err.println("[GestureController] Failed to save set-limit log: " + e.getMessage());
        }
    }
}