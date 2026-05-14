package com.signbank.backend.repository;

import com.signbank.backend.entity.Gesture;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface GestureRepository extends JpaRepository<Gesture, String> {

    Optional<Gesture> findByGestureId(String gestureId);

    Optional<Gesture> findByGestureName(String gestureName);

}