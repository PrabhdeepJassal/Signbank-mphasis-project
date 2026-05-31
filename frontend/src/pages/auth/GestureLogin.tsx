import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../api/client';
import type { Gesture } from '../../types';
import GestureCamera from '../../components/GestureCamera/GestureCamera';
import type { GestureEvent } from '../../hooks/useGestureControl';
import './GestureLogin.css';

const MIN_PWD = 1;

const FINGER_EMOJIS: Record<string, string> = {
  '1': '☝️', '2': '✌️', '3': '🤌', '4': '🤘', '5': '🖐️',
  '6': '🖐️☝️', '7': '🖐️✌️', '8': '🖐️🤌', '9': '🖐️🤘', '10': '🖐️🖐️',
};

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

interface FoundUser { userId: string; roleId: string; roleName: string; }
interface ChallengeMapping { digit: number; show: number; emoji: string; }
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
  const [pwdEntries,  setPwdEntries]  = useState<{ fingers: string }[]>([]);
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

  const addFingerCount = useCallback((fingerCount: string) => {
    setError('');
    setPwdEntries(prev => [...prev, { fingers: fingerCount }]);
  }, []);

  const backspacePwd = useCallback(() => {
    setPwdEntries(prev => prev.slice(0, -1));
  }, []);

  const submitChallenge = useCallback(async (currentEntries: typeof pwdEntries, user: FoundUser, chal: ChallengeData) => {
    if (currentEntries.length < MIN_PWD) { setError('Enter at least 1 finger gesture'); return; }
    if (loadingRef.current) return;
    setLoading(true); setError('');

    const fingerSequence = currentEntries.map(e => parseInt(e.fingers, 10));

    try {
      const res = await apiClient.post<{ token: string; status: string }>(
        `/api/auth/verify-challenge?challengeId=${chal.challengeId}&userId=${user.userId}`,
        { fingerSequence }
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
      if (evt.type === 'DIGIT')      { const n = evt.value; setGestureHint(`${n} fingers`); addFingerCount(n); }
      if (evt.type === 'THUMB_UP')   { setGestureHint('👍 Submit'); const u = foundUserRef.current; const c = challenge; if (u && c) submitChallenge(pwdEntriesRef.current, u, c); }
      if (evt.type === 'THUMB_DOWN') { setGestureHint('👎 Backspace'); backspacePwd(); }
      if (evt.type === 'FIST')       { setGestureHint('✊ Back'); goBack(); }
    }
  }, [addDigit, backspaceDigit, submitUserId, addFingerCount, backspacePwd, submitChallenge, goBack, challenge]);

  const passwordFingerMap = challenge
    ? challenge.mapping.filter(m => m.digit >= 1 && m.digit <= 10)
    : [];

  const enteredFingers = pwdEntries.map(e => ({
    fingers: e.fingers,
    emoji: FINGER_EMOJIS[e.fingers] ?? '?',
  }));

  return (
    <div className="gesture-login" role="main" aria-label="Gesture login">
      <header className="gl-header glass-strong" role="banner">
        {step === 'challenge' && (
          <button className="gl-back" onClick={goBack} aria-label="Go back to user ID entry">
            <span aria-hidden="true">←</span> Back
          </button>
        )}
        <div className="gl-brand">
          <span className="gl-brand-title">SignBank</span>
          <span className="gl-brand-sub">Gesture Login</span>
        </div>
        <div />
      </header>

      <div className="gl-body">
        <div className="gl-card" role="region" aria-label={step === 'username' ? 'Enter user ID' : 'Finger challenge'}>
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
            <section aria-label="Finger challenge">
              <span className="gl-badge">Step 2</span>
              <h2>Shuffled Finger Challenge</h2>
              <p className="gl-hint">
                Welcome, <strong>{foundUser?.userId}</strong>
                &nbsp;· Each digit of your password maps to a random finger count.
              </p>
              <p className="gl-hint">Show the matching finger count for each password digit · <span aria-label="thumbs up to submit">👍 Submit</span> · <span aria-label="thumbs down backspace">👎 Backspace</span></p>

              <div className="challenge-grid">
                <div className="challenge-grid-header">
                  <span>Password Digit</span>
                  <span>Show this many fingers</span>
                </div>
                {passwordFingerMap.map(m => (
                  <div key={m.digit} className="challenge-row">
                    <span className="challenge-digit">{m.digit}</span>
                    <span className="challenge-arrow">→</span>
                    <span className="challenge-gesture">
                      <span className="challenge-emoji">{m.emoji}</span>
                      <span className="challenge-gesture-id">{m.show} finger{m.show > 1 ? 's' : ''}</span>
                    </span>
                  </div>
                ))}
              </div>

              <div className="pwd-field">
                <div className="pwd-dots" role="group" aria-label="Finger input">
                  {enteredFingers.length === 0
                    ? <span className="pwd-placeholder">Show finger counts matching your password...</span>
                    : enteredFingers.map((e, i) => (
                        <span key={i} className="pwd-dot revealed" aria-label={`Entry ${i + 1}: ${e.fingers} fingers`}>
                          {e.emoji}
                        </span>
                      ))}
                </div>
                <span className="pwd-count" aria-live="polite">{pwdEntries.length} entries</span>
              </div>

              <div className="digit-grid">
                {DIGIT_GESTURES.map(([d, sym]) => (
                  <button key={d} className="digit-btn" onClick={() => addFingerCount(d)} aria-label={`Show ${d} fingers`}>
                    <span className="dg-sym" aria-hidden="true">{sym}</span>
                    <span className="dg-label">{d} fingers</span>
                  </button>
                ))}
              </div>

              <div className="pwd-actions">
                <button className="pwd-btn backspace" onClick={backspacePwd} aria-label="Backspace">👎 Backspace</button>
                <button className="pwd-btn clear" onClick={() => setPwdEntries([])} aria-label="Clear all">✕ Clear</button>
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
