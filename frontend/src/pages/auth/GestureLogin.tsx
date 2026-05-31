import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../api/client';
import type { Gesture } from '../../types';
import GestureCamera from '../../components/GestureCamera/GestureCamera';
import type { GestureEvent } from '../../hooks/useGestureControl';
import './GestureLogin.css';

const RESERVED     = { BACKSPACE: 'G007', SIGNIN: 'G006', FIST: 'G008' };
const MIN_PWD      = 1;

const ID_TO_EMOJI: Record<string, string> = {
  G001: '☝️', G002: '✌️', G003: '🤌', G004: '🤘',
  G005: '🖐️', G006: '👍', G007: '👎', G008: '✊', G009: '🤟',
};
const NAME_TO_EMOJI: Record<string, string> = {
  'One Finger': '☝️', ONE_FINGER: '☝️',
  'Two Finger': '✌️', TWO_FINGER: '✌️',
  'Three Finger': '🤌', THREE_FINGER: '🤌',
  'Closed middle Two Finger': '🤘', CLOSED_MIDDLE_TWO_FINGER: '🤘',
  'Closed Mid Two': '🤘',
  'Open Palm': '🖐️', OPEN_PALM: '🖐️',
  'Thumbs Up': '👍', THUMBS_UP: '👍',
  'Thumbs Down': '👎', THUMBS_DOWN: '👎',
  'Fist': '✊', FIST: '✊',
  'Middle Two Closed': '🤟', MIDDLE_TWO_CLOSED: '🤟',
};
const GESTURE_ID_TO_EMOJI: Record<string, string> = {
  '1': '☝️', '2': '✌️', '3': '🤌', '4': '🤘',
  '5': '🖐️', '6': '👍', '7': '👎', '8': '✊', '9': '🤟',
};

function resolveEmoji(g: Gesture): string {
  const s = g.gestureSymbol;
  if (s && /\p{Emoji}/u.test(s)) return s;
  return ID_TO_EMOJI[g.gestureId] ?? NAME_TO_EMOJI[g.gestureName] ?? '🤚';
}

