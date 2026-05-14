package com.signbank.backend.repository;

import com.signbank.backend.entity.Card;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CardRepository extends JpaRepository<Card, String> {

    List<Card> findByUser_UserId(String userId);

    Optional<Card> findByUser_UsernameAndCardType(String username, String cardType);

    List<Card> findByUser_Username(String username);
}