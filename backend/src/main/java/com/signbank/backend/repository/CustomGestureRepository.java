package com.signbank.backend.repository;

import com.signbank.backend.entity.CustomGesture;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CustomGestureRepository extends JpaRepository<CustomGesture, Long> {
    List<CustomGesture> findByUserId(String userId);
    Optional<CustomGesture> findByUserIdAndSlotNumber(String userId, Integer slotNumber);
    void deleteByUserIdAndSlotNumber(String userId, Integer slotNumber);
    boolean existsByUserIdAndSlotNumber(String userId, Integer slotNumber);
}
