package com.signbank.backend.repository;

import com.signbank.backend.entity.UserSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.time.LocalDateTime;

@Repository
public interface UserSessionRepository extends JpaRepository<UserSession, String> {
    List<UserSession> findByUserIdOrderByLoginAtDesc(String userId);
    List<UserSession> findByUserIdAndLoginAtAfter(String userId, LocalDateTime after);
    List<UserSession> findByUserIdAndDeviceFingerprint(String userId, String deviceFingerprint);
}
