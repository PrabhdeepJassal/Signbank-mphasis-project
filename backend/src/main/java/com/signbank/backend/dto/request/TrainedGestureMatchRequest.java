package com.signbank.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public class TrainedGestureMatchRequest {

    @NotBlank
    private String userId;

    @NotNull
    private List<LandmarkPoint> landmarks;

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public List<LandmarkPoint> getLandmarks() { return landmarks; }
    public void setLandmarks(List<LandmarkPoint> landmarks) { this.landmarks = landmarks; }

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
