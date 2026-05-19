import { useEffect, useRef } from 'react';

export type GestureEvent =
  | { type: 'DIGIT'; value: string; hand?: number }
  | { type: 'THUMB_UP'; confidence?: number; hand?: number }
  | { type: 'THUMB_DOWN'; confidence?: number; hand?: number }
  | { type: 'FIST'; confidence?: number; hand?: number }
  | { type: 'ROCK'; confidence?: number; hand?: number }
  | { type: 'OK'; confidence?: number; hand?: number }
  | { type: 'OPEN_PALM'; confidence?: number; hand?: number }
  | { type: 'BACK_DYNAMIC'; confidence?: number }
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

declare const Hands: any;
declare const FaceDetection: any;
declare const HAND_CONNECTIONS: any;
declare const drawConnectors: any;
declare const drawLandmarks: any;
declare const cv: any;

const HAND_COLORS = ['#00e676', '#40c4ff'];
const HAND_LABELS = ['Right', 'Left'];

function calcConfidence(buffer: string[], current: string): number {
  if (!buffer.length) return 0;
  const matching = buffer.filter(g => g === current).length;
  return Math.round((matching / buffer.length) * 100);
}

function isCVReady(): boolean {
  try { return typeof cv !== 'undefined' && !!cv.Mat; } catch (_) { return false; }
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

function drawPinchScrollbar(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  thumbY: number,
  isLocked: boolean,
  isHovered: boolean,
  pointerX?: number,
  pointerY?: number
) {
  ctx.save();

  // 1. Draw track (Left Side)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(10, 30, 8, H - 60, 4);
  ctx.fill();
  ctx.stroke();

  // 2. Draw hover target guide
  if (isHovered && !isLocked) {
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 10;
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // 3. Draw thumb handle
  ctx.shadowBlur = isLocked ? 15 : isHovered ? 8 : 0;
  ctx.shadowColor = isLocked ? '#a78bfa' : '#38bdf8';
  const grad = ctx.createLinearGradient(10, thumbY - 15, 18, thumbY + 15);
  if (isLocked) {
    grad.addColorStop(0, '#f43f5e');
    grad.addColorStop(1, '#a78bfa');
  } else {
    grad.addColorStop(0, '#38bdf8');
    grad.addColorStop(1, '#0284c7');
  }
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(8, thumbY - 15, 12, 30, 6);
  ctx.fill();

  // 4. Draw labels next to track (to the right of the left track)
  ctx.shadowBlur = 0;
  ctx.fillStyle = isLocked ? '#f43f5e' : isHovered ? '#38bdf8' : 'rgba(255, 255, 255, 0.4)';
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(isLocked ? '🔒 DRAGGING' : '🤏 PINCH HERE TO DRAG', 26, thumbY + 3);

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
    let gestureBuffer0: string[] = [], gestureBuffer1: string[] = [];
    let openPalmSeen = false, backStartTime: number | null = null;
    const BACK_HOLD_MS = 350;
    let lastFiredGesture = '', lastFiredTime = 0;
    let rockHoldStart: number | null = null, inSlider = false;
    let prevSmoothedX = 0.5, velocity = 0;
    const ALPHA = 0.2, VEL_DECAY = 0.8, VEL_WEIGHT = 0.2;
    let frameCount = 0;
    let isPinchLocked = false;
    let pinchStartY: number | null = null;
    let pinchStartScroll: number | null = null;
    let targetScrollY = 0;
    let currentScrollY = 0;
    let cachedScrollContainer: HTMLElement | null = null;
    let smoothedHandY = 0;
    let faceDetectionInst: any = null;

    // High-refresh-rate smooth scroll rendering thread (RAF)
    let scrollAnimId = 0;
    const smoothScrollLoop = () => {
      if (isPinchLocked && cachedScrollContainer) {
        // Friction lerp coefficient at native rate (usually 0.85/0.15)
        currentScrollY = currentScrollY * 0.85 + targetScrollY * 0.15;
        
        cachedScrollContainer.scrollTop = currentScrollY;
        if (cachedScrollContainer === document.documentElement || cachedScrollContainer === document.body) {
          window.scrollTo(0, currentScrollY);
        }
      }
      scrollAnimId = requestAnimationFrame(smoothScrollLoop);
    };
    scrollAnimId = requestAnimationFrame(smoothScrollLoop);

    function countFingers(lm: any[], label: string): number {
      let f = 0;
      if (label === 'Right') { if (lm[4].x < lm[3].x) f++; } else { if (lm[4].x > lm[3].x) f++; }
      if (lm[8].y < lm[6].y) f++; if (lm[12].y < lm[10].y) f++;
      if (lm[16].y < lm[14].y) f++; if (lm[20].y < lm[18].y) f++;
      return f;
    }

    function classifySingleHand(lm: any[], label: string): string {
      const total = countFingers(lm, label);
      if (lm[4].y < lm[3].y - .05 && lm[8].y > lm[6].y && lm[12].y > lm[10].y && lm[16].y > lm[14].y && lm[20].y > lm[18].y)
        return 'THUMB_UP';
      if (lm[4].y > lm[3].y + .05 && lm[8].y > lm[6].y && lm[12].y > lm[10].y && lm[16].y > lm[14].y && lm[20].y > lm[18].y)
        return 'THUMB_DOWN';
      if (Math.abs(lm[4].x - lm[8].x) < .04 && Math.abs(lm[4].y - lm[8].y) < .04) return 'OK';
      if (lm[8].y < lm[6].y && lm[20].y < lm[18].y && lm[12].y > lm[10].y + .02 && lm[16].y > lm[14].y + .02)
        return 'ROCK';
      if (total === 0) return 'FIST';
      if (total === 5) return 'OPEN_PALM';
      if (total >= 1 && total <= 9) return String(total);
      return 'Unknown';
    }

    function fireGesture(raw: string, confidence: number, hand: number) {
      if (!enabledRef.current) return;
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
        if (gid) onGestureRef.current({ type: 'GESTURE_ID', id: gid, confidence, hand });
      }
      if (event) onGestureRef.current(event);
    }

    function exitSlider() {
      if (inSlider) {
        inSlider = false; prevSmoothedX = 0.5; velocity = 0;
        onGestureRef.current({ type: 'SLIDER_COMMIT' });
      }
      rockHoldStart = null;
    }

    const init = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        const video = videoRef.current!;
        video.srcObject = stream; await video.play();
        await new Promise<void>(res => { const poll = () => (video.videoWidth > 0 ? res() : setTimeout(poll, 80)); poll(); });
        if (cancelled) return;
        await new Promise<void>(res => { const poll = () => (typeof Hands !== 'undefined' ? res() : setTimeout(poll, 100)); poll(); });
        if (cancelled) return;

        handsInst = new Hands({ locateFile: (f: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}` });
        handsInst.setOptions({
          maxNumHands: 2,
          modelComplexity: 1,
          minDetectionConfidence: 0.75,
          minTrackingConfidence: 0.7,
        });

        // Initialize FaceDetection for anti-peeking security (does not highlight/draw anything)
        await new Promise<void>(res => { const poll = () => (typeof FaceDetection !== 'undefined' ? res() : setTimeout(poll, 100)); poll(); });
        if (cancelled) return;

        faceDetectionInst = new FaceDetection({ locateFile: (f: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${f}` });
        faceDetectionInst.setOptions({
          model: 'short', // optimized for close-range/selfie cameras
          minDetectionConfidence: 0.65
        });

        faceDetectionInst.onResults((results: any) => {
          if (cancelled) return;
          const faces = results.detections ?? [];
          const faceCount = faces.length;

          if (faceCount > 1) {
            // PEER SECURITY VIOLATION: Show warning overlay and lock screen
            let overlay = document.getElementById('peeking-warning-overlay');
            if (!overlay) {
              overlay = document.createElement('div');
              overlay.id = 'peeking-warning-overlay';
              overlay.innerHTML = `
                <div class="peeking-content">
                  <div class="peeking-icon">⚠️</div>
                  <h1>SECURITY ALERT</h1>
                  <p>SCREEN PEEKING DETECTED!</p>
                  <div class="peeking-sub">SignBank Enterprise has locked the screen to protect your security. Please ask the peeking person to step away.</div>
                </div>
              `;
              overlay.setAttribute('style', `
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(10, 15, 30, 0.98);
                backdrop-filter: blur(25px);
                z-index: 999999;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #fff;
                font-family: system-ui, -apple-system, sans-serif;
                text-align: center;
                transition: opacity 0.3s ease;
                opacity: 0;
              `);
              
              const styleEl = document.createElement('style');
              styleEl.id = 'peeking-warning-styles';
              styleEl.innerHTML = `
                #peeking-warning-overlay .peeking-content {
                  max-width: 500px;
                  padding: 40px;
                  border: 2px solid #ef4444;
                  border-radius: 24px;
                  background: rgba(239, 68, 68, 0.05);
                  box-shadow: 0 0 50px rgba(239, 68, 68, 0.3);
                  animation: peekingPulse 2s infinite alternate;
                }
                #peeking-warning-overlay .peeking-icon {
                  font-size: 72px;
                  margin-bottom: 16px;
                  display: inline-block;
                  animation: peekingShake 0.5s infinite;
                }
                #peeking-warning-overlay h1 {
                  font-size: 32px;
                  color: #ef4444;
                  font-weight: 800;
                  margin: 0 0 8px 0;
                  letter-spacing: 2px;
                }
                #peeking-warning-overlay p {
                  font-size: 20px;
                  font-weight: 600;
                  margin: 0 0 20px 0;
                  color: #f8fafc;
                }
                #peeking-warning-overlay .peeking-sub {
                  font-size: 14px;
                  line-height: 1.6;
                  color: #94a3b8;
                }
                @keyframes peekingPulse {
                  from { box-shadow: 0 0 30px rgba(239, 68, 68, 0.2); border-color: rgba(239, 68, 68, 0.4); }
                  to { box-shadow: 0 0 60px rgba(239, 68, 68, 0.6); border-color: rgba(239, 68, 68, 1); }
                }
                @keyframes peekingShake {
                  0%, 100% { transform: rotate(0); }
                  25% { transform: rotate(-8deg); }
                  75% { transform: rotate(8deg); }
                }
              `;
              document.head.appendChild(styleEl);
              document.body.appendChild(overlay);
              overlay.offsetHeight; // Force reflow
              overlay.style.opacity = '1';
            }
          } else {
            // Normal state: remove warning overlay
            const overlay = document.getElementById('peeking-warning-overlay');
            if (overlay) {
              overlay.style.opacity = '0';
              setTimeout(() => {
                overlay.remove();
                document.getElementById('peeking-warning-styles')?.remove();
              }, 300);
            }
          }
        });

        handsInst.onResults((results: any) => {
          if (cancelled) return;
          const canvas = canvasRef.current, video = videoRef.current;
          if (!canvas || !video) return;
          const W = video.videoWidth || 640, H = video.videoHeight || 480;
          canvas.width = W; canvas.height = H;
          const ctx = canvas.getContext('2d')!;
          ctx.save(); ctx.clearRect(0, 0, W, H); ctx.drawImage(video, 0, 0, W, H);

          const cvAvailable = isCVReady();
          if (cvAvailable) {
            let src: any = null, blurred: any = null;
            try { src = cv.imread(canvas); blurred = new cv.Mat(); cv.GaussianBlur(src, blurred, new cv.Size(5, 5), 0); cv.imshow(canvas, blurred); }
            catch (_) { } finally { src?.delete(); blurred?.delete(); }
          }

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
              const sum = f0 + f1;
              if (sum >= 1 && sum <= 10) {
                isTwoHandDigit = true;
                raw0 = String(sum);
                raw1 = 'Unknown';
              }
            }

            if (!isTwoHandDigit) {
              raw0 = classifySingleHand(hands[0], handedness[0]?.label ?? 'Right');
              raw1 = hands.length > 1 ? classifySingleHand(hands[1], handedness[1]?.label ?? 'Left') : 'Unknown';
            }

            // ── GESTURE DEADZONE FOR SCROLLBAR REGION (Left 60px or while active dragging) ──
            if (hands.length > 0 && hands[0][8]) {
              const tx = hands[0][8].x * W;
              if (tx < 60 || isPinchLocked) {
                if (isPinchLocked) {
                  raw0 = 'OK';
                } else if (raw0 !== 'OK') {
                  raw0 = 'Unknown';
                }
                isTwoHandDigit = false;
              }
            }
            if (hands.length > 1 && hands[1][8]) {
              const tx = hands[1][8].x * W;
              if (tx < 60 || isPinchLocked) {
                if (isPinchLocked) {
                  raw1 = 'OK';
                } else if (raw1 !== 'OK') {
                  raw1 = 'Unknown';
                }
                isTwoHandDigit = false;
              }
            }

            // BACK gesture from hand 0 only
            if (raw0 === 'OPEN_PALM') { openPalmSeen = true; backStartTime = null; }
            else if (openPalmSeen && raw0 === 'FIST') {
              if (!backStartTime) backStartTime = now;
              if (now - backStartTime >= BACK_HOLD_MS) {
                openPalmSeen = false; backStartTime = null;
                onGestureRef.current({ type: 'BACK_DYNAMIC', confidence: 100 });
                ctx.restore(); return;
              }
            } else { /* no back */ }

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
                  onGestureRef.current({ type: 'SLIDER_ACTIVE', normX: finalX });
                } else {
                  drawHoldRing(ctx, hands[0][0].x * W, wristY, pct);
                }
              } else { exitSlider(); }
            }

            // Touch-point scroll control using index finger tip & left air-scrollbar
            let isNearScrollbar = false;

            const activeContainer = cachedScrollContainer || document.documentElement || document.body;
            const maxScroll = Math.max(100, activeContainer.scrollHeight - window.innerHeight);
            const currentScroll = activeContainer.scrollTop;
            const currentPct = Math.max(0, Math.min(1, currentScroll / maxScroll));
            let thumbY = 30 + currentPct * (H - 60);

            if (hands.length > 0) {
              const tip = hands[0][8];   // Index finger tip landmark
              const thumb = hands[0][4]; // Thumb tip landmark
              if (tip && thumb) {
                const tx = tip.x * W;
                const ty = tip.y * H;

                // 1. Instant raw pinch check using 3D Euclidean distance (zero recognition latency)
                const dx = thumb.x - tip.x;
                const dy = thumb.y - tip.y;
                const dz = (thumb.z ?? 0) - (tip.z ?? 0);
                const pinchDist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                const isPinchingRaw = pinchDist < 0.048; // Highly sensitive raw pinch threshold

                // 2. Check Scrollbar Hover/Drag (Left Side check: tx < 40)
                if (tx < 40) {
                  isNearScrollbar = true;
                }

                if (isPinchingRaw && (isNearScrollbar || isPinchLocked)) {
                  if (!isPinchLocked) {
                    isPinchLocked = true;
                    pinchStartY = ty;
                    smoothedHandY = ty;

                    // Query DOM once on lock state to prevent style recalculation layout thrashing
                    cachedScrollContainer = document.getElementById('portal-content') || 
                                            document.querySelector('.portal-main') as HTMLElement || 
                                            document.documentElement || 
                                            document.body;

                    pinchStartScroll = cachedScrollContainer ? cachedScrollContainer.scrollTop : (window.scrollY || document.documentElement.scrollTop);
                    currentScrollY = pinchStartScroll;
                    targetScrollY = pinchStartScroll;
                  }

                  if (pinchStartY !== null && pinchStartScroll !== null) {
                    // Exponential Moving Average (EMA) to smooth out raw finger tip coordinate jitter/shaking
                    smoothedHandY = smoothedHandY * 0.65 + ty * 0.35;
                    const deltaY = smoothedHandY - pinchStartY;
                    const sensitivity = maxScroll / (H - 60);
                    targetScrollY = pinchStartScroll + deltaY * sensitivity;

                    // Physical finger gluing with filtered coordinates
                    thumbY = Math.max(30, Math.min(H - 30, smoothedHandY));
                  }
                } else {
                  isPinchLocked = false;
                  pinchStartY = null;
                  pinchStartScroll = null;
                }
              }
            } else {
              isPinchLocked = false;
              pinchStartY = null;
              pinchStartScroll = null;
            }

            drawPinchScrollbar(
              ctx,
              W,
              H,
              thumbY,
              isPinchLocked,
              isNearScrollbar,
              hands[0] ? hands[0][8].x * W : undefined,
              hands[0] ? hands[0][8].y * H : undefined
            );

            if (!inSlider) {
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
            gestureBuffer0 = []; gestureBuffer1 = [];
            exitSlider();
          }

          ctx.restore();
        });

        const loop = async () => {
          if (cancelled) return;
          const v = videoRef.current;
          if (v && !v.paused && v.readyState >= 2) {
            try {
              await Promise.all([
                handsInst.send({ image: v }),
                faceDetectionInst.send({ image: v })
              ]);
            } catch (_) { }
          }
          animId = requestAnimationFrame(loop);
        };
        animId = requestAnimationFrame(loop);

        const cvCheckInterval = setInterval(() => {
          if (isCVReady()) { clearInterval(cvCheckInterval); }
        }, 500);

      } catch (err) { console.error('[GestureControl] Init error:', err); }
    };

    init();
    return () => {
      cancelled = true; 
      cancelAnimationFrame(animId);
      cancelAnimationFrame(scrollAnimId);
      stream?.getTracks().forEach(t => t.stop());
      handsInst?.close?.();
      faceDetectionInst?.close?.();
      document.getElementById('peeking-warning-overlay')?.remove();
      document.getElementById('peeking-warning-styles')?.remove();
    };
  }, []);
}
