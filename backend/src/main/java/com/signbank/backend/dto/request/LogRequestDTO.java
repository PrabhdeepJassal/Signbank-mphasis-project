package com.signbank.backend.dto.request;


public class LogRequestDTO {
    private String commandId;
    private String userId;
    private String gestureId;
    private String metadata;

    public LogRequestDTO(String commandId, String userId, String metadata, String gestureId) {
        this.commandId = commandId;
        this.userId = userId;
        this.metadata = metadata;
        this.gestureId = gestureId;
    }

    public String getCommandId() {
        return commandId;
    }

    public void setCommandId(String commandId) {
        this.commandId = commandId;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getGestureId() {
        return gestureId;
    }

    public void setGestureId(String gestureId) {
        this.gestureId = gestureId;
    }

    public String getMetadata() {
        return metadata;
    }

    public void setMetadata(String metadata) {
        this.metadata = metadata;
    }
}