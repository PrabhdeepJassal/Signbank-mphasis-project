package com.signbank.backend.mapper;

import com.signbank.backend.dto.response.*;
import com.signbank.backend.entity.*;

public class AdminMapper {
	
	
    public static UserResponse toUserResponse(User user) {
        UserResponse dto = new UserResponse();
        dto.setUserId(user.getUserId());
        dto.setUsername(user.getUsername());
        dto.setEmail(user.getEmail());
        dto.setRoleId(user.getRole().getRoleId());
        dto.setRoleName(user.getRole().getRoleName());
        dto.setCreatedAt(user.getCreatedAt());
        
        dto.setPasswordSet(user.getPasswordHash() != null);
        return dto;
    }

    public static GestureResponse toGestureResponse(Gesture gesture) {
        GestureResponse dto = new GestureResponse();
        dto.setGestureId(gesture.getGestureId());
        dto.setGestureName(gesture.getGestureName());
        dto.setGestureSymbol(gesture.getGestureSymbol());
        return dto;
    }

    public static CommandMappingResponse toMappingResponse(CommandMapping mapping) {
        CommandMappingResponse dto = new CommandMappingResponse();
        dto.setMapId(mapping.getMapId());
        dto.setCommandId(mapping.getCommand().getCommandId());
        dto.setCommandName(mapping.getCommand().getCommandName());
        dto.setGestureId(mapping.getGesture().getGestureId());
        dto.setGestureName(mapping.getGesture().getGestureName());
        dto.setRoleId(mapping.getRole().getRoleId());
        dto.setRoleName(mapping.getRole().getRoleName());
        dto.setUserId(mapping.getUser() != null ? mapping.getUser().getUserId() : null);
        dto.setIsActive(mapping.getIsActive());
        return dto;
    }
}