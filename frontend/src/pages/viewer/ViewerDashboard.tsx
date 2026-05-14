import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PortalLayout from '../../components/Layout/PortalLayout';
import GestureCamera from '../../components/GestureCamera/GestureCamera';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../api/client';
import type { Command, CommandMapping, Gesture } from '../../types';
import type { GestureEvent } from '../../hooks/useGestureControl';
import './ViewerDashboard.css';

const FALLBACK_COMMANDS: Command[] = [
  { commandId: 'C004', commandName: 'View Logs',      commandDescription: 'Navigate to View Logs page',      page: { pageId: 'P003', pageName: 'Viewer Dashboard' } },
  { commandId: 'C005', commandName: 'View Analytics', commandDescription: 'Navigate to View Analytics page', page: { pageId: 'P003', pageName: 'Viewer Dashboard' } },
];
const FALLBACK_MAPPINGS: CommandMapping[] = [
  { mapId: 'M004', commandId: 'C004', roleId: 'R002', gestureId: 'G001', userId: null, isActive: true },
  { mapId: 'M005', commandId: 'C005', roleId: 'R002', gestureId: 'G002', userId: null, isActive: true },
];
const FALLBACK_GESTURES: Gesture[] = [
  { gestureId: 'G001', gestureName: 'One Finger',               gestureSymbol: '☝️' },
  { gestureId: 'G002', gestureName: 'Two Finger',               gestureSymbol: '✌️' },
  { gestureId: 'G003', gestureName: 'Three Finger',             gestureSymbol: '🤌' },
  { gestureId: 'G004', gestureName: 'Closed middle Two Finger', gestureSymbol: '🤘' },
  { gestureId: 'G005', gestureName: 'Open Palm',                gestureSymbol: '🖐️' },
  { gestureId: 'G006', gestureName: 'Thumbs Up',                gestureSymbol: '👍' },
  { gestureId: 'G007', gestureName: 'Thumbs Down',              gestureSymbol: '👎' },
  { gestureId: 'G008', gestureName: 'Fist',                     gestureSymbol: '✊' },
  { gestureId: 'G009', gestureName: 'Middle Two Closed',        gestureSymbol: '🤟' },
];

