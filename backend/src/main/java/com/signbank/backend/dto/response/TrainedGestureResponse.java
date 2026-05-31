package com.signbank.backend.dto.response;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public class TrainedGestureResponse {

    private Long id;
    private String userId;
    private Integer slotNumber;
    private String slotLabel;
    private boolean trained;
    private List<Map<String, Double>> landmarks;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public Integer getSlotNumber() { return slotNumber; }
    public void setSlotNumber(Integer slotNumber) { this.slotNumber = slotNumber; }

    public String getSlotLabel() { return slotLabel; }
    public void setSlotLabel(String slotLabel) { this.slotLabel = slotLabel; }

    public boolean isTrained() { return trained; }
    public void setTrained(boolean trained) { this.trained = trained; }

    public List<Map<String, Double>> getLandmarks() { return landmarks; }
    public void setLandmarks(List<Map<String, Double>> landmarks) { this.landmarks = landmarks; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
