import { useEffect, useRef, useCallback } from 'react';

interface SOSConfig {
  /** EAR threshold below which eye is considered closed (default: 0.22) */
  earThreshold?: number;
  /** Max time (ms) for 3 blinks to count as SOS (default: 2000) */
  sosWindow?: number;
  /** Min time (ms) an eye must stay closed to count as a blink (default: 100) */
  minBlinkDuration?: number;
  /** Callback when SOS is triggered */
  onSOS: () => void;
  /** Whether SOS detection is active */
  enabled?: boolean;
}

/**
 * Hook that detects SOS distress signal — 3 rapid eye blinks within 2 seconds.
 * Uses Eye Aspect Ratio (EAR) from the MediaPipe face landmarks.
 *
 * @example
 * useSOSDetection({
 *   onSOS: () => { window.location.href = '/sos'; },
 *   enabled: isCameraActive
 * });
 */
export function useSOSDetection({
  earThreshold = 0.22,
  sosWindow = 2000,
  minBlinkDuration = 100,
  onSOS,
  enabled = true,
}: SOSConfig) {
  const blinkTimestamps = useRef<number[]>([]);
  const eyeClosedStart = useRef<number | null>(null);
  const lastChecked = useRef<number>(0);
  const sosTriggered = useRef(false);

  const processEAR = useCallback((ear: number, timestamp: number) => {
    if (!enabled || sosTriggered.current) return;

    const isClosed = ear < earThreshold;

    if (isClosed) {
      // Eye just closed — record the time
      if (eyeClosedStart.current === null) {
        eyeClosedStart.current = timestamp;
      }
    } else {
      // Eye opened — check if this was a valid blink
      if (eyeClosedStart.current !== null) {
        const blinkDuration = timestamp - eyeClosedStart.current;
        eyeClosedStart.current = null;

        // Only count if the eye was closed long enough to be a deliberate blink
        // but not too long (avoid false triggers from staring)
        if (blinkDuration >= minBlinkDuration && blinkDuration < 800) {
          const now = performance.now();
          blinkTimestamps.current.push(now);

          // Remove blinks outside the SOS window
          const cutoff = now - sosWindow;
          blinkTimestamps.current = blinkTimestamps.current.filter(t => t > cutoff);

          // Check for SOS pattern: 3+ blinks within the window
          if (blinkTimestamps.current.length >= 3) {
            sosTriggered.current = true;
            onSOS();

            // Reset after a delay so it can trigger again later
            setTimeout(() => {
              sosTriggered.current = false;
              blinkTimestamps.current = [];
            }, 5000);
          }
        }
      }
    }

    lastChecked.current = timestamp;
  }, [earThreshold, sosWindow, minBlinkDuration, onSOS, enabled]);

  /**
   * Submit an EAR value from face tracking. Call this on every frame.
   */
  const submitEAR = useCallback((ear: number) => {
    const now = performance.now();
    // Throttle to ~30fps max
    if (now - lastChecked.current < 33) return;
    processEAR(ear, now);
  }, [processEAR]);

  /**
   * Reset the SOS state manually.
   */
  const resetSOS = useCallback(() => {
    sosTriggered.current = false;
    blinkTimestamps.current = [];
    eyeClosedStart.current = null;
  }, []);

  return { submitEAR, resetSOS };
}
