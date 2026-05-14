package com.signbank.backend.controller;

import com.signbank.backend.dto.request.*;
import com.signbank.backend.dto.response.*;
import com.signbank.backend.entity.InteractionLog;
import com.signbank.backend.service.LogService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/logs")
public class LogController {

    private final LogService service;

    public LogController(LogService service) {
        this.service = service;
    }

    @PostMapping
    public InteractionLog createLog(@RequestBody LogRequestDTO dto) {
        return service.saveLog(dto);
    }

    @GetMapping
    public List<InteractionLog> getLogs() {
        return service.getAllLogs();
    }

    @GetMapping("/detailed")
    public List<LogResponseDTO> getDetailedLogs() {
        return service.getDetailedLogs();
    }



    @GetMapping("/user/{userId}")
    public List<InteractionLog> getLogsByUser(@PathVariable String userId) {
        return service.getLogsByUser(userId);
    }


    @GetMapping("/analytics")
    public AnalyticsResponseDTO getAnalytics() {
        return service.getAnalytics();
    }

    @GetMapping("/filter")
    public List<InteractionLog> filterLogs(
            @RequestParam(required = false) String userId,
            @RequestParam(required = false) String status
    ) {
        return service.filterLogs(userId, status);
    }
}