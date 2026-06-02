import { useState, useRef, useCallback, useEffect } from 'react';
import apiClient from '../api/client';
import './GestureTrainingModal.css';

interface GestureTrainingModalProps {
  userId: string;
  visible: boolean;
  onClose: () => void;
}

interface GestureSlot {
  slotNumber: number;
  gestureName: string;
  gestureVector?: string;
  trained: boolean;
}

const VIDEO_W = 320;
const VIDEO_H = 240;

export default function GestureTrainingModal({ userId, visible, onClose }: GestureTrainingModalProps) {
  const [slots, setSlots] = useState<GestureSlot[]>(
    Array.from({ length: 5 }, (_, i) => ({ slotNumber: i + 1, gestureName: `Gesture ${i + 1}`, trained: false }))
  );
  const [selectedSlot, setSelectedSlot] = useState<number>(1);
  const [recording, setRecording] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [cameraActive, setCameraActive] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastVector, setLastVector] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const handsRef = useRef<any>(null);

  // Load existing gestures on open
  useEffect(() => {
    if (!visible || !userId) return;
    apiClient.get(`/api/gestures/load/${userId}`)
      .then(r => r.data)
      .then((data: any[]) => {
        if (data.length > 0) {
          const newSlots = slots.map(s => {
            const existing = data.find((g: any) => g.slotNumber === s.slotNumber);
            return existing
              ? { ...s, trained: true, gestureName: existing.gestureName, gestureVector: existing.gestureVector }
              : s;
          });
          setSlots(newSlots);
        }
      })
      .catch(() => {});
  }, [visible, userId]);

  // Start/stop camera
  useEffect(() => {
    if (!visible) {
      stopCamera();
      return;
    }
    startCamera();
    return () => stopCamera();
  }, [visible]);

  function startCamera() {
    navigator.mediaDevices.getUserMedia({ video: { width: VIDEO_W, height: VIDEO_H } })
      .then(stream => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          setCameraActive(true);
        }
        loadMediaPipe();
      })
      .catch(() => setCameraActive(false));
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraActive(false);
    if (handsRef.current) {
      try { handsRef.current.close(); } catch (e) {}
      handsRef.current = null;
    }
  }

  function loadMediaPipe() {
    if (typeof Hands !== 'undefined') {
      initHands();
      return;
    }
    const check = setInterval(() => {
      if (typeof Hands !== 'undefined') {
        clearInterval(check);
        initHands();
      }
    }, 200);
    setTimeout(() => clearInterval(check), 10000);
  }

  function initHands() {
    if (handsRef.current) return;
    const hands = new (window as any).Hands({
      locateFile: (f: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`
    });
    hands.setOptions({ maxNumHands: 2, modelComplexity: 0, minDetectionConfidence: 0.7, minTrackingConfidence: 0.6 });
    hands.onResults(onHandResults);
    handsRef.current = hands;
    processFrame();
  }

  function processFrame() {
    const video = videoRef.current;
    const hands = handsRef.current;
    if (video && hands && !video.paused && video.readyState >= 2) {
      try { hands.send({ image: video }); } catch (e) {}
    }
    requestAnimationFrame(processFrame);
  }

  function onHandResults(results: any) {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    canvas.width = VIDEO_W;
    canvas.height = VIDEO_H;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, VIDEO_W, VIDEO_H);
    ctx.drawImage(video, 0, 0, VIDEO_W, VIDEO_H);

    const landmarks = results.multiHandLandmarks?.[0];
    if (landmarks) {
      // Draw landmarks
      ctx.fillStyle = '#00e676';
      ctx.strokeStyle = '#00e676';
      ctx.lineWidth = 2;
      const connections = (window as any).HAND_CONNECTIONS;
      if (connections) {
        connections.forEach(([i, j]: [number, number]) => {
          ctx.beginPath();
          ctx.moveTo(landmarks[i].x * VIDEO_W, landmarks[i].y * VIDEO_H);
          ctx.lineTo(landmarks[j].x * VIDEO_W, landmarks[j].y * VIDEO_H);
          ctx.stroke();
        });
      }
      landmarks.forEach((p: any) => {
        ctx.beginPath();
        ctx.arc(p.x * VIDEO_W, p.y * VIDEO_H, 4, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Draw countdown overlay
    if (countdown > 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 0, VIDEO_W, VIDEO_H);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 72px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(countdown), VIDEO_W / 2, VIDEO_H / 2);
    }

    // Capture vector if recording and countdown finished
    if (recording && countdown === 0 && landmarks) {
      const vector = landmarks.map((p: any) => `${p.x},${p.y},${p.z || 0}`).join(',');
      setLastVector(vector);
    }
  }

  function startRecording() {
    if (recording) return;
    setRecording(true);
    setLastVector(null);
    setCountdown(3);
    let c = 3;
    const timer = setInterval(() => {
      c--;
      setCountdown(c);
      if (c <= 0) {
        clearInterval(timer);
        setRecording(false);
        // Capture happens in onHandResults
        setFeedback('Gesture captured! Click Save to store it.');
      }
    }, 1000);
  }

  async function saveGesture() {
    if (!lastVector || saving) return;
    setSaving(true);
    try {
      await apiClient.post('/api/gestures/upsert', {
        userId,
        slotNumber: selectedSlot,
        gestureName: slots[selectedSlot - 1].gestureName,
        gestureVector: lastVector
      });
      const newSlots = [...slots];
      newSlots[selectedSlot - 1] = { ...newSlots[selectedSlot - 1], trained: true };
      setSlots(newSlots);
      setFeedback('✅ Gesture saved successfully!');
    } catch (e) {
      setFeedback('❌ Failed to save gesture');
    } finally {
      setSaving(false);
    }
  }

  async function deleteGesture(slotNumber: number) {
    try {
      await apiClient.delete(`/api/gestures/delete/${userId}/${slotNumber}`);
      const newSlots = [...slots];
      newSlots[slotNumber - 1] = { ...newSlots[slotNumber - 1], trained: false, gestureName: `Gesture ${slotNumber}`, gestureVector: undefined };
      setSlots(newSlots);
      setFeedback(`🗑️ Gesture ${slotNumber} deleted`);
    } catch (e) {
      setFeedback('❌ Failed to delete gesture');
    }
  }

  if (!visible) return null;

  return (
    <div className="gt-modal-backdrop" onClick={onClose}>
      <div className="gt-modal" onClick={e => e.stopPropagation()}>
        <button className="gt-close" onClick={onClose}>✕</button>
        <h2 className="gt-title">🎯 Train My Gestures</h2>
        <p className="gt-subtitle">Create up to 5 custom hand gestures for transaction approval</p>

        <div className="gt-main">
          {/* Camera */}
          <div className="gt-camera-section">
            <div className="gt-camera-container">
              <video ref={videoRef} className="gt-video" playsInline muted />
              <canvas ref={canvasRef} className="gt-canvas" />
              {!cameraActive && <div className="gt-camera-off">Camera access required</div>}
            </div>
            <button
              className="gt-record-btn"
              onClick={startRecording}
              disabled={recording || !cameraActive}
            >
              {recording ? `⏳ ${countdown > 0 ? `${countdown}s` : 'Capturing...'}` : '🔴 Record'}
            </button>
          </div>

          {/* Slots */}
          <div className="gt-slots-section">
            <h3>Your Gesture Slots</h3>
            <div className="gt-slots-grid">
              {slots.map(slot => (
                <div
                  key={slot.slotNumber}
                  className={`gt-slot ${selectedSlot === slot.slotNumber ? 'active' : ''} ${slot.trained ? 'trained' : ''}`}
                  onClick={() => setSelectedSlot(slot.slotNumber)}
                >
                  <div className="gt-slot-number">{slot.slotNumber}</div>
                  <div className="gt-slot-name">{slot.gestureName}</div>
                  <div className="gt-slot-status">{slot.trained ? '✅ Trained' : '⬜ Empty'}</div>
                  {slot.trained && (
                    <button
                      className="gt-slot-delete"
                      onClick={e => { e.stopPropagation(); deleteGesture(slot.slotNumber); }}
                      title="Delete gesture"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="gt-actions">
              <button
                className="gt-save-btn"
                onClick={saveGesture}
                disabled={!lastVector || saving}
              >
                {saving ? '💾 Saving...' : '💾 Save Gesture'}
              </button>
            </div>

            {feedback && <div className="gt-feedback">{feedback}</div>}
          </div>
        </div>

        <div className="gt-instructions">
          <strong>How to train:</strong> Select a slot → Show your hand to the camera → Click Record → Hold your pose for 3 seconds → Click Save
        </div>
      </div>
    </div>
  );
}
