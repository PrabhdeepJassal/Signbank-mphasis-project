import { useRef, useState } from 'react';
import {
  useGestureControl,
  type GestureEvent,
  type LandmarkPoint,
} from '../../hooks/useGestureControl';
import './GestureCamera.css';

interface Props {
  onGesture?:          (event: GestureEvent) => void;
  onLandmarks?:        (landmarks: LandmarkPoint[]) => void;
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
  const [lastGesture, setLastGesture] = useState('');
  const [active,      setActive]      = useState(false);

  useGestureControl(videoRef, canvasRef, {
    sliderMode,
    onLandmarks,
    onGesture: (evt) => {
      if (evt.type !== 'SLIDER_ACTIVE' && evt.type !== 'SLIDER_COMMIT') {
        const label =
          evt.type === 'DIGIT'      ? `${evt.value} finger(s)` :
          evt.type === 'GESTURE_ID' ? evt.id :
          evt.type;
        setLastGesture(label);
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
    <div className="gesture-camera">
      <div className="camera-header">
        <span className="camera-title">Live Gesture Detection</span>
        <span className={`status-dot ${active ? 'active' : 'loading'}`}>
          {active ? '● Active' : '● Loading'}
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
          ? 'Hold 🤘 Rock gesture → move hand left/right → 👍 Thumb Up to confirm'
          : 'Show a hand gesture to continue'}
      </div>
      <div className="ai-status">
        AI Detection:{' '}
        <span className={active ? 'ready' : 'not-ready'}>
          {active ? 'Ready' : 'Initializing'}
        </span>
        {lastGesture && (
          <span className="detected-gesture"> · {lastGesture}</span>
        )}
      </div>
    </div>
  );
}
