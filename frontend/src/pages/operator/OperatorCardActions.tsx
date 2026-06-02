import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import GestureCamera from '../../components/GestureCamera/GestureCamera';
import { useAuth } from '../../context/AuthContext';
import { getCards, replaceCard, getReplacementHistory } from '../../api/cardApi';
import type { CardData, ReplacementHistoryEntry } from '../../api/cardApi';
import apiClient from '../../api/client';
import type { GestureEvent } from '../../hooks/useGestureControl';
import './OperatorCardActions.css';

// ── Types ──
type ResultState  = 'idle' | 'loading' | 'success' | 'error';
type ReplaceReason = 'LOST' | 'DAMAGED' | 'STOLEN' | null;
type FlowStep = 'idle' | 'block-auth' | 'replace-reason' | 'replace-confirm';

const REPLACE_REASONS: { value: ReplaceReason; label: string; emoji: string; gesture: string }[] = [
  { value: 'LOST',    label: 'Lost',    emoji: '🔍', gesture: '☝️ One finger' },
  { value: 'DAMAGED', label: 'Damaged', emoji: '💔', gesture: '✌️ Two fingers' },
  { value: 'STOLEN',  label: 'Stolen',  emoji: '🚨', gesture: '🤌 Three fingers' },
];

const GESTURE_META: Record<string, { label: string; emoji: string; color: string }> = {
  G001: { label: 'One Finger',   emoji: '☝️', color: '#059669' },
  G002: { label: 'Two Fingers',  emoji: '✌️', color: '#2563eb' },
  G003: { label: 'Three Fingers',emoji: '🤌', color: '#7c3aed' },
  G004: { label: 'Four Fingers', emoji: '🤘', color: '#d97706' },
  G005: { label: 'Open Palm',    emoji: '🖐️', color: '#0891b2' },
};

const MAX_SEQUENCE = 4;

// ── Realistic Card Visual ──
function CardVisual({ card, cardType }: { card: CardData | null; cardType: string }) {
  const isCredit = cardType === 'CREDIT';
  const gradient = isCredit
    ? 'linear-gradient(135deg, #0f0220 0%, #2d1b69 40%, #1a0533 100%)'
    : 'linear-gradient(135deg, #020b1a 0%, #0f2847 40%, #061e3a 100%)';
  const accent = isCredit ? '#c084fc' : '#60a5fa';
  const label = isCredit ? 'CREDIT' : 'DEBIT';
  const masked = card?.cardNumber || '**** **** **** 0000';
  const isBlocked = card?.cardStatus === 'BLOCKED';

  return (
    <div className="ca-card-visual" style={{ background: gradient }}>
      <div className="ca-card-top">
        <div className="ca-chip">
          <div className="ca-chip-line" />
          <div className="ca-chip-line" />
        </div>
        <div className="ca-card-type-badge" style={{ color: accent }}>{label}</div>
      </div>
      <div className="ca-card-number">{masked}</div>
      <div className="ca-card-bottom">
        <div className="ca-card-stat">
          <span className={`ca-stat-dot ${isBlocked ? 'red' : 'green'}`} />
          {isBlocked ? 'Blocked' : 'Active'}
        </div>
        {card?.transactionLimit != null && (
          <div className="ca-card-limit">₹{card.transactionLimit.toLocaleString()}</div>
        )}
      </div>
      {card?.replaceRequested && <div className="ca-replace-badge">🔄 Replacement Requested</div>}
    </div>
  );
}

// ── GestureSequenceDisplay ──
function GestureSequenceDisplay({ sequence, maxLen = MAX_SEQUENCE, color }: { sequence: string[]; maxLen?: number; color: string }) {
  return (
    <div className="gs-display">
      {sequence.map((gid, i) => {
        const meta = GESTURE_META[gid];
        return (
          <div key={i} className="gs-chip filled" style={{ borderColor: color, background: color + '22' }}>
            <span className="gs-chip-emoji">{meta?.emoji ?? '?'}</span>
            <span className="gs-chip-label">{meta?.label ?? gid}</span>
          </div>
        );
      })}
      {Array.from({ length: maxLen - sequence.length }).map((_, i) => (
        <div key={`e-${i}`} className="gs-chip empty" style={{ borderColor: '#334155' }}>
          <span className="gs-chip-dot" />
        </div>
      ))}
    </div>
  );
}

