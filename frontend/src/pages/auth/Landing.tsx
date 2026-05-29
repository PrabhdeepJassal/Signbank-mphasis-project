import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import GestureCamera from '../../components/GestureCamera/GestureCamera';
import { useGlobalGestureNav } from '../../hooks/useGlobalGestureNav';
import OnboardingTutorial, { type OnboardingHandle } from '../../components/ARGuide/OnboardingTutorial';
import type { GestureEvent } from '../../hooks/useGestureControl';
import './Landing.css';

const roles = [
  {
    id: 'admin',
    label: 'ADMIN MODE',
    subLabel: 'Platform Control Panel',
    description: 'Manage gestures, custom commands, and database parameters.',
    emoji: '⚡',
    gesture: '☝️ One Finger',
    path: '/admin/login',
    accentColor: '#8b5cf6',
  },
  {
    id: 'operator',
    label: 'USER PORTAL',
    subLabel: 'Gesture-Driven ATM',
    description: 'Access balances, lock credit cards, and modify limits hands-free.',
    emoji: '💳',
    gesture: '✌️ Two Fingers',
    path: '/login/gesture',
    accentColor: '#06b6d4',
  },
  {
    id: 'viewer',
    label: 'VIEWER DESK',
    subLabel: 'Live Traffic Monitor',
    description: 'Inspect transaction analytics and security logs.',
    emoji: '📊',
    gesture: '🤌 Three Fingers',
    path: '/login/gesture',
    accentColor: '#10b981',
  },
];

