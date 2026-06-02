import { useCallback, useEffect, useRef, useState } from 'react';

import { useNavigate } from 'react-router-dom';

import PortalLayout from '../../components/Layout/PortalLayout';

import GestureCamera from '../../components/GestureCamera/GestureCamera';
import GestureTrainingModal from '../../components/GestureTrainingModal';

import { useAuth } from '../../context/AuthContext';

import apiClient from '../../api/client';

import type { Command, CommandMapping, Gesture } from '../../types';

import type { GestureEvent } from '../../hooks/useGestureControl';

import './OperatorDashboard.css';
 
const FALLBACK_COMMANDS: Command[] = [

  {

    commandId: 'C001',

    commandName: 'Check Balance',

    commandDescription: 'Check the balance',

    page: { pageId: 'P001', pageName: 'Operator Dashboard' }

  },

  {

    commandId: 'C004',

    commandName: 'Check Cards',

    commandDescription: 'Manage credit & debit cards',

    page: { pageId: 'P001', pageName: 'Operator Dashboard' }

  },

];
 
const FALLBACK_MAPPINGS: CommandMapping[] = [

  { mapId: 'M001', commandId: 'C001', roleId: 'R001', gestureId: 'G002', userId: null, isActive: true },

  { mapId: 'M004', commandId: 'C004', roleId: 'R001', gestureId: 'G003', userId: null, isActive: true },

];
 
const FALLBACK_GESTURES: Gesture[] = [

  { gestureId: 'G001', gestureName: 'One Finger', gestureSymbol: '☝️' },

  { gestureId: 'G002', gestureName: 'Two Fingers', gestureSymbol: '✌️' },

  { gestureId: 'G003', gestureName: 'Three Fingers', gestureSymbol: '🤌' },

  { gestureId: 'G004', gestureName: 'Closed Middle Two', gestureSymbol: '🤘' },

  { gestureId: 'G005', gestureName: 'Open Palm', gestureSymbol: '🖐️' },

  { gestureId: 'G006', gestureName: 'Thumbs Up', gestureSymbol: '👍' },

  { gestureId: 'G007', gestureName: 'Thumbs Down', gestureSymbol: '👎' },

  { gestureId: 'G008', gestureName: 'Fist', gestureSymbol: '✊' },

  { gestureId: 'G009', gestureName: 'Middle Two Closed', gestureSymbol: '🤟' },

];
 
