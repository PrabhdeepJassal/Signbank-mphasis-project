package com.signbank.backend.repository;

import com.signbank.backend.entity.TrainedGesture;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

public interface TrainedGestureRepository extends JpaRepository<TrainedGesture, Long> {

    List<TrainedGesture> findByUserId(String userId);

    Optional<TrainedGesture> findByUserIdAndSlotNumber(String userId, Integer slotNumber);

    @Modifying
    @Transactional
    void deleteByUserIdAndSlotNumber(String userId, Integer slotNumber);
}
