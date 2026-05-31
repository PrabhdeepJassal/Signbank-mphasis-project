import { useEffect, useRef } from 'react';
import { getAverageEyeAspectRatio } from '../utils/eyeAspectRatio';

export type GestureEvent =
  | { type: 'DIGIT'; value: string; hand?: number }
  | { type: 'THUMB_UP'; confidence?: number; hand?: number }
  | { type: 'THUMB_DOWN'; confidence?: number; hand?: number }
  | { type: 'FIST'; confidence?: number; hand?: number }
  | { type: 'ROCK'; confidence?: number; hand?: number }
  | { type: 'OK'; confidence?: number; hand?: number }
  | { type: 'OPEN_PALM'; confidence?: number; hand?: number }
  | { type: 'BACK_DYNAMIC'; confidence?: number }
  | { type: 'BOTH_THUMBS_DOWN'; confidence?: number }
  | { type: 'GESTURE_ID'; id: string; confidence?: number; hand?: number }
  | { type: 'SLIDER_ACTIVE'; normX: number }
  | { type: 'SLIDER_COMMIT' };

export type LandmarkPoint = { x: number; y: number; z: number };
export type HandData = { landmarks: LandmarkPoint[]; label: string; fingers: number };

export interface UseGestureControlOptions {
  onGesture: (event: GestureEvent) => void;
  onLandmarks?: (hands: HandData[]) => void;
  enabled?: boolean;
  sliderMode?: boolean;
}

const FINGER_TO_GESTURE_ID: Record<string, string> = {
  '1': 'G001', '2': 'G002', '3': 'G003', '4': 'G004', '5': 'G005',
  '6': 'G001', '7': 'G002', '8': 'G003', '9': 'G004', '10': 'G005',
};
const RAW_TO_EMOJI: Record<string, string> = {
  THUMB_UP: '👍', THUMB_DOWN: '👎', FIST: '✊', ROCK: '🤘', OK: '👌', OPEN_PALM: '🖐️',
  '0': '✊', '1': '☝️', '2': '✌️', '3': '🤌', '4': '🤘', '5': '🖐️',
  '6': '🖐️☝️', '7': '🖐️✌️', '8': '🖐️🤌', '9': '🖐️🤘', '10': '🖐️🖐️',
};

const BUFFER_SIZE = 20;
const CONFIRM_COUNT = 16;
const COOLDOWN_MS = 2200;
const ROCK_HOLD_MS = 700;
const PINCH_LOCK_THRESHOLD = 0.065;
const PINCH_UNLOCK_THRESHOLD = 0.085;
const PINCH_DEADZONE = 30;
const SCROLL_CONTAINER_REQUERY_INTERVAL = 30;

declare const Hands: any;
declare const FaceMesh: any;
declare const HAND_CONNECTIONS: any;
declare const drawConnectors: any;
declare const drawLandmarks: any;

const HAND_COLORS = ['#00e676', '#40c4ff'];
const HAND_LABELS = ['Right', 'Left'];
const EYE_CLOSED_EAR_THRESHOLD = 0.19;
const EYE_CLOSED_LOCK_CONFIRM_MS = 2500;

type SecurityState = 'NORMAL' | 'WARNING' | 'LOCKED';

let securityOverlayRemovalTimer: ReturnType<typeof setTimeout> | null = null;

function calcConfidence(buffer: string[], current: string): number {
  if (!buffer.length) return 0;
  const matching = buffer.filter(g => g === current).length;
  return Math.round((matching / buffer.length) * 100);
}