// ── GestureKeyGrid ──
function GestureKeyGrid({ pressedId }: { pressedId: string | null }) {
  return (
    <div className="gs-key-grid">
      {Object.entries(GESTURE_META).map(([gid, meta]) => (
        <div key={gid} className={`gs-key ${pressedId === gid ? 'pressed' : ''}`} style={{ '--kc': meta.color } as React.CSSProperties}>
          <span className="gs-key-emoji">{meta.emoji}</span>
          <span className="gs-key-name">{meta.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── ModalCamera ──
function ModalCamera({ onGesture }: { onGesture: (evt: GestureEvent) => void }) {
  return (
    <div className="modal-camera-wrap">
      <div className="modal-camera-label"><span className="modal-cam-dot" /> Live Gesture Camera</div>
      <GestureCamera onGesture={onGesture} />
    </div>
  );
}

// ── BlockAuthModal ──
interface BlockAuthModalProps {
  cardLabel: string; cardStatus: string; sequence: string[];
  lastPressedId: string | null; verifying: boolean; authError: string | null;
  confidence: number | null; card: CardData | null; cardType: string;
  onGesture: (evt: GestureEvent) => void; onConfirm: () => void; onCancel: () => void;
}
function BlockAuthModal({ cardLabel, cardStatus, sequence, lastPressedId, verifying, authError, confidence, card, cardType, onGesture, onConfirm, onCancel }: BlockAuthModalProps) {
  const willBlock = cardStatus === 'ACTIVE';
  const color = willBlock ? '#ef4444' : '#10b981';
  const icon = willBlock ? '🔒' : '🔓';
  return (
    <div className="ca-overlay">
      <div className="ca-modal ca-modal-lg">
        <div className="ca-modal-left">
          <ModalCamera onGesture={onGesture} />
          {confidence !== null && (
            <div className="ca-conf-badge">
              <div className="ca-conf-bar" style={{ width: `${confidence}%`, background: confidence >= 80 ? '#34d399' : confidence >= 60 ? '#f59e0b' : '#f87171' }} />
              <span>{confidence}%</span>
            </div>
          )}
          <GestureKeyGrid pressedId={lastPressedId} />
        </div>
        <div className="ca-modal-right">
          <h2 className="ca-modal-title">{icon} {willBlock ? 'Block' : 'Unblock'} {cardLabel}</h2>
          <p className="ca-modal-desc">Show the same gesture sequence you used at login to verify your identity.</p>
          <CardVisual card={card} cardType={cardType} />
          <div className="ca-seq-section">
            <div className="ca-seq-label">🔑 Your login gesture sequence</div>
            <GestureSequenceDisplay sequence={sequence} color={color} />
            {sequence.length > 0 && <code className="ca-seq-code">{sequence.join('-')}</code>}
          </div>
          {verifying && <div className="ca-banner info">⏳ Verifying...</div>}
          {authError && !verifying && <div className="ca-banner error">❌ {authError}</div>}
          <div className="ca-modal-actions">
            <button className="ca-btn ca-btn-ghost" onClick={onCancel}>Cancel</button>
            <button className="ca-btn" style={{ background: color }} onClick={onConfirm} disabled={!sequence.length || verifying}>
              {verifying ? '⏳' : icon} Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── ReplaceReasonModal ──
function ReplaceReasonModal({ cardLabel, cardType, card, confidence, onGesture, onSelect, onCancel }: any) {
  return (
    <div className="ca-overlay">
      <div className="ca-modal">
        <div className="ca-modal-left">
          <ModalCamera onGesture={onGesture} />
          {confidence !== null && (
            <div className="ca-conf-badge">
              <div className="ca-conf-bar" style={{ width: `${confidence}%`, background: confidence >= 80 ? '#34d399' : '#f59e0b' }} />
              <span>{confidence}%</span>
            </div>
          )}
          <div className="ca-cam-guide">
            {REPLACE_REASONS.map(r => <div key={r.value} className="ca-cam-guide-row"><span>{r.emoji}</span><span>{r.label}</span></div>)}
          </div>
        </div>
        <div className="ca-modal-right">
          <h2 className="ca-modal-title">🔄 Replace {cardLabel}</h2>
          <p className="ca-modal-desc">Select the reason for replacement.</p>
          <CardVisual card={card} cardType={cardType} />
          <div className="ca-reason-list">
            {REPLACE_REASONS.map(r => (
              <div key={r.value} className="ca-reason-item" onClick={() => onSelect(r.value)}>
                <span className="ca-reason-emoji">{r.emoji}</span>
                <div>
                  <div className="ca-reason-label">{r.label}</div>
                  <div className="ca-reason-gesture">{r.gesture}</div>
                </div>
              </div>
            ))}
          </div>
          <button className="ca-btn ca-btn-ghost" style={{ width: '100%' }} onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── ReplaceConfirmModal ──
function ReplaceConfirmModal({ cardLabel, cardType, card, reason, confidence, onGesture, onConfirm, onCancel }: any) {
  const r = REPLACE_REASONS.find(x => x.value === reason);
  return (
    <div className="ca-overlay">
      <div className="ca-modal">
        <div className="ca-modal-left">
          <ModalCamera onGesture={onGesture} />
          {confidence !== null && (
            <div className="ca-conf-badge">
              <div className="ca-conf-bar" style={{ width: `${confidence}%`, background: '#8b5cf6' }} />
              <span>{confidence}%</span>
            </div>
          )}
          <div className="ca-cam-guide">
            <div className="ca-cam-guide-row"><span>👍</span><span>Confirm</span></div>
            <div className="ca-cam-guide-row"><span>👎</span><span>Cancel</span></div>
          </div>
        </div>
        <div className="ca-modal-right">
          <h2 className="ca-modal-title">🔄 Confirm Replacement</h2>
          <p className="ca-modal-desc">A new {cardLabel} will be issued. Your current card will be deactivated.</p>
          <CardVisual card={card} cardType={cardType} />
          <div className="ca-replace-info">
            <div className="ca-replace-row"><span>📍 Delivery</span><span>Registered address</span></div>
            <div className="ca-replace-row"><span>📅 ETA</span><span>5–7 business days</span></div>
            <div className="ca-replace-row"><span>📋 Reason</span><span>{r?.emoji} {r?.label}</span></div>
          </div>
          <div className="ca-modal-actions">
            <button className="ca-btn ca-btn-ghost" onClick={onCancel}>Cancel</button>
            <button className="ca-btn" style={{ background: '#8b5cf6' }} onClick={onConfirm}>👍 Confirm</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── ReplacementHistory ──
function ReplacementHistory({ entries, loading }: { entries: ReplacementHistoryEntry[]; loading: boolean }) {
  const statusColor: Record<string, string> = { Processing: '#f59e0b', Shipped: '#60a5fa', Delivered: '#34d399' };
  const reasonEmoji: Record<string, string> = { LOST: '🔍', DAMAGED: '💔', STOLEN: '🚨' };
  if (loading) return <div className="ca-history"><h3>📋 Replacement History</h3><p className="ca-muted">Loading...</p></div>;
  if (!entries.length) return null;
  return (
    <div className="ca-history">
      <h3>📋 Replacement History</h3>
      <div className="ca-timeline">
        {entries.map(e => (
          <div key={e.replacementId} className="ca-timeline-item">
            <div className="ca-tl-dot" style={{ background: statusColor[e.status] ?? '#64748b' }} />
            <div className="ca-tl-content">
              <div className="ca-tl-title">{reasonEmoji[e.reason] ?? '📋'} {e.reason} — {e.cardType}</div>
              <div className="ca-tl-date">{new Date(e.requestedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
            </div>
            <span className="ca-tl-status" style={{ color: statusColor[e.status] ?? '#94a3b8' }}>{e.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── ResultBanner ──
function ResultBanner({ state, message }: { state: ResultState; message: string }) {
  if (state === 'idle') return null;
  return (
    <div className={`ca-result ca-result-${state}`}>
      <span>{state === 'success' ? '✅' : state === 'error' ? '❌' : '⏳'}</span>
      <span>{message}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════
export default function OperatorCardActions() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { cardType } = useParams<{ cardType: string }>();
  const username = currentUser?.username ?? 'default';
  const cardLabel = cardType === 'CREDIT' ? 'Credit Card' : 'Debit Card';

  const [card, setCard] = useState<CardData | null>(null);
  const [flowStep, setFlowStep] = useState<FlowStep>('idle');
  const [replaceReason, setReplaceReason] = useState<ReplaceReason>(null);
  const [resultState, setResultState] = useState<ResultState>('idle');
  const [resultMsg, setResultMsg] = useState('');
  const [confidence, setConfidence] = useState<number | null>(null);
  const [exiting, setExiting] = useState(false);
  const [authSequence, setAuthSequence] = useState<string[]>([]);
  const [lastPressedId, setLastPressedId] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [replacementHistory, setReplacementHistory] = useState<ReplacementHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const flowStepRef = useRef<FlowStep>('idle');
  const authSequenceRef = useRef<string[]>([]);
  const replaceReasonRef = useRef<ReplaceReason>(null);
  const cardRef = useRef<CardData | null>(null);
  const justTransRef = useRef(false);
  const waveXHistory = useRef<number[]>([]);
  const waveCountRef = useRef(0);

  const setFlowBoth = (s: FlowStep) => { flowStepRef.current = s; setFlowStep(s); };
  const setSeqBoth = (seq: string[]) => { authSequenceRef.current = seq; setAuthSequence(seq); };
  const setReasonBoth = (r: ReplaceReason) => { replaceReasonRef.current = r; setReplaceReason(r); };

  useEffect(() => { cardRef.current = card; }, [card]);

  // ── Load data ──
  useEffect(() => {
    getCards(username).then(cards => { const f = cards.find(c => c.cardType === cardType); if (f) setCard(f); }).catch(() => {});
    setHistoryLoading(true);
    getReplacementHistory(username, cardType).then(setReplacementHistory).catch(() => {}).finally(() => setHistoryLoading(false));
  }, [username, cardType]);

  // ── Execute block ──
  const executeBlock = useCallback(async (credential: string, currentCardStatus: string) => {
    try {
      const res = await apiClient.post<CardData>('/api/operator/cards/toggle-block', null, { params: { username, cardType, credential } });
      const updated = res.data;
      setFlowBoth('idle'); setSeqBoth([]); setAuthError(null); setCard(updated);
      setResultState('success');
      setResultMsg(updated.message ?? (currentCardStatus === 'ACTIVE' ? `${cardLabel} blocked` : `${cardLabel} unblocked`));
      setTimeout(() => { setResultState('idle'); setResultMsg(''); }, 5000);
    } catch (e: any) {
      const status = e?.response?.status;
      const serverMsg = e?.response?.data?.error ?? e?.response?.data?.message ?? '';
      if (status === 401) { setAuthError('Wrong gesture password. Enter the same gestures you used to log in.'); setSeqBoth([]); }
      else if (status === 404) { setAuthError('User not found. Please log in again.'); setSeqBoth([]); }
      else { setFlowBoth('idle'); setSeqBoth([]); setAuthError(null); setResultState('error'); setResultMsg(serverMsg || 'Operation failed.'); }
    }
  }, [cardType, cardLabel, username]);

  const executeReplace = useCallback(async () => {
    const reason = replaceReasonRef.current;
    setFlowBoth('idle'); setResultState('loading'); setResultMsg('Requesting replacement...');
    try {
      const updated = await replaceCard(username, cardType!, { reason });
      setCard(updated); setResultState('success'); setResultMsg(updated.message ?? 'Replacement requested');
      getReplacementHistory(username, cardType).then(setReplacementHistory).catch(() => {});
      setReasonBoth(null);
      setTimeout(() => { setResultState('idle'); setResultMsg(''); }, 5000);
    } catch (e: any) { setResultState('error'); setResultMsg(e?.response?.data?.message ?? 'Failed.'); }
  }, [cardType, username]);

  const handleVerifyAndBlock = useCallback(async () => {
    const seq = authSequenceRef.current;
    if (!seq.length) return;
    setVerifying(true); setAuthError(null);
    const credential = seq.join('-');
    const currentStatus = cardRef.current?.cardStatus ?? 'ACTIVE';
    await executeBlock(credential, currentStatus);
    setVerifying(false);
  }, [executeBlock]);

  // ── Gesture handler ──
  const handleGesture = useCallback((evt: GestureEvent) => {
    if (evt.type === 'BOTH_THUMBS_DOWN') { navigate('/'); return; }

    const step = flowStepRef.current;
    const seq = authSequenceRef.current;
    if ('confidence' in evt && typeof evt.confidence === 'number') setConfidence(evt.confidence);

    if (evt.type === 'SLIDER_ACTIVE') {
      const hist = waveXHistory.current; hist.push(evt.normX);
      if (hist.length > 30) hist.shift();
      if (hist.length >= 8) {
        let dirChanges = 0;
        for (let i = 2; i < hist.length; i++) { const p = hist[i-1]-hist[i-2], c = hist[i]-hist[i-1]; if (Math.sign(p)!==Math.sign(c) && Math.abs(c)>0.06) dirChanges++; }
        if (dirChanges >= 5) { waveCountRef.current++; if (waveCountRef.current >= 2) navigate('/'); } else waveCountRef.current = 0;
      }
      return;
    }
    if (evt.type === 'BACK_DYNAMIC' && step === 'idle') { setExiting(true); setTimeout(() => navigate('/operator/cards'), 300); return; }

    if (step === 'block-auth') {
      if (justTransRef.current) { justTransRef.current = false; return; }
      if (evt.type === 'GESTURE_ID') {
        setLastPressedId(evt.id); setTimeout(() => setLastPressedId(null), 600);
        if (seq.length < MAX_SEQUENCE) setSeqBoth([...seq, evt.id]);
        return;
      }
      if (evt.type === 'THUMB_UP') { handleVerifyAndBlock(); return; }
      if (evt.type === 'BACK_DYNAMIC') {
        if (seq.length > 0) { setSeqBoth(seq.slice(0, -1)); setAuthError(null); }
        else { setFlowBoth('idle'); setAuthError(null); }
        return;
      }
      return;
    }
    if (step === 'replace-reason') {
      if (evt.type === 'GESTURE_ID') {
        if (evt.id === 'G001') { setReasonBoth('LOST'); setFlowBoth('replace-confirm'); return; }
        if (evt.id === 'G002') { setReasonBoth('DAMAGED'); setFlowBoth('replace-confirm'); return; }
        if (evt.id === 'G003') { setReasonBoth('STOLEN'); setFlowBoth('replace-confirm'); return; }
      }
      if (evt.type === 'BACK_DYNAMIC') { setFlowBoth('idle'); return; }
      return;
    }
    if (step === 'replace-confirm') {
      if (evt.type === 'THUMB_UP') { executeReplace(); return; }
      if (evt.type === 'BACK_DYNAMIC') { setFlowBoth('idle'); setReasonBoth(null); return; }
      return;
    }
    if (evt.type === 'GESTURE_ID') {
      switch (evt.id) {
        case 'G001': navigate(`/operator/set-limit/${cardType}`); break;
        case 'G002': setFlowBoth('block-auth'); setSeqBoth([]); setAuthError(null); justTransRef.current = true; break;
        case 'G003': setFlowBoth('replace-reason'); break;
      }
    }
  }, [executeReplace, handleVerifyAndBlock, navigate, cardType]);

  const isBlocked = card?.cardStatus === 'BLOCKED';
  const actions = [
    { id: 'limit', label: 'Set Transaction Limit', emoji: '☝️', gesture: 'One Finger', accent: '#059669', desc: 'Adjust spending limit', onClick: () => navigate(`/operator/set-limit/${cardType}`) },
    { id: 'block', label: isBlocked ? 'Unblock Card' : 'Block Card', emoji: isBlocked ? '🔓' : '🔒', gesture: 'Two Fingers', accent: isBlocked ? '#10b981' : '#ef4444', desc: isBlocked ? 'Reactivate transactions' : 'Stop all transactions immediately', onClick: () => { setFlowBoth('block-auth'); setSeqBoth([]); setAuthError(null); } },
    { id: 'replace', label: 'Replace Card', emoji: '🔄', gesture: 'Three Fingers', accent: '#7c3aed', desc: 'Request a new physical card', onClick: () => setFlowBoth('replace-reason') },
  ];

  return (
    <div className={`ca-layout page-container ${exiting ? 'page-exit' : ''}`}>
      {/* Modals */}
      {flowStep === 'block-auth' && card && (
        <BlockAuthModal cardLabel={cardLabel} cardStatus={card.cardStatus} sequence={authSequence} lastPressedId={lastPressedId}
          verifying={verifying} authError={authError} confidence={confidence} card={card} cardType={cardType!}
          onGesture={handleGesture} onConfirm={handleVerifyAndBlock} onCancel={() => { setFlowBoth('idle'); setSeqBoth([]); setAuthError(null); }} />
      )}
      {flowStep === 'replace-reason' && card && (
        <ReplaceReasonModal cardLabel={cardLabel} cardType={cardType!} card={card} confidence={confidence}
          onGesture={handleGesture} onSelect={(r: ReplaceReason) => { setReasonBoth(r); setFlowBoth('replace-confirm'); }} onCancel={() => setFlowBoth('idle')} />
      )}
      {flowStep === 'replace-confirm' && card && (
        <ReplaceConfirmModal cardLabel={cardLabel} cardType={cardType!} card={card} reason={replaceReason}
          confidence={confidence} onGesture={handleGesture} onConfirm={executeReplace} onCancel={() => { setFlowBoth('idle'); setReasonBoth(null); }} />
      )}

      {/* ── Header ── */}
      <header className="ca-header">
        <button className="ca-back" onClick={() => navigate('/operator/cards')}>
          ← Back <span className="ca-back-hint">🖐️→✊</span>
        </button>
        <div className="ca-header-right">
          <div className="ca-header-title">{cardLabel}</div>
          <div className="ca-header-sub">Actions & Settings</div>
        </div>
      </header>

      <main className="ca-main">
        <div className="ca-wrap">
          <div className="ca-content">
            {/* Card Visual */}
            <CardVisual card={card} cardType={cardType!} />

            <ResultBanner state={resultState} message={resultMsg} />

            {/* Actions */}
            <section className="ca-section">
              <h3>Available Actions</h3>
              <div className="ca-actions-grid">
                {actions.map(a => (
                  <div key={a.id} className="ca-action-card" style={{ borderLeft: `4px solid ${a.accent}`, '--ca-accent': a.accent } as React.CSSProperties} onClick={a.onClick}>
                    <div className="ca-action-emoji">{a.emoji}</div>
                    <div className="ca-action-info">
                      <div className="ca-action-label">{a.label}</div>
                      <div className="ca-action-desc">{a.desc}</div>
                      <div className="ca-action-gesture">{a.gesture}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <ReplacementHistory entries={replacementHistory} loading={historyLoading} />
          </div>

          {flowStep === 'idle' && (
            <div className="ca-camera-col">
              <GestureCamera onGesture={handleGesture} />
              <div className="ca-guide">
                <div className="ca-guide-row"><span>☝️</span><span>Set Limit</span></div>
                <div className="ca-guide-row"><span>✌️</span><span>{isBlocked ? 'Unblock' : 'Block'} Card</span></div>
                <div className="ca-guide-row"><span>🤌</span><span>Replace Card</span></div>
                <div className="ca-guide-row"><span>🖐️→✊</span><span>Back to Cards</span></div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
