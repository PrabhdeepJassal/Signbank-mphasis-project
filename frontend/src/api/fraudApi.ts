import apiClient from './client';
import type { FraudAlert, AlertRule, FraudAnalytics } from '../types';

export const fetchAlerts = (params?: { severity?: string; status?: string }): Promise<FraudAlert[]> =>
  apiClient.get('/api/fraud/alerts', { params }).then(r => r.data);

export const fetchAlert = (id: string): Promise<FraudAlert> =>
  apiClient.get(`/api/fraud/alerts/${id}`).then(r => r.data);

export const acknowledgeAlert = (id: string): Promise<void> =>
  apiClient.patch(`/api/fraud/alerts/${id}/acknowledge`).then(r => r.data);

export const resolveAlert = (id: string): Promise<void> =>
  apiClient.patch(`/api/fraud/alerts/${id}/resolve`).then(r => r.data);

export const fetchRules = (): Promise<AlertRule[]> =>
  apiClient.get('/api/fraud/rules').then(r => r.data);

export const updateRule = (id: string, payload: { enabled?: boolean; params?: string }): Promise<void> =>
  apiClient.put(`/api/fraud/rules/${id}`, payload).then(r => r.data);

export const toggleRule = (id: string): Promise<void> =>
  apiClient.patch(`/api/fraud/rules/${id}/toggle`).then(r => r.data);

export const fetchFraudAnalytics = (): Promise<FraudAnalytics> =>
  apiClient.get('/api/fraud/analytics').then(r => r.data);

export const clearAllAlerts = (): Promise<{ deleted: number; message: string }> =>
  apiClient.delete('/api/fraud/alerts').then(r => r.data);