export default function ViewerDashboard() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [commands, setCommands] = useState<Command[]>(FALLBACK_COMMANDS);
  const [mappings, setMappings] = useState<CommandMapping[]>(FALLBACK_MAPPINGS);
  const [gestures, setGestures] = useState<Gesture[]>(FALLBACK_GESTURES);

  useEffect(() => {
    Promise.allSettled([
      apiClient.get<Command[]>('/api/admin/commands').then(r => setCommands(r.data)),
      apiClient.get<CommandMapping[]>('/api/admin/mappings').then(r => setMappings(r.data)),
      apiClient.get<Gesture[]>('/api/admin/gestures').then(r => setGestures(r.data)),
    ]);
  }, []);

  const dashCommands = commands.filter(
    c => c.page?.pageId === 'P003' && c.commandName.toLowerCase() !== 'logout'
  );

  const getMappedGesture = (commandId: string) => {
    const mapping = mappings.find(m => m.commandId === commandId && m.roleId === 'R002' && m.userId === null);
    if (!mapping) return null;
    return gestures.find(g => g.gestureId === mapping.gestureId);
  };

  const handleCommandClick = (commandName: string) => {
    if (commandName === 'View Logs')      navigate('/viewer/logs');
    if (commandName === 'View Analytics') navigate('/viewer/analytics');
  };

  const doLogout = useCallback(() => {
    logout();
    navigate('/');
  }, [logout, navigate]);

  const handleGesture = useCallback((evt: GestureEvent) => {
    // If logout confirm modal is open
    if (showLogoutConfirm) {
      if (evt.type === 'THUMB_UP')    { doLogout(); return; }
      if (evt.type === 'THUMB_DOWN')  { setShowLogoutConfirm(false); return; }
      if (evt.type === 'BACK_DYNAMIC'){ setShowLogoutConfirm(false); return; }
      return;
    }

    if (evt.type === 'BACK_DYNAMIC') {
      setShowLogoutConfirm(true);
      return;
    }

    if (evt.type === 'GESTURE_ID' && evt.id === 'G003') {
      setShowLogoutConfirm(true);
      return;
    }

    const gestureId = evt.type === 'GESTURE_ID' ? evt.id : null;
    if (!gestureId) return;
    for (const cmd of dashCommands) {
      const mapped = getMappedGesture(cmd.commandId);
      if (mapped?.gestureId === gestureId) { handleCommandClick(cmd.commandName); return; }
    }
  }, [showLogoutConfirm, doLogout, dashCommands, mappings, gestures]);

  const cardAccents = ['#059669', '#7c3aed', '#2563eb', '#d97706'];
  const cardBgs     = ['#f0fdf4', '#faf5ff', '#eff6ff', '#fffbeb'];

  return (
    <PortalLayout title="Viewer" subtitle="Portal">
      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="logout-confirm-overlay">
          <div className="logout-confirm-box">
            <div className="logout-confirm-left">
              <div className="logout-confirm-icon">🚪</div>
              <h2 className="logout-confirm-title">Confirm Logout</h2>
              <p className="logout-confirm-desc">
                Are you sure you want to log out of SignBank?
              </p>

              <div className="logout-gesture-hints">
                <div className="logout-gesture-item yes">
                  <span className="logout-gesture-icon">👍</span>
                  <div>
                    <div className="logout-gesture-label">Thumb Up = Logout</div>
                    <div className="logout-gesture-sub">Confirm and exit session</div>
                  </div>
                </div>
                <div className="logout-gesture-item no">
                  <span className="logout-gesture-icon">👎</span>
                  <div>
                    <div className="logout-gesture-label">Thumb Down = Cancel</div>
                    <div className="logout-gesture-sub">Stay logged in</div>
                  </div>
                </div>
                <div className="logout-gesture-item back">
                  <span className="logout-gesture-icon">🖐️→✊</span>
                  <div>
                    <div className="logout-gesture-label">Back Dynamic = Cancel</div>
                    <div className="logout-gesture-sub">Return to dashboard</div>
                  </div>
                </div>
              </div>

              <div className="logout-confirm-buttons">
                <button
                  className="logout-cancel-btn"
                  onClick={() => setShowLogoutConfirm(false)}
                >
                  ✕ Cancel
                </button>
                <button
                  className="logout-confirm-btn"
                  onClick={doLogout}
                >
                  👍 Logout
                </button>
              </div>
            </div>

            <div className="logout-confirm-right">
              <div className="logout-camera-label">
                <span className="logout-cam-dot" /> Live Gesture Camera
              </div>
              <GestureCamera onGesture={handleGesture} />
            </div>
          </div>
        </div>
      )}

      <div className="viewer-dashboard">
        <div className="commands-panel">
          <h2>Available Commands</h2>
          <div className="viewer-command-cards">
            {dashCommands.map((cmd, i) => {
              const gesture = getMappedGesture(cmd.commandId);
              return (
                <div key={cmd.commandId} className="viewer-cmd-card"
                  style={{ background: cardBgs[i % cardBgs.length], borderLeft: `4px solid ${cardAccents[i % cardAccents.length]}` }}
                  onClick={() => handleCommandClick(cmd.commandName)}>
                  <div className="vcmd-dot" style={{ background: cardAccents[i % cardAccents.length] }} />
                  <div className="vcmd-info">
                    <div className="vcmd-name">{cmd.commandName}</div>
                    <div className="vcmd-gesture">Gesture: <strong>{gesture?.gestureName || '—'}</strong></div>
                  </div>
                  <div className="vcmd-symbol">{gesture?.gestureSymbol || ''}</div>
                </div>
              );
            })}
          </div>

          {/* Logout button */}
          <button
            className="viewer-logout-btn"
            onClick={() => setShowLogoutConfirm(true)}
          >
            🚪 Logout
          </button>
        </div>

        {!showLogoutConfirm && (
          <GestureCamera onGesture={handleGesture} />
        )}
      </div>
    </PortalLayout>
  );
}
