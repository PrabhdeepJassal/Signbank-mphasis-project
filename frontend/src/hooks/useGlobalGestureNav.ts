import { useCallback, useEffect, useRef } from 'react';
import type { GestureEvent } from './useGestureControl';

export interface GestureButton {
  id: string;
  gestureId?:   string; // G001-G005 for finger counts
  gestureType?: 'THUMB_UP' | 'THUMB_DOWN' | 'FIST' | 'ROCK' | 'OK' | 'OPEN_PALM';
  action: () => void;
  label:  string;
}

export interface UseGlobalGestureNavOptions {
  buttons:  GestureButton[];
  enabled?: boolean;
}

/**
 * Hook to map gestures to button actions globally.
 * Supports finger-count gestures (G001–G005) and named gesture types
 * including the new OPEN_PALM gesture used for the dynamic back transition.
 */
export function useGlobalGestureNav({ buttons, enabled = true }: UseGlobalGestureNavOptions) {
  const buttonsRef = useRef(buttons);
  const enabledRef = useRef(enabled);

  useEffect(() => { buttonsRef.current = buttons; }, [buttons]);
  useEffect(() => { enabledRef.current = enabled; }, [enabled]);

  const handleGesture = useCallback((evt: GestureEvent) => {
    if (!enabledRef.current) return;

    const currentButtons = buttonsRef.current;

    // Match by gesture ID (G001-G005 from finger count)
    if (evt.type === 'GESTURE_ID') {
      const btn = currentButtons.find(b => b.gestureId === evt.id);
      if (btn) {
        console.log(`Gesture ${evt.id} triggered: ${btn.label}`);
        btn.action();
        return;
      }
    }

    // Match by gesture type (THUMB_UP, FIST, OPEN_PALM, etc.)
    if (evt.type !== 'DIGIT' && evt.type !== 'GESTURE_ID') {
      const btn = currentButtons.find(b => b.gestureType === evt.type);
      if (btn) {
        console.log(`Gesture ${evt.type} triggered: ${btn.label}`);
        btn.action();
        return;
      }
    }
  }, []);

  return { handleGesture };
}
