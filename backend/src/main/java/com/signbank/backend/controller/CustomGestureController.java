package com.signbank.backend.controller;

import com.signbank.backend.entity.CustomGesture;
import com.signbank.backend.repository.CustomGestureRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/gestures")
@CrossOrigin(origins = "*")
public class CustomGestureController {

    private final CustomGestureRepository repository;

    public CustomGestureController(CustomGestureRepository repository) {
        this.repository = repository;
    }

    // ── Save a new custom gesture ──
    @PostMapping("/save")
    public ResponseEntity<Map<String, Object>> saveGesture(@RequestBody Map<String, Object> body) {
        String userId = (String) body.get("userId");
        Integer slotNumber = (Integer) body.get("slotNumber");
        String gestureName = (String) body.get("gestureName");
        String gestureVector = (String) body.get("gestureVector");

        if (userId == null || slotNumber == null || gestureVector == null) {
            return ResponseEntity.badRequest().body(Map.of("status", "error", "message", "Missing required fields"));
        }

        // If slot already exists, overwrite it
        repository.findByUserIdAndSlotNumber(userId, slotNumber).ifPresent(repository::delete);

        CustomGesture gesture = new CustomGesture(userId, slotNumber,
            gestureName != null ? gestureName : "Gesture " + slotNumber, gestureVector);
        repository.save(gesture);

        return ResponseEntity.ok(Map.of("status", "success", "message", "Gesture saved", "slot", slotNumber));
    }

    // ── Load all gestures for a user ──
    @GetMapping("/load/{userId}")
    public ResponseEntity<List<CustomGesture>> loadGestures(@PathVariable String userId) {
        List<CustomGesture> gestures = repository.findByUserId(userId);
        return ResponseEntity.ok(gestures);
    }

    // ── Update a gesture ──
    @PutMapping("/update")
    public ResponseEntity<Map<String, Object>> updateGesture(@RequestBody Map<String, Object> body) {
        Long id = Long.valueOf(body.get("id").toString());
        String gestureVector = (String) body.get("gestureVector");
        String gestureName = (String) body.get("gestureName");

        Optional<CustomGesture> opt = repository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        CustomGesture gesture = opt.get();
        if (gestureVector != null) gesture.setGestureVector(gestureVector);
        if (gestureName != null) gesture.setGestureName(gestureName);
        gesture.setUpdatedAt(LocalDateTime.now());
        repository.save(gesture);

        return ResponseEntity.ok(Map.of("status", "success", "message", "Gesture updated"));
    }

    // ── Delete a gesture by slot ──
    @DeleteMapping("/delete/{userId}/{slotNumber}")
    public ResponseEntity<Map<String, Object>> deleteGesture(
            @PathVariable String userId, @PathVariable Integer slotNumber) {
        repository.findByUserIdAndSlotNumber(userId, slotNumber).ifPresent(g -> repository.delete(g));
        return ResponseEntity.ok(Map.of("status", "success", "message", "Gesture deleted"));
    }

    // ── Delete by ID ──
    @DeleteMapping("/delete/{id}")
    public ResponseEntity<Map<String, Object>> deleteGestureById(@PathVariable Long id) {
        repository.findById(id).ifPresent(g -> repository.delete(g));
        return ResponseEntity.ok(Map.of("status", "success", "message", "Gesture deleted"));
    }

    // ── Upsert: save or update ──
    @PostMapping("/upsert")
    public ResponseEntity<Map<String, Object>> upsertGesture(@RequestBody Map<String, Object> body) {
        return saveGesture(body);
    }

    // ── Recognize gesture by comparing landmarks with stored vectors ──
    @PostMapping("/recognize")
    public ResponseEntity<Map<String, Object>> recognizeGesture(@RequestBody Map<String, Object> body) {
        String userId = (String) body.get("userId");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> landmarks = (List<Map<String, Object>>) body.get("landmarks");

        if (userId == null || landmarks == null) {
            return ResponseEntity.badRequest().body(Map.of("status", "error", "message", "Missing userId or landmarks"));
        }

        // Convert incoming landmarks to a flat vector string
        String currentVector = landmarksToVector(landmarks);
        double[] current = parseVector(currentVector);

        List<CustomGesture> userGestures = repository.findByUserId(userId);

        double bestScore = 0;
        String bestSlot = null;
        String bestName = null;

        for (CustomGesture g : userGestures) {
            double[] stored = parseVector(g.getGestureVector());
            double similarity = cosineSimilarity(current, stored);
            if (similarity > bestScore) {
                bestScore = similarity;
                bestSlot = String.valueOf(g.getSlotNumber());
                bestName = g.getGestureName();
            }
        }

        double threshold = body.containsKey("threshold")
            ? Double.parseDouble(body.get("threshold").toString())
            : 0.85;

        Map<String, Object> result = new HashMap<>();
        result.put("status", bestScore >= threshold ? "matched" : "no_match");
        result.put("similarity", Math.round(bestScore * 1000.0) / 1000.0);
        result.put("slot", bestSlot);
        result.put("gestureName", bestName);
        result.put("threshold", threshold);

        return ResponseEntity.ok(result);
    }

    // ── Convert landmark list to flat vector string (63 values: 21 points × 3 coords) ──
    private String landmarksToVector(List<Map<String, Object>> landmarks) {
        StringBuilder sb = new StringBuilder();
        for (Map<String, Object> lm : landmarks) {
            sb.append(lm.get("x")).append(",");
            sb.append(lm.get("y")).append(",");
            sb.append(lm.getOrDefault("z", 0)).append(",");
        }
        return sb.toString();
    }

    // ── Parse comma-separated vector string to double array ──
    private double[] parseVector(String vector) {
        String[] parts = vector.split(",");
        double[] result = new double[parts.length];
        for (int i = 0; i < parts.length; i++) {
            result[i] = Double.parseDouble(parts[i].trim());
        }
        return result;
    }

    // ── Cosine similarity calculation ──
    private double cosineSimilarity(double[] a, double[] b) {
        int len = Math.min(a.length, b.length);
        double dotProduct = 0, normA = 0, normB = 0;
        for (int i = 0; i < len; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        double denominator = Math.sqrt(normA) * Math.sqrt(normB);
        return denominator == 0 ? 0 : dotProduct / denominator;
    }
}
