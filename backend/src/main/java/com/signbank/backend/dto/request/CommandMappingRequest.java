package com.signbank.backend.dto.request;

public class CommandMappingRequest {


    private String mapId;
    private String commandId;
    private String gestureId;
    private String roleId;
    private String userId;     // nullable
    private Boolean isActive;

    public String getMapId() {
        return mapId;
    }

    public void setMapId(String mapId) {
        this.mapId = mapId;
    }

    public String getCommandId() {
        return commandId;
    }

    public void setCommandId(String commandId) {
        this.commandId = commandId;
    }

    public String getGestureId() {
        return gestureId;
    }

    public void setGestureId(String gestureId) {
        this.gestureId = gestureId;
    }

    public String getRoleId() {
        return roleId;
    }

    public void setRoleId(String roleId) {
        this.roleId = roleId;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public Boolean getIsActive() {
        return isActive;
    }

    public void setIsActive(Boolean isActive) {
        this.isActive = isActive;
    }



}