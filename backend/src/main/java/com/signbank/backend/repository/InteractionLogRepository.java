package com.signbank.backend.repository;

import com.signbank.backend.dto.response.LogResponseDTO;
import com.signbank.backend.entity.InteractionLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
public interface InteractionLogRepository extends JpaRepository<InteractionLog, String> {

    @Query("""
    SELECT new com.signbank.backend.dto.response.LogResponseDTO(
        l.executedAt,
        u.username,
        r.roleName,
        g.gestureName,
        c.commandName
    )
    FROM InteractionLog l
    JOIN l.user u
    JOIN u.role r
    JOIN l.gesture g
    JOIN l.command c
    ORDER BY l.executedAt DESC
    """)
    List<LogResponseDTO> getDetailedLogs();

    @Query("""
    SELECT l FROM InteractionLog l
    JOIN l.user u
    WHERE u.userId = :userId
    """)
    List<InteractionLog> getLogsByUser(@Param("userId") String userId);

    @Query("SELECT COUNT(l) FROM InteractionLog l")
    long getTotalLogs();

    @Query("SELECT COUNT(DISTINCT l.user) FROM InteractionLog l")
    long getActiveUsers();

    @Query("SELECT COUNT(l) FROM InteractionLog l WHERE l.status = 'success'")
    long getSuccessLogs();

    @Query("""
SELECT l FROM InteractionLog l
JOIN l.user u
WHERE (:userId IS NULL OR u.userId = :userId)
AND (:status IS NULL OR l.status = :status)
""")
    List<InteractionLog> filterLogs(String userId, String status);
}
