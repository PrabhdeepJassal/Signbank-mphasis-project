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

const ROLE_ROUTES: Record<string, string> = { R001: '/operator/dashboard', R002: '/viewer/dashboard' };

export default function SetPassword() {
  const { currentUser, login, token } = useAuth();
  const { gestures } = useData();
  const navigate = useNavigate();

  const passwordGestures = gestures.filter(g => g.gestureId !== RESERVED.BACKSPACE && g.gestureId !== RESERVED.SIGNIN && g.gestureId !== RESERVED.FIST);
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
  useEffect(() => () => { newTimers.current.forEach(t => clearTimeout(t)); confirmTimers.current.forEach(t => clearTimeout(t)); }, []);

  const addGesture = useCallback((gestureId: string) => {
    setError(''); const field = activeFieldRef.current;
    if (field === 'new') {
      setNewEntries(prev => {
        const idx = prev.length;
        const t = setTimeout(() => setNewEntries(p => p.map((e, i) => i === idx ? { ...e, masked: true } : e)), REVEAL_MS);
        newTimers.current.set(idx, t);
        return [...prev, { id: gestureId, masked: false }];
      });
    } else {
      setConfirmEntries(prev => {
        const idx = prev.length;
        const t = setTimeout(() => setConfirmEntries(p => p.map((e, i) => i === idx ? { ...e, masked: true } : e)), REVEAL_MS);
        confirmTimers.current.set(idx, t);
        return [...prev, { id: gestureId, masked: false }];
      });
    }
  }, []);

  const backspace = useCallback(() => {
    const field = activeFieldRef.current;
    if (field === 'new') {
      setNewEntries(prev => { const last = prev.length - 1; if (last < 0) return prev; clearTimeout(newTimers.current.get(last)); newTimers.current.delete(last); return prev.slice(0, -1); });
    } else {
      setConfirmEntries(prev => { const last = prev.length - 1; if (last < 0) return prev; clearTimeout(confirmTimers.current.get(last)); confirmTimers.current.delete(last); return prev.slice(0, -1); });
    }
  }, []);

  const switchField = useCallback(() => setActiveField(f => f === 'new' ? 'confirm' : 'new'), []);

  const handleSubmit = useCallback(() => {
    if (newEntries.length < MIN_PWD_LENGTH) { setError(`Minimum ${MIN_PWD_LENGTH} gestures required`); return; }
    if (confirmEntries.length === 0) { setError('Please confirm your password'); return; }

    const newSeq  = newEntries.map(e => e.id).join('-');
    const confSeq = confirmEntries.map(e => e.id).join('-');

    if (newSeq !== confSeq) {
      setError('Passwords do not match');
      confirmTimers.current.forEach(t => clearTimeout(t)); confirmTimers.current.clear();
      setConfirmEntries([]);
      return;
    }

    if (!currentUser) { setError('Session expired. Please log in again.'); return; }

    setSaving(true); setError('');
    apiClient.post<string>('/api/auth/set-password', null, { params: { userId: currentUser.userId, newPassword: newSeq } })
      .then(res => {
        const newToken = typeof res.data === 'string' ? res.data.trim() : (token ?? '');
        login({ ...currentUser, passwordSet: true }, newToken);
        setSuccess(true);
        setTimeout(() => navigate(ROLE_ROUTES[currentUser.roleId] ?? '/'), 1500);
      })
      .catch(() => { setError('Failed to save password — please try again.'); })
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
      <label className={activeField === field ? 'active' : ''} onClick={() => setActiveField(field)}>
        {label}
        {activeField === field && <span className="editing-badge" aria-live="polite">editing</span>}
        <span className="field-count">{entries.length} gestures</span>
      </label>
      <div className={`pwd-field ${activeField === field ? 'active' : ''}`} onClick={() => setActiveField(field)} role="button" tabIndex={0} aria-label={`${label} field, ${entries.length} gestures entered`} onKeyDown={e => e.key === 'Enter' && setActiveField(field)}>
        <div className="pwd-dots">
          {entries.length === 0
            ? <span className="pwd-placeholder">{field === 'new' ? 'Show gestures...' : 'Repeat same gestures...'}</span>
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
    <div className="set-password-page" role="main" aria-label="Set gesture password">
      <header className="sp-header glass-strong" role="banner">
        <div className="sp-brand">
          <span className="sp-brand-title">SignBank</span>
          <span className="sp-brand-sub">Set Your Gesture Password</span>
        </div>
      </header>

      <div className="sp-body">
        <div className="sp-card" role="region" aria-label="Password setup">
          <span className="sp-badge">First Login</span>
          <h2>Set New Password</h2>
          <p className="sp-hint">
            Welcome <strong>{currentUser?.username}</strong>. Min {MIN_PWD_LENGTH} gestures. Rock or Fist switches fields.
          </p>
          {success ? (
            <div className="banner-success" role="status">
              <span aria-hidden="true">✓</span> Password set! Redirecting...
            </div>
          ) : (
            <>
              {gestureHint && <div className="gl-hint-bar" role="status" aria-live="polite">{gestureHint}</div>}
              {renderField(newEntries, 'new', 'New Password')}
              {renderField(confirmEntries, 'confirm', 'Confirm Password')}
              <div className="avail-grid">
                {passwordGestures.map(g => (
                  <button key={g.gestureId} className="avail-btn" onClick={() => addGesture(g.gestureId)} aria-label={`Add gesture: ${g.gestureName}`}>
                    <span className="ag-sym" aria-hidden="true">{g.gestureSymbol}</span>
                    <span className="ag-name">{g.gestureName}</span>
                  </button>
                ))}
              </div>
              <div className="pwd-actions">
                <button className="pwd-btn backspace" onClick={backspace} aria-label="Backspace gesture">
                  <span aria-hidden="true">👎</span> Backspace
                </button>
                <button className="pwd-btn clear" onClick={switchField} aria-label="Switch between new and confirm fields">
                  ⇄ Switch Field
                </button>
              </div>
              {error && <div className="banner-error" role="alert"><span aria-hidden="true">⚠</span> {error}</div>}
              <button className="gl-submit" onClick={handleSubmit} disabled={newEntries.length < MIN_PWD_LENGTH || saving}>
                {saving ? 'Saving…' : <>Set Password <span className="gl-btn-hint" aria-hidden="true">{signinGesture?.gestureSymbol} {signinGesture?.gestureName}</span></>}
              </button>
            </>
          )}
        </div>
        <GestureCamera onGesture={handleGesture} />
      </div>
    </div>
  );
}