function drawSlider(ctx: CanvasRenderingContext2D, normX: number, _wristYpx: number, W: number, H: number, _rawX: number, _smoothX: number) {
  const PAD = 50, left = PAD, right = W - PAD, trackY = H - 60, thumbX = left + normX * (right - left);
  ctx.save(); ctx.globalAlpha = .35; ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 12; ctx.lineCap = 'round';
  ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = 8; ctx.beginPath(); ctx.moveTo(left, trackY); ctx.lineTo(right, trackY); ctx.stroke();
  ctx.globalAlpha = 1; ctx.shadowColor = 'rgba(245,158,11,.6)'; ctx.shadowBlur = 18;
  const grad = ctx.createLinearGradient(left, 0, right, 0); grad.addColorStop(0, '#f59e0b'); grad.addColorStop(1, '#f43f5e');
  ctx.strokeStyle = grad; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(left, trackY); ctx.lineTo(thumbX, trackY); ctx.stroke();
  ctx.globalAlpha = .7; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
  const tick = (x: number) => { ctx.beginPath(); ctx.moveTo(x, trackY - 12); ctx.lineTo(x, trackY + 12); ctx.stroke(); };
  tick(left); tick(right);
  ctx.globalAlpha = 1; ctx.shadowColor = '#f59e0b'; ctx.shadowBlur = 32; ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(thumbX, trackY, 20, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0; const ig = ctx.createRadialGradient(thumbX, trackY, 0, thumbX, trackY, 15);
  ig.addColorStop(0, '#f59e0b'); ig.addColorStop(1, '#f43f5e');
  ctx.fillStyle = ig; ctx.beginPath(); ctx.arc(thumbX, trackY, 12, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = .95; ctx.fillStyle = '#fff'; ctx.font = 'bold 12px system-ui'; ctx.shadowColor = 'rgba(0,0,0,.8)'; ctx.shadowBlur = 5;
  ctx.textAlign = 'left'; ctx.fillText('₹500', left, trackY - 30); ctx.textAlign = 'right'; ctx.fillText('₹1,00,000', right, trackY - 30);
  ctx.textAlign = 'center'; ctx.font = 'bold 13px system-ui'; ctx.shadowBlur = 10; ctx.fillText('🤘 slide hand left/right', W / 2, trackY - 52);
  ctx.restore();
}

function drawHoldRing(ctx: CanvasRenderingContext2D, cx: number, cy: number, pct: number) {
  ctx.save(); ctx.globalAlpha = .35; ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.arc(cx, cy, 32, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 1; ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 6; ctx.lineCap = 'round';
  ctx.shadowColor = '#f59e0b'; ctx.shadowBlur = 16;
  ctx.beginPath(); ctx.arc(cx, cy, 32, -Math.PI / 2, -Math.PI / 2 + pct * Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 12px system-ui'; ctx.shadowColor = 'rgba(0,0,0,.7)'; ctx.shadowBlur = 6; ctx.textAlign = 'center';
  ctx.fillText('Hold 🤘', cx, cy - 42); ctx.restore();
}

// drawScrollButtons removed as requested

function drawThreeFingerScrollIndicator(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  H: number,
  isUpper: boolean,
  speedRatio: number
) {
  ctx.save();
  
  // 1. Draw horizontal dividing dotted line at the exact center H / 2
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(0, H / 2);
  ctx.lineTo(640, H / 2);
  ctx.stroke();
  ctx.setLineDash([]);
  
  // 2. Draw neutral deadzone guide bands
  ctx.fillStyle = 'rgba(255, 255, 255, 0.015)';
  ctx.fillRect(0, (H / 2) - 60, 640, 120);

  // 3. Draw active glowing particle circle at pinch center
  const color = isUpper ? '#38bdf8' : '#ef4444';
  ctx.shadowBlur = 20;
  ctx.shadowColor = color;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(px, py, 12, 0, Math.PI * 2);
  ctx.fill();
  
  // Draw rotating outer radar ring
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(px, py, 20, 0, Math.PI * 2);
  ctx.stroke();
  
  // 4. Draw dynamic motion vectors and direction HUD text
  ctx.shadowBlur = 10;
  ctx.font = 'bold 22px system-ui';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  if (isUpper) {
    ctx.fillText('▲', px, py - 35);
    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`▲ GLIDING UP (${Math.round(speedRatio * 100)}%)`, px, py + 32);
  } else {
    ctx.fillText('▼', px, py + 35);
    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = '#ef4444';
    ctx.fillText(`▼ GLIDING DOWN (${Math.round(speedRatio * 100)}%)`, px, py - 32);
  }
  
  ctx.restore();
}

function drawConfidenceOverlay(ctx: CanvasRenderingContext2D, gesture: string, confidence: number, _W: number, H: number, hand: number) {
  if (!gesture || gesture === 'Unknown') return;
  ctx.save(); const label = `${hand === 0 ? '✋' : '🤚'} H${hand + 1}: ${RAW_TO_EMOJI[gesture] ?? gesture} ${confidence}%`;
  const boxW = 220, boxH = 30, bx = 10, by = hand === 0 ? 10 : H - boxH - 10;
  ctx.globalAlpha = .75; ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.roundRect(bx, by, boxW, boxH, 8); ctx.fill();
  ctx.globalAlpha = 1; const barColor = confidence >= 80 ? '#34d399' : confidence >= 60 ? '#f59e0b' : '#f87171';
  ctx.fillStyle = barColor; ctx.beginPath(); ctx.roundRect(bx + 3, by + boxH - 6, (boxW - 6) * (confidence / 100), 3, 2); ctx.fill();
  ctx.fillStyle = '#f8fafc'; ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'left'; ctx.shadowColor = 'rgba(0,0,0,.7)'; ctx.shadowBlur = 4;
  ctx.fillText(label, bx + 6, by + 14); ctx.restore();
}

function ensureSecurityOverlay() {
  if (securityOverlayRemovalTimer) {
    clearTimeout(securityOverlayRemovalTimer);
    securityOverlayRemovalTimer = null;
  }
  let overlay = document.getElementById('eye-verification-lock-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'eye-verification-lock-overlay';
    overlay.setAttribute(
      'style',
      'position:fixed;inset:0;width:100vw;height:100vh;background:rgba(8,13,28,0.98);backdrop-filter:blur(24px);z-index:999999;display:flex;align-items:center;justify-content:center;color:#fff;font-family:system-ui,sans-serif;text-align:center;transition:opacity .2s ease;opacity:0'
    );
    overlay.innerHTML = `
      <div style="width:min(540px,calc(100vw - 32px));padding:32px;border:1px solid rgba(148,163,184,.25);background:rgba(15,23,42,.9);box-shadow:0 24px 80px rgba(0,0,0,.4)">
        <div style="font-size:40px;margin-bottom:12px">!</div>
        <h1 id="eye-lock-title" style="margin:0 0 8px;font-size:28px;letter-spacing:.02em">SECURITY WARNING</h1>
        <p id="eye-lock-message" style="margin:0 0 18px;color:#cbd5e1;font-size:15px;line-height:1.5">Another person has been detected. Close both eyes for 2-3 seconds to confirm locking the app.</p>
        <div style="height:10px;background:rgba(148,163,184,.22);overflow:hidden">
          <div id="eye-lock-progress" style="height:100%;width:0%;background:#22c55e;transition:width .12s linear"></div>
        </div>
        <div id="eye-lock-detail" style="margin-top:14px;color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:.08em">Waiting for lock confirmation</div>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => { overlay!.style.opacity = '1'; });
  }
  return overlay;
}

function updateSecurityOverlay(state: SecurityState, faceCount: number, progress: number, message: string) {
  const overlay = ensureSecurityOverlay();
  overlay.style.opacity = '1';
  const pct = Math.max(0, Math.min(100, progress * 100));
  const titleEl = document.getElementById('eye-lock-title');
  const progressEl = document.getElementById('eye-lock-progress');
  const messageEl = document.getElementById('eye-lock-message');
  const detailEl = document.getElementById('eye-lock-detail');
  if (titleEl) titleEl.textContent = state === 'LOCKED' ? 'APPLICATION LOCKED' : 'SECURITY WARNING';
  if (progressEl) progressEl.style.width = `${pct}%`;
  if (messageEl) messageEl.textContent = message;
  if (detailEl) {
    detailEl.textContent = state === 'LOCKED'
      ? 'Use the unlock gesture placeholder: thumbs up'
      : `${faceCount} face${faceCount === 1 ? '' : 's'} detected - ${Math.round(pct)}% lock confirmed`;
  }
}

function removeSecurityOverlay() {
  const overlay = document.getElementById('eye-verification-lock-overlay');
  if (overlay) {
    overlay.style.opacity = '0';
    securityOverlayRemovalTimer = setTimeout(() => {
      overlay.remove();
      securityOverlayRemovalTimer = null;
    }, 250);
  }
  document.getElementById('peeking-warning-overlay')?.remove();
}

export function useGestureControl(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  { onGesture, onLandmarks, enabled = true, sliderMode = false }: UseGestureControlOptions
) {
  const onGestureRef = useRef(onGesture);
  const onLandmarksRef = useRef(onLandmarks);
  const enabledRef = useRef(enabled);
  const sliderModeRef = useRef(sliderMode);

  useEffect(() => { onGestureRef.current = onGesture; }, [onGesture]);
  useEffect(() => { onLandmarksRef.current = onLandmarks; }, [onLandmarks]);
  useEffect(() => { enabledRef.current = enabled; }, [enabled]);
  useEffect(() => { sliderModeRef.current = sliderMode; }, [sliderMode]);

  useEffect(() => {
    let cancelled = false, animId = 0, handsInst: any = null, stream: MediaStream | null = null;
    let gestureBuffer0: string[] = [], gestureBuffer1: string[] = [], bothThumbsDownBuffer: boolean[] = [];
    let openPalmSeen = false, backStartTime: number | null = null, backFired = false;
    const BACK_HOLD_MS = 350;
    let lastFiredGesture = '', lastFiredTime = 0;
    let rockHoldStart: number | null = null, inSlider = false;
    let prevSmoothedX = 0.5, velocity = 0;
    const ALPHA = 0.2, VEL_DECAY = 0.8, VEL_WEIGHT = 0.2;
    let frameCount = 0;
    let isPinchLocked = false;
    let targetVelocity = 0;
    let currentVelocity = 0;
    let currentScrollY = 0;
    let cachedScrollContainer: HTMLElement | null = null;
    let pinchFrameCount = 0;
    let faceMeshInst: any = null;
    let faceMeshReady = false;
    let securityState: SecurityState = 'NORMAL';
    let warningFaceCount: number | null = null;
    let verifierIndex: number | null = null;
    let eyeClosedStart: number | null = null;
    let verificationProgress = 0;
    // High-refresh-rate smooth scroll rendering thread (RAF)
    let scrollAnimId = 0;
    const smoothScrollLoop = () => {
      if (isPinchLocked && cachedScrollContainer) {
        // Direction-aware damping: reverse direction faster, glide same direction smoother
        if (targetVelocity !== 0 && currentVelocity !== 0 && Math.sign(targetVelocity) !== Math.sign(currentVelocity)) {
          currentVelocity = currentVelocity * 0.70 + targetVelocity * 0.30;
        } else {
          currentVelocity = currentVelocity * 0.93 + targetVelocity * 0.07;
        }
        
        // Deadband: ignore extremely tiny velocity noise
        if (Math.abs(currentVelocity) < 0.2) {
          currentVelocity = 0;
        }
        
        currentScrollY = Math.max(0, Math.min(cachedScrollContainer.scrollHeight - window.innerHeight, currentScrollY + currentVelocity));
        
        cachedScrollContainer.scrollTop = currentScrollY;
        if (cachedScrollContainer === document.documentElement || cachedScrollContainer === document.body) {
          window.scrollTo(0, currentScrollY);
        }
      }
      scrollAnimId = requestAnimationFrame(smoothScrollLoop);
    };
    scrollAnimId = requestAnimationFrame(smoothScrollLoop);

    function emitGesture(event: GestureEvent) {
      if (!enabledRef.current || securityState !== 'NORMAL') return;
      onGestureRef.current(event);
    }

    function resetEyeClosureConfirmation(faceCount: number | null = warningFaceCount) {
      warningFaceCount = faceCount;
      verifierIndex = null;
      eyeClosedStart = null;
      verificationProgress = 0;
    }

    function stopActiveGestureState() {
      gestureBuffer0 = [];
      gestureBuffer1 = [];
      bothThumbsDownBuffer = [];
      openPalmSeen = false;
      backStartTime = null;
      exitSlider();
    }

    function transitionToNormal() {
      securityState = 'NORMAL';
      resetEyeClosureConfirmation(null);
      removeSecurityOverlay();
    }

    function transitionToWarning(faceCount: number) {
      resetEyeClosureConfirmation(faceCount);
      stopActiveGestureState();
      securityState = 'WARNING';
      updateSecurityOverlay('WARNING', faceCount, 0, 'Another person has been detected. Close both eyes for 2-3 seconds to lock the app.');
    }

    function transitionToLocked(faceCount: number) {
      resetEyeClosureConfirmation(null);
      stopActiveGestureState();
      securityState = 'LOCKED';
      updateSecurityOverlay('LOCKED', faceCount, 1, 'Application locked. It will stay locked until an explicit unlock gesture is performed.');
    }

    function handleExplicitUnlockGesture(raw: string): boolean {
      if (securityState === 'LOCKED' && raw === 'THUMB_UP') {
        transitionToNormal();
        return true;
      }
      return false;
    }

    function updateWarningEyeClosure(faces: any[][], faceCount: number, now: number) {
      if (warningFaceCount !== faceCount) {
        resetEyeClosureConfirmation(faceCount);
        updateSecurityOverlay('WARNING', faceCount, 0, 'Face count changed. Close both eyes again for 2-3 seconds to confirm locking.');
        return;
      }

      const closedIndex = faces.findIndex((points: any[]) => getAverageEyeAspectRatio(points) < EYE_CLOSED_EAR_THRESHOLD);
      if (closedIndex < 0) {
        resetEyeClosureConfirmation(faceCount);
        updateSecurityOverlay('WARNING', faceCount, 0, 'Blink ignored. Close both eyes continuously to confirm locking.');
        return;
      }

      if (verifierIndex !== closedIndex) {
        verifierIndex = closedIndex;
        eyeClosedStart = now;
      }

      const elapsed = eyeClosedStart === null ? 0 : now - eyeClosedStart;
      verificationProgress = Math.min(1, elapsed / EYE_CLOSED_LOCK_CONFIRM_MS);
      updateSecurityOverlay('WARNING', faceCount, verificationProgress, `User ${closedIndex + 1} confirming lock. Keep eyes closed.`);

      if (elapsed >= EYE_CLOSED_LOCK_CONFIRM_MS) transitionToLocked(faceCount);
    }

    function handleFaceMeshResults(results: any) {
      if (cancelled) return;
      const faces = results.multiFaceLandmarks ?? [];
      const faceCount = faces.length;
      const now = Date.now();

      if (securityState === 'LOCKED') {
        updateSecurityOverlay('LOCKED', faceCount, 1, 'Application locked. It will stay locked until an explicit unlock gesture is performed.');
        return;
      }

      if (faceCount <= 1) {
        if (securityState === 'WARNING') transitionToNormal();
        return;
      }

      if (securityState === 'NORMAL') {
        transitionToWarning(faceCount);
        return;
      }

      updateWarningEyeClosure(faces, faceCount, now);
    }

    function countFingers(lm: any[], label: string): number {
      let f = 0;
      const thumbToSide = label === 'Right' ? lm[4].x < lm[2].x : lm[4].x > lm[2].x;
      const thumbToSideDist = Math.abs(lm[4].x - lm[2].x);
      if (thumbToSide && thumbToSideDist > 0.04) f++;
      if (lm[8].y < lm[6].y - 0.02) f++; if (lm[12].y < lm[10].y - 0.02) f++;
      if (lm[16].y < lm[14].y - 0.02) f++; if (lm[20].y < lm[18].y - 0.02) f++;
      return f;
    }

    function classifySingleHand(lm: any[], label: string): string {
      const total = countFingers(lm, label);
      const otherFingersCurled =
        lm[8].y > lm[6].y && lm[12].y > lm[10].y &&
        lm[16].y > lm[14].y && lm[20].y > lm[18].y;

      const thumbTipY = lm[4].y;
      const thumbMCPY = lm[2].y;
      const thumbToMCPDist = thumbTipY - thumbMCPY;

      if (otherFingersCurled) {
        if (thumbToMCPDist < -0.04)
          return 'THUMB_UP';
        if (thumbToMCPDist > 0.04)
          return 'THUMB_DOWN';
      }

      if (Math.abs(lm[4].x - lm[8].x) < .04 && Math.abs(lm[4].y - lm[8].y) < .04 && Math.sqrt(Math.pow(lm[4].x - lm[12].x, 2) + Math.pow(lm[4].y - lm[12].y, 2)) > 0.1) return 'OK';
      if (lm[8].y < lm[6].y && lm[20].y < lm[18].y && lm[12].y > lm[10].y + .02 && lm[16].y > lm[14].y + .02)
        return 'ROCK';
      if (total === 0) return 'FIST';
      if (total === 5) return 'OPEN_PALM';
      if (total >= 1 && total <= 9) return String(total);
      return 'Unknown';
    }

    function fireGesture(raw: string, confidence: number, hand: number) {
      if (!enabledRef.current) return;
      if (handleExplicitUnlockGesture(raw)) return;
      if (securityState !== 'NORMAL') return;
      const now = Date.now();
      const key = `${hand}-${raw}`;
      if (key === lastFiredGesture && now - lastFiredTime < COOLDOWN_MS) return;
      lastFiredGesture = key;
      lastFiredTime = now;

      let event: GestureEvent | null = null;
      if (raw === 'THUMB_UP') event = { type: 'THUMB_UP', confidence, hand };
      else if (raw === 'THUMB_DOWN') event = { type: 'THUMB_DOWN', confidence, hand };
      else if (raw === 'FIST') event = { type: 'FIST', confidence, hand };
      else if (raw === 'ROCK') event = { type: 'ROCK', confidence, hand };
      else if (raw === 'OK') event = { type: 'OK', confidence, hand };
      else if (raw === 'OPEN_PALM') event = { type: 'OPEN_PALM', confidence, hand };
      else if (/^(10|[1-9])$/.test(raw)) {
        event = { type: 'DIGIT', value: raw, hand };
        const gid = FINGER_TO_GESTURE_ID[raw];
        if (gid) emitGesture({ type: 'GESTURE_ID', id: gid, confidence, hand });
      }
      if (event) emitGesture(event);
    }

    function exitSlider() {
      if (inSlider) {
        inSlider = false; prevSmoothedX = 0.5; velocity = 0;
        emitGesture({ type: 'SLIDER_COMMIT' });
      }
      rockHoldStart = null;
    }

    const init = async () => {
      try {
        // Start camera and wait for MediaPipe Hands CDN script in parallel
        const [camStream] = await Promise.all([
          navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } }),
          new Promise<void>(res => { const poll = () => (typeof Hands !== 'undefined' ? res() : setTimeout(poll, 100)); poll(); }),
        ]);
        if (cancelled) { camStream.getTracks().forEach(t => t.stop()); return; }
        stream = camStream;
        const video = videoRef.current!;
        video.srcObject = stream; await video.play();
        await new Promise<void>(res => { const poll = () => (video.videoWidth > 0 ? res() : setTimeout(poll, 80)); poll(); });
        if (cancelled) return;

        handsInst = new Hands({ locateFile: (f: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}` });
        handsInst.setOptions({
          maxNumHands: 2,
          modelComplexity: 0,
          minDetectionConfidence: 0.75,
          minTrackingConfidence: 0.7,
        });

        // Lazy Face Mesh init — provides face landmark detection for eye-blink anti-peek
        const initFaceMesh = async () => {
          while (typeof FaceMesh === 'undefined') await new Promise(r => setTimeout(r, 200));
          if (cancelled) return;
          const inst = new FaceMesh({ locateFile: (f: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}` });
          inst.setOptions({ maxNumFaces: 4, refineLandmarks: true, minDetectionConfidence: 0.65, minTrackingConfidence: 0.65 });
          inst.onResults(handleFaceMeshResults);
          faceMeshInst = inst;
          faceMeshReady = true;
        };
        initFaceMesh();

        handsInst.onResults((results: any) => {
          if (cancelled) return;
          const canvas = canvasRef.current, video = videoRef.current;
          if (!canvas || !video) return;
          const W = video.videoWidth || 640, H = video.videoHeight || 480;
          canvas.width = W; canvas.height = H;
          const ctx = canvas.getContext('2d')!;
          ctx.save(); ctx.clearRect(0, 0, W, H); ctx.drawImage(video, 0, 0, W, H);

          const hands = results.multiHandLandmarks ?? [];
          const handedness = results.multiHandedness ?? [];

          for (let h = 0; h < hands.length; h++) {
            const color = HAND_COLORS[h % 2];
            drawConnectors(ctx, hands[h], HAND_CONNECTIONS, { color, lineWidth: 2 });
            drawLandmarks(ctx, hands[h], { color: '#fff', lineWidth: 1, radius: 3 });
          }

          if (hands.length > 0) {
            const now = Date.now(); frameCount++;

            if (onLandmarksRef.current) {
              onLandmarksRef.current(hands.map((lm: any, i: number) => ({
                landmarks: lm.map((p: any) => ({ x: p.x, y: p.y, z: p.z ?? 0 })),
                label: handedness[i]?.label ?? HAND_LABELS[i % 2],
                fingers: 0,
              })));
            }

            let raw0 = 'Unknown';
            let raw1 = 'Unknown';
            let isTwoHandDigit = false;

            if (hands.length > 1) {
              const f0 = countFingers(hands[0], handedness[0]?.label ?? 'Right');
              const f1 = countFingers(hands[1], handedness[1]?.label ?? 'Left');
              const s0 = classifySingleHand(hands[0], handedness[0]?.label ?? 'Right');
              const s1 = classifySingleHand(hands[1], handedness[1]?.label ?? 'Left');
              const isThumbGesture = s0 === 'THUMB_UP' || s0 === 'THUMB_DOWN' || s1 === 'THUMB_UP' || s1 === 'THUMB_DOWN';
              const sum = f0 + f1;
              if (!isThumbGesture && sum >= 1 && sum <= 10) {
                isTwoHandDigit = true;
                raw0 = String(sum);
                raw1 = 'Unknown';
              }
            }

            if (!isTwoHandDigit) {
              raw0 = classifySingleHand(hands[0], handedness[0]?.label ?? 'Right');
              raw1 = hands.length > 1 ? classifySingleHand(hands[1], handedness[1]?.label ?? 'Left') : 'Unknown';
            }

            // BACK gesture from hand 0 only (OPEN_PALM → FIST held 350ms)
            // Use raw finger count to avoid classification quirks (thumb-up vs fist)
            const f0 = countFingers(hands[0], handedness[0]?.label ?? 'Right');
            if (f0 >= 4) {
              openPalmSeen = true; backStartTime = null; backFired = false;
            } else if (f0 <= 1 && openPalmSeen && !backFired) {
              if (!backStartTime) backStartTime = now;
              else if (now - backStartTime >= BACK_HOLD_MS) {
                backFired = true;
                openPalmSeen = false; backStartTime = null;
                emitGesture({ type: 'BACK_DYNAMIC', confidence: 100 });
                ctx.restore(); return;
              }
            } else if (f0 > 1 && f0 < 4) {
              // Intermediate transition (2-3 fingers) — don't reset
            } else {
              openPalmSeen = false; backStartTime = null;
            }

            const wristY = hands[0][0].y * H;

            // Slider mode — hand 0 only
            if (sliderModeRef.current) {
              if (raw0 === 'ROCK') {
                if (rockHoldStart === null) rockHoldStart = now;
                const held = now - rockHoldStart, pct = Math.min(1, held / ROCK_HOLD_MS);
                if (held >= ROCK_HOLD_MS) {
                  if (!inSlider) { inSlider = true; prevSmoothedX = hands[0][0].x; velocity = 0; }
                  const rawX = hands[0][0].x;
                  const smoothX = prevSmoothedX * (1 - ALPHA) + rawX * ALPHA;
                  velocity = velocity * VEL_DECAY + (smoothX - prevSmoothedX) * VEL_WEIGHT;
                  const finalX = Math.max(0, Math.min(1, smoothX + velocity));
                  prevSmoothedX = smoothX;
                  drawSlider(ctx, finalX, wristY, W, H, rawX, smoothX);
                  emitGesture({ type: 'SLIDER_ACTIVE', normX: finalX });
                } else {
                  drawHoldRing(ctx, hands[0][0].x * W, wristY, pct);
                }
              } else { exitSlider(); }
            }

            // ── THREE-FINGER PINCH AUTO-SCROLL PHYSICS ENGINE ──
            let isThreeFingerPinchActive = false;
            let pinchCenterX = 0;
            let pinchCenterY = 0;

            if (hands.length > 0) {
              const thumb = hands[0][4];
              const index = hands[0][8];
              const middle = hands[0][12];

              if (thumb && index && middle) {
                const d_thumb_index = Math.sqrt(
                  Math.pow(thumb.x - index.x, 2) +
                  Math.pow(thumb.y - index.y, 2) +
                  Math.pow((thumb.z ?? 0) - (index.z ?? 0), 2)
                );
                
                const d_thumb_middle = Math.sqrt(
                  Math.pow(thumb.x - middle.x, 2) +
                  Math.pow(thumb.y - middle.y, 2) +
                  Math.pow((thumb.z ?? 0) - (middle.z ?? 0), 2)
                );
                
                const d_index_middle = Math.sqrt(
                  Math.pow(index.x - middle.x, 2) +
                  Math.pow(index.y - middle.y, 2) +
                  Math.pow((index.z ?? 0) - (middle.z ?? 0), 2)
                );

                // Hysteresis: tighter to engage, wider to disengage (prevents rapid flickering)
                if (!isPinchLocked) {
                  isThreeFingerPinchActive =
                    d_thumb_index < PINCH_LOCK_THRESHOLD &&
                    d_thumb_middle < PINCH_LOCK_THRESHOLD &&
                    d_index_middle < PINCH_LOCK_THRESHOLD;
                } else {
                  isThreeFingerPinchActive =
                    d_thumb_index < PINCH_UNLOCK_THRESHOLD &&
                    d_thumb_middle < PINCH_UNLOCK_THRESHOLD &&
                    d_index_middle < PINCH_UNLOCK_THRESHOLD;
                }

                if (isThreeFingerPinchActive) {
                  pinchCenterX = ((thumb.x + index.x + middle.x) / 3) * W;
                  pinchCenterY = ((thumb.y + index.y + middle.y) / 3) * H;

                  raw0 = 'OK';
                  isTwoHandDigit = false;

                  if (!isPinchLocked) {
                    isPinchLocked = true;
                    pinchFrameCount = 0;
                    cachedScrollContainer =
                      document.getElementById('portal-content') ||
                      document.getElementById('main-content') ||
                      document.querySelector('.portal-main') as HTMLElement ||
                      document.querySelector('.admin-main') as HTMLElement ||
                      document.querySelector('main') as HTMLElement ||
                      document.documentElement ||
                      document.body;

                    currentScrollY = cachedScrollContainer ? cachedScrollContainer.scrollTop : (window.scrollY || document.documentElement.scrollTop);
                    targetVelocity = 0;
                    currentVelocity = 0;
                  }

                  // Periodically re-query scroll container in case DOM changed
                  pinchFrameCount++;
                  if (pinchFrameCount % SCROLL_CONTAINER_REQUERY_INTERVAL === 0) {
                    const fresh =
                      document.getElementById('portal-content') ||
                      document.getElementById('main-content') ||
                      document.querySelector('.portal-main') as HTMLElement ||
                      document.querySelector('.admin-main') as HTMLElement ||
                      document.querySelector('main') as HTMLElement ||
                      document.documentElement ||
                      document.body;
                    if (fresh) cachedScrollContainer = fresh;
                  }

                  const offset = pinchCenterY - (H / 2);

                  if (Math.abs(offset) < PINCH_DEADZONE) {
                    targetVelocity = 0;
                  } else {
                    const sign = offset > 0 ? 1 : -1;
                    const absOffset = Math.abs(offset) - PINCH_DEADZONE;
                    targetVelocity = sign * Math.min(25, Math.pow(absOffset * 0.10, 1.4));
                  }
                }
              }
            }

            if (!isThreeFingerPinchActive) {
              isPinchLocked = false;
              targetVelocity = 0;
              currentVelocity = 0;
            }

            // Render glowing HUD feedback when three-finger autoscroll is running
            if (isPinchLocked) {
              const isUpper = pinchCenterY < H / 2;
              const speedRatio = Math.min(1, Math.abs(targetVelocity) / 22);
              drawThreeFingerScrollIndicator(ctx, pinchCenterX, pinchCenterY, H, isUpper, speedRatio);
            }

            if (!inSlider) {
              // ── Both-hands thumbs-down detection ──
              const isBothDown = raw0 === 'THUMB_DOWN' && raw1 === 'THUMB_DOWN';
              bothThumbsDownBuffer.push(isBothDown);
              if (bothThumbsDownBuffer.length > BUFFER_SIZE) bothThumbsDownBuffer.shift();
              const bothThumbsConfirmed = bothThumbsDownBuffer.filter(Boolean).length >= CONFIRM_COUNT;

              if (bothThumbsConfirmed) {
                const now = Date.now();
                const btdKey = 'both';
                if (btdKey !== lastFiredGesture || now - lastFiredTime >= COOLDOWN_MS) {
                  lastFiredGesture = btdKey;
                  lastFiredTime = now;
                  emitGesture({ type: 'BOTH_THUMBS_DOWN', confidence: 100 });
                  gestureBuffer0 = []; gestureBuffer1 = [];
                  bothThumbsDownBuffer = [];
                }
                // Skip individual hand processing entirely while both-hands confirmed
                const bothEmoji = RAW_TO_EMOJI['THUMB_DOWN'] ?? '👎';
                ctx.font = 'bold 48px serif'; ctx.fillStyle = '#ef4444';
                ctx.shadowColor = 'rgba(239,68,68,.6)'; ctx.shadowBlur = 16;
                ctx.fillText(bothEmoji + bothEmoji, W / 2 - 30, H / 2);
                ctx.restore(); return;
              }

              const handsToProcess = [
                { raw: raw0, buf: gestureBuffer0, idx: 0 },
                { raw: raw1, buf: gestureBuffer1, idx: 1 },
              ];

              for (const hp of handsToProcess) {
                const emoji = RAW_TO_EMOJI[hp.raw];
                if (emoji && hp.raw !== 'Unknown') {
                  ctx.font = 'bold 36px serif'; ctx.fillStyle = '#fff';
                  ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 8;
                  ctx.fillText(emoji, hp.idx === 0 ? 12 : W - 52, hp.idx === 0 ? 52 : H - 14);
                  ctx.shadowBlur = 0;
                }

                hp.buf.push(hp.raw);
                if (hp.buf.length > BUFFER_SIZE) hp.buf.shift();

                const conf = calcConfidence(hp.buf, hp.raw);
                drawConfidenceOverlay(ctx, hp.raw, conf, W, H, hp.idx);

                if (hp.buf.filter(g => g === hp.raw).length >= CONFIRM_COUNT && hp.raw !== 'Unknown') {
                  if (hp.raw === 'OK' && isPinchLocked) {
                    // Suppress fireGesture to prevent accidental clicks while dragging scrollbar
                  } else {
                    fireGesture(hp.raw, conf, hp.idx);
                  }
                }
              }
            }
          } else {
            gestureBuffer0 = []; gestureBuffer1 = []; bothThumbsDownBuffer = [];
            exitSlider();
          }

          ctx.restore();
        });

        let faceFrameSkip = 0;
        const loop = async () => {
          if (cancelled) return;
          const v = videoRef.current;
          if (v && !v.paused && v.readyState >= 2) {
            try { await handsInst.send({ image: v }); } catch (_) { }
            faceFrameSkip++;
            if (faceFrameSkip % 5 === 0 && faceMeshReady && faceMeshInst) {
              try { faceMeshInst.send({ image: v }); } catch (_) { }
            }
          }
          animId = requestAnimationFrame(loop);
        };
        animId = requestAnimationFrame(loop);

      } catch (err) { console.error('[GestureControl] Init error:', err); }
    };

    init();
    return () => {
      cancelled = true; 
      cancelAnimationFrame(animId);
      cancelAnimationFrame(scrollAnimId);
      stream?.getTracks().forEach(t => t.stop());
      handsInst?.close?.();
      faceMeshInst?.close?.();
      removeSecurityOverlay();
    };
  }, []);
}
