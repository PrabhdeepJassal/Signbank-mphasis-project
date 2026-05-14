/**
 * Logs & Analytics API
 * POST /api/logs        — create an interaction log
 * GET  /api/logs        — all logs
 * GET  /api/logs/detailed
 * GET  /api/logs/user/{userId}
 * GET  /api/logs/filter
 * GET  /api/logs/analytics
 */
import apiClient from './client';
import type { InteractionLog } from '../types';

export const fetchLogs = (): Promise<InteractionLog[]> =>
  apiClient.get('/api/logs').then(r => r.data);

export const fetchDetailedLogs = (): Promise<InteractionLog[]> =>
  apiClient.get('/api/logs/detailed').then(r => r.data);

export const fetchLogsByUser = (userId: string): Promise<InteractionLog[]> =>
  apiClient.get(`/api/logs/user/${userId}`).then(r => r.data);

export const fetchAllLogs = (): Promise<InteractionLog[]> =>
  apiClient.get('/api/logs').then(r => r.data);

export const fetchFilteredLogs = (params: Record<string, string>): Promise<InteractionLog[]> =>
  apiClient.get('/api/logs/filter', { params }).then(r => r.data);

export const fetchAnalytics = (): Promise<Record<string, unknown>> =>
  apiClient.get('/api/logs/analytics').then(r => r.data);

export interface LogPayload {
  commandId: string | null;
  userId: string;
  gestureId: string | null;
  metadata: string;
}

export const postLog = (payload: LogPayload): Promise<InteractionLog> =>
  apiClient.post('/api/logs', payload).then(r => r.data);