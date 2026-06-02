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

// ── Hand skeleton connections ──
const HAND_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [0, 9], [9, 10], [10, 11], [11, 12],
  [0, 13], [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20],
  [5, 9], [9, 13], [13, 17],
];

// ── Base landmark positions (neutral hand) ──
const BASE_LM: [number, number][] = [
  [0.50, 0.82], [0.34, 0.72], [0.24, 0.62], [0.19, 0.52], [0.17, 0.42],
  [0.40, 0.54], [0.40, 0.36], [0.40, 0.26], [0.40, 0.16],
  [0.50, 0.50], [0.50, 0.30], [0.50, 0.20], [0.50, 0.10],
  [0.60, 0.54], [0.60, 0.36], [0.60, 0.28], [0.60, 0.20],
  [0.68, 0.64], [0.68, 0.50], [0.68, 0.44], [0.68, 0.38],
];

// ── Curled finger positions for each MCP joint ──
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
  '1':          [false, true,  false, false, false],
  '2':          [false, true,  true,  false, false],
  '3':          [false, true,  true,  true,  false],
  '4':          [false, true,  true,  true,  true ],
  '5':          [true,  true,  true,  true,  true ],
  'FIST':       [false, false, false, false, false],
  'OPEN_PALM':  [true,  true,  true,  true,  true ],
  'THUMB_UP':   [true,  false, false, false, false],
  'THUMB_DOWN': [true,  false, false, false, false],
  'ROCK':       [false, true,  false, false, true ],
  'OK':         [false, true,  false, false, false],
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

function applyThumbDown(lm: [number, number][]) {
  applyPose(lm, [false, false, false, false, false] as Pose);
  lm[1] = [0.30, 0.55]; lm[2] = [0.26, 0.62];
  lm[3] = [0.28, 0.74]; lm[4] = [0.30, 0.86];
}

function applyOkPose(lm: [number, number][]) {
  applyPose(lm, [false, false, false, false, false] as Pose);
  lm[2] = [0.32, 0.52]; lm[3] = [0.28, 0.48]; lm[4] = [0.25, 0.46];
  lm[6] = [0.38, 0.52]; lm[7] = [0.32, 0.50]; lm[8] = [0.25, 0.46];
}

function makeLandmarks(gesture: string): [number, number][] {
  const lm = BASE_LM.map(p => [...p] as [number, number]);
  if (gesture === 'THUMB_DOWN') { applyThumbDown(lm); return lm; }
  if (gesture === 'OK') { applyOkPose(lm); return lm; }
  const pose = GESTURE_POSE[gesture];
  if (pose) applyPose(lm, pose);
  return lm;
}

// ── Particle system for celebration effects ──
interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; size: number; color: string;
}

function spawnParticles(cx: number, cy: number, count: number): Particle[] {
  const particles: Particle[] = [];
  const colors = ['#00e5ff', '#a78bfa', '#34d399', '#fbbf24', '#f472b6'];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
    const speed = 2 + Math.random() * 4;
    particles.push({
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      life: 1,
      maxLife: 30 + Math.random() * 30,
      size: 2 + Math.random() * 4,
      color: colors[Math.floor(Math.random() * colors.length)],
    });
  }
  return particles;
}

