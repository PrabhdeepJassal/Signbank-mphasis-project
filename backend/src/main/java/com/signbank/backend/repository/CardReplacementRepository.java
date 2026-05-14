package com.signbank.backend.repository;

import com.signbank.backend.entity.CardReplacement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface CardReplacementRepository extends JpaRepository<CardReplacement, String> {

    @Query("SELECT r FROM CardReplacement r JOIN r.user u WHERE u.username = :username ORDER BY r.requestedAt DESC")
    List<CardReplacement> findByUsername(@Param("username") String username);

    @Query("SELECT r FROM CardReplacement r JOIN r.user u WHERE u.username = :username AND r.cardType = :cardType ORDER BY r.requestedAt DESC")
    List<CardReplacement> findByUsernameAndCardType(@Param("username") String username, @Param("cardType") String cardType);
}