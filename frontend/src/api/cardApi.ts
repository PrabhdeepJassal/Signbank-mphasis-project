import apiClient from './client';

export interface CardData {
  cardId: string;
  cardType: 'CREDIT' | 'DEBIT';
  cardStatus: 'ACTIVE' | 'BLOCKED';
  cardNumber: string;
  replaceRequested: boolean;
  message?: string;
}

export type ReplaceReason = 'LOST' | 'DAMAGED' | 'STOLEN' | null;

export interface ReplacementHistoryEntry {
  replacementId: string;
  cardType: string;
  reason: string;
  status: 'Processing' | 'Shipped' | 'Delivered';
  requestedAt: string;
}

/** GET /api/operator/cards?username=xxx */
export const getCards = (username: string): Promise<CardData[]> =>
  apiClient.get(`/api/operator/cards?username=${encodeURIComponent(username)}`).then(r => r.data);

/** POST /api/operator/cards/toggle-block?username=xxx&cardType=CREDIT&credential=G001-G002 */
export const toggleBlockCard = (username: string, cardType: string, credential: string): Promise<CardData> =>
  apiClient
    .post(`/api/operator/cards/toggle-block?username=${encodeURIComponent(username)}&cardType=${cardType}&credential=${encodeURIComponent(credential)}`)
    .then(r => r.data);

/** POST /api/operator/cards/replace?username=xxx&cardType=DEBIT&reason=LOST */
export const replaceCard = (
  username: string,
  cardType: string,
  options?: { reason?: ReplaceReason }
): Promise<CardData> => {
  const params = new URLSearchParams({
    username,
    cardType,
    ...(options?.reason ? { reason: options.reason } : {}),
  });
  return apiClient.post(`/api/operator/cards/replace?${params}`).then(r => r.data);
};

/** GET /api/operator/cards/replacement-history?username=xxx&cardType=CREDIT */
export const getReplacementHistory = (
  username: string,
  cardType?: string
): Promise<ReplacementHistoryEntry[]> => {
  const params = new URLSearchParams({ username });
  if (cardType) params.append('cardType', cardType);
  return apiClient.get(`/api/operator/cards/replacement-history?${params}`).then(r => r.data);
};