const DIGIT_GESTURES: [string, string, string][] = [
  ['1', '☝️', 'One Finger'],
  ['2', '✌️', 'Two Fingers'],
  ['3', '🤌', 'Three Fingers'],
  ['4', '🤘', 'Four Fingers'],
  ['5', '🖐️', 'Five Fingers'],
  ['6', '🖐️☝️', 'Six Fingers'],
  ['7', '🖐️✌️', 'Seven Fingers'],
  ['8', '🖐️🤌', 'Eight Fingers'],
  ['9', '🖐️🤘', 'Nine Fingers'],
  ['10', '🖐️🖐️', 'Ten Fingers'],
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

interface FoundUser { userId: string; roleId: string; roleName: string; }
interface ChallengeMapping { digit: number; gestureId: string; }
interface ChallengeData {
  challengeId: string;
  mapping: ChallengeMapping[];
  passwordLength: number;
  expiresIn: number;
}

export default function GestureLogin() {
  const [step,        setStep]        = useState<'username' | 'challenge'>('username');
  const [digits,      setDigits]      = useState<string[]>([]);
  const [foundUser,   setFoundUser]   = useState<FoundUser | null>(null);
  const [gestures,    setGestures]    = useState<Gesture[]>(FALLBACK_GESTURES);
  const [pwdEntries,  setPwdEntries]  = useState<{ id: string }[]>([]);
  const [error,       setError]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [gestureHint, setGestureHint] = useState('');
  const [challenge,   setChallenge]   = useState<ChallengeData | null>(null);

  const { login }   = useAuth();
  const navigate    = useNavigate();

  const stepRef       = useRef(step);
  const digitsRef     = useRef(digits);
  const pwdEntriesRef = useRef(pwdEntries);
  const foundUserRef  = useRef(foundUser);
  const loadingRef    = useRef(loading);

  useEffect(() => { stepRef.current       = step;       }, [step]);
  useEffect(() => { digitsRef.current     = digits;     }, [digits]);
  useEffect(() => { pwdEntriesRef.current = pwdEntries; }, [pwdEntries]);
  useEffect(() => { foundUserRef.current  = foundUser;  }, [foundUser]);
  useEffect(() => { loadingRef.current    = loading;    }, [loading]);

  const fingerGestures = ['G001','G002','G003','G004','G005'];
  const passwordGestures = gestures.filter(g => fingerGestures.includes(g.gestureId));

  const addDigit = useCallback((d: string) => {
    const val = parseInt(d, 10);
    if (isNaN(val) || val < 1 || val > 10) return;
    setDigits(p => p.length < 4 ? [...p, d] : p);
  }, []);

  const backspaceDigit = useCallback(() => setDigits(p => p.slice(0, -1)), []);

  const submitUserId = useCallback(async (currentDigits: string[]) => {
    const id = currentDigits.join('');
    if (id.length !== 4) { setError('Enter 4-digit User ID'); return; }
    if (loadingRef.current) return;
    setLoading(true); setError('');

    try {
      const res  = await apiClient.post<string>('/api/auth/login', null, { params: { userId: id } });
      const body = (typeof res.data === 'string' ? res.data : String(res.data)).trim();

      if (body !== 'FIRST_LOGIN' && body !== 'PASSWORD_REQUIRED') { setError('Unexpected response from server'); return; }

      if (body === 'FIRST_LOGIN') {
        const user = { userId: id, username: id, email: '', roleId: 'R001', roleName: 'operator', createdAt: '', passwordSet: false };
        login(user, '');
        navigate('/set-password');
        return;
      }

      let roleId   = 'R001';
      let roleName = 'operator';
      try {
        const ur = await apiClient.get<any[]>('/api/admin/users');
        const u  = ur.data.find((x: any) => String(x.userId) === id);
        if (u) { roleId = u.roleId ?? 'R001'; roleName = (u.roleName ?? 'operator').toLowerCase(); }
      } catch { /* keep defaults */ }

      if (roleName.includes('admin')) { setError('Admin accounts must use the Admin Login page'); return; }

      try {
        const gr    = await apiClient.get<Gesture[]>('/api/admin/gestures');
        const fixed = gr.data.map(g => ({ ...g, gestureSymbol: resolveEmoji(g) }));
        setGestures(fixed.length > 0 ? fixed : FALLBACK_GESTURES);
      } catch { setGestures(FALLBACK_GESTURES); }

      const chalResp = await apiClient.post<ChallengeData>('/api/auth/challenge', null, { params: { userId: id } });
      const chal = chalResp.data;

      setFoundUser({ userId: id, roleId, roleName });
      setChallenge(chal);
      setStep('challenge');
      setPwdEntries([]);
    } catch (err: any) {
      const s = err?.response?.status;
      if      (s === 404) setError('User ID not found');
      else if (s === 401) setError('Access denied — use Admin Login');
      else                setError('User ID not found — check your ID');
    } finally { setLoading(false); }
  }, [login, navigate]);

  const handleUserIdSubmit = useCallback(() => { submitUserId(digitsRef.current); }, [submitUserId]);

  const addGesture = useCallback((gestureId: string) => {
    setError('');
    setPwdEntries(prev => [...prev, { id: gestureId }]);
  }, []);

  const backspacePwd = useCallback(() => {
    setPwdEntries(prev => prev.slice(0, -1));
  }, []);

  const submitChallenge = useCallback(async (currentEntries: typeof pwdEntries, user: FoundUser, chal: ChallengeData) => {
    if (currentEntries.length < MIN_PWD) { setError('Enter at least 1 gesture'); return; }
    if (loadingRef.current) return;
    setLoading(true); setError('');

    const gestureSequence = currentEntries.map(e => e.id);

    try {
      const res = await apiClient.post<{ token: string; status: string }>(
        `/api/auth/verify-challenge?challengeId=${chal.challengeId}&userId=${user.userId}`,
        { gestureSequence }
      );
      const { token } = res.data;
      let role = user.roleName;
      try { const payload = JSON.parse(atob(token.split('.')[1])); role = (payload.role ?? role).toString().toLowerCase(); } catch { }
      const userObj = { userId: user.userId, username: user.userId, email: '', roleId: user.roleId, roleName: role, createdAt: '', passwordSet: true };
      login(userObj, token);
      if (role.includes('operator')) navigate('/operator/dashboard');
      else navigate('/viewer/dashboard');
    } catch (err: any) {
      const s = err?.response?.status;
      if (s === 401 || s === 403) setError('Wrong gesture password — try again');
      else if (s === 410) setError('Challenge expired — start again');
      else setError('Login failed — please retry');
    } finally { setLoading(false); }
  }, [login, navigate]);

  const handleChallengeSubmit = useCallback(() => {
    const user = foundUserRef.current; if (!user) return;
    const chal = challenge; if (!chal) return;
    submitChallenge(pwdEntriesRef.current, user, chal);
  }, [submitChallenge, challenge]);

  const goBack = useCallback(() => {
    setStep('username'); setDigits([]); setPwdEntries([]);
    setFoundUser(null);  setError(''); setChallenge(null);
  }, []);

  const handleGesture = useCallback((evt: GestureEvent) => {
    const cur = stepRef.current;
    if (cur === 'username') {
      if (evt.type === 'DIGIT')     { setGestureHint(`${evt.value} finger`); addDigit(evt.value); }
      if (evt.type === 'THUMB_UP')  { setGestureHint('👍 Confirm ID'); submitUserId(digitsRef.current); }
      if (evt.type === 'THUMB_DOWN'){ setGestureHint('👎 Backspace'); backspaceDigit(); }
    }
    if (cur === 'challenge') {
      if (evt.type === 'GESTURE_ID') { setGestureHint(`Gesture: ${evt.id}`); addGesture(evt.id); }
      if (evt.type === 'THUMB_UP')   { setGestureHint('👍 Submit'); const u = foundUserRef.current; const c = challenge; if (u && c) submitChallenge(pwdEntriesRef.current, u, c); }
      if (evt.type === 'THUMB_DOWN') { setGestureHint('👎 Backspace'); backspacePwd(); }
      if (evt.type === 'FIST')       { setGestureHint('✊ Back'); goBack(); }
    }
  }, [addDigit, backspaceDigit, submitUserId, addGesture, backspacePwd, submitChallenge, goBack, challenge]);

  const passwordDigitEmojis = challenge
    ? challenge.mapping.filter(m => m.digit >= 1 && m.digit <= 5)
    : [];

  const enteredGestures = pwdEntries.map(e => {
    const found = passwordDigitEmojis.find(m => m.gestureId === e.id);
    return { id: e.id, emoji: ID_TO_EMOJI[e.id] ?? '?' };
  });

  return (
    <div className="gesture-login" role="main" aria-label="Gesture login">
      <header className="gl-header glass-strong" role="banner">
        {step === 'challenge' && (
          <button className="gl-back" onClick={goBack} aria-label="Go back to user ID entry">
            <span aria-hidden="true">←</span> Back <span className="gl-back-hint" aria-hidden="true">{ID_TO_EMOJI['G008'] ?? '✊'} Fist</span>
          </button>
        )}
        <div className="gl-brand">
          <span className="gl-brand-title">SignBank</span>
          <span className="gl-brand-sub">Gesture Login</span>
        </div>
        <div />
      </header>

      <div className="gl-body">
        <div className="gl-card" role="region" aria-label={step === 'username' ? 'Enter user ID' : 'Gesture challenge'}>
          {gestureHint && <div className="gl-hint-bar" role="status" aria-live="polite">{gestureHint}</div>}

          {step === 'username' && (
            <section aria-label="User ID entry">
              <span className="gl-badge">Step 1</span>
              <h2>Enter User ID</h2>
              <p className="gl-hint">Show 1–10 fingers (using 1 or 2 hands) for each digit · <span aria-label="thumbs up to confirm">👍 Confirm</span> · <span aria-label="thumbs down for backspace">👎 Backspace</span></p>
              <div className="digit-boxes" role="group" aria-label="User ID digits">
                {[0,1,2,3].map(i => (
                  <div key={i} className={`digit-box ${digits[i] ? 'filled' : ''}`} aria-label={`Digit ${i + 1}${digits[i] ? `: ${digits[i]}` : ': empty'}`}>
                    {digits[i] || ''}
                  </div>
                ))}
              </div>
              <div className="digit-grid">
                {DIGIT_GESTURES.map(([d, sym, name]) => (
                  <button key={d} className="digit-btn" onClick={() => addDigit(d)} aria-label={`Enter digit ${d}: ${name}`}>
                    <span className="dg-sym" aria-hidden="true">{sym}</span>
                    <span className="dg-label">{d} — {name}</span>
                  </button>
                ))}
                <button className="digit-btn action-btn" onClick={backspaceDigit} aria-label="Backspace last digit">
                  <span className="dg-sym" aria-hidden="true">👎</span>
                  <span className="dg-label">Backspace</span>
                </button>
              </div>
              {error && <div className="banner-error" role="alert"><span aria-hidden="true">⚠</span> {error}</div>}
              <button className="gl-submit" onClick={handleUserIdSubmit} disabled={loading || digits.length < 4}>
                {loading ? 'Checking…' : <>Next <span className="gl-btn-hint" aria-hidden="true">👍 Thumbs Up</span></>}
              </button>
              <p className="gl-demo">Demo: <strong>1111</strong> (operator) · <strong>2111</strong> (viewer)</p>
            </section>
          )}

          {step === 'challenge' && challenge && (
            <section aria-label="Gesture challenge">
              <span className="gl-badge">Step 2</span>
              <h2>Shuffled Gesture Challenge</h2>
              <p className="gl-hint">
                Welcome, <strong>{foundUser?.userId}</strong>
                &nbsp;· Each digit of your password is mapped to a random gesture below.
              </p>
              <p className="gl-hint">Perform the gestures matching your password digits · <span aria-label="thumbs up to submit">👍 Submit</span> · <span aria-label="thumbs down backspace">👎 Backspace</span></p>

              <div className="challenge-grid">
                <div className="challenge-grid-header">
                  <span>Digit</span>
                  <span>Make this gesture</span>
                </div>
                {passwordDigitEmojis.map(m => (
                  <div key={m.digit} className="challenge-row">
                    <span className="challenge-digit">{m.digit}</span>
                    <span className="challenge-arrow">→</span>
                    <span className="challenge-gesture">
                      <span className="challenge-emoji">{ID_TO_EMOJI[m.gestureId] ?? '?'}</span>
                      <span className="challenge-gesture-id">{m.gestureId}</span>
                    </span>
                  </div>
                ))}
              </div>

              <div className="pwd-field">
                <div className="pwd-dots" role="group" aria-label="Gesture password input">
                  {enteredGestures.length === 0
                    ? <span className="pwd-placeholder">Show gestures matching your password...</span>
                    : enteredGestures.map((e, i) => (
                        <span key={i} className="pwd-dot revealed" aria-label={`Gesture ${i + 1}: ${e.id}`}>
                          {e.emoji}
                        </span>
                      ))}
                </div>
                <span className="pwd-count" aria-live="polite">{pwdEntries.length} gestures</span>
              </div>

              <div className="avail-grid">
                {passwordGestures.map(g => (
                  <button key={g.gestureId} className="avail-btn" onClick={() => addGesture(g.gestureId)} aria-label={`Add gesture: ${g.gestureName}`}>
                    <span className="ag-sym" aria-hidden="true">{resolveEmoji(g)}</span>
                    <span className="ag-name">{g.gestureName}</span>
                  </button>
                ))}
              </div>

              <div className="pwd-actions">
                <button className="pwd-btn backspace" onClick={backspacePwd} aria-label="Backspace gesture">👎 Backspace</button>
                <button className="pwd-btn clear" onClick={() => setPwdEntries([])} aria-label="Clear all gestures">✕ Clear</button>
              </div>
              {error && <div className="banner-error" role="alert"><span aria-hidden="true">⚠</span> {error}</div>}
              <button className="gl-submit" onClick={handleChallengeSubmit} disabled={pwdEntries.length < MIN_PWD || loading}>
                {loading ? 'Verifying…' : <>Submit <span className="gl-btn-hint" aria-hidden="true">👍 Thumbs Up</span></>}
              </button>
            </section>
          )}
        </div>

        <GestureCamera onGesture={handleGesture} />
      </div>
    </div>
  );
}
