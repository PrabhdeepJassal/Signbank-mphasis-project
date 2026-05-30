import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useGestureControl,
  type GestureEvent,
  type HandData,
} from '../../hooks/useGestureControl';
import { playGestureTap, playGestureConfirm, playGestureCancel, playGestureNav } from '../../utils/sound';
import './GestureCamera.css';

interface Props {
  onGesture?:          (event: GestureEvent) => void;
  onLandmarks?:        (hands: HandData[]) => void;
  onGestureDetected?:  (name: string) => void;
  sliderMode?: boolean;
}

export default function GestureCamera({
  onGesture,
  onGestureDetected,
  onLandmarks,
  sliderMode = false,
}: Props) {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const navigate  = useNavigate();
  const [lastGestures, setLastGestures] = useState<{ h0: string; h1: string }>({ h0: '', h1: '' });
  const [active, setActive] = useState(false);
  const [handCount, setHandCount] = useState(0);

  useGestureControl(videoRef, canvasRef, {
    sliderMode,
    onLandmarks: (hands) => {
      setHandCount(hands.length);
      onLandmarks?.(hands);
    },
    onGesture: (evt) => {
      if (evt.type === 'BOTH_THUMBS_DOWN') {
        navigate('/');
        onGesture?.(evt);
        return;
      }
      if (evt.type !== 'SLIDER_ACTIVE' && evt.type !== 'SLIDER_COMMIT') {
        const label =
          evt.type === 'DIGIT'      ? `${evt.value} finger(s)` :
          evt.type === 'GESTURE_ID' ? evt.id :
          evt.type;
        const hand = 'hand' in evt ? (evt as any).hand ?? 0 : 0;
        setLastGestures(prev => hand === 0 ? { ...prev, h0: label } : { ...prev, h1: label });

        // Play contextual sounds
        if (evt.type === 'THUMB_UP') playGestureConfirm();
        else if (evt.type === 'THUMB_DOWN') playGestureCancel();
        else if (evt.type === 'GESTURE_ID') playGestureNav();
        else if (evt.type === 'DIGIT' || evt.type === 'FIST' || evt.type === 'OPEN_PALM') playGestureTap();
      }
      setActive(true);
      onGesture?.(evt);
      if (onGestureDetected) {
        if (evt.type === 'DIGIT') onGestureDetected(evt.value);
        else if (evt.type !== 'SLIDER_ACTIVE' && evt.type !== 'SLIDER_COMMIT')
          onGestureDetected(evt.type);
      }
    },
  });

  return (
    <div className={`gesture-camera ${active ? 'active' : ''}`}>
      <div className="camera-header">
        <span className="camera-title">
          {handCount > 1 ? '✋🤚 Both Hands Detected' : handCount === 1 ? '✋ Gesture Detection' : 'Gesture Detection'}
        </span>
        <span className={`status-dot ${active ? 'active' : 'loading'}`}>
          {active ? `● ${handCount} hand${handCount !== 1 ? 's' : ''}` : '● Loading'}
        </span>
      </div>

      <div className="camera-feed">
        <video ref={videoRef} className="camera-video" playsInline muted />
        <canvas ref={canvasRef} className="camera-canvas" />
        {sliderMode && (
          <div className="slider-hint-badge">🤘 Hold Rock → slide to set amount</div>
        )}
      </div>

      <div className="camera-prompt">
        {sliderMode
          ? 'Hold 🤘 Rock gesture with one hand → move left/right → 👍 Thumb Up to confirm'
          : 'Show one or both hands to interact'}
      </div>
      <div className="ai-status">
        {handCount >= 1 && lastGestures.h0 && (
          <span className="hand-status">✋ H1: <strong className="detected-gesture">{lastGestures.h0}</strong></span>
        )}
        {handCount >= 2 && lastGestures.h1 && (
          <span className="hand-status" style={{ marginLeft: 12 }}>🤚 H2: <strong className="detected-gesture">{lastGestures.h1}</strong></span>
        )}
        {handCount === 0 && (
          <span className={active ? 'ready' : 'not-ready'}>
            {active ? 'Waiting for hands...' : 'Initializing camera...'}
          </span>
        )}
      </div>
    </div>
  );
}
