package com.signbank.backend.dto.request;

import java.util.List;

public class LandmarkRequest {

    private List<LandmarkPoint> landmarks;

    public List<LandmarkPoint> getLandmarks() { return landmarks; }
    public void setLandmarks(List<LandmarkPoint> landmarks) { this.landmarks = landmarks; }

    public static class LandmarkPoint {
        private double x;
        private double y;
        private double z;

        public double getX() { return x; }
        public void   setX(double x) { this.x = x; }
        public double getY() { return y; }
        public void   setY(double y) { this.y = y; }
        public double getZ() { return z; }
        public void   setZ(double z) { this.z = z; }
    }
}