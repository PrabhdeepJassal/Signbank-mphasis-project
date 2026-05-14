package com.signbank.backend.service;

import com.signbank.backend.dto.request.*;
import com.signbank.backend.dto.response.*;
import com.signbank.backend.entity.*;
import com.signbank.backend.repository.InteractionLogRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class LogService {

    private final InteractionLogRepository repository;

    public LogService(InteractionLogRepository repository) {
        this.repository = repository;
    }

    public InteractionLog saveLog(LogRequestDTO dto) {

        InteractionLog log = new InteractionLog();

        log.setInteractionId("L" + System.currentTimeMillis());

        Command command = new Command();
        command.setCommandId(dto.getCommandId());
        log.setCommand(command);

        User user = new User();
        user.setUserId(dto.getUserId());
        log.setUser(user);

        Gesture gesture = new Gesture();
        gesture.setGestureId(dto.getGestureId());
        log.setGesture(gesture);

        log.setExecutedAt(LocalDateTime.now());
        log.setStatus("success");
        log.setMetadata(dto.getMetadata());

        return repository.save(log);
    }

    public List<InteractionLog> getAllLogs() {
        return repository.findAll();
    }

    public List<LogResponseDTO> getDetailedLogs() {
        return repository.getDetailedLogs();
    }


    public List<InteractionLog> getLogsByUser(String userId) {
        return repository.getLogsByUser(userId);
    }


    public AnalyticsResponseDTO getAnalytics() {

        long total = repository.getTotalLogs();
        long activeUsers = repository.getActiveUsers();
        long successLogs = repository.getSuccessLogs();

        double successRate = (total == 0) ? 0 : ((double) successLogs / total) * 100;

        return new AnalyticsResponseDTO(total, activeUsers, successRate);
    }

    public List<InteractionLog> filterLogs(String userId, String status) {
        return repository.filterLogs(userId, status);
    }
}