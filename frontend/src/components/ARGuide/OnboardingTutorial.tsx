import { useEffect, useRef, useImperativeHandle, forwardRef, type ReactNode } from 'react';
import { useARGuide, type ARStep } from '../../hooks/useARGuide';
import type { GestureEvent } from '../../hooks/useGestureControl';
import './OnboardingTutorial.css';

export const ONBOARDING_STEPS: ARStep[] = [
  { id: 'one', gesture: '1', label: 'One Finger ☝️', instruction: 'Raise just your index finger', ghostEmoji: '☝️' },
  { id: 'two', gesture: '2', label: 'Two Fingers ✌️', instruction: 'Raise index + middle (peace sign)', ghostEmoji: '✌️' },
  { id: 'three', gesture: '3', label: 'Three Fingers 🤌', instruction: 'Raise index + middle + ring', ghostEmoji: '🤌' },
  { id: 'four', gesture: '4', label: 'Four Fingers 🤘', instruction: 'Raise 4 fingers, tuck pinky', ghostEmoji: '🤘' },
  { id: 'palm', gesture: 'OPEN_PALM', label: 'Open Palm 🖐️', instruction: 'Show all 5 fingers — open hand', ghostEmoji: '🖐️' },
  { id: 'thumbs-up', gesture: 'THUMB_UP', label: 'Thumbs Up 👍', instruction: 'Thumb up, all other fingers curled', ghostEmoji: '👍' },
  { id: 'thumbs-down', gesture: 'THUMB_DOWN', label: 'Thumbs Down 👎', instruction: 'Thumb down, all other fingers curled', ghostEmoji: '👎' },
  { id: 'rock', gesture: 'ROCK', label: 'Rock Sign 🤘', instruction: 'Index + pinky up, middle + ring down', ghostEmoji: '🤘' },
  { id: 'six', gesture: '6', label: '6 Fingers 🖐️☝️', instruction: 'Open palm + 1 finger on other hand', ghostEmoji: '🖐️☝️' },
  { id: 'seven', gesture: '7', label: '7 Fingers 🖐️✌️', instruction: 'Open palm + 2 fingers on other hand', ghostEmoji: '🖐️✌️' },
  { id: 'eight', gesture: '8', label: '8 Fingers 🖐️🤌', instruction: 'Open palm + 3 fingers on other hand', ghostEmoji: '🖐️🤌' },
  { id: 'nine', gesture: '9', label: '9 Fingers 🖐️🤘', instruction: 'Open palm + 4 fingers on other hand', ghostEmoji: '🖐️🤘' },
  { id: 'ten', gesture: '10', label: '10 Fingers 🖐️🖐️', instruction: 'Open palms on both hands', ghostEmoji: '🖐️🖐️' },
];

export interface OnboardingHandle {
  reportGesture: (evt: GestureEvent) => void;
}

interface Props {
  visible: boolean;
  onDismiss: () => void;
  children?: ReactNode;
}

const OnboardingTutorial = forwardRef<OnboardingHandle, Props>(
  ({ visible, onDismiss, children }, ref) => {
    const guide = useARGuide(ONBOARDING_STEPS, onDismiss);
    const startedRef = useRef(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
      if (visible && !startedRef.current) {
        startedRef.current = true;
        guide.start();
      }
      if (!visible) {
        startedRef.current = false;
        guide.reset();
      }
    }, [visible]);

    // Self-contained AR canvas overlay
    useEffect(() => {
      if (!visible) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      let animId = 0;
      const W = 640, H = 480;
      canvas.width = W;
      canvas.height = H;

      const loop = () => {
        ctx.clearRect(0, 0, W, H);
        guide.drawFeedback(ctx, W, H);
        animId = requestAnimationFrame(loop);
      };
      animId = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(animId);
    }, [visible, guide.drawFeedback]);

    useImperativeHandle(ref, () => ({
      reportGesture: (evt: GestureEvent) => {
        let raw: string | null = null;
        if (evt.type === 'DIGIT') raw = evt.value;
        else if (evt.type === 'FIST') raw = 'FIST';
        else if (evt.type === 'OPEN_PALM') raw = 'OPEN_PALM';
        else if (evt.type === 'THUMB_UP') raw = 'THUMB_UP';
        else if (evt.type === 'THUMB_DOWN') raw = 'THUMB_DOWN';
        else if (evt.type === 'ROCK') raw = 'ROCK';
        else if (evt.type === 'OK') raw = 'OK';
        if (raw) guide.reportGesture(raw, guide.confidence > 0 ? guide.confidence : 80);
      },
    }), [guide]);

    if (!visible || guide.mode === 'completed') return null;

    return (
      <div className={`onboarding-overlay ${guide.mode}`}>
        <div className="onboarding-content">
          <div className="onboarding-header glass-strong">
            <div className="onboarding-title-row">
              <span className="onboarding-icon">🎮</span>
              <div>
                <h2>Gesture Training</h2>
                <p className="onboarding-sub">Master the basic gestures in 5 quick steps</p>
              </div>
            </div>
            <div className="onboarding-progress">
              <div className="onboarding-progress-track">
                <div
                  className="onboarding-progress-fill"
                  style={{ width: `${guide.progress * 100}%` }}
                />
              </div>
              <span className="onboarding-progress-text">
                {guide.stepIndex + 1} / {ONBOARDING_STEPS.length}
              </span>
            </div>
          </div>

          <div className="onboarding-camera-area">
            <div className="onboarding-camera-frame">
              <div className="onboarding-live-feed">{children}</div>
              <canvas ref={canvasRef} className="onboarding-ar-canvas" />

              {guide.mode === 'correct' && (
                <div className="onboarding-feedback correct-feedback">
                  <span className="feedback-icon">✓</span>
                  <span>Got it!</span>
                </div>
              )}
              {guide.mode === 'incorrect' && (
                <div className="onboarding-feedback incorrect-feedback">
                  <span className="feedback-icon">✕</span>
                  <span>Not quite — try again</span>
                </div>
              )}
            </div>

            <div className="onboarding-steps-list">
              {ONBOARDING_STEPS.map((step, i) => (
                <div
                  key={step.id}
                  className={`onboarding-step-item ${i < guide.stepIndex ? 'done' : ''} ${i === guide.stepIndex ? 'active' : ''}`}
                >
                  <span className="osi-status">
                    {i < guide.stepIndex ? '✓' : i === guide.stepIndex ? '●' : '○'}
                  </span>
                  <span className="osi-emoji">{step.ghostEmoji}</span>
                  <span className="osi-label">{step.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="onboarding-footer glass">
            <p className="onboarding-footer-hint">
              Show the gesture to the camera. Use <strong>👍 Thumbs Up</strong> to confirm if stuck.
            </p>
            <div className="onboarding-footer-actions">
              <button className="onboarding-skip-btn" onClick={guide.skip}>
                Skip Tutorial
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

OnboardingTutorial.displayName = 'OnboardingTutorial';
export default OnboardingTutorial;
