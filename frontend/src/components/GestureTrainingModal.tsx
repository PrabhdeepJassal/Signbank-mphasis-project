import { useState, useEffect, useRef, useCallback } from 'react';
import GestureCamera from './GestureCamera/GestureCamera';
import type { GestureEvent } from '../hooks/useGestureControl';
import './GestureTrainingModal.css';

// ── Training steps ──
const STEPS = [
  { id: 'one',   gesture: '1', label: 'One Finger',       emoji: '☝️', targetFingers: 1, desc: 'Extend only your index finger' },
  { id: 'two',   gesture: '2', label: 'Two Fingers',       emoji: '✌️', targetFingers: 2, desc: 'Extend index & middle finger' },
  { id: 'three', gesture: '3', label: 'Three Fingers',     emoji: '🤟', targetFingers: 3, desc: 'Extend index, middle & ring finger' },
  { id: 'four',  gesture: '4', label: 'Four Fingers',      emoji: '🤘', targetFingers: 4, desc: 'Raise 4 fingers, tuck pinky' },
  { id: 'palm',  gesture: 'OPEN_PALM', label: 'Open Palm', emoji: '🖐️', targetFingers: 5, desc: 'Show all 5 fingers open' },
  { id: 'rock',  gesture: 'ROCK', label: 'Rock Sign',       emoji: '🤘', targetFingers: 2, desc: 'Index + pinky up, others curled' },
];

// ── Ghost hand landmark data (simplified for overlay) ──
const HAND_CONNS: [number, number][] = [
  [0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],
  [5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],
  [13,17],[0,17],[17,18],[18,19],[19,20],
];

const BASE_LM: [number, number][] = [
  [0.50,0.82],[0.34,0.72],[0.24,0.62],[0.19,0.52],[0.17,0.42],
  [0.40,0.54],[0.40,0.36],[0.40,0.26],[0.40,0.16],
  [0.50,0.50],[0.50,0.30],[0.50,0.20],[0.50,0.10],
  [0.60,0.54],[0.60,0.36],[0.60,0.28],[0.60,0.20],
  [0.68,0.64],[0.68,0.50],[0.68,0.44],[0.68,0.38],
];

const CURLED: Record<number, [[number,number],[number,number],[number,number]]> = {
  5: [[0.37,0.44],[0.35,0.50],[0.41,0.56]],
  9: [[0.47,0.40],[0.45,0.46],[0.51,0.52]],
  13:[[0.63,0.44],[0.65,0.50],[0.59,0.56]],
  17:[[0.71,0.54],[0.73,0.60],[0.67,0.64]],
};
const CURLED_THUMB: [[number,number],[number,number],[number,number]] = [[0.28,0.64],[0.33,0.58],[0.38,0.56]];
const MCP = [5,9,13,17];
const TIPS = [8,12,16,20];

type Phase = 'idle' | 'waiting' | 'holding' | 'recorded' | 'done';

function buildGhostPose(targetFingers: number): [number, number][] {
  const lm = BASE_LM.map(p => [...p]) as [number, number][];
  // expected [thumb, index, middle, ring, pinky]
  let expected: boolean[];
  switch (targetFingers) {
    case 1: expected = [false, true, false, false, false]; break;
    case 2: expected = [false, true, true, false, false]; break;
    case 3: expected = [false, true, true, true, false]; break;
    case 4: expected = [true,  true, false, true, true];  break;
    case 5: expected = [true,  true, true,  true, true];  break;
    default: expected = [false, false, false, false, false];
  }
  const [thumbExt, ...fingers] = expected;
  for (let i = 0; i < 4; i++) {
    if (!fingers[i]) {
      const m = MCP[i];
      const c = CURLED[m];
      lm[m+1] = [...c[0]]; lm[m+2] = [...c[1]]; lm[m+3] = [...c[2]];
    }
  }
  if (!thumbExt) {
    lm[2] = [...CURLED_THUMB[0]]; lm[3] = [...CURLED_THUMB[1]]; lm[4] = [...CURLED_THUMB[2]];
  }
  return lm;
}

