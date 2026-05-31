import { useCallback, useEffect, useRef, useState } from 'react';
import GestureCamera from '../GestureCamera/GestureCamera';
import type { HandData } from '../../hooks/useGestureControl';
import type { LandmarkPoint } from '../../api/gestureApi';
import { getTrainedGestures, saveTrainedGesture } from '../../api/trainedGestureApi';
import type { TrainedGesture } from '../../types';
import './TrainGestureModal.css';

interface Props {
  userId: string;
  onClose: () => void;
  onTrained: () => void;
}

type RecordState = 'idle' | 'countdown' | 'capturing' | 'saving' | 'done';

const SLOTS = [
  { slot: 1, label: 'Check Balance' },
  { slot: 2, label: 'Check Cards' },
  { slot: 3, label: 'Set Transaction Limit' },
  { slot: 4, label: 'Logout' },
  { slot: 5, label: 'Custom Action' },
];

const STABLE_FRAMES = 8;

function averageLandmarks(frames: LandmarkPoint[][]): LandmarkPoint[] {
  const avg: LandmarkPoint[] = [];
  for (let i = 0; i < 21; i++) {
    let x = 0, y = 0, z = 0, count = 0;
    for (const frame of frames) {
      if (frame[i]) {
        x += frame[i].x;
        y += frame[i].y;
        z += frame[i].z;
        count++;
      }
    }
    avg.push({
      x: count > 0 ? x / count : 0,
      y: count > 0 ? y / count : 0,
      z: count > 0 ? z / count : 0,
    });
  }
  return avg;
}

