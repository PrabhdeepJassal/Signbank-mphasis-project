package com.signbank.backend.repository;

import com.signbank.backend.entity.Page;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PageRepository extends JpaRepository<Page, String> {

    Optional<Page> findByPageName(String pageName);
    

    Optional<Page> findTopByOrderByPageIdDesc();
}