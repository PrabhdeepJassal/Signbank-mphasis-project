import { useEffect, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Public types
// ─────────────────────────────────────────────────────────────────────────────
export type GestureEvent =
  | { type: 'DIGIT'; value: string }
  | { type: 'THUMB_UP'; confidence?: number }
  | { type: 'THUMB_DOWN'; confidence?: number }
  | { type: 'FIST'; confidence?: number }
  | { type: 'ROCK'; confidence?: number }
  | { type: 'OK'; confidence?: number }
  | { type: 'OPEN_PALM'; confidence?: number }   // NEW — used for dynamic back + wave
  | { type: 'BACK_DYNAMIC'; confidence?: number }
  | { type: 'GESTURE_ID'; id: string; confidence?: number }
  | { type: 'SLIDER_ACTIVE'; normX: number }
  | { type: 'SLIDER_COMMIT' };

export type LandmarkPoint = { x: number; y: number; z: number };

export interface UseGestureControlOptions {
  onGesture: (event: GestureEvent) => void;
  onLandmarks?: (landmarks: LandmarkPoint[]) => void;
  enabled?: boolean;
  sliderMode?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const FINGER_TO_GESTURE_ID: Record<string, string> = {
  '1': 'G001', '2': 'G002', '3': 'G003', '4': 'G004', '5': 'G005',
};
const RAW_TO_EMOJI: Record<string, string> = {
  THUMB_UP: '👍', THUMB_DOWN: '👎', FIST: '✊', ROCK: '🤘', OK: '👌', OPEN_PALM: '🖐️',
  '0': '✊', '1': '☝️', '2': '✌️', '3': '🤌', '4': '🤘', '5': '🖐️',
};

const BUFFER_SIZE = 20;
const CONFIRM_COUNT = 16;
const COOLDOWN_MS = 2200;
const ROCK_HOLD_MS = 700;

declare const Hands: any;
declare const HAND_CONNECTIONS: any;
declare const drawConnectors: any;
declare const drawLandmarks: any;
declare const cv: any;

// ─────────────────────────────────────────────────────────────────────────────
// Confidence calculation
// Measures how consistently the buffer agrees on the current gesture (0–100)
// ─────────────────────────────────────────────────────────────────────────────
function calcConfidence(buffer: string[], current: string): number {
  if (!buffer.length) return 0;
  const matching = buffer.filter(g => g === current).length;
  return Math.round((matching / buffer.length) * 100);
}

// ─────────────────────────────────────────────────────────────────────────────
// OpenCV readiness check
// ─────────────────────────────────────────────────────────────────────────────
function isCVReady(): boolean {
  try { return typeof cv !== 'undefined' && !!cv.Mat; } catch (_) { return false; }
}

// ─────────────────────────────────────────────────────────────────────────────
// Slider drawing
// ─────────────────────────────────────────────────────────────────────────────
function drawSlider(
  ctx: CanvasRenderingContext2D, normX: number, wristYpx: number,
  W: number, H: number, rawX: number, smoothX: number
) {
  const PAD = 50;
  const left = PAD, right = W - PAD;
  const trackY = Math.max(70, Math.min(H - 70, wristYpx));
  const thumbX = left + normX * (right - left);
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 12; ctx.lineCap = 'round';
  ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 8;
  ctx.beginPath(); ctx.moveTo(left, trackY); ctx.lineTo(right, trackY); ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.shadowColor = 'rgba(124,58,237,0.55)'; ctx.shadowBlur = 18;
  const grad = ctx.createLinearGradient(left, 0, right, 0);
  grad.addColorStop(0, '#059669'); grad.addColorStop(1, '#7c3aed');
  ctx.strokeStyle = grad; ctx.lineWidth = 8;
  ctx.beginPath(); ctx.moveTo(left, trackY); ctx.lineTo(thumbX, trackY); ctx.stroke();
  ctx.globalAlpha = 0.7; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
  [left, right].forEach(x => {
    ctx.beginPath(); ctx.moveTo(x, trackY - 12); ctx.lineTo(x, trackY + 12); ctx.stroke();
  });
  ctx.globalAlpha = 1; ctx.shadowColor = '#7c3aed'; ctx.shadowBlur = 32;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(thumbX, trackY, 20, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  const ig = ctx.createRadialGradient(thumbX, trackY, 0, thumbX, trackY, 15);
  ig.addColorStop(0, '#7c3aed'); ig.addColorStop(1, '#059669');
  ctx.fillStyle = ig;
  ctx.beginPath(); ctx.arc(thumbX, trackY, 12, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 0.95; ctx.fillStyle = '#fff'; ctx.font = 'bold 13px system-ui';
  ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 5;
  ctx.textAlign = 'left'; ctx.fillText('₹500', left, trackY - 30);
  ctx.textAlign = 'right'; ctx.fillText('₹1,00,000', right, trackY - 30);
  ctx.textAlign = 'center'; ctx.font = 'bold 14px system-ui'; ctx.shadowBlur = 10;
  ctx.fillText('🤘 OpenCV smoothed — move hand ← or →', W / 2, trackY - 52);
  const dbY = H - 14;
  ctx.shadowBlur = 4; ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.font = 'bold 11px monospace'; ctx.textAlign = 'left'; ctx.fillStyle = '#fbbf24';
  ctx.fillText(`[OpenCV] raw=${rawX.toFixed(3)}  smooth=${smoothX.toFixed(3)}  final=${normX.toFixed(3)}`, 8, dbY);
  ctx.restore();
}

function drawHoldRing(ctx: CanvasRenderingContext2D, cx: number, cy: number, pct: number) {
  ctx.save();
  ctx.globalAlpha = 0.35; ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.arc(cx, cy, 32, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 1; ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 6; ctx.lineCap = 'round';
  ctx.shadowColor = '#7c3aed'; ctx.shadowBlur = 16;
  ctx.beginPath(); ctx.arc(cx, cy, 32, -Math.PI / 2, -Math.PI / 2 + pct * Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 13px system-ui';
  ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 6; ctx.textAlign = 'center';
  ctx.fillText('Hold 🤘', cx, cy - 42);
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────────────
// Confidence overlay — drawn in bottom-right corner of camera feed
// ─────────────────────────────────────────────────────────────────────────────
function drawConfidenceOverlay(
  ctx: CanvasRenderingContext2D,
  gesture: string,
  confidence: number,
  W: number,
  H: number
) {
  if (!gesture || gesture === 'Unknown') return;
  ctx.save();
  const label = `Gesture: ${RAW_TO_EMOJI[gesture] ?? gesture}  Confidence: ${confidence}%`;
  const boxW = 260, boxH = 36;
  const bx = W - boxW - 10;
  const by = H - boxH - 10;
  // background pill
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.roundRect(bx, by, boxW, boxH, 10);
  ctx.fill();
  // progress bar inside pill
  ctx.globalAlpha = 1;
  const barColor = confidence >= 80 ? '#34d399' : confidence >= 60 ? '#f59e0b' : '#f87171';
  ctx.fillStyle = barColor;
  ctx.beginPath();
  ctx.roundRect(bx + 4, by + boxH - 7, (boxW - 8) * (confidence / 100), 4, 2);
  ctx.fill();
  // text
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 12px system-ui';
  ctx.textAlign = 'left';
  ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 4;
  ctx.fillText(label, bx + 8, by + 17);
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────
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
    let cancelled = false;
    let animId = 0;
    let handsInst: any = null;
    let stream: MediaStream | null = null;

    let gestureBuffer: string[] = [];
    let openPalmSeen = false;
    let backStartTime: number | null = null;
    let backProgress = 0;
    const BACK_HOLD_MS = 350;
    let lastFiredGesture = '';
    let lastFiredTime = 0;

    let rockHoldStart: number | null = null;
    let inSlider = false;

    let prevSmoothedX = 0.5;
    let velocity = 0;
    const ALPHA = 0.2;
    const VEL_DECAY = 0.8;
    const VEL_WEIGHT = 0.2;

    let frameCount = 0;
    const LOG_EVERY = 15;

    function countFingers(lm: any[], label: string): number {
      let f = 0;
      if (label === 'Right') { if (lm[4].x < lm[3].x) f++; }
      else { if (lm[4].x > lm[3].x) f++; }
      if (lm[8].y < lm[6].y) f++;
      if (lm[12].y < lm[10].y) f++;
      if (lm[16].y < lm[14].y) f++;
      if (lm[20].y < lm[18].y) f++;
      return f;
    }

    function classifyRaw(handsLm: any[], handedness: any[]): string {
      if (!handsLm?.length) return 'Unknown';
      let total = 0;
      for (let i = 0; i < handsLm.length; i++)
        total += countFingers(handsLm[i], handedness[i]?.label ?? 'Right');
      const lm = handsLm[0];

      if (
        lm[4].y < lm[3].y - 0.05 &&
        lm[8].y > lm[6].y && lm[12].y > lm[10].y &&
        lm[16].y > lm[14].y && lm[20].y > lm[18].y
      ) return 'THUMB_UP';

      if (
        lm[4].y > lm[3].y + 0.05 &&
        lm[8].y > lm[6].y && lm[12].y > lm[10].y &&
        lm[16].y > lm[14].y && lm[20].y > lm[18].y
      ) return 'THUMB_DOWN';

      if (
        Math.abs(lm[4].x - lm[8].x) < 0.04 &&
        Math.abs(lm[4].y - lm[8].y) < 0.04
      ) return 'OK';

      if (
        lm[8].y < lm[6].y &&
        lm[20].y < lm[18].y &&
        lm[12].y > lm[10].y + 0.02 &&
        lm[16].y > lm[14].y + 0.02
      ) return 'ROCK';

      if (total === 0) return 'FIST';
      if (total === 5) return 'OPEN_PALM'; // NEW — all 5 fingers open
      if (total >= 1 && total <= 9) return String(total);
      return 'Unknown';
    }

    function fireGesture(raw: string, confidence: number) {
      if (!enabledRef.current) return;
      const now = Date.now();
      if (raw === lastFiredGesture && now - lastFiredTime < COOLDOWN_MS) return;
      lastFiredGesture = raw;
      lastFiredTime = now;

      let event: GestureEvent | null = null;
      if (raw === 'THUMB_UP') event = { type: 'THUMB_UP', confidence };
      else if (raw === 'THUMB_DOWN') event = { type: 'THUMB_DOWN', confidence };
      else if (raw === 'FIST') event = { type: 'FIST', confidence };
      else if (raw === 'ROCK') event = { type: 'ROCK', confidence };
      else if (raw === 'OK') event = { type: 'OK', confidence };
      else if (raw === 'OPEN_PALM') event = { type: 'OPEN_PALM', confidence }; // NEW
      else if (/^[0-9]$/.test(raw)) {
        event = { type: 'DIGIT', value: raw };
        const gid = FINGER_TO_GESTURE_ID[raw];
        if (gid) onGestureRef.current({ type: 'GESTURE_ID', id: gid, confidence });
      }
      if (event) onGestureRef.current(event);
    }

    function exitSlider() {
      if (inSlider) {
        console.log('%c[Slider] Deactivated — SLIDER_COMMIT fired', 'color:#f87171;font-weight:bold');
        inSlider = false;
        prevSmoothedX = 0.5;
        velocity = 0;
        onGestureRef.current({ type: 'SLIDER_COMMIT' });
      }
      rockHoldStart = null;
    }

    const init = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }

        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play();

        await new Promise<void>(res => {
          const poll = () => (video.videoWidth > 0 ? res() : setTimeout(poll, 80));
          poll();
        });
        if (cancelled) return;

        await new Promise<void>(res => {
          const poll = () => (typeof Hands !== 'undefined' ? res() : setTimeout(poll, 100));
          poll();
        });
        if (cancelled) return;

        console.log('%c[MediaPipe] Hands loaded ✓', 'color:#34d399;font-weight:bold');

        handsInst = new Hands({ locateFile: (f: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}` });
        handsInst.setOptions({
          maxNumHands: 1, modelComplexity: 1,
          minDetectionConfidence: 0.8, minTrackingConfidence: 0.8,
        });

        handsInst.onResults((results: any) => {
          if (cancelled) return;
          const canvas = canvasRef.current;
          const video = videoRef.current;
          if (!canvas || !video) return;

          const W = video.videoWidth || 640;
          const H = video.videoHeight || 480;
          canvas.width = W;
          canvas.height = H;

          const ctx = canvas.getContext('2d')!;
          ctx.save();
          ctx.clearRect(0, 0, W, H);
          ctx.drawImage(video, 0, 0, W, H);

          const cvAvailable = isCVReady();
          if (cvAvailable) {
            let src: any = null; let blurred: any = null;
            try {
              src = cv.imread(canvas); blurred = new cv.Mat();
              cv.GaussianBlur(src, blurred, new cv.Size(5, 5), 0);
              cv.imshow(canvas, blurred);
            } catch (e) { console.warn('[OpenCV] GaussianBlur failed:', e); }
            finally { src?.delete(); blurred?.delete(); }
          }

          if (results.multiHandLandmarks?.length > 0) {
            for (const l of results.multiHandLandmarks) {
              drawConnectors(ctx, l, HAND_CONNECTIONS, { color: '#00e676', lineWidth: 2 });
              drawLandmarks(ctx, l, { color: '#7c3aed', lineWidth: 1, radius: 3 });
            }
          }

          if (results.multiHandLandmarks?.length > 0) {
            const lm = results.multiHandLandmarks[0];
            const now = Date.now();
            frameCount++;

            if (onLandmarksRef.current) {
              onLandmarksRef.current(lm.map((p: any) => ({ x: p.x, y: p.y, z: p.z ?? 0 })));
            }

            const raw = classifyRaw(results.multiHandLandmarks, results.multiHandedness ?? []);

            // BACK GESTURE (dynamic open → fist)
            if (raw === 'OPEN_PALM') {
              openPalmSeen = true;
              backStartTime = null;
              backProgress = 0;
            }

            else if (openPalmSeen && raw === 'FIST') {
              if (!backStartTime) backStartTime = now;

              backProgress = Math.min((now - backStartTime) / BACK_HOLD_MS, 1);

              if (now - backStartTime >= BACK_HOLD_MS) {
                openPalmSeen = false;
                backStartTime = null;
                backProgress = 0;

                onGestureRef.current({
                  type: 'BACK_DYNAMIC',
                  confidence: 100,
                });

                return;
              }
            }

            else {
              backProgress = 0;
            }

            const wristY = lm[0].y * H;

            // ── SLIDER MODE ──────────────────────────────────────────────
            if (sliderModeRef.current) {
              if (raw === 'ROCK') {
                if (rockHoldStart === null) rockHoldStart = now;
                const held = now - rockHoldStart;
                const pct = Math.min(1, held / ROCK_HOLD_MS);

                if (held >= ROCK_HOLD_MS) {
                  if (!inSlider) {
                    inSlider = true; prevSmoothedX = lm[0].x; velocity = 0;
                    console.log('%c[Slider] ACTIVATED 🤘', 'color:#a78bfa;font-weight:bold;font-size:13px');
                  }

                  const rawX = lm[0].x;
                  const smoothX = prevSmoothedX * (1 - ALPHA) + rawX * ALPHA;
                  velocity = velocity * VEL_DECAY + (smoothX - prevSmoothedX) * VEL_WEIGHT;
                  const finalX = smoothX + velocity;
                  const clampedX = Math.max(0, Math.min(1, finalX));
                  prevSmoothedX = smoothX;

                  if (cvAvailable) {
                    let highlightMat: any = null;
                    try {
                      highlightMat = cv.imread(canvas);
                      cv.circle(highlightMat, new cv.Point(Math.round(rawX * W), Math.round(lm[0].y * H)), 22, new cv.Scalar(124, 58, 237, 255), 3);
                      cv.circle(highlightMat, new cv.Point(Math.round(rawX * W), Math.round(lm[0].y * H)), 30, new cv.Scalar(0, 230, 118, 255), 2);
                      cv.imshow(canvas, highlightMat);
                    } catch (e) { console.warn('[OpenCV] circle draw failed:', e); }
                    finally { highlightMat?.delete(); }
                  }

                  drawSlider(ctx, clampedX, wristY, W, H, rawX, smoothX);

                  if (frameCount % LOG_EVERY === 0) {
                    console.log(`%c[OpenCV Slider] raw=${rawX.toFixed(4)} smooth=${smoothX.toFixed(4)} vel=${velocity.toFixed(4)} final=${clampedX.toFixed(4)}`, 'color:#34d399;font-weight:bold');
                  }

                  onGestureRef.current({ type: 'SLIDER_ACTIVE', normX: clampedX });
                } else {
                  drawHoldRing(ctx, lm[0].x * W, wristY, pct);
                }
              } else {
                exitSlider();
              }
            }

            // ── Static gesture buffer ────────────────────────────────────
            if (!inSlider) {
              const emoji = RAW_TO_EMOJI[raw] ?? '';
              if (emoji && raw !== 'Unknown') {
                ctx.font = 'bold 42px serif'; ctx.fillStyle = '#fff';
                ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 8;
                ctx.fillText(emoji, 10, 52); ctx.shadowBlur = 0;
              }

              gestureBuffer.push(raw);
              if (gestureBuffer.length > BUFFER_SIZE) gestureBuffer.shift();

              const conf = calcConfidence(gestureBuffer, raw);

              // Draw confidence overlay on camera canvas
              drawConfidenceOverlay(ctx, raw, conf, W, H);

              if (
                gestureBuffer.filter(g => g === raw).length >= CONFIRM_COUNT &&
                raw !== 'Unknown'
              ) {
                fireGesture(raw, conf);
              }
            }

          } else {
            gestureBuffer = [];
            exitSlider();
          }

          ctx.restore();
        });

        const loop = async () => {
          if (cancelled) return;
          const v = videoRef.current;
          if (v && !v.paused && v.readyState >= 2)
            try { await handsInst.send({ image: v }); } catch (_) { }
          animId = requestAnimationFrame(loop);
        };
        animId = requestAnimationFrame(loop);

        const cvCheckInterval = setInterval(() => {
          if (isCVReady()) {
            console.log('%c[OpenCV] Runtime ready ✓', 'color:#34d399;font-weight:bold;font-size:13px');
            clearInterval(cvCheckInterval);
          }
        }, 500);

      } catch (err) {
        console.error('[GestureControl] Init error:', err);
      }
    };

    init();

    return () => {
      cancelled = true;
      cancelAnimationFrame(animId);
      stream?.getTracks().forEach(t => t.stop());
      handsInst?.close?.();
      console.log('%c[GestureControl] Cleanup — camera stopped', 'color:#94a3b8');
    };
  }, []);
}