export default function TrainGestureModal({ userId, onClose, onTrained }: Props) {
  const [slots, setSlots] = useState<TrainedGesture[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [recordState, setRecordState] = useState<RecordState>('idle');
  const [countdownValue, setCountdownValue] = useState(3);
  const [statusMessage, setStatusMessage] = useState('');
  const [autoTriggeredSlot, setAutoTriggeredSlot] = useState<number | null>(null);
  const collectedFrames = useRef<LandmarkPoint[][]>([]);
  const captureTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const handStableCount = useRef(0);
  const hadHands = useRef(false);

  useEffect(() => {
    getTrainedGestures(userId).then(setSlots).catch(() => {});
  }, [userId]);

  const cleanupCapture = useCallback(() => {
    if (countdownInterval.current) {
      clearInterval(countdownInterval.current);
      countdownInterval.current = null;
    }
    if (captureTimeout.current) {
      clearTimeout(captureTimeout.current);
      captureTimeout.current = null;
    }
    collectedFrames.current = [];
    handStableCount.current = 0;
    hadHands.current = false;
    setRecordState('idle');
    setCountdownValue(3);
    setAutoTriggeredSlot(null);
  }, []);

  useEffect(() => {
    return () => {
      if (countdownInterval.current) clearInterval(countdownInterval.current);
      if (captureTimeout.current) clearTimeout(captureTimeout.current);
    };
  }, []);

  useEffect(() => {
    if (recordState === 'done') {
      const timer = setTimeout(cleanupCapture, 2500);
      return () => clearTimeout(timer);
    }
  }, [recordState, cleanupCapture]);

  const handleLandmarks = useCallback((hands: HandData[]) => {
    const slot = selectedSlot;
    if (slot === null) return;
    if (recordState !== 'idle' && recordState !== 'countdown' && recordState !== 'capturing') return;

    const hasHands = hands.length > 0;

    if (recordState === 'idle') {
      if (hasHands) {
        hadHands.current = true;
        handStableCount.current++;
        if (handStableCount.current >= STABLE_FRAMES) {
          handStableCount.current = 0;
          setAutoTriggeredSlot(slot);
          setRecordState('countdown');
          setCountdownValue(3);
          collectedFrames.current = [];

          let count = 3;
          countdownInterval.current = setInterval(() => {
            count--;
            if (count > 0) {
              setCountdownValue(count);
            } else {
              if (countdownInterval.current) clearInterval(countdownInterval.current);
              countdownInterval.current = null;
              setRecordState('capturing');
              setCountdownValue(0);

              captureTimeout.current = setTimeout(async () => {
                setRecordState('saving');
                setStatusMessage('Saving your gesture...');

                const frames = collectedFrames.current;
                if (frames.length < 5) {
                  setStatusMessage('No hand detected. Try again.');
                  setRecordState('done');
                  return;
                }

                const avg = averageLandmarks(frames);
                const s = SLOTS.find(x => x.slot === slot);
                try {
                  await saveTrainedGesture({
                    userId,
                    slotNumber: slot,
                    slotLabel: s?.label ?? `Slot ${slot}`,
                    landmarks: avg,
                  });
                  setStatusMessage('Gesture saved successfully!');
                  const updated = await getTrainedGestures(userId);
                  setSlots(updated);
                  onTrained();
                } catch {
                  setStatusMessage('Failed to save. Please try again.');
                }
                setRecordState('done');
              }, 1000);
            }
          }, 1000);
        }
      } else {
        handStableCount.current = 0;
        hadHands.current = false;
      }
      return;
    }

    if (recordState === 'capturing') {
      if (hasHands) {
        collectedFrames.current.push(hands[0].landmarks);
      }
      return;
    }

    if (recordState === 'countdown') {
      if (!hasHands) {
        cleanupCapture();
        setSelectedSlot(null);
      }
    }
  }, [selectedSlot, recordState, userId, onTrained, cleanupCapture]);

  const handleSlotClick = (slotNumber: number) => {
    if (recordState === 'saving' || recordState === 'countdown' || recordState === 'capturing') return;
    cleanupCapture();
    setSelectedSlot(slotNumber === selectedSlot ? null : slotNumber);
  };

  const getSlotStatus = (slot: number): TrainedGesture | undefined =>
    slots.find(s => s.slotNumber === slot);

  return (
    <div className="train-gesture-backdrop" onClick={onClose}>
      <div className="train-gesture-modal" onClick={e => e.stopPropagation()}>
        <div className="train-gesture-header">
          <h2>Train My Gestures</h2>
          <button className="train-gesture-close" onClick={onClose}>✕</button>
        </div>

        <div className="train-gesture-body">
          <div className="train-gesture-camera-section">
            <div className="train-gesture-camera-wrapper">
              <GestureCamera
                onLandmarks={handleLandmarks}
                key={selectedSlot ?? 'none'}
              />
              {(recordState === 'countdown' || recordState === 'capturing') && (
                <div className="train-gesture-overlay">
                  {recordState === 'countdown' && (
                    <div className="countdown-display">{countdownValue}</div>
                  )}
                  {recordState === 'capturing' && (
                    <div className="capture-indicator">
                      <div className="capture-ring" />
                      <span>Capturing pose...</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            {selectedSlot && recordState === 'idle' && (
              <div className="train-gesture-waiting">
                Show your hand to start recording slot {selectedSlot}
              </div>
            )}
          </div>

          <div className="train-gesture-slots-section">
            <p className="train-gesture-subtitle">
              Tap a slot, then show your hand to record.
            </p>

            <div className="train-gesture-slots">
              {SLOTS.map(slot => {
                const status = getSlotStatus(slot.slot);
                const isSelected = selectedSlot === slot.slot;
                const isRecording = isSelected && (recordState === 'countdown' || recordState === 'capturing' || recordState === 'saving');

                return (
                  <div
                    key={slot.slot}
                    className={`train-gesture-slot ${status?.trained ? 'trained' : ''} ${isSelected ? 'selected' : ''} ${isRecording ? 'recording' : ''}`}
                    onClick={() => handleSlotClick(slot.slot)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') handleSlotClick(slot.slot); }}
                  >
                    <div className="slot-info">
                      <div className="slot-number">{slot.slot}</div>
                      <div className="slot-details">
                        <div className="slot-label">{slot.label}</div>
                        <div className={`slot-status ${status?.trained ? 'trained' : 'empty'}`}>
                          {status?.trained ? '● Trained' : '○ Empty'}
                        </div>
                      </div>
                    </div>
                    {isRecording && recordState === 'countdown' && (
                      <span className="slot-countdown-overlay">{countdownValue}</span>
                    )}
                  </div>
                );
              })}
            </div>

            {recordState === 'done' && (
              <div className={`train-gesture-status ${statusMessage.includes('successfully') ? 'success' : 'error'}`}>
                {statusMessage}
              </div>
            )}

            <p className="train-gesture-hint">
              Tap a slot to select it, then hold a steady one-handed pose in view.
              The recording starts automatically.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