export default function OperatorDashboard() {

  const { logout, currentUser } = useAuth();

  const navigate = useNavigate();
 
  const [exiting, setExiting] = useState(false);

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showTrainingModal, setShowTrainingModal] = useState(false);

  
  const userId = currentUser?.username ?? 'User';

  const doLogout = useCallback(() => {

    setExiting(true);

    logout();

    setTimeout(() => {

      navigate('/');

    }, 300);

  }, [logout, navigate]);


  const [commands, setCommands] = useState<Command[]>(FALLBACK_COMMANDS);

  const [mappings, setMappings] = useState<CommandMapping[]>(FALLBACK_MAPPINGS);

  const [gestures, setGestures] = useState<Gesture[]>(FALLBACK_GESTURES);
 
  useEffect(() => {

    Promise.allSettled([

      apiClient.get<Command[]>('/api/admin/commands')

        .then(r => setCommands(r.data)),
 
      apiClient.get<CommandMapping[]>('/api/admin/mappings')

        .then(r => setMappings(r.data)),
 
      apiClient.get<Gesture[]>('/api/admin/gestures')

        .then(r => setGestures(r.data)),

    ]);

  }, []);
 
  const dashCommands = commands.filter(

    c =>

      c.page?.pageId === 'P001' &&

      c.commandName.toLowerCase() !== 'logout' &&

      c.commandName.toLowerCase() !== 'set transaction limit'

  );
 
  const getMappedGesture = (commandId: string, commandName?: string) => {

    if (commandName === 'Check Cards') {

      return gestures.find(g => g.gestureId === 'G003') ?? null;

    }

    if (commandName === 'Check Balance') {

      return gestures.find(g => g.gestureId === 'G002') ?? null;

    }

    const m = mappings.find(

      m =>

        m.commandId === commandId &&

        m.roleId === 'R001' &&

        m.userId === null

    );

    if (!m) return null;

    return gestures.find(g => g.gestureId === m.gestureId) ?? null;

  };
 
  const handleCommandClick = (commandName: string) => {

    if (commandName === 'Check Balance') {

      navigate('/operator/balance');

    }

    if (commandName === 'Check Cards') {

      navigate('/operator/cards');

    }

  };

  const handleGesture = useCallback((evt: GestureEvent) => {

    if (showLogoutConfirm) {

      if (evt.type === 'THUMB_UP') {

        doLogout();

        return;

      }

      if (evt.type === 'THUMB_DOWN') {

        setShowLogoutConfirm(false);

        return;

      }

      if (evt.type === 'BACK_DYNAMIC') {

        setShowLogoutConfirm(false);

        return;

      }

      return;

    }

    if (evt.type === 'BACK_DYNAMIC') {

      setShowLogoutConfirm(true);

      return;

    }

    if (evt.type !== 'GESTURE_ID') return;

    // Pass gesture events to training modal if open
    if (showTrainingModal) {
      // Dispatch a custom event that the TrainingModal listens to
      window.dispatchEvent(new CustomEvent('training-gesture', { detail: evt }));
      return;
    }

    switch (evt.id) {

      case 'G002':

        navigate('/operator/balance');

        break;
 
      case 'G003':
        // Three fingers → open training modal
        setShowTrainingModal(true);
        break;

      case 'G004':
        navigate('/operator/cards');
        break;

    }

  }, [showLogoutConfirm, doLogout, navigate, showTrainingModal]);
 
  const cardAccents = ['#059669', '#7c3aed', '#2563eb', '#d97706'];

  return (
<PortalLayout title="SignBank" subtitle="User Profile">
 
      {showLogoutConfirm && (
<div className="logout-confirm-overlay">
 
          <div className="logout-confirm-box">
 
            <div className="logout-confirm-left">
 
              <div className="logout-confirm-icon">🚪</div>
 
              <h2 className="logout-confirm-title">

                Confirm Logout
</h2>
 
              <p className="logout-confirm-desc">

                Are you sure you want to log out of SignBank?
</p>
 
              <div className="logout-gesture-hints">
 
                <div className="logout-gesture-item yes">
<span className="logout-gesture-icon">👍</span>
 
                  <div>
<div className="logout-gesture-label">

                      Thumb Up = Logout
</div>
 
                    <div className="logout-gesture-sub">

                      Confirm and exit session
</div>
</div>
</div>
 
                <div className="logout-gesture-item no">
<span className="logout-gesture-icon">👎</span>
 
                  <div>
<div className="logout-gesture-label">

                      Thumb Down = Cancel
</div>
 
                    <div className="logout-gesture-sub">

                      Stay logged in
</div>
</div>
</div>
 
                <div className="logout-gesture-item back">
<span className="logout-gesture-icon">🖐️→✊</span>
 
                  <div>
<div className="logout-gesture-label">

                      Back Dynamic = Cancel
</div>
 
                    <div className="logout-gesture-sub">

                      Return to dashboard
</div>
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
<span className="logout-cam-dot" />

                Live Gesture Camera
</div>
 
              <GestureCamera onGesture={handleGesture} />
 
            </div>
 
          </div>
 
        </div>

      )}
 
      <div className={`operator-dashboard page-container ${exiting ? 'page-exit' : ''}`}>
 
        <div className="commands-panel">
 
          <h1>

            Welcome to SignBank, <span>{userId}</span>
</h1>
 
          <div className="command-cards">

            {dashCommands.map((cmd, i) => {

              const gesture = getMappedGesture(

                cmd.commandId,

                cmd.commandName

              );

              const accent = cardAccents[i % cardAccents.length];

              return (
<div

                  key={cmd.commandId}

                  className="command-card"

                  style={{ borderLeft: `4px solid ${accent}`, '--card-accent': accent + '18' } as React.CSSProperties}

                  onClick={() => handleCommandClick(cmd.commandName)}
>
 
                  <div

                    className="cmd-dot"

                    style={{ background: accent }}

                  />
 
                  <div className="cmd-info">
 
                    <div className="cmd-name">

                      {cmd.commandName}
</div>
 
                    <div className="cmd-gesture">

                      Gesture: <strong>{gesture?.gestureName || '—'}</strong>
</div>
 
                  </div>
 
                  <div className="cmd-symbol">

                    {gesture?.gestureSymbol || ''}
</div>
 
                </div>

              );

            })}
 
          </div>
 
          <div className="dashboard-actions">

            <button

              className="dashboard-logout-btn"

              onClick={() => setShowLogoutConfirm(true)}
>

              🚪 Logout
</button>

          </div>
  
        </div>
  
        {!showLogoutConfirm && (
<GestureCamera onGesture={handleGesture} />

        )}
  
      </div>

      <GestureTrainingModal
        userId={userId}
        visible={showTrainingModal}
        onClose={() => setShowTrainingModal(false)}
      />

    </PortalLayout>

  );

}
