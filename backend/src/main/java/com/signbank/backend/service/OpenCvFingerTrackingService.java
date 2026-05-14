package com.signbank.backend.service;

import com.signbank.backend.dto.request.LandmarkRequest;
import com.signbank.backend.dto.request.LandmarkRequest.LandmarkPoint;
import com.signbank.backend.dto.response.LandmarkResponse;
import jakarta.annotation.PostConstruct;
import org.opencv.core.*;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.concurrent.ConcurrentHashMap;


@Service
public class OpenCvFingerTrackingService {

    private static final double MIN_LIMIT      =    500.0;
    private static final double MAX_LIMIT      = 100000.0;
    private static final double MOVE_THRESHOLD =   0.008; 
    private static final double MAX_DX         =   0.04;  // fast swipe
    private static final double MIN_STEP       =    500.0;
    private static final double MAX_STEP       =   5000.0;

    // Per-user state
    private final ConcurrentHashMap<String, Double> limitStore = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Double> prevXStore = new ConcurrentHashMap<>();

    @PostConstruct
    public void loadNativeLib() {
        nu.pattern.OpenCV.loadLocally();
    }

    // ─────────────────────────────────────────────────────────────────────────

    public LandmarkResponse analyseFinger(LandmarkRequest request, String userId) {
        List<LandmarkPoint> lm = request.getLandmarks();

        double currentLimit = limitStore.getOrDefault(userId, 10000.0);

        if (lm == null || lm.size() < 21) {
            return new LandmarkResponse("NEUTRAL", 0.0, currentLimit, 0.5);
        }

        if (!isOneFinger(lm)) {
            prevXStore.remove(userId); // reset tracking when gesture breaks
            return new LandmarkResponse("NEUTRAL", 0.0, currentLimit, lm.get(8).getX());
        }

        double currentX = lm.get(8).getX(); // INDEX_TIP normalised x (0=left, 1=right)

        Double prevX = prevXStore.get(userId);
        if (prevX == null) {
            prevXStore.put(userId, currentX);
            return new LandmarkResponse("NEUTRAL", 0.0, currentLimit, currentX);
        }

        Mat curMat = new Mat(1, 1, CvType.CV_64F);
        Mat preMat = new Mat(1, 1, CvType.CV_64F);
        Mat dxMat  = new Mat(1, 1, CvType.CV_64F);

        curMat.put(0, 0, currentX);
        preMat.put(0, 0, prevX);
        Core.subtract(curMat, preMat, dxMat);   

        double dx = dxMat.get(0, 0)[0];

        curMat.release();
        preMat.release();
        dxMat.release();

        prevXStore.put(userId, currentX);

        double absDx = Math.abs(dx);
        String direction;

        if (dx > MOVE_THRESHOLD) {
            direction = "RIGHT";
        } else if (dx < -MOVE_THRESHOLD) {
            direction = "LEFT";
        } else {
            direction = "NEUTRAL";
        }

        double speed = 0.0;
        if (!direction.equals("NEUTRAL")) {
            speed = Math.min(1.0, (absDx - MOVE_THRESHOLD) / (MAX_DX - MOVE_THRESHOLD));
        }

        double step = MIN_STEP + speed * (MAX_STEP - MIN_STEP);

        if (direction.equals("RIGHT")) {
            currentLimit = Math.min(MAX_LIMIT, currentLimit + step);
        } else if (direction.equals("LEFT")) {
            currentLimit = Math.max(MIN_LIMIT, currentLimit - step);
        }

        currentLimit = Math.round(currentLimit / 500.0) * 500.0;
        currentLimit = Math.max(MIN_LIMIT, Math.min(MAX_LIMIT, currentLimit));

        limitStore.put(userId, currentLimit);

        return new LandmarkResponse(direction, speed, currentLimit, currentX);
    }

    public void confirmLimit(String userId, double limit) {
        limitStore.put(userId, Math.max(MIN_LIMIT, Math.min(MAX_LIMIT, limit)));
        prevXStore.remove(userId);
    }

    public double getLimit(String userId) {
        return limitStore.getOrDefault(userId, 10000.0);
    }

    private boolean isOneFinger(List<LandmarkPoint> lm) {
        boolean indexUp    = lm.get(8).getY()  < lm.get(6).getY();
        boolean middleDown = lm.get(12).getY() > lm.get(10).getY();
        boolean ringDown   = lm.get(16).getY() > lm.get(14).getY();
        boolean pinkyDown  = lm.get(20).getY() > lm.get(18).getY();
        boolean thumbDown  = lm.get(4).getY()  > lm.get(5).getY();
        return indexUp && middleDown && ringDown && pinkyDown && thumbDown;
    }
}