package com.signbank.backend.controller;

import com.signbank.backend.dto.request.TrainedGestureMatchRequest;
import com.signbank.backend.dto.request.TrainedGestureRequest;
import com.signbank.backend.dto.response.TrainedGestureMatchResponse;
import com.signbank.backend.dto.response.TrainedGestureResponse;
import com.signbank.backend.entity.TrainedGesture;
import com.signbank.backend.repository.TrainedGestureRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.JsonProcessingException;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/operator/trained-gestures")
@CrossOrigin(origins = "*")
public class OperatorController {

    private final TrainedGestureRepository repository;
    private final ObjectMapper objectMapper;

    private static final double MATCH_THRESHOLD = 0.88;

    public OperatorController(TrainedGestureRepository repository) {
        this.repository = repository;
        this.objectMapper = new ObjectMapper();
    }

    @PostMapping
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<TrainedGestureResponse> saveTrainedGesture(
            @Valid @RequestBody TrainedGestureRequest request) {

        String landmarksJson;
        try {
            landmarksJson = objectMapper.writeValueAsString(request.getLandmarks());
        } catch (JsonProcessingException e) {
            return ResponseEntity.badRequest().build();
        }

        repository.findByUserIdAndSlotNumber(request.getUserId(), request.getSlotNumber())
                .ifPresent(existing -> repository.delete(existing));

        TrainedGesture tg = new TrainedGesture();
        tg.setUserId(request.getUserId());
        tg.setSlotNumber(request.getSlotNumber());
        tg.setSlotLabel(request.getSlotLabel());
        tg.setLandmarks(landmarksJson);

        TrainedGesture saved = repository.save(tg);

        TrainedGestureResponse resp = toResponse(saved);
        resp.setTrained(true);
        return ResponseEntity.ok(resp);
    }

    @GetMapping
    public ResponseEntity<List<TrainedGestureResponse>> getTrainedGestures(
            @RequestParam String userId) {

        List<TrainedGesture> all = repository.findByUserId(userId);

        Map<Integer, TrainedGestureResponse> slotMap = new HashMap<>();
        for (int i = 1; i <= 5; i++) {
            TrainedGestureResponse empty = new TrainedGestureResponse();
            empty.setSlotNumber(i);
            empty.setSlotLabel(slotLabelFor(i));
            empty.setTrained(false);
            slotMap.put(i, empty);
        }

        for (TrainedGesture tg : all) {
            TrainedGestureResponse resp = toResponse(tg);
            resp.setTrained(true);
            slotMap.put(tg.getSlotNumber(), resp);
        }

        List<TrainedGestureResponse> result = new ArrayList<>(slotMap.values());
        result.sort((a, b) -> Integer.compare(a.getSlotNumber(), b.getSlotNumber()));
        return ResponseEntity.ok(result);
    }

    @DeleteMapping("/{slotNumber}")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<Void> deleteTrainedGesture(
            @RequestParam String userId,
            @PathVariable Integer slotNumber) {
        repository.deleteByUserIdAndSlotNumber(userId, slotNumber);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/match")
    public ResponseEntity<TrainedGestureMatchResponse> matchTrainedGesture(
            @Valid @RequestBody TrainedGestureMatchRequest request) {

        List<TrainedGesture> userGestures = repository.findByUserId(request.getUserId());

        if (userGestures.isEmpty()) {
            TrainedGestureMatchResponse resp = new TrainedGestureMatchResponse();
            resp.setMatched(false);
            resp.setConfidence(0);
            return ResponseEntity.ok(resp);
        }

        double[] queryVec = landmarksToVector(request.getLandmarks());

        TrainedGestureMatchResponse best = new TrainedGestureMatchResponse();
        best.setMatched(false);
        best.setConfidence(0);

        for (TrainedGesture tg : userGestures) {
            try {
                List<Map<String, Double>> stored = objectMapper.readValue(
                        tg.getLandmarks(), List.class);

                double[] storedVec = new double[63];
                int idx = 0;
                for (Map<String, Double> pt : stored) {
                    storedVec[idx++] = pt.getOrDefault("x", 0.0);
                    storedVec[idx++] = pt.getOrDefault("y", 0.0);
                    storedVec[idx++] = pt.getOrDefault("z", 0.0);
                }

                double sim = cosineSimilarity(queryVec, storedVec);

                if (sim > best.getConfidence()) {
                    best.setMatched(sim >= MATCH_THRESHOLD);
                    best.setConfidence(sim);
                    best.setSlotNumber(tg.getSlotNumber());
                    best.setSlotLabel(tg.getSlotLabel());
                }
            } catch (Exception e) {
                System.err.println("[OperatorController] Failed to parse landmarks for gesture " + tg.getId());
            }
        }

        if (best.getConfidence() < MATCH_THRESHOLD) {
            best.setMatched(false);
        }

        return ResponseEntity.ok(best);
    }

    private double[] landmarksToVector(List<TrainedGestureMatchRequest.LandmarkPoint> landmarks) {
        double[] vec = new double[63];
        for (int i = 0; i < 21 && i < landmarks.size(); i++) {
            TrainedGestureMatchRequest.LandmarkPoint p = landmarks.get(i);
            vec[i * 3] = p.getX();
            vec[i * 3 + 1] = p.getY();
            vec[i * 3 + 2] = p.getZ();
        }
        return vec;
    }

    private double cosineSimilarity(double[] a, double[] b) {
        double dot = 0, normA = 0, normB = 0;
        for (int i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        double denom = Math.sqrt(normA) * Math.sqrt(normB);
        return denom == 0 ? 0 : dot / denom;
    }

    private TrainedGestureResponse toResponse(TrainedGesture tg) {
        TrainedGestureResponse r = new TrainedGestureResponse();
        r.setId(tg.getId());
        r.setUserId(tg.getUserId());
        r.setSlotNumber(tg.getSlotNumber());
        r.setSlotLabel(tg.getSlotLabel() != null ? tg.getSlotLabel() : slotLabelFor(tg.getSlotNumber()));
        r.setCreatedAt(tg.getCreatedAt());
        r.setUpdatedAt(tg.getUpdatedAt());
        try {
            List<Map<String, Double>> landmarks = objectMapper.readValue(
                    tg.getLandmarks(), List.class);
            r.setLandmarks(landmarks);
        } catch (Exception e) {
            r.setLandmarks(null);
        }
        return r;
    }

    private String slotLabelFor(int slot) {
        return switch (slot) {
            case 1 -> "Check Balance";
            case 2 -> "Check Cards";
            case 3 -> "Set Transaction Limit";
            case 4 -> "Logout";
            case 5 -> "Custom Action";
            default -> "Slot " + slot;
        };
    }
}
