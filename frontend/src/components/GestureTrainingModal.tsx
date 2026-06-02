import { useState, useRef, useEffect } from 'react';
import apiClient from '../api/client';
import './GestureTrainingModal.css';
import type { GestureEvent } from '../hooks/useGestureControl';

interface GestureTrainingModalProps {
  userId: string;
  visible: boolean;
  onClose: () => void;
  onGestureEvent?: (evt: GestureEvent) => void;
}

interface GestureSlot {
  slotNumber: number;
  gestureName: string;
  gestureVector?: string;
  trained: boolean;
}

const VIDEO_W = 320;
const VIDEO_H = 240;

type ModalState = 'idle' | 'countdown' | 'captured' | 'saving' | 'saved';

export default function GestureTrainingModal({ userId, visible, onClose }: GestureTrainingModalProps) {
  const [slots, setSlots] = useState<GestureSlot[]>(
    Array.from({ length: 5 }, (_, i) => ({ slotNumber: i + 1, gestureName: `Gesture ${i + 1}`, trained: false }))
  );
  const [selectedSlot, setSelectedSlot] = useState<number>(1);
  const [modalState, setModalState] = useState<ModalState>('idle');
  const [countdown, setCountdown] = useState(0);
  const [cameraActive, setCameraActive] = useState(false);
  const [lastVector, setLastVector] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [gestureHint, setGestureHint] = useState<string>('Show 3 fingers to open training');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const handsRef = useRef<any>(null);
  const animRef = useRef(0);

  // Load existing gestures on open + pre-fill slots with system gestures
  useEffect(() => {
    if (!visible || !userId) return;
    setModalState('idle');
    setLastVector(null);
    setFeedback(null);
    setSelectedSlot(1);

    // Fetch system gestures (G001-G005) to name slots, then overlay user's saved gestures
    Promise.all([
      apiClient.get('/api/admin/gestures').then(r => r.data).catch(() => []),
      apiClient.get(`/api/gestures/load/${userId}`).then(r => r.data).catch(() => [])
    ]).then(([systemGestures, userGestures]) => {
      const namedSlots = systemGestures.slice(0, 5).map((g: any, i: number) => ({
        slotNumber: i + 1,
        gestureName: g.gestureName,
        trained: false,
        gestureVector: undefined as string | undefined
      }));
      while (namedSlots.length < 5) {
        namedSlots.push({ slotNumber: namedSlots.length + 1, gestureName: `Gesture ${namedSlots.length + 1}`, trained: false });
      }
      // Overlay user's saved gestures
      if (userGestures.length > 0) {
        userGestures.forEach((ug: any) => {
          const idx = namedSlots.findIndex(s => s.slotNumber === ug.slotNumber);
          if (idx >= 0) {
            namedSlots[idx] = { ...namedSlots[idx], trained: true, gestureVector: ug.gestureVector };
          }
        });
      }
      setSlots(namedSlots);
    });
  }, [visible, userId]);

  // Start/stop camera
  useEffect(() => {
    if (!visible) { stopCamera(); return; }
    startCamera();
    return () => stopCamera();
  }, [visible]);

  // Listen for gesture events from parent dashboard via custom event
  useEffect(() => {
    if (!visible) return;
    const handler = (e: Event) => {
      const evt = (e as CustomEvent).detail as GestureEvent;
      handleGesture(evt);
    };
    // Also add keyboard shortcuts for dev/testing
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key >= '1' && e.key <= '5') handleGesture({ type: 'DIGIT', value: e.key });
      else if (e.key === 'r') handleGesture({ type: 'THUMB_UP', confidence: 100 });
      else if (e.key === 'd') handleGesture({ type: 'THUMB_DOWN', confidence: 100 });
      else if (e.key === 's') handleGesture({ type: 'OPEN_PALM', confidence: 100 });
      else if (e.key === 'Escape') handleGesture({ type: 'FIST', confidence: 100 });
    };
    window.addEventListener('training-gesture', handler);
    window.addEventListener('keydown', keyHandler);
    return () => {
      window.removeEventListener('training-gesture', handler);
      window.removeEventListener('keydown', keyHandler);
    };
  }, [visible, selectedSlot, lastVector, modalState, slots]);

  // ── Gesture handler — the core of click-free interaction ──
  function handleGesture(evt: GestureEvent) {
    if (!visible) return;

    // DIGIT events: select slot (1-5)
    if (evt.type === 'DIGIT') {
      const slot = parseInt(evt.value);
      if (slot >= 1 && slot <= 5) {
        setSelectedSlot(slot);
        setFeedback(`🎯 Slot ${slot} selected`);
        setModalState('idle');
        setLastVector(null);
        setTimeout(() => setFeedback(null), 1500);
      }
      return;
    }

    // GESTURE_ID events from the camera system
    if (evt.type === 'GESTURE_ID') {
      const gid = evt.id;
      const digitMatch = gid?.match(/G00(\d)/);
      if (digitMatch) {
        const num = parseInt(digitMatch[1]);
        if (num >= 1 && num <= 5) {
          setSelectedSlot(num);
          setFeedback(`🎯 Slot ${num} selected`);
          setModalState('idle');
          setLastVector(null);
          setTimeout(() => setFeedback(null), 1500);
          return;
        }
      }
      // G006 = Thumbs Up → record
      if (gid === 'G006') {
        startRecording();
        return;
      }
      // G007 = Thumbs Down → delete
      if (gid === 'G007') {
        deleteGesture(selectedSlot);
        return;
      }
      // G005 = Open Palm → save
      if (gid === 'G005' && lastVector) {
        saveGesture();
        return;
      }
      // G008 = Fist → close
      if (gid === 'G008') {
        onClose();
        return;
      }
      return;
    }

    // Named gesture types
    if (evt.type === 'THUMB_UP') {
      startRecording();
      return;
    }
    if (evt.type === 'THUMB_DOWN') {
      deleteGesture(selectedSlot);
      return;
    }
    if (evt.type === 'OPEN_PALM' && lastVector) {
      saveGesture();
      return;
    }
    if (evt.type === 'FIST') {
      onClose();
      return;
    }
  }

  // ── Camera ──
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
    cancelAnimationFrame(animRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraActive(false);
    if (handsRef.current) { try { handsRef.current.close(); } catch (e) {} handsRef.current = null; }
  }

  function loadMediaPipe() {
    if (typeof Hands !== 'undefined') { initHands(); return; }
    const check = setInterval(() => {
      if (typeof Hands !== 'undefined') { clearInterval(check); initHands(); }
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
    const v = videoRef.current;
    const h = handsRef.current;
    if (v && h && !v.paused && v.readyState >= 2) { try { h.send({ image: v }); } catch (e) {} }
    animRef.current = requestAnimationFrame(processFrame);
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
      const connections = (window as any).HAND_CONNECTIONS;
      ctx.strokeStyle = '#00e676'; ctx.lineWidth = 2;
      if (connections) connections.forEach(([i, j]: [number, number]) => {
        ctx.beginPath();
        ctx.moveTo(landmarks[i].x * VIDEO_W, landmarks[i].y * VIDEO_H);
        ctx.lineTo(landmarks[j].x * VIDEO_W, landmarks[j].y * VIDEO_H);
        ctx.stroke();
      });
      ctx.fillStyle = '#00e676';
      landmarks.forEach((p: any) => { ctx.beginPath(); ctx.arc(p.x * VIDEO_W, p.y * VIDEO_H, 4, 0, Math.PI * 2); ctx.fill(); });

      // Countdown overlay
      if (modalState === 'countdown' && countdown > 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, VIDEO_W, VIDEO_H);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 72px system-ui';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(countdown), VIDEO_W / 2, VIDEO_H / 2);
      }

      // Capture when countdown reaches 0
      if (modalState === 'countdown' && countdown === 0) {
        const vector = landmarks.map((p: any) => `${p.x},${p.y},${p.z || 0}`).join(',');
        setLastVector(vector);
        setModalState('captured');
        setFeedback('✋ Gesture captured! Show Open Palm (5 fingers) to save.');
      }
    }
  }

  function startRecording() {
    if (modalState === 'countdown' || modalState === 'saving') return;
    setModalState('countdown');
    setLastVector(null);
    setFeedback('⏳ Hold your pose...');
    let c = 3;
    setCountdown(c);
    const timer = setInterval(() => {
      c--;
      setCountdown(c);
      if (c <= 0) { clearInterval(timer); }
    }, 1000);
  }

  async function saveGesture() {
    if (!lastVector || modalState === 'saving') return;
    setModalState('saving');
    setFeedback('💾 Saving...');
    try {
      await apiClient.post('/api/gestures/upsert', {
        userId, slotNumber: selectedSlot,
        gestureName: slots[selectedSlot - 1].gestureName,
        gestureVector: lastVector
      });
      setSlots(prev => {
        const n = [...prev];
        n[selectedSlot - 1] = { ...n[selectedSlot - 1], trained: true };
        return n;
      });
      setModalState('saved');
      setFeedback(`✅ Gesture ${selectedSlot} saved! Show another finger to select a different slot.`);
    } catch (e) {
      setModalState('idle');
      setFeedback('❌ Save failed. Try again.');
    }
  }

  async function deleteGesture(slotNumber: number) {
    try {
      await apiClient.delete(`/api/gestures/delete/${userId}/${slotNumber}`);
      setSlots(prev => {
        const n = [...prev];
        n[slotNumber - 1] = { ...n[slotNumber - 1], trained: false, gestureName: `Gesture ${slotNumber}`, gestureVector: undefined };
        return n;
      });
      setFeedback(`🗑️ Gesture ${slotNumber} deleted`);
      setTimeout(() => setFeedback(null), 2000);
    } catch (e) {
      setFeedback('❌ Delete failed');
    }
  }

  if (!visible) return null;

  // Gesture guide based on current state
  const gestureGuide = modalState === 'idle'
    ? '👆 1-5 fingers = select slot  |  👍 = record  |  👎 = delete  |  ✊ = close'
    : modalState === 'countdown'
    ? '⏳ Hold your hand still...'
    : modalState === 'captured'
    ? '✋ Open Palm (5 fingers) = save  |  👎 = discard'
    : modalState === 'saving'
    ? '💾 Saving...'
    : '✅ Done! Select another slot or ✊ to close';

  return (
    <div className="gt-modal-backdrop" onClick={onClose}>
      <div className="gt-modal" onClick={e => e.stopPropagation()}>
        <div className="gt-close-icon" onClick={onClose}>✕</div>
        <h2 className="gt-title">🎯 Gesture Training</h2>
        <p className="gt-subtitle">Use gestures to control everything — no clicking needed</p>

        <div className="gt-main">
          {/* Camera */}
          <div className="gt-camera-section">
            <div className="gt-camera-container">
              <video ref={videoRef} className="gt-video" playsInline muted />
              <canvas ref={canvasRef} className="gt-canvas" />
              {!cameraActive && <div className="gt-camera-off">Camera access required</div>}
            </div>
          </div>

          {/* Slots — show finger count as gesture hint */}
          <div className="gt-slots-section">
            <h3>Your Gesture Slots</h3>
            <div className="gt-slots-grid">
              {slots.map(slot => (
                <div
                  key={slot.slotNumber}
                  className={`gt-slot ${selectedSlot === slot.slotNumber ? 'active' : ''} ${slot.trained ? 'trained' : ''} ${modalState === 'idle' ? 'gesture-selectable' : ''}`}
                >
                  <div className="gt-slot-number">{slot.slotNumber}</div>
                  <div className="gt-slot-info">
                    <div className="gt-slot-name">{slot.gestureName}</div>
                    <div className="gt-slot-status">
                      {slot.trained ? '✅ Trained' : '⬜ Empty'}
                      {selectedSlot === slot.slotNumber && modalState === 'captured' && lastVector && <span className="gt-just-captured"> ✋ Captured!</span>}
                    </div>
                  </div>
                  {selectedSlot === slot.slotNumber && (
                    <div className="gt-slot-indicator">👈</div>
                  )}
                </div>
              ))}
            </div>

            {/* Gesture hint bar */}
            <div className="gt-gesture-hint">{gestureGuide}</div>

            {feedback && <div className="gt-feedback">{feedback}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
