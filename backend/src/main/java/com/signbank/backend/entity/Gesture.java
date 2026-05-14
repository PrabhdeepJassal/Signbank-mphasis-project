package com.signbank.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;


@Entity
@Table(name = "gestures")
public class Gesture {

    @Id
    @Column(name = "gesture_id")
    private String gestureId;

    @Column(name = "gesture_name")
    private String gestureName;

    @Column(name = "gesture_symbol")
    private String gestureSymbol;

    public Gesture(String gestureId, String gestureName, String gestureSymbol) {
        this.gestureId = gestureId;
        this.gestureName = gestureName;
        this.gestureSymbol = gestureSymbol;
    }

    public Gesture() {
    }

    public String getGestureId() {
        return gestureId;
    }

    public void setGestureId(String gestureId) {
        this.gestureId = gestureId;
    }

    public String getGestureName() {
        return gestureName;
    }

    public void setGestureName(String gestureName) {
        this.gestureName = gestureName;
    }

    public String getGestureSymbol() {
        return gestureSymbol;
    }

    public void setGestureSymbol(String gestureSymbol) {
        this.gestureSymbol = gestureSymbol;
    }
}