function updateParticles(particles: Particle[]): Particle[] {
  return particles
    .map(p => ({
      ...p,
      x: p.x + p.vx,
      y: p.y + p.vy,
      vy: p.vy + 0.08,
      life: p.life - 1 / p.maxLife,
    }))
    .filter(p => p.life > 0);
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  for (const p of particles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 12;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ── VR-style skeleton drawing with neon hologram effect ──
function drawHandSkeletonVR(
  ctx: CanvasRenderingContext2D,
  landmarks: [number, number][],
  cx: number, cy: number, scale: number,
  color: string, alpha: number, neonIntensity = 1
) {
  ctx.save();
  ctx.globalAlpha = alpha;

  const proj = (lm: [number, number]) =>
    [cx + (lm[0] - 0.5) * scale, cy + (lm[1] - 0.5) * scale] as const;

  const now = Date.now();
  const pulse = 0.85 + Math.sin(now / 400) * 0.15; // gentle breathing pulse

  // ── Palm glow (radial gradient) ──
  const PALM_INDICES = [0, 5, 9, 13, 17, 0];
  ctx.beginPath();
  const [sx, sy] = proj(landmarks[0]);
  ctx.moveTo(sx, sy);
  for (let i = 1; i < PALM_INDICES.length; i++) {
    const [px, py] = proj(landmarks[PALM_INDICES[i]]);
    ctx.lineTo(px, py);
  }
  ctx.closePath();
  const palmGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, scale * 0.4);
  palmGrad.addColorStop(0, color + '44');
  palmGrad.addColorStop(0.5, color + '22');
  palmGrad.addColorStop(1, color + '00');
  ctx.fillStyle = palmGrad;
  ctx.fill();

  // ── Outer glow ring around the hand ──
  ctx.beginPath();
  ctx.arc(cx, cy, scale * 0.35, 0, Math.PI * 2);
  ctx.strokeStyle = color + '22';
  ctx.lineWidth = 1;
  ctx.shadowColor = color;
  ctx.shadowBlur = 30 * neonIntensity;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // ── Finger bones with neon glow ──
  for (const [i, j] of HAND_CONNECTIONS) {
    const [x1, y1] = proj(landmarks[i]);
    const [x2, y2] = proj(landmarks[j]);
    const isTipConn = [4, 8, 12, 16, 20].includes(j);
    ctx.strokeStyle = color;
    ctx.lineWidth = isTipConn ? 3.5 : 2.5;
    ctx.lineCap = 'round';
    ctx.shadowColor = color;
    ctx.shadowBlur = (isTipConn ? 20 : 12) * neonIntensity * pulse;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;

  // ── Joint dots ──
  for (const [i, lm] of landmarks.entries()) {
    const [x, y] = proj(lm);
    const isPalmJoint = [0, 5, 9, 13, 17].includes(i);
    const isWrist = i === 0;
    const radius = isWrist ? 4 : isPalmJoint ? 3.5 : FINGER_TIP_INDICES.includes(i) ? 3 : 2;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = isPalmJoint ? color : '#ffffff';
    ctx.shadowColor = isPalmJoint ? color : 'rgba(255,255,255,0.6)';
    ctx.shadowBlur = isPalmJoint ? 12 * neonIntensity * pulse : 6;
    ctx.fill();
  }
  ctx.shadowBlur = 0;

  // ── Finger tip glow rings ──
  for (const idx of FINGER_TIP_INDICES) {
    const [x, y] = proj(landmarks[idx]);
    const tipGrad = ctx.createRadialGradient(x, y, 0, x, y, 10);
    tipGrad.addColorStop(0, '#ffffff');
    tipGrad.addColorStop(0.3, color);
    tipGrad.addColorStop(1, color + '00');
    ctx.beginPath();
    ctx.arc(x, y, 10 * neonIntensity * pulse, 0, Math.PI * 2);
    ctx.fillStyle = tipGrad;
    ctx.shadowColor = color;
    ctx.shadowBlur = 24 * neonIntensity * pulse;
    ctx.fill();
  }

  ctx.restore();
}

function drawMiniHandVR(
  ctx: CanvasRenderingContext2D,
  gesture: string,
  cx: number, cy: number, scale: number,
  color: string, alpha: number, neonIntensity = 1
) {
  const lm = makeLandmarks(gesture);
  drawHandSkeletonVR(ctx, lm, cx, cy, scale, color, alpha, neonIntensity);
}

// ── Two-hand gesture drawing ──
function drawTwoHandsVR(
  ctx: CanvasRenderingContext2D,
  gesture: string,
  cx: number, cy: number, scale: number,
  color: string, alpha: number
) {
  const val = parseInt(gesture, 10);
  if (isNaN(val) || val < 6 || val > 10) return;
  const leftCount = val - 5;
  const hScale = scale * 0.75;
  const gap = hScale * 0.95;
  const yOff = 6;
  drawMiniHandVR(ctx, String(leftCount), cx - gap, cy + yOff, hScale, color, alpha);
  drawMiniHandVR(ctx, '5', cx + gap, cy - yOff, hScale, color, alpha);
}

// ── Guided hand positioning reticle ──
function drawGuidedReticle(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, radius: number,
  detected: boolean
) {
  const now = Date.now();
  const pulse = 0.6 + Math.sin(now / 300) * 0.4;
  const color = detected ? '#22c55e' : 'rgba(148, 163, 184, 0.4)';

  // Outer dashed ring
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 8]);
  ctx.shadowColor = detected ? '#22c55e' : 'transparent';
  ctx.shadowBlur = detected ? 20 : 0;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Corner brackets
  const bracketSize = 18;
  const bracketGap = 8;
  ctx.lineWidth = 2;
  ctx.strokeStyle = color;
  const corners = [
    [-1, -1], [1, -1], [-1, 1], [1, 1],
  ];
  for (const [dx, dy] of corners) {
    const bx = cx + dx * (radius + bracketGap);
    const by = cy + dy * (radius + bracketGap);
    ctx.beginPath();
    ctx.moveTo(bx - dx * bracketSize, by);
    ctx.lineTo(bx, by);
    ctx.lineTo(bx, by - dy * bracketSize);
    ctx.stroke();
  }

  // Center crosshair dot
  ctx.fillStyle = color;
  ctx.shadowColor = detected ? '#22c55e' : 'transparent';
  ctx.shadowBlur = detected ? 12 * pulse : 0;
  ctx.beginPath();
  ctx.arc(cx, cy, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// ── HUD overlay ──
function drawHUD(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  stepLabel: string,
  stepEmoji: string,
  instruction: string,
  detectedFingers: number | null,
  targetFingers: number | null,
  mode: ARMode
) {
  ctx.save();

  // Top HUD bar
  ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
  ctx.beginPath();
  ctx.roundRect(8, 8, W - 16, 44, 10);
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 16px system-ui';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${stepEmoji} ${stepLabel}`, 20, 30);

  ctx.textAlign = 'right';
  ctx.font = '12px system-ui';
  ctx.fillStyle = '#64748b';
  ctx.fillText(instruction, W - 16, 30);

  // Bottom HUD — finger count
  if (detectedFingers !== null && targetFingers !== null && mode === 'waiting') {
    const isMatch = detectedFingers === targetFingers;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.beginPath();
    ctx.roundRect(8, H - 38, 180, 30, 8);
    ctx.fill();

    ctx.font = 'bold 13px system-ui';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isMatch ? '#22c55e' : '#f87171';
    ctx.fillText(`Fingers: ${detectedFingers} / ${targetFingers}`, 16, H - 23);
  }

  ctx.restore();
}

// ── Animation timing ──
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

// ── Parse finger count from a gesture string ──
function gestureToFingerCount(gesture: string): number | null {
  if (/^[0-9]$|^10$/.test(gesture)) return parseInt(gesture, 10);
  if (gesture === 'OPEN_PALM' || gesture === '5') return 5;
  if (gesture === 'FIST' || gesture === '0') return 0;
  if (gesture === 'THUMB_UP' || gesture === 'THUMB_DOWN') return 1;
  if (gesture === 'ROCK') return 2;
  if (gesture === 'OK') return 1;
  return null;
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

  // Particle system state
  const particlesRef = useRef<Particle[]>([]);
  const particleSpawnedRef = useRef(false);

  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { stepIndexRef.current = stepIndex; }, [stepIndex]);

  const currentStep = steps[stepIndex] ?? null;

  const start = useCallback(() => {
    setMode('waiting');
    setStepIndex(0);
    setLastGesture(null);
    setConfidence(0);
    stepStartTime.current = Date.now();
    particlesRef.current = [];
    particleSpawnedRef.current = false;
  }, []);

  const reset = useCallback(() => {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    setMode('idle');
    setStepIndex(0);
    setLastGesture(null);
    setConfidence(0);
    particlesRef.current = [];
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
      // Spawn celebration particles
      particleSpawnedRef.current = true;
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
          particlesRef.current = [];
          particleSpawnedRef.current = false;
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

  // ── Main draw function called every RAF by OnboardingTutorial ──
  const drawFeedback = useCallback((
    ctx: CanvasRenderingContext2D,
    W: number, H: number,
    detectedLandmarks?: { x: number; y: number }[] | null // optional real hand landmarks
  ) => {
    if (!currentStep) return;

    const centerX = W / 2;
    const centerY = H / 2 + 30; // slightly below center to match natural hand position
    const baseScale = Math.min(W, H) * 0.55;
    const elapsed = (Date.now() - stepStartTime.current) / 1000;
    const anim = calcAnim(elapsed);
    const twoHand = isTwoHandGesture(currentStep.gesture);
    const now = Date.now();

    // ── WAITING mode: show ghost hand with VR glow ──
    if (mode === 'waiting') {
      // Draw guided reticle
      const handDetected = detectedLandmarks && detectedLandmarks.length > 0;
      drawGuidedReticle(ctx, centerX, centerY, baseScale * 0.4, !!handDetected);

      // Draw ghost hand
      if (twoHand) {
        drawTwoHandsVR(ctx, currentStep.gesture, centerX, centerY,
          baseScale * anim.scaleMul, '#00e5ff', 0.3 + 0.5 * anim.alpha);
      } else {
        drawHandSkeletonVR(ctx, makeLandmarks(currentStep.gesture),
          centerX, centerY, baseScale * anim.scaleMul, '#00e5ff',
          0.3 + 0.5 * anim.alpha, 1.2);
      }

      // If user's hand is detected, draw a comparison indicator
      if (handDetected) {
        // Draw a subtle "your hand" label
        ctx.save();
        ctx.font = '10px system-ui';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
        ctx.fillText('YOUR HAND →', centerX + baseScale * 0.55, centerY - 10);
        ctx.restore();
      }

      // Ghost hand label
      ctx.save();
      ctx.font = '10px system-ui';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(0, 229, 255, 0.6)';
      ctx.fillText('← TARGET POSE', centerX - baseScale * 0.55, centerY - 10);
      ctx.restore();
    }

    // ── INCORRECT mode: show ghost hand + error indication ──
    if (mode === 'incorrect') {
      ctx.save();
      // Red tint overlay
      ctx.fillStyle = 'rgba(244, 63, 94, 0.06)';
      ctx.fillRect(0, 0, W, H);

      // Pulsing red border
      const pulse = Math.sin(now / 200) * 0.3 + 0.7;
      ctx.strokeStyle = `rgba(244, 63, 94, ${0.3 * pulse})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.strokeRect(10, 10, W - 20, H - 20);
      ctx.setLineDash([]);

      // Show ghost hand with guidance (blue color - indicating correction)
      if (twoHand) {
        drawTwoHandsVR(ctx, currentStep.gesture, centerX, centerY + 10,
          baseScale, '#60a5fa', 0.75);
      } else {
        drawHandSkeletonVR(ctx, makeLandmarks(currentStep.gesture),
          centerX, centerY, baseScale, '#60a5fa', 0.7, 0.8);

        // Direction arrows for fingers that should be extended
        const pose = GESTURE_POSE[currentStep.gesture];
        const [_, ...fingerExts] = pose ?? [true, true, true, true, true];
        for (let i = 0; i < 4; i++) {
          if (fingerExts[i]) {
            const tipIdx = MCP_INDICES[i] + 3;
            const [lx, ly] = makeLandmarks(currentStep.gesture)[tipIdx];
            const ax = centerX + (lx - 0.5) * baseScale;
            const ay = centerY + (ly - 0.5) * baseScale;
            // Small arrow indicator
            ctx.save();
            ctx.translate(ax, ay - 20);
            ctx.globalAlpha = 0.6 + Math.sin(now / 250) * 0.4;
            ctx.fillStyle = '#60a5fa';
            ctx.shadowColor = '#60a5fa';
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.moveTo(0, -10);
            ctx.lineTo(-6, 0);
            ctx.lineTo(-3, 0);
            ctx.lineTo(-3, 8);
            ctx.lineTo(3, 8);
            ctx.lineTo(3, 0);
            ctx.lineTo(6, 0);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          }
        }
      }

      ctx.restore();
    }

    // ── CORRECT mode: celebration effects ──
    if (mode === 'correct') {
      ctx.save();

      // Green tint
      ctx.fillStyle = 'rgba(16, 185, 129, 0.06)';
      ctx.fillRect(0, 0, W, H);

      // Pulsing green border
      const p = Math.sin(now / 200) * 0.15 + 0.85;
      ctx.strokeStyle = `rgba(16, 185, 129, ${0.3 * p})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.strokeRect(10, 10, W - 20, H - 20);
      ctx.setLineDash([]);

      // Ghost hand fade-out
      if (twoHand) {
        drawTwoHandsVR(ctx, currentStep.gesture, W / 2, H / 2,
          baseScale * 0.7, '#34d399', 0.2);
      } else {
        drawHandSkeletonVR(ctx, makeLandmarks(currentStep.gesture),
          W / 2, H / 2, baseScale * 0.7, '#34d399', 0.2, 0.5);
      }

      // Spawn particles on first correct frame
      if (particleSpawnedRef.current && particlesRef.current.length === 0) {
        particlesRef.current = spawnParticles(W / 2, H / 2, 36);
        particleSpawnedRef.current = false;
      }

      // Update and draw particles
      particlesRef.current = updateParticles(particlesRef.current);
      drawParticles(ctx, particlesRef.current);

      ctx.restore();
    }

    // ── Always draw HUD (except in idle/completed) ──
    if (mode !== 'idle' && mode !== 'completed') {
      // Show detected finger info based on last gesture
      const detectedCount = lastGesture ? gestureToFingerCount(lastGesture) : null;
      const targetCount = gestureToFingerCount(currentStep.gesture);
      drawHUD(ctx, W, H, currentStep.label, currentStep.ghostEmoji,
        currentStep.instruction, detectedCount, targetCount, mode);
    }

    // ── Big status text overlay ──
    if (mode === 'correct') {
      ctx.save();
      ctx.fillStyle = 'rgba(16, 185, 129, 0.9)';
      ctx.font = 'bold 28px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#34d399';
      ctx.shadowBlur = 30;
      ctx.fillText('✅ GOT IT!', W / 2, H / 2 - baseScale * 0.6);
      ctx.restore();
    }

    if (mode === 'incorrect') {
      ctx.save();
      ctx.fillStyle = 'rgba(244, 63, 94, 0.9)';
      ctx.font = 'bold 22px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 20;
      ctx.fillText('✕ NOT QUITE — TRY AGAIN', W / 2, H / 2 - baseScale * 0.6);
      ctx.restore();
    }

  }, [mode, currentStep, lastGesture]);

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
