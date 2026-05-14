package com.signbank.backend.dto.response;


public class GestureEventResponse {

    private String resolvedCommand;
    private String status;

    public static GestureEventResponse success(String command) {
        GestureEventResponse response = new GestureEventResponse();
        response.resolvedCommand = command;
        response.status = "SUCCESS";
        return response;
    }

    public static GestureEventResponse rejected(String reason) {
        GestureEventResponse response = new GestureEventResponse();
        response.resolvedCommand = null;
        response.status = reason;
        return response;
    }

    public String getResolvedCommand() {
        return resolvedCommand;
    }

    public String getStatus() {
        return status;
    }
}