function drawGhostHand(ctx: CanvasRenderingContext2D, cx: number, cy: number, scale: number, alpha: number, fingerCount: number) {
  const lm = buildGhostPose(fingerCount);
  const now = Date.now();
  const pulse = 0.85 + Math.sin(now / 500) * 0.15;
  const proj = (p: [number,number]) => [cx + (p[0]-0.5)*scale, cy + (p[1]-0.5)*scale] as const;

  ctx.save();
  ctx.globalAlpha = alpha * pulse;

  // Palm glow
  const palmIdxs = [0,5,9,13,17,0];
  ctx.beginPath();
  const [sx,sy] = proj(lm[0]); ctx.moveTo(sx,sy);
  for (let i = 1; i < palmIdxs.length; i++) { const [px,py] = proj(lm[palmIdxs[i]]); ctx.lineTo(px,py); }
  ctx.closePath();
  const pg = ctx.createRadialGradient(cx,cy,0,cx,cy,scale*0.35);
  pg.addColorStop(0,'rgba(0,229,255,0.25)'); pg.addColorStop(1,'rgba(0,229,255,0.05)');
  ctx.fillStyle = pg; ctx.fill();

  // Skeleton
  for (const [i,j] of HAND_CONNS) {
    const [x1,y1] = proj(lm[i]), [x2,y2] = proj(lm[j]);
    const isTip = [4,8,12,16,20].includes(j);
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = isTip ? 3 : 2;
    ctx.lineCap = 'round';
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = (isTip ? 18 : 10) * pulse;
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
  }
  ctx.shadowBlur = 0;

  // Joints
  for (let i = 0; i < lm.length; i++) {
    const [x,y] = proj(lm[i]);
    const isPalm = [0,5,9,13,17].includes(i);
    ctx.beginPath();
    ctx.arc(x,y, isPalm ? 3 : 2, 0, Math.PI*2);
    ctx.fillStyle = isPalm ? '#00e5ff' : '#fff';
    ctx.shadowColor = isPalm ? '#00e5ff' : 'rgba(255,255,255,0.5)';
    ctx.shadowBlur = isPalm ? 10 : 4;
    ctx.fill();
  }
  ctx.shadowBlur = 0;

  // Finger tip glow
  for (const idx of TIPS) {
    const [x,y] = proj(lm[idx]);
    const tg = ctx.createRadialGradient(x,y,0,x,y,8);
    tg.addColorStop(0,'#ffffff'); tg.addColorStop(0.4,'#00e5ff'); tg.addColorStop(1,'rgba(0,229,255,0)');
    ctx.beginPath(); ctx.arc(x,y,8*pulse,0,Math.PI*2); ctx.fillStyle = tg; ctx.fill();
  }

  ctx.restore();
}

