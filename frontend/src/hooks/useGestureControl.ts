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

function drawConfidenceOverlay(ctx: CanvasRenderingContext2D, gesture: string, confidence: number, W: number, H: number, hand: number) {
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
    let openPalmSeen = false, backStartTime: number | null = null, backProgress = 0;
    const BACK_HOLD_MS = 350;
    let lastFiredGesture = '', lastFiredTime = 0;
    let rockHoldStart: number | null = null, inSlider = false;
    let prevSmoothedX = 0.5, velocity = 0;
    const ALPHA = 0.2, VEL_DECAY = 0.8, VEL_WEIGHT = 0.2;
    let frameCount = 0, LOG_EVERY = 15;

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
      else if (/^[0-9]$/.test(raw)) {
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

            const raw0 = classifySingleHand(hands[0], handedness[0]?.label ?? 'Right');
            const raw1 = hands.length > 1 ? classifySingleHand(hands[1], handedness[1]?.label ?? 'Left') : 'Unknown';

            // BACK gesture from hand 0 only
            if (raw0 === 'OPEN_PALM') { openPalmSeen = true; backStartTime = null; backProgress = 0; }
            else if (openPalmSeen && raw0 === 'FIST') {
              if (!backStartTime) backStartTime = now;
              backProgress = Math.min((now - backStartTime) / BACK_HOLD_MS, 1);
              if (now - backStartTime >= BACK_HOLD_MS) {
                openPalmSeen = false; backStartTime = null; backProgress = 0;
                onGestureRef.current({ type: 'BACK_DYNAMIC', confidence: 100 });
                ctx.restore(); return;
              }
            } else { backProgress = 0; }

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
                  fireGesture(hp.raw, conf, hp.idx);
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
          if (v && !v.paused && v.readyState >= 2)
            try { await handsInst.send({ image: v }); } catch (_) { }
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
      cancelled = true; cancelAnimationFrame(animId);
      stream?.getTracks().forEach(t => t.stop());
      handsInst?.close?.();
    };
  }, []);
}
