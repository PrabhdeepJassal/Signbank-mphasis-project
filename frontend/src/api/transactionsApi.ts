import apiClient from './client';
import type { Transaction } from '../types';

export const createTransaction = (userId: string, payload: { amount: number; type: string; description: string }): Promise<Transaction> =>
  apiClient.post('/api/transactions', payload, { params: { userId } }).then(r => r.data);

export const fetchTransactions = (userId: string): Promise<Transaction[]> =>
  apiClient.get('/api/transactions', { params: { userId } }).then(r => r.data);
