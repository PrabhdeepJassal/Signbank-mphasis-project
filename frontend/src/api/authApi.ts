/**
 * Auth API
 * POST /api/auth/register  — { userId, name, role, email } → { token, message }
 * POST /api/auth/login     — ?userId=... → plain JWT string
 */
import apiClient from './client';

export interface LoginResponse {
  token: string;
}

// Backend returns a plain JWT string from /api/auth/login
export const loginUser = (userId: string): Promise<LoginResponse> =>
  apiClient
    .post('/api/auth/login', null, { params: { userId } })
    .then(r => ({ token: r.data as string }));

export const registerUser = (payload: {
  username: string;
  password: string;
  email: string;
  gestureData: string;
}): Promise<{ token: string; message: string }> =>
  apiClient.post('/api/auth/register', payload).then(r => r.data);
