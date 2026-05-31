import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../api/client';
import GestureCamera from '../../components/GestureCamera/GestureCamera';
import type { GestureEvent } from '../../hooks/useGestureControl';
import './GestureLogin.css';

const MIN_PWD = 1;

const FINGER_EMOJIS: Record<string, string> = {
  '1': '☝️', '2': '✌️', '3': '🤌', '4': '🤘', '5': '🖐️',
  '6': '🖐️☝️', '7': '🖐️✌️', '8': '🖐️🤌', '9': '🖐️🤘', '10': '🖐️🖐️',
};

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
  const [challenge,   setChallenge]   = useState<ChallengeData | null>(null);

  const { login } = useAuth();
  const navigate  = useNavigate();

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

      if (body !== 'FIRST_LOGIN' && body !== 'PASSWORD_REQUIRED') { setError('Unexpected response'); return; }

      if (body === 'FIRST_LOGIN') {
        const user = { userId: id, username: id, email: '', roleId: 'R001', roleName: 'operator', createdAt: '', passwordSet: false };
        login(user, '');
        navigate('/set-password');
        return;
      }

      let roleName = 'operator';
      try {
        const ur = await apiClient.get<any[]>('/api/admin/users');
        const u  = ur.data.find((x: any) => String(x.userId) === id);
        if (u) roleName = (u.roleName ?? 'operator').toLowerCase();
      } catch { /* keep defaults */ }

      if (roleName.includes('admin')) { setError('Admin accounts must use the Admin Login page'); return; }

      const chalResp = await apiClient.post<ChallengeData>('/api/auth/challenge', null, { params: { userId: id } });
      setFoundUser({ userId: id, roleId: 'R001', roleName });
      setChallenge(chalResp.data);
      setStep('challenge');
      setPwdEntries([]);
    } catch (err: any) {
      const s = err?.response?.status;
      if      (s === 404) setError('User ID not found');
      else if (s === 401) setError('Access denied — use Admin Login');
      else                setError('User ID not found — check your ID');
    } finally { setLoading(false); }
  }, [login, navigate]);

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

    try {
      const res = await apiClient.post<{ token: string; status: string }>(
        `/api/auth/verify-challenge?challengeId=${chal.challengeId}&userId=${user.userId}`,
        { fingerSequence: currentEntries.map(e => parseInt(e.fingers, 10)) }
      );
      const { token } = res.data;
      let role = user.roleName;
      try { const payload = JSON.parse(atob(token.split('.')[1])); role = (payload.role ?? role).toString().toLowerCase(); } catch { }
      login({ userId: user.userId, username: user.userId, email: '', roleId: user.roleId, roleName: role, createdAt: '', passwordSet: true }, token);
      navigate(role.includes('operator') ? '/operator/dashboard' : '/viewer/dashboard');
    } catch (err: any) {
      const s = err?.response?.status;
      if (s === 401 || s === 403) setError('Wrong gesture password — try again');
      else if (s === 410) setError('Challenge expired — start again');
      else setError('Login failed — retry');
    } finally { setLoading(false); }
  }, [login, navigate]);

  const goBack = useCallback(() => {
    setStep('username'); setDigits([]); setPwdEntries([]);
    setFoundUser(null); setError(''); setChallenge(null);
  }, []);

  const handleGesture = useCallback((evt: GestureEvent) => {
    const cur = stepRef.current;
    if (cur === 'username') {
      if (evt.type === 'DIGIT')      addDigit(evt.value);
      if (evt.type === 'THUMB_UP')   submitUserId(digitsRef.current);
      if (evt.type === 'THUMB_DOWN') backspaceDigit();
    }
    if (cur === 'challenge') {
      if (evt.type === 'DIGIT')      addFingerCount(evt.value);
      if (evt.type === 'THUMB_UP')   { const u = foundUserRef.current; const c = challenge; if (u && c) submitChallenge(pwdEntriesRef.current, u, c); }
      if (evt.type === 'THUMB_DOWN') backspacePwd();
    }
  }, [addDigit, backspaceDigit, submitUserId, addFingerCount, backspacePwd, submitChallenge, challenge]);

  const enteredFingers = pwdEntries.map(e => FINGER_EMOJIS[e.fingers] ?? '?');

  return (
    <div className="gl" role="main">
      <header className="gl-top">
        <div className="gl-top-left">
          {step === 'challenge' && <button className="gl-back" onClick={goBack}>← Back</button>}
        </div>
        <span className="gl-brand">SignBank <span className="gl-brand-sub">· Gesture Login</span></span>
        <div />
      </header>

      <div className="gl-body">
        <div className="gl-camera-col">
          <GestureCamera onGesture={handleGesture} />
        </div>

        <div className="gl-panel-col">
          {step === 'username' && (
            <div className="gl-step">
              <span className="gl-badge">Step 1</span>
              <h2>Enter User ID</h2>
              <div className="gl-digit-boxes">
                {[0,1,2,3].map(i => (
                  <div key={i} className={`gl-digit-box ${digits[i] ? 'filled' : ''}`}>{digits[i] || ''}</div>
                ))}
              </div>
              <div className="gl-digit-grid">
                {['1','2','3','4','5','6','7','8','9','10'].map(d => (
                  <button key={d} className="gl-dbtn" onClick={() => addDigit(d)}>
                    <span>{FINGER_EMOJIS[d]}</span>
                    <small>{d}</small>
                  </button>
                ))}
                <button className="gl-dbtn action" onClick={backspaceDigit}>👎 <small>BS</small></button>
              </div>
              {error && <div className="gl-err">⚠ {error}</div>}
              <button className="gl-submit" onClick={() => submitUserId(digitsRef.current)} disabled={loading || digits.length < 4}>
                {loading ? 'Checking…' : 'Confirm ID  👍'}
              </button>
              <p className="gl-demo">Demo: <strong>1111</strong> · <strong>2111</strong></p>
            </div>
          )}

          {step === 'challenge' && challenge && (
            <div className="gl-step">
              <span className="gl-badge">Step 2</span>
              <h2>Shuffled Challenge</h2>
              <p className="gl-user">{foundUser?.userId}</p>

              <div className="gl-chal-grid">
                {challenge.mapping.filter(m => m.digit <= 10).map(m => (
                  <div key={m.digit} className="gl-chal-row">
                    <span className="gl-chal-digit">{m.digit}</span>
                    <span className="gl-chal-arr">→</span>
                    <span className="gl-chal-emoji">{m.emoji}</span>
                    <span className="gl-chal-label">{m.show}</span>
                  </div>
                ))}
              </div>

              <div className="gl-entered">
                {enteredFingers.length === 0
                  ? <span className="gl-entered-empty">Enter finger count...</span>
                  : enteredFingers.map((e, i) => <span key={i} className="gl-entered-chip">{e}</span>)
                }
              </div>

              <div className="gl-finger-grid">
                {['1','2','3','4','5','6','7','8','9','10'].map(d => (
                  <button key={d} className="gl-fbtn" onClick={() => addFingerCount(d)}>
                    <span>{FINGER_EMOJIS[d]}</span>
                  </button>
                ))}
              </div>

              <div className="gl-actions">
                <button className="gl-act backspace" onClick={backspacePwd}>👎</button>
                <button className="gl-act clear" onClick={() => setPwdEntries([])}>✕</button>
                <button className="gl-submit compact" onClick={() => { const u = foundUserRef.current; const c = challenge; if (u && c) submitChallenge(pwdEntriesRef.current, u, c); }} disabled={pwdEntries.length < MIN_PWD || loading}>
                  {loading ? '…' : 'Submit  👍'}
                </button>
              </div>
              {error && <div className="gl-err">⚠ {error}</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
