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
declare const HAND_CONNECTIONS: any;
declare const drawConnectors: any;
declare const drawLandmarks: any;

const HAND_COLORS = ['#00e676', '#40c4ff'];
const HAND_LABELS = ['Right', 'Left'];

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
  ctx.fillRect(0, (H / 2) - 30, 640, 60);

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
    let targetVelocity = 0;
    let currentVelocity = 0;
    let currentScrollY = 0;
    let cachedScrollContainer: HTMLElement | null = null;
    // High-refresh-rate smooth scroll rendering thread (RAF)
    let scrollAnimId = 0;
    const smoothScrollLoop = () => {
      if (isPinchLocked && cachedScrollContainer) {
        // Butter-smooth heavy friction dampening for completely jitter-free gliding
        currentVelocity = currentVelocity * 0.90 + targetVelocity * 0.10;
        
        // Deadband: ignore extremely tiny velocity noise
        if (Math.abs(currentVelocity) < 0.1) {
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

            // ── GESTURE DEADZONE FOR SCROLLBAR REGION (Left 80px or while active dragging) ──
            // Left scroller muted deadzone removed to give full screen for gestures

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

            // ── THREE-FINGER PINCH AUTO-SCROLL PHYSICS ENGINE ──
            let isThreeFingerPinchActive = false;
            let pinchCenterX = 0;
            let pinchCenterY = 0;

            if (hands.length > 0) {
              const thumb = hands[0][4];  // Thumb tip landmark
              const index = hands[0][8];  // Index tip landmark
              const middle = hands[0][12]; // Middle tip landmark

              if (thumb && index && middle) {
                // Calculate 3D distances between the three finger tips
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

                // If all three tips are pinched together like picking something (< 0.052)
                isThreeFingerPinchActive = d_thumb_index < 0.052 && d_thumb_middle < 0.052 && d_index_middle < 0.052;

                if (isThreeFingerPinchActive) {
                  // Calculate average coordinate of pinch
                  pinchCenterX = ((thumb.x + index.x + middle.x) / 3) * W;
                  pinchCenterY = ((thumb.y + index.y + middle.y) / 3) * H;

                  // Suppress standard gestures during scrolling
                  raw0 = 'OK';
                  isTwoHandDigit = false;

                  if (!isPinchLocked) {
                    isPinchLocked = true;
                    // Cache DOM scroll container
                    cachedScrollContainer = document.getElementById('portal-content') || 
                                            document.querySelector('.portal-main') as HTMLElement || 
                                            document.documentElement || 
                                            document.body;

                    currentScrollY = cachedScrollContainer ? cachedScrollContainer.scrollTop : (window.scrollY || document.documentElement.scrollTop);
                    targetVelocity = 0;
                    currentVelocity = 0;
                  }

                  // Neutral dividing line is H / 2
                  const offset = pinchCenterY - (H / 2);
                  const DEADZONE = 30; // 30px deadzone around center dividing line

                  if (Math.abs(offset) < DEADZONE) {
                    targetVelocity = 0;
                  } else {
                    const sign = offset > 0 ? 1 : -1;
                    const absOffset = Math.abs(offset) - DEADZONE;
                    
                    // Comfortable rate-scrolling velocity curve
                    targetVelocity = sign * Math.min(22, Math.pow(absOffset * 0.12, 1.5));
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
            try { await handsInst.send({ image: v }); } catch (_) { }
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
    };
  }, []);
}
