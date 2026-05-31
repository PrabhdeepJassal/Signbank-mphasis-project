import apiClient from './client';
import type { TrainedGesture, TrainedGestureMatchResult } from '../types';
import type { LandmarkPoint } from './gestureApi';

export interface SaveTrainedGesturePayload {
  userId: string;
  slotNumber: number;
  slotLabel: string;
  landmarks: LandmarkPoint[];
}

export const getTrainedGestures = (userId: string): Promise<TrainedGesture[]> =>
  apiClient.get('/api/operator/trained-gestures', { params: { userId } }).then(r => r.data);

export const saveTrainedGesture = (payload: SaveTrainedGesturePayload): Promise<TrainedGesture> =>
  apiClient.post('/api/operator/trained-gestures', payload).then(r => r.data);

export const deleteTrainedGesture = (userId: string, slotNumber: number): Promise<void> =>
  apiClient.delete(`/api/operator/trained-gestures/${slotNumber}`, { params: { userId } }).then(() => {});

export interface MatchTrainedGesturePayload {
  userId: string;
  landmarks: LandmarkPoint[];
}

export const matchTrainedGesture = (payload: MatchTrainedGesturePayload): Promise<TrainedGestureMatchResult> =>
  apiClient.post('/api/operator/trained-gestures/match', payload).then(r => r.data);
