let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.1) {
  try {
    const ctx = getCtx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, ctx.currentTime);
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g);
    g.connect(ctx.destination);
    o.start(ctx.currentTime);
    o.stop(ctx.currentTime + dur);
  } catch { }
}

export function playGestureTap() {
  tone(880, 0.06, 'sine', 0.06);
}

export function playGestureConfirm() {
  tone(523, 0.1, 'sine', 0.1);
  setTimeout(() => tone(659, 0.1, 'sine', 0.1), 80);
  setTimeout(() => tone(784, 0.15, 'sine', 0.1), 160);
}

export function playGestureCancel() {
  tone(220, 0.2, 'sawtooth', 0.05);
}

export function playGestureNav() {
  tone(660, 0.05, 'sine', 0.05);
  setTimeout(() => tone(880, 0.05, 'sine', 0.05), 50);
}

export function playCorrectSound() {
  tone(523, 0.12, 'sine', 0.12);
  setTimeout(() => tone(659, 0.12, 'sine', 0.12), 100);
  setTimeout(() => tone(784, 0.2, 'sine', 0.12), 200);
}

export function playIncorrectSound() {
  tone(200, 0.3, 'sawtooth', 0.08);
}
