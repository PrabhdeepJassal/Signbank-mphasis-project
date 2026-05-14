package com.signbank.backend.repository;

import com.signbank.backend.entity.Command;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CommandRepository extends JpaRepository<Command, String> {

    Optional<Command> findByCommandName(String commandName);
}