import { useRef, useCallback, useEffect, useState } from 'react';
import { playCorrectSound, playIncorrectSound } from '../utils/sound';

export interface ARStep {
  id: string;
  gesture: string;
  label: string;
  instruction: string;
  ghostEmoji: string;
}

export type ARMode = 'idle' | 'waiting' | 'correct' | 'incorrect' | 'completed';

const FEEDBACK_DISPLAY_MS = 1200;

const HAND_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [0, 9], [9, 10], [10, 11], [11, 12],
  [0, 13], [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20],
  [5, 9], [9, 13], [13, 17],
];

const BASE_LM: [number, number][] = [
  [0.50, 0.82], [0.34, 0.72], [0.24, 0.62], [0.19, 0.52], [0.17, 0.42],
  [0.40, 0.54], [0.40, 0.36], [0.40, 0.26], [0.40, 0.16],
  [0.50, 0.50], [0.50, 0.30], [0.50, 0.20], [0.50, 0.10],
  [0.60, 0.54], [0.60, 0.36], [0.60, 0.28], [0.60, 0.20],
  [0.68, 0.64], [0.68, 0.50], [0.68, 0.44], [0.68, 0.38],
];

const CURLED_FINGER: Record<number, [[number, number], [number, number], [number, number]]> = {
  5:  [[0.37, 0.44], [0.35, 0.50], [0.41, 0.56]],
  9:  [[0.47, 0.40], [0.45, 0.46], [0.51, 0.52]],
  13: [[0.63, 0.44], [0.65, 0.50], [0.59, 0.56]],
  17: [[0.71, 0.54], [0.73, 0.60], [0.67, 0.64]],
};

const CURLED_THUMB: [[number, number], [number, number], [number, number]] = [
  [0.28, 0.64], [0.33, 0.58], [0.38, 0.56],
];

const FINGER_TIP_INDICES = [8, 12, 16, 20];
const MCP_INDICES = [5, 9, 13, 17];

type Pose = [boolean, boolean, boolean, boolean, boolean];

const GESTURE_POSE: Record<string, Pose> = {
  '0':          [false, false, false, false, false],
  '1':          [true,  true,  false, false, false],
  '2':          [true,  true,  true,  false, false],
  '3':          [true,  true,  true,  true,  false],
  '4':          [true,  true,  true,  true,  false],
  '5':          [true,  true,  true,  true,  true ],
  'FIST':       [false, false, false, false, false],
  'OPEN_PALM':  [true,  true,  true,  true,  true ],
  'THUMB_UP':   [true,  false, false, false, false],
  'THUMB_DOWN': [false, false, false, false, false],
  'ROCK':       [true,  true,  false, false, true ],
  'OK':         [true,  true,  false, false, false],
};

function applyPose(lm: [number, number][], [thumbExt, ...fingerExt]: Pose) {
  for (let i = 0; i < 4; i++) {
    if (!fingerExt[i]) {
      const mcp = MCP_INDICES[i];
      const curled = CURLED_FINGER[mcp];
      lm[mcp + 1] = [...curled[0]];
      lm[mcp + 2] = [...curled[1]];
      lm[mcp + 3] = [...curled[2]];
    }
  }
  if (!thumbExt) {
    lm[2] = [...CURLED_THUMB[0]];
    lm[3] = [...CURLED_THUMB[1]];
    lm[4] = [...CURLED_THUMB[2]];
  }
}

// For THUMB_DOWN: rotate the thumb downward
function applyThumbDown(lm: [number, number][]) {
  applyPose(lm, [false, false, false, false, false] as Pose);
  // Override thumb to point down
  lm[2] = [0.24, 0.58];
  lm[3] = [0.20, 0.68];
  lm[4] = [0.18, 0.78];
}

// For OK: bring thumb tip and index tip together
function applyOkPose(lm: [number, number][]) {
  applyPose(lm, [true, false, false, false, false] as Pose);
  // Extend index and make tips meet
  lm[6] = [0.34, 0.46];
  lm[7] = [0.29, 0.50];
  lm[8] = [0.26, 0.52];
  // Thumb tip meets index tip
  lm[4] = [0.26, 0.52];
}

function makeLandmarks(gesture: string): [number, number][] {
  const lm = BASE_LM.map(p => [...p] as [number, number]);

  if (gesture === 'THUMB_DOWN') {
    applyThumbDown(lm);
    return lm;
  }
  if (gesture === 'OK') {
    applyOkPose(lm);
    return lm;
  }

  const pose = GESTURE_POSE[gesture];
  if (pose) {
    applyPose(lm, pose);
  }

  return lm;
}

