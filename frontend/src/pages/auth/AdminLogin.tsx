import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../api/client';
import './AdminLogin.css';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const { login } = useAuth();
  const navigate  = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Username and password are required');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const userId = username.trim() === 'admin' ? 'U000' : username.trim();

      const res = await apiClient.post<string>(
        '/api/auth/login',
        null,
        { params: { userId, password: password.trim() } }
      );

      const raw = typeof res.data === 'string'
        ? res.data.trim()
        : String(res.data).trim();

      if (raw === 'FIRST_LOGIN') {
        setError('Admin account has no password. Use db_fix.sql to set one.');
        return;
      }
      if (raw === 'PASSWORD_REQUIRED') {
        setError('Unexpected response. Please check AuthController.java.');
        return;
      }

      let payload: any;
      try {
        payload = JSON.parse(atob(raw.split('.')[1]));
      } catch {
        setError('Invalid response from server. Expected a JWT.');
        return;
      }

      const role: string = (payload.role ?? payload.sub ?? '').toString().toLowerCase();
      if (!role.includes('admin')) {
        setError('Access denied — this account is not an admin');
        return;
      }

      login(
        {
          userId,
          username: username.trim(),
          email:    'admin@signbank.com',
          roleId:   'R000',
          roleName: 'admin',
          createdAt: '',
          passwordSet: true,
        },
        raw
      );
      navigate('/admin/dashboard');

    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401) setError('Wrong username or password');
      else if (status === 404) setError('User not found — check userId');
      else setError('Login failed — check backend connection');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-header">
        <button className="back-link" onClick={() => navigate('/')}>← Back</button>
        <div className="brand-center">
          <div className="brand-name">SignBank Enterprise</div>
          <div className="brand-tagline">Gesture Driven Smart Interaction Platform</div>
        </div>
        <div />
      </div>

      <div className="admin-login-content">
        <div className="admin-login-card">
          <h2>Admin Login</h2>
          <p className="login-hint">Enter your credentials to continue</p>
          <form onSubmit={handleSubmit}>
            <div className="field-group">
              <label>Username / User ID</label>
              <input
                type="text"
                placeholder="admin  or  U000"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="username"
              />
            </div>
            <div className="field-group">
              <label>Password</label>
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            {error && <p className="error-msg">{error}</p>}
            <button type="submit" className="sign-in-btn" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
          <p className="demo-hint">
            Default credentials: <strong>admin</strong> / <strong>admin123</strong>
          </p>
        </div>
      </div>
    </div>
  );
}