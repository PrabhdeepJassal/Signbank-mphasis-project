package com.signbank.backend.repository;

import com.signbank.backend.entity.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.time.LocalDateTime;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, String> {
    List<Transaction> findByUser_UserIdOrderByTimestampDesc(String userId);
    List<Transaction> findByUser_UserIdAndTimestampAfter(String userId, LocalDateTime timestamp);
    long countByUser_UserId(String userId);
    List<Transaction> findByUser_UserIdAndTypeNot(String userId, String type);
}
