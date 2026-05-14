import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import GestureCamera from '../../components/GestureCamera/GestureCamera';
import type { GestureEvent } from '../../hooks/useGestureControl';
import apiClient from '../../api/client';
import './SetPassword.css';

const MIN_PWD_LENGTH = 3;
const REVEAL_MS = 1000;
const RESERVED = { BACKSPACE: 'G007', SIGNIN: 'G006', FIST: 'G008' };
type Entry = { id: string; masked: boolean };

const ROLE_ROUTES: Record<string, string> = {
  R001: '/operator/dashboard',
  R002: '/viewer/dashboard',
};

export default function SetPassword() {
  const { currentUser, login, token } = useAuth();
  const { gestures } = useData();
  const navigate = useNavigate();

  const passwordGestures = gestures.filter(
    g => g.gestureId !== RESERVED.BACKSPACE &&
         g.gestureId !== RESERVED.SIGNIN &&
         g.gestureId !== RESERVED.FIST
  );
  const backspaceGesture = gestures.find(g => g.gestureId === RESERVED.BACKSPACE);
  const signinGesture    = gestures.find(g => g.gestureId === RESERVED.SIGNIN);
  const getGestureById   = (id: string) => gestures.find(g => g.gestureId === id);

  const [newEntries,     setNewEntries]     = useState<Entry[]>([]);
  const [confirmEntries, setConfirmEntries] = useState<Entry[]>([]);
  const [activeField,    setActiveField]    = useState<'new' | 'confirm'>('new');
  const [error,          setError]          = useState('');
  const [success,        setSuccess]        = useState(false);
  const [saving,         setSaving]         = useState(false);
  const [gestureHint,    setGestureHint]    = useState('');

  const newTimers     = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const confirmTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const activeFieldRef = useRef(activeField);
  useEffect(() => { activeFieldRef.current = activeField; }, [activeField]);
  useEffect(() => () => {
    newTimers.current.forEach(t => clearTimeout(t));
    confirmTimers.current.forEach(t => clearTimeout(t));
  }, []);

  const addGesture = useCallback((gestureId: string) => {
    setError('');
    const field = activeFieldRef.current;
    if (field === 'new') {
      setNewEntries(prev => {
        const idx = prev.length;
        const t = setTimeout(() =>
          setNewEntries(p => p.map((e, i) => i === idx ? { ...e, masked: true } : e)), REVEAL_MS);
        newTimers.current.set(idx, t);
        return [...prev, { id: gestureId, masked: false }];
      });
    } else {
      setConfirmEntries(prev => {
        const idx = prev.length;
        const t = setTimeout(() =>
          setConfirmEntries(p => p.map((e, i) => i === idx ? { ...e, masked: true } : e)), REVEAL_MS);
        confirmTimers.current.set(idx, t);
        return [...prev, { id: gestureId, masked: false }];
      });
    }
  }, []);

  const backspace = useCallback(() => {
    const field = activeFieldRef.current;
    if (field === 'new') {
      setNewEntries(prev => {
        const last = prev.length - 1; if (last < 0) return prev;
        clearTimeout(newTimers.current.get(last)); newTimers.current.delete(last);
        return prev.slice(0, -1);
      });
    } else {
      setConfirmEntries(prev => {
        const last = prev.length - 1; if (last < 0) return prev;
        clearTimeout(confirmTimers.current.get(last)); confirmTimers.current.delete(last);
        return prev.slice(0, -1);
      });
    }
  }, []);

  const switchField = useCallback(() =>
    setActiveField(f => f === 'new' ? 'confirm' : 'new'), []);

  // ─────────────────────────────────────────────────────────────────────────
  // FIX: handleSubmit now calls POST /api/auth/set-password on the backend
  // so the BCrypt hash is actually persisted to the database.
  //
  // Previously it only called login() locally — the password_hash column was
  // never written, so every subsequent login probe returned "FIRST_LOGIN"
  // and the user was sent back to this page in an infinite loop.
  // ─────────────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(() => {
    if (newEntries.length < MIN_PWD_LENGTH) {
      setError(`Minimum ${MIN_PWD_LENGTH} gestures required`); return;
    }
    if (confirmEntries.length === 0) {
      setError('Please confirm your password'); return;
    }

    const newSeq  = newEntries.map(e => e.id).join('-');
    const confSeq = confirmEntries.map(e => e.id).join('-');

    if (newSeq !== confSeq) {
      setError('Passwords do not match');
      confirmTimers.current.forEach(t => clearTimeout(t)); confirmTimers.current.clear();
      setConfirmEntries([]);
      return;
    }

    if (!currentUser) { setError('Session expired. Please log in again.'); return; }

    setSaving(true);
    setError('');

    // POST to backend — BCrypt-hashes and persists the gesture sequence
    apiClient
      .post<string>('/api/auth/set-password', null, {
        params: { userId: currentUser.userId, newPassword: newSeq },
      })
      .then(res => {
        // Backend returns a fresh JWT after setting the password
        const newToken = typeof res.data === 'string' ? res.data.trim() : (token ?? '');
        // Update auth context: passwordSet = true, store real JWT
        login({ ...currentUser, passwordSet: true }, newToken);
        setSuccess(true);
        setTimeout(() => navigate(ROLE_ROUTES[currentUser.roleId] ?? '/'), 1500);
      })
      .catch(() => {
        setError('Failed to save password — please try again.');
      })
      .finally(() => setSaving(false));
  }, [newEntries, confirmEntries, currentUser, login, token, navigate]);

  const handleGesture = useCallback((evt: GestureEvent) => {
    if (evt.type === 'GESTURE_ID') { setGestureHint(`Gesture: ${evt.id}`); addGesture(evt.id); }
    if (evt.type === 'THUMB_DOWN') { setGestureHint('👎 Backspace'); backspace(); }
    if (evt.type === 'THUMB_UP')   { setGestureHint('👍 Submit'); handleSubmit(); }
    if (evt.type === 'ROCK')       { setGestureHint('🤘 Switch field'); switchField(); }
    if (evt.type === 'FIST')       { setGestureHint('✊ Switch field'); switchField(); }
  }, [addGesture, backspace, handleSubmit, switchField]);

  const renderField = (entries: Entry[], field: 'new' | 'confirm', label: string) => (
    <div className="pwd-field-group">
      <label className={activeField === field ? 'active-label' : ''} onClick={() => setActiveField(field)}>
        {label}
        {activeField === field && <span className="editing-tag">● editing</span>}
        <span className="field-count">{entries.length} gestures</span>
      </label>
      <div className={`pwd-field ${activeField === field ? 'active' : ''}`} onClick={() => setActiveField(field)}>
        <div className="pwd-dots-row">
          {entries.length === 0
            ? <span className="pwd-placeholder">
                {field === 'new' ? 'Show gestures...' : 'Repeat same gestures...'}
              </span>
            : entries.map((e, i) => (
                <span key={i} className={`pwd-token ${e.masked ? 'masked' : 'revealed'}`}>
                  {e.masked ? '●' : getGestureById(e.id)?.gestureSymbol}
                </span>
              ))
          }
        </div>
      </div>
    </div>
  );

  return (
    <div className="set-password-page">
      <div className="set-pwd-header">
        <div className="brand-name">SignBank Enterprise</div>
        <div className="brand-tagline">Set Your Gesture Password</div>
      </div>
      <div className="set-pwd-body">
        <div className="set-pwd-card">
          <div className="card-badge first-login">First Login</div>
          <h2>Set New Password</h2>
          <p className="hint">
            Welcome <strong>{currentUser?.username}</strong>. Min {MIN_PWD_LENGTH} gestures.
            Rock or Fist gesture switches between fields.
          </p>
          {success ? (
            <div className="success-msg">✅ Password set! Redirecting...</div>
          ) : (
            <>
              {gestureHint && <div className="gesture-hint-bar">{gestureHint}</div>}
              {renderField(newEntries,     'new',     'New Password')}
              {renderField(confirmEntries, 'confirm', 'Confirm Password')}
              <div className="available-gestures">
                {passwordGestures.map(g => (
                  <button key={g.gestureId} className="avail-gesture-btn"
                    onClick={() => addGesture(g.gestureId)} title={g.gestureName}>
                    <span className="ag-sym">{g.gestureSymbol}</span>
                    <span className="ag-name">{g.gestureName}</span>
                  </button>
                ))}
              </div>
              <div className="pwd-action-row">
                <button className="pwd-action-btn backspace" onClick={backspace}>
                  {backspaceGesture?.gestureSymbol} Backspace
                </button>
                <button className="pwd-action-btn clear" onClick={switchField}>
                  ⇄ Switch Field
                </button>
              </div>
              {error && <p className="error-msg">{error}</p>}
              <button
                className="sign-in-gesture-btn"
                onClick={handleSubmit}
                disabled={newEntries.length < MIN_PWD_LENGTH || saving}
              >
                {saving
                  ? 'Saving…'
                  : <>Set Password <span className="btn-gesture-hint">{signinGesture?.gestureSymbol} {signinGesture?.gestureName}</span></>
                }
              </button>
            </>
          )}
        </div>
        <GestureCamera onGesture={handleGesture} />
      </div>
    </div>
  );
}
