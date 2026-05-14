package com.signbank.backend.service;


import com.signbank.backend.dto.request.GestureEventRequest;
import com.signbank.backend.dto.response.GestureEventResponse;

public interface GestureService {

    GestureEventResponse handleGesture(GestureEventRequest request);
}
