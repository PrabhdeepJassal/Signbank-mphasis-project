import React, { useEffect, useState } from 'react';
import './SOSOverlay.css';

interface SOSOverlayProps {
  /** Called when the user confirms it's a real emergency */
  onConfirm: () => void;
  /** Called when the user dismisses (false alarm) */
  onDismiss: () => void;
}

/**
 * Emergency SOS overlay triggered by 3 rapid eye blinks.
 * Shows a full-screen alert with a countdown and haptic feedback.
 */
const SOSOverlay: React.FC<SOSOverlayProps> = ({ onConfirm, onDismiss }) => {
  const [countdown, setCountdown] = useState(5);
  const [phase, setPhase] = useState<'alert' | 'confirming' | 'safe'>('alert');

  useEffect(() => {
    // Auto-confirm after countdown if no action taken
    if (phase === 'alert' && countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
    if (phase === 'alert' && countdown === 0) {
      setPhase('confirming');
      onConfirm();
    }
  }, [countdown, phase, onConfirm]);

  const handleSafe = () => {
    setPhase('safe');
    setTimeout(() => onDismiss(), 1500);
  };

  if (phase === 'safe') {
    return (
      <div className="sos-overlay sos-safe">
        <div className="sos-content">
          <div className="sos-icon">✅</div>
          <h2>False Alarm</h2>
          <p>Resuming normal operation.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sos-overlay">
      <div className="sos-content">
        <div className="sos-icon sos-pulse">🆘</div>
        <h1>EMERGENCY SOS</h1>
        <p className="sos-desc">
          Distress signal detected! If this is a real emergency, stay calm.
          The system will log out and lock the screen automatically.
        </p>
        <div className="sos-timer">
          <div className="sos-countdown">{countdown}</div>
          <span>Auto-locking in {countdown} seconds</span>
        </div>
        <div className="sos-actions">
          <button className="sos-btn sos-btn-danger" onClick={() => { setPhase('confirming'); onConfirm(); }}>
            ⚠️ Confirm Emergency
          </button>
          <button className="sos-btn sos-btn-safe" onClick={handleSafe}>
            ✅ I'm Safe — False Alarm
          </button>
        </div>
      </div>
    </div>
  );
};

export default SOSOverlay;
