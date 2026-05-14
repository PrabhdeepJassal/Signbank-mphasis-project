package com.signbank.backend.repository;

import com.signbank.backend.entity.CommandMapping;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CommandMappingRepository extends JpaRepository<CommandMapping, String> {

    List<CommandMapping> findByRole_RoleId(String roleId);

    List<CommandMapping> findByUser_UserId(String userId);

    List<CommandMapping> findByIsActiveTrue();

    Optional<CommandMapping> findByGesture_GestureIdAndRole_RoleId(String gestureId, String roleId);
}