// ── Hold progress ring ──
function drawHoldRing(ctx: CanvasRenderingContext2D, cx: number, cy: number, pct: number) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(cx,cy,28,0,Math.PI*2); ctx.stroke();
  ctx.strokeStyle = '#22c55e';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.shadowColor = '#22c55e';
  ctx.shadowBlur = 16;
  ctx.beginPath(); ctx.arc(cx,cy,28,-Math.PI/2,-Math.PI/2+pct*Math.PI*2); ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${Math.ceil((1-pct)*3)}s`, cx, cy);
  ctx.restore();
}

// ── Digit → finger count helper ──
function gestureToCount(evt: GestureEvent): number | null {
  if (evt.type === 'DIGIT') return parseInt(evt.value, 10);
  if (evt.type === 'OPEN_PALM') return 5;
  if (evt.type === 'ROCK') return 2;
  if (evt.type === 'FIST') return 0;
  if (evt.type === 'THUMB_UP' || evt.type === 'THUMB_DOWN') return 1;
  return null;
}

const HOLD_MS = 3000;

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function GestureTrainingModal({ visible, onClose }: Props) {
  const [stepIdx, setStepIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [holdPct, setHoldPct] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const holdStartRef = useRef(0);
  const holdAnimRef = useRef(0);
  const phaseRef = useRef(phase);
  const stepRef = useRef(stepIdx);
  const countRef = useRef(0); // detected finger count

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { stepRef.current = stepIdx; }, [stepIdx]);

  const currentStep = STEPS[stepIdx];

  // ── Start on visible ──
  useEffect(() => {
    if (visible) {
      setStepIdx(0);
      setPhase('waiting');
      setHoldPct(0);
    }
  }, [visible]);

  // ── Ghost hand render loop ──
  useEffect(() => {
    if (!visible) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let anim = 0;
    const W = canvas.clientWidth || 420, H = canvas.clientHeight || 340;
    canvas.width = W; canvas.height = H;

    const loop = () => {
      ctx.clearRect(0, 0, W, H);
      const p = phaseRef.current;
      const step = STEPS[stepRef.current];
      if (!step) return;

      const cx = W / 2, cy = H / 2 + 10;
      const scale = Math.min(W, H) * 0.45;

      // Ghost hand
      if (p === 'waiting' || p === 'holding') {
        drawGhostHand(ctx, cx, cy, scale, 0.8, step.targetFingers);

        // Label
        ctx.save();
        ctx.font = 'bold 16px system-ui';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillStyle = 'rgba(0,229,255,0.8)';
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 12;
        ctx.fillText(`${step.emoji} ${step.label}`, cx, H - 70);
        ctx.shadowBlur = 0;
        ctx.font = '12px system-ui';
        ctx.fillStyle = 'rgba(148,163,184,0.7)';
        ctx.fillText(step.desc, cx, H - 50);
        ctx.restore();
      }

      // Hold progress
      if (p === 'holding') {
        drawHoldRing(ctx, cx, cy + 120, holdPct);
        ctx.save();
        ctx.font = 'bold 13px system-ui';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#22c55e';
        ctx.fillText('Hold this gesture...', cx, cy + 165);
        ctx.restore();
      }

      // Recorded
      if (p === 'recorded') {
        ctx.save();
        ctx.fillStyle = 'rgba(16,185,129,0.1)';
        ctx.fillRect(0, 0, W, H);
        ctx.font = 'bold 40px system-ui';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#22c55e';
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 30;
        ctx.fillText('✅', cx, cy - 10);
        ctx.shadowBlur = 0;
        ctx.font = 'bold 18px system-ui';
        ctx.fillStyle = '#34d399';
        ctx.fillText('Recorded!', cx, cy + 40);
        ctx.restore();
      }

      anim = requestAnimationFrame(loop);
    };
    anim = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(anim);
  }, [visible]);

  // ── Handle hold timer ──
  const startHold = useCallback(() => {
    setPhase('holding');
    holdStartRef.current = Date.now();
    setHoldPct(0);
    const tick = () => {
      const elapsed = Date.now() - holdStartRef.current;
      const pct = Math.min(1, elapsed / HOLD_MS);
      setHoldPct(pct);
      if (pct >= 1) {
        setPhase('recorded');
        setHoldPct(0);
        setTimeout(() => {
          if (stepRef.current < STEPS.length - 1) {
            setStepIdx(i => i + 1);
            setPhase('waiting');
          } else {
            setPhase('done');
          }
        }, 800);
      } else {
        holdAnimRef.current = requestAnimationFrame(tick);
      }
    };
    holdAnimRef.current = requestAnimationFrame(tick);
  }, []);

  // ── Handle gesture events from the embedded GestureCamera ──
  const handleGesture = useCallback((evt: GestureEvent) => {
    if (phaseRef.current === 'recorded' || phaseRef.current === 'done' || phaseRef.current === 'idle') return;
    const count = gestureToCount(evt);
    if (count === null) return;
    countRef.current = count;
    if (evt.type === 'FIST') { onClose(); return; }

    if (phaseRef.current === 'waiting') {
      if (count === currentStep.targetFingers) {
        startHold();
      }
    } else if (phaseRef.current === 'holding') {
      if (count !== currentStep.targetFingers) {
        // Reset hold if gesture changes
        cancelAnimationFrame(holdAnimRef.current);
        setPhase('waiting');
        setHoldPct(0);
      }
    }
  }, [currentStep, startHold, onClose]);

  if (!visible) return null;

  if (phase === 'done') {
    return (
      <div className="gt-backdrop" onClick={onClose}>
        <div className="gt-modal" onClick={e => e.stopPropagation()}>
          <div className="gt-modal-header">
            <h2>🎯 Gesture Training</h2>
            <button className="gt-close-btn" onClick={onClose}>✕</button>
          </div>
          <div className="gt-done-body">
            <div className="gt-done-icon">🎉</div>
            <h3>All Gestures Recorded!</h3>
            <p>You've successfully trained all 6 gestures.</p>
            <button className="gt-finish-btn" onClick={onClose}>Finish</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="gt-backdrop" onClick={onClose}>
      <div className="gt-modal" onClick={e => e.stopPropagation()}>
        <div className="gt-modal-header">
          <h2>🎯 Gesture Training</h2>
          <button className="gt-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Progress bar */}
        <div className="gt-progress-row">
          <div className="gt-progress-track">
            <div className="gt-progress-fill" style={{ width: `${(stepIdx / STEPS.length) * 100}%` }} />
          </div>
          <span className="gt-progress-num">{stepIdx + 1} / {STEPS.length}</span>
        </div>

        <div className="gt-body">
          {/* Camera + AR overlay */}
          <div className="gt-camera-box">
            <div className="gt-camera-feed">
              <GestureCamera onGesture={handleGesture} />
            </div>
            <canvas ref={canvasRef} className="gt-ghost-canvas" />
          </div>

          {/* Steps list */}
          <div className="gt-steps-panel">
            <h3>Steps</h3>
            <div className="gt-steps-list">
              {STEPS.map((s, i) => (
                <div key={s.id} className={`gt-step ${i < stepIdx ? 'done' : ''} ${i === stepIdx ? 'active' : ''} ${phase === 'recorded' && i === stepIdx ? 'just-recorded' : ''}`}>
                  <span className="gt-step-badge">
                    {i < stepIdx ? '✅' : phase === 'recorded' && i === stepIdx ? '✅' : i === stepIdx ? '◉' : '○'}
                  </span>
                  <span>{s.emoji} {s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