export default function Landing() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<string[]>([
    'SYSTEM: Initializing SignBank Secure Shell...',
    'MEDIA_PIPE: Loading camera tracking nodes...',
  ]);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialDone, setTutorialDone] = useState(
    () => localStorage.getItem('sb_onboarding_done') === 'true'
  );
  const tutorialRef = useRef<OnboardingHandle>(null);

  // Simulate a live retro terminal stream on the HUD
  useEffect(() => {
    const messages = [
      'SECURE_SHELL: Cryptographic gesture handshake ready.',
      'GESTURE_ENGINE: Active camera listeners bound.',
      'SIGN_BANK: Enterprise bank portal online.',
      'SECURITY: PostgreSQL database flyway modules active.',
      'HUD: Console refresh rate synced (60fps).',
      'AI_CORE: Landmark tracking loaded.',
    ];
    let index = 0;
    const interval = setInterval(() => {
      if (index < messages.length) {
        setLogs((prev) => [...prev.slice(-4), messages[index]]);
        index++;
      } else {
        clearInterval(interval);
      }
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  const buttons = [
    { id: 'admin', gestureId: 'G001', action: () => navigate('/admin/login'), label: 'Admin Login' },
    { id: 'operator', gestureId: 'G002', action: () => navigate('/login/gesture'), label: 'Operator/Viewer Login' },
  ];

  const { handleGesture } = useGlobalGestureNav({ buttons });

  const handleNormalGesture = useCallback((evt: GestureEvent) => {
    handleGesture(evt);
  }, [handleGesture]);

  const handleTutorialGesture = useCallback((evt: GestureEvent) => {
    tutorialRef.current?.reportGesture(evt);
  }, []);

  const handleTutorialDismiss = useCallback(() => {
    setShowTutorial(false);
    setTutorialDone(true);
    localStorage.setItem('sb_onboarding_done', 'true');
  }, []);

  const handleTutorialShow = useCallback(() => {
    setShowTutorial(true);
    setTutorialDone(false);
  }, []);

  return (
    <div className="landing-cockpit" role="main" aria-label="SignBank Terminal Interface">
      {/* Immersive background mesh lights */}
      <div className="cockpit-bg" aria-hidden="true">
        <div className="ambient-blob primary-blob" />
        <div className="ambient-blob accent-blob" />
        <div className="ambient-blob success-blob" />
      </div>

      <div className="cockpit-grid">
        {/* ─── LEFT PANEL: System status HUD ─── */}
        <div className="cockpit-panel left-hud glass-strong">
          <div className="hud-header">
            <span className="hud-beacon" />
            <h2>SYSTEM STATUS HUD</h2>
          </div>

          <div className="hud-logo-section">
            <div className="hud-spinning-ring">
              <div className="inner-ring-content">SB</div>
            </div>
            <div className="hud-brand-details">
              <h1>SIGNBANK</h1>
              <p>ENTERPRISE SUITE v2.0</p>
            </div>
          </div>

          <div className="hud-terminal-box">
            <div className="terminal-title">LIVE ACTION FEED</div>
            <div className="terminal-content">
              {logs.map((log, i) => (
                <div key={i} className="terminal-line">
                  <span className="terminal-prompt">&gt;</span> {log}
                </div>
              ))}
            </div>
          </div>

          <div className="hud-metrics">
            <div className="metric-item">
              <span className="metric-lbl">ACTIVE CAMERA</span>
              <span className="metric-val text-success">READY</span>
            </div>
            <div className="metric-item">
              <span className="metric-lbl">TRACKING NODE</span>
              <span className="metric-val text-accent">MEDIAPIPE v3</span>
            </div>
            <div className="metric-item">
              <span className="metric-lbl">SECURITY LOCK</span>
              <span className="metric-val text-primary">AES_256_GCM</span>
            </div>
          </div>

          <div className="hud-footer">
            SECURE HANDS-FREE GESTURE GATEWAY
          </div>
        </div>

        {/* ─── RIGHT PANEL: cascading cyber role selectors ─── */}
        <div className="cockpit-panel right-controls">
          <div className="controls-header">
            <h2>SELECT OPERATING MODE</h2>
            <p>Show physical hands-free gestures or select mode via clicks</p>
          </div>

          <div className="cascading-selectors" role="group" aria-label="Operating modes selection">
            {roles.map((r, index) => (
              <button
                key={r.id}
                className="selector-module glass"
                onClick={() => navigate(r.path)}
                aria-label={`Activate ${r.label}`}
                style={{
                  '--accent': r.accentColor,
                  animationDelay: `${index * 0.1}s`,
                } as React.CSSProperties}
              >
                <div className="module-left" style={{ background: `linear-gradient(135deg, ${r.accentColor}, rgba(0,0,0,0))` }}>
                  <span className="module-emoji">{r.emoji}</span>
                </div>
                <div className="module-info">
                  <span className="module-sub">{r.subLabel}</span>
                  <h3>{r.label}</h3>
                  <p>{r.description}</p>
                </div>
                <div className="module-right">
                  <span className="module-gesture-badge">{r.gesture}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Camera Visualizer container integrated into cockpit controls */}
          {!showTutorial && (
            <div className="hud-camera-frame glass-strong">
              <div className="cam-frame-title">
                <span className="cam-pulse-dot" />
                SENSORS FEED V.02
              </div>
              <GestureCamera onGesture={handleNormalGesture} />
              {!tutorialDone && (
                <button className="ar-start-btn glass" onClick={handleTutorialShow}>
                  <span className="ar-start-icon">🎮</span>
                  <div className="ar-start-text">
                    <strong>AR Training</strong>
                    <span>Learn gestures in 5 steps</span>
                  </div>
                  <span className="ar-start-badge">NEW</span>
                </button>
              )}
              {tutorialDone && (
                <div className="ar-restart-hint">
                  <button className="ar-restart-btn" onClick={handleTutorialShow}>
                    🎮 Retry tutorial
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <OnboardingTutorial
        ref={tutorialRef}
        visible={showTutorial}
        onDismiss={handleTutorialDismiss}
      >
        {showTutorial && (
          <GestureCamera onGesture={handleTutorialGesture} />
        )}
      </OnboardingTutorial>
    </div>
  );
}
