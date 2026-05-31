package com.signbank.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class TrainedGestureRequest {

    @NotBlank
    private String userId;

    @NotNull
    private Integer slotNumber;

    private String slotLabel;

    @NotNull
    private java.util.List<LandmarkPoint> landmarks;

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public Integer getSlotNumber() { return slotNumber; }
    public void setSlotNumber(Integer slotNumber) { this.slotNumber = slotNumber; }

    public String getSlotLabel() { return slotLabel; }
    public void setSlotLabel(String slotLabel) { this.slotLabel = slotLabel; }

    public java.util.List<LandmarkPoint> getLandmarks() { return landmarks; }
    public void setLandmarks(java.util.List<LandmarkPoint> landmarks) { this.landmarks = landmarks; }

    public static class LandmarkPoint {
        private double x;
        private double y;
        private double z;

        public double getX() { return x; }
        public void setX(double x) { this.x = x; }
        public double getY() { return y; }
        public void setY(double y) { this.y = y; }
        public double getZ() { return z; }
        public void setZ(double z) { this.z = z; }
    }
}
