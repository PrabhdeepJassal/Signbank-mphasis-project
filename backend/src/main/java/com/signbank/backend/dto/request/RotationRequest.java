package com.signbank.backend.dto.request;

import java.util.List;

/**
 * Payload sent by the frontend every ~200 ms while the Set Limit modal is open.
 * Contains the raw MediaPipe hand landmark coordinates for ONE hand (21 points).
 */
public class RotationRequest {

    /** 21 landmarks, each with x, y, z (normalised 0-1) */
    private List<LandmarkPoint> landmarks;

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