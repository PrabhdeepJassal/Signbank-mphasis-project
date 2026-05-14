package com.signbank.backend.service;


import com.signbank.backend.dto.request.GestureEventRequest;
import com.signbank.backend.repository.UserRepository;
import com.signbank.backend.dto.response.GestureEventResponse;
import com.signbank.backend.entity.CommandMapping;
import com.signbank.backend.entity.Gesture;
import com.signbank.backend.entity.User;
import com.signbank.backend.exception.GestureMappingNotFoundException;
import com.signbank.backend.exception.GestureNotFoundException;
import com.signbank.backend.exception.LowConfidenceException;
import com.signbank.backend.repository.CommandMappingRepository;
import com.signbank.backend.repository.GestureRepository;
import org.springframework.stereotype.Service;

@Service
public class GestureServiceImpl implements GestureService {
	private final UserRepository userRepository;
    private final GestureRepository gestureRepository;
    private final CommandMappingRepository commandMappingRepository;
    private static String currentMode = "IDLE";
    private static double currentLimit = 5000;
    private static long lastUpdateTime = 0;
    public GestureServiceImpl(GestureRepository gestureRepository,
            CommandMappingRepository commandMappingRepository,
            UserRepository userRepository) {
this.gestureRepository = gestureRepository;
this.commandMappingRepository = commandMappingRepository;
this.userRepository = userRepository;
}
    @Override
    public GestureEventResponse handleGesture(GestureEventRequest request) {

        if (request.getConfidence() < 0.8) {
            throw new LowConfidenceException("Gesture confidence too low");
        }
        String gestureCode = request.getGestureCode();

     // 🔥 Enter SET LIMIT MODE
        if ("OPEN_PALM".equals(gestureCode) && !"SET_LIMIT".equals(currentMode)) {
            currentMode = "SET_LIMIT";
            currentLimit = 5000;

            return GestureEventResponse.success("SET_LIMIT_MODE_STARTED:" + currentLimit);
        }
  // 🔥 Handle limit adjustment
     if ("SET_LIMIT".equals(currentMode)) {
    	 if (System.currentTimeMillis() - lastUpdateTime < 500) {
    		    return GestureEventResponse.success("WAIT");
    		}
    		lastUpdateTime = System.currentTimeMillis();

         switch (gestureCode) {
         case "THUMBS_UP":

        	    currentMode = "IDLE";

        	    saveTransactionLimit("U001", currentLimit); // temp user

        	    return GestureEventResponse.success("LIMIT_SAVED:" + currentLimit);

         case "WAVE_RIGHT":
        	    currentLimit += 500;

        	    if (currentLimit > 50000) currentLimit = 50000;

        	    return GestureEventResponse.success("LIMIT_INCREASED:" + currentLimit);

         case "WAVE_LEFT":
        	    currentLimit -= 500;

        	    if (currentLimit < 0) currentLimit = 0;

        	    return GestureEventResponse.success("LIMIT_DECREASED:" + currentLimit);
         }
         
         
     }
        Gesture gesture = gestureRepository
                .findByGestureName(request.getGestureCode())
                .orElseThrow(() ->
                        new GestureNotFoundException("Gesture not found"));
        

        String roleId = "R001"; // TEMP: Operator role (replace with auth later)

        CommandMapping mapping =
                commandMappingRepository
                        .findByGesture_GestureIdAndRole_RoleId(
                                gesture.getGestureId(), roleId
                        )
                        .orElseThrow(() ->
                                new GestureMappingNotFoundException("No mapping found"));

        return GestureEventResponse.success(
                mapping.getCommand().getCommandName()
        );
    }
    public void saveTransactionLimit(String userId, Double limit) {

        // 1. Get user from DB
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // 2. Set new limit
        user.setTransactionLimit(limit);

        // 3. Save back to DB
        userRepository.save(user);
    }
}