function drawHandSkeleton(
  ctx: CanvasRenderingContext2D,
  landmarks: [number, number][],
  cx: number, cy: number, scale: number,
  color: string, alpha: number
) {
  ctx.save();
  ctx.globalAlpha = alpha;

  const proj = (lm: [number, number]) => [
    cx + (lm[0] - 0.5) * scale,
    cy + (lm[1] - 0.5) * scale,
  ] as const;

  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;

  for (const [i, j] of HAND_CONNECTIONS) {
    const [x1, y1] = proj(landmarks[i]);
    const [x2, y2] = proj(landmarks[j]);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  ctx.shadowBlur = 4;
  for (const lm of landmarks) {
    const [x, y] = proj(lm);
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }

  ctx.shadowBlur = 14;
  for (const idx of FINGER_TIP_INDICES) {
    const [x, y] = proj(landmarks[idx]);
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }

  ctx.restore();
}

function drawMiniHand(
  ctx: CanvasRenderingContext2D,
  gesture: string,
  cx: number, cy: number, scale: number,
  color: string, alpha: number
) {
  const lm = makeLandmarks(gesture);
  drawHandSkeleton(ctx, lm, cx, cy, scale, color, alpha);
}

function drawDirectionArrow(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  color: string
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = 0.6 + Math.sin(Date.now() / 250) * 0.4;
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 16;

  ctx.beginPath();
  ctx.moveTo(0, -16);
  ctx.lineTo(-10, -2);
  ctx.lineTo(-4, -2);
  ctx.lineTo(-4, 10);
  ctx.lineTo(4, 10);
  ctx.lineTo(4, -2);
  ctx.lineTo(10, -2);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

// Two-hand gesture: draw two hands side by side
function drawTwoHands(
  ctx: CanvasRenderingContext2D,
  gesture: string,
  cx: number, cy: number, scale: number,
  color: string, alpha: number
) {
  const val = parseInt(gesture, 10);
  if (isNaN(val) || val < 6 || val > 10) return;

  const leftCount = val - 5;
  const leftGesture = String(leftCount);
  const rightGesture = '5';

  const hScale = scale * 0.75;
  const gap = hScale * 0.95;
  const yOff = 6;

  drawMiniHand(ctx, leftGesture, cx - gap, cy + yOff, hScale, color, alpha);
  drawMiniHand(ctx, rightGesture, cx + gap, cy - yOff, hScale, color, alpha);
}

const ANIM_FADE_IN = 0.6;
const ANIM_HOLD = 2.8;
const ANIM_FADE_OUT = 0.6;
const ANIM_CYCLE = ANIM_FADE_IN + ANIM_HOLD + ANIM_FADE_OUT;

function calcAnim(t: number): { alpha: number; scaleMul: number } {
  const phase = t % ANIM_CYCLE;
  if (phase < ANIM_FADE_IN) {
    const p = phase / ANIM_FADE_IN;
    const ease = 1 - Math.pow(1 - p, 3);
    return { alpha: ease, scaleMul: 0.7 + 0.3 * ease };
  }
  if (phase < ANIM_FADE_IN + ANIM_HOLD) {
    const breathe = 1 + Math.sin(phase * 2) * 0.03;
    return { alpha: 1, scaleMul: breathe };
  }
  const p = (phase - ANIM_FADE_IN - ANIM_HOLD) / ANIM_FADE_OUT;
  const ease = 1 - Math.pow(1 - p, 2);
  return { alpha: 1 - ease, scaleMul: 1 - 0.3 * ease };
}

function isTwoHandGesture(gesture: string): boolean {
  return ['6', '7', '8', '9', '10'].includes(gesture);
}

export function useARGuide(steps: ARStep[], onComplete: () => void) {
  const [stepIndex, setStepIndex] = useState(0);
  const [mode, setMode] = useState<ARMode>('idle');
  const [lastGesture, setLastGesture] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(0);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const modeRef = useRef(mode);
  const stepIndexRef = useRef(stepIndex);
  const stepStartTime = useRef(Date.now());

  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { stepIndexRef.current = stepIndex; }, [stepIndex]);

  const currentStep = steps[stepIndex] ?? null;

  const start = useCallback(() => {
    setMode('waiting');
    setStepIndex(0);
    setLastGesture(null);
    setConfidence(0);
    stepStartTime.current = Date.now();
  }, []);

  const reset = useCallback(() => {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    setMode('idle');
    setStepIndex(0);
    setLastGesture(null);
    setConfidence(0);
  }, []);

  const skip = useCallback(() => {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    setMode('completed');
    setTimeout(onComplete, 400);
  }, [onComplete]);

  const reportGesture = useCallback((gesture: string, conf: number) => {
    if (!currentStep) return;
    if (modeRef.current === 'completed') return;

    setLastGesture(gesture);
    setConfidence(conf);

    if (gesture === currentStep.gesture && conf >= 70) {
      setMode('correct');
      playCorrectSound();
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
      feedbackTimer.current = setTimeout(() => {
        const nextIdx = stepIndexRef.current + 1;
        if (nextIdx >= steps.length) {
          setMode('completed');
          setTimeout(onComplete, 400);
        } else {
          setStepIndex(nextIdx);
          setMode('waiting');
          setLastGesture(null);
          setConfidence(0);
          stepStartTime.current = Date.now();
        }
      }, FEEDBACK_DISPLAY_MS);
    } else if (gesture !== 'Unknown' && conf >= 60) {
      if (modeRef.current !== 'correct') {
        setMode('incorrect');
        playIncorrectSound();
        if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
        feedbackTimer.current = setTimeout(() => {
          setMode('waiting');
          stepStartTime.current = Date.now();
        }, 1200);
      }
    }
  }, [currentStep, steps.length, onComplete]);

  const drawFeedback = useCallback((
    ctx: CanvasRenderingContext2D,
    W: number, H: number
  ) => {
    if (!currentStep) return;

    const centerX = W / 2;
    const centerY = H / 2;
    const baseScale = Math.min(W, H) * 0.6;
    const elapsed = (Date.now() - stepStartTime.current) / 1000;
    const anim = calcAnim(elapsed);
    const twoHand = isTwoHandGesture(currentStep.gesture);

    if (mode === 'waiting') {
      ctx.save();

      if (twoHand) {
        drawTwoHands(ctx, currentStep.gesture, centerX, centerY,
          baseScale * anim.scaleMul, '#a78bfa', 0.3 + 0.5 * anim.alpha);
      } else {
        const alpha = 0.3 + 0.5 * anim.alpha;
        drawHandSkeleton(ctx, makeLandmarks(currentStep.gesture),
          centerX, centerY, baseScale * anim.scaleMul, '#a78bfa', alpha);
      }

      ctx.restore();
    }

    if (mode === 'incorrect') {
      ctx.save();
      ctx.fillStyle = 'rgba(244, 63, 94, 0.08)';
      ctx.fillRect(0, 0, W, H);

      const pulse = Math.sin(Date.now() / 200) * 0.3 + 0.7;
      ctx.strokeStyle = `rgba(244, 63, 94, ${0.35 * pulse})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.strokeRect(10, 10, W - 20, H - 20);
      ctx.setLineDash([]);

      if (twoHand) {
        drawTwoHands(ctx, currentStep.gesture, centerX, centerY + 10,
          baseScale, '#60a5fa', 0.75);
      } else {
        drawHandSkeleton(ctx, makeLandmarks(currentStep.gesture),
          centerX, centerY, baseScale, '#60a5fa', 0.75);

        const pose = GESTURE_POSE[currentStep.gesture];
        const [_, ...fingerExts] = pose ?? [true, true, true, true, true];
        for (let i = 0; i < 4; i++) {
          if (fingerExts[i]) {
            const tipIdx = MCP_INDICES[i] + 3;
            const [lx, ly] = makeLandmarks(currentStep.gesture)[tipIdx];
            const ax = centerX + (lx - 0.5) * baseScale;
            const ay = centerY + (ly - 0.5) * baseScale;
            drawDirectionArrow(ctx, ax, ay - 20, '#60a5fa');
          }
        }
      }
      ctx.restore();
    }

    if (mode === 'correct') {
      ctx.save();
      ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
      ctx.fillRect(0, 0, W, H);

      const p = Math.sin(Date.now() / 200) * 0.15 + 0.85;
      ctx.strokeStyle = `rgba(16, 185, 129, ${0.35 * p})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.strokeRect(10, 10, W - 20, H - 20);
      ctx.setLineDash([]);

      const ghostLm = makeLandmarks(currentStep.gesture);
      drawHandSkeleton(ctx, ghostLm, W / 2, H / 2, baseScale * 0.7,
        '#34d399', 0.25);
      ctx.restore();
    }
  }, [mode, currentStep]);

  const progress = steps.length > 0 ? stepIndex / steps.length : 0;

  return {
    stepIndex,
    currentStep,
    mode,
    progress,
    lastGesture,
    confidence,
    steps,
    start,
    reset,
    skip,
    reportGesture,
    drawFeedback,
  };
}
