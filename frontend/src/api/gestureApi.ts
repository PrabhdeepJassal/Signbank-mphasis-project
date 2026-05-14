import apiClient from './client';

// ── Existing gesture event ────────────────────────────────────────────────────
export interface GestureEventPayload  { gestureCode: string; confidence: number; }
export interface GestureEventResponse { resolvedCommand: string; status: string; }
export const submitGestureEvent = (p: GestureEventPayload): Promise<GestureEventResponse> =>
  apiClient.post('/api/gesture-events', p).then(r => r.data);

// ── Shared landmark type ──────────────────────────────────────────────────────
export interface LandmarkPoint { x: number; y: number; z: number; }

// ── Finger movement (horizontal tracking) ────────────────────────────────────
export interface FingerTrackPayload  { landmarks: LandmarkPoint[]; }
export interface FingerTrackResponse {
  direction: 'LEFT' | 'RIGHT' | 'NEUTRAL';
  speed:     number;
  limit:     number;
  indexTipX: number;
}
export const analyseFingerMovement = (
  payload: FingerTrackPayload,
  userId:  string
): Promise<FingerTrackResponse> =>
  apiClient
    .post(`/api/operator/analyse-finger?userId=${encodeURIComponent(userId)}`, payload)
    .then(r => r.data);

// ── Rotation analysis ─────────────────────────────────────────────────────────
// Used by SetLimitModal. Falls back gracefully if backend endpoint absent.
export interface RotationPayload  { landmarks: LandmarkPoint[]; }
export interface RotationResponse {
  angleDeg:  number;
  direction: 'CW' | 'CCW' | 'NEUTRAL';
  limit:     number;
}
export const analyseRotation = (
  payload: RotationPayload
): Promise<RotationResponse> =>
  apiClient.post('/api/operator/analyse-rotation', payload).then(r => r.data);

// ── Save / confirm limit ──────────────────────────────────────────────────────
export interface SetLimitPayload  { userId: string; limit: number; }
export interface SetLimitResponse { userId: string; limit: number; status: string; message: string; }
export const setTransactionLimit = (p: SetLimitPayload): Promise<SetLimitResponse> =>
  apiClient.post('/api/operator/set-limit', p).then(r => r.data);