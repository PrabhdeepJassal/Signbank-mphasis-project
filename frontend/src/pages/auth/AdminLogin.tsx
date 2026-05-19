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
        '/api/auth/login', null,
        { params: { userId, password: password.trim() } }
      );
      const raw = (typeof res.data === 'string' ? res.data : String(res.data)).trim();
      if (raw === 'FIRST_LOGIN') { setError('Admin account has no password. Use db_fix.sql to set one.'); return; }
      if (raw === 'PASSWORD_REQUIRED') { setError('Unexpected response. Please check AuthController.java.'); return; }

      let payload: any;
      try { payload = JSON.parse(atob(raw.split('.')[1])); }
      catch { setError('Invalid response from server.'); return; }

      const role: string = (payload.role ?? payload.sub ?? '').toString().toLowerCase();
      if (!role.includes('admin')) { setError('Access denied — this account is not an admin'); return; }

      login({ userId, username: username.trim(), email: 'admin@signbank.com', roleId: 'R000', roleName: 'admin', createdAt: '', passwordSet: true }, raw);
      navigate('/admin/dashboard');
    } catch (err: any) {
      const s = err?.response?.status;
      if (s === 401) setError('Wrong username or password');
      else if (s === 404) setError('User not found');
      else setError('Login failed — check backend connection');
    } finally { setLoading(false); }
  };

  return (
    <div className="admin-login" role="main" aria-label="Admin login">
      <div className="login-bg" aria-hidden="true">
        <div className="login-bg-orb" />
        <div className="login-bg-orb" />
        <div className="login-bg-orb" />
      </div>

      <header className="login-topbar glass-strong" role="banner">
        <button className="login-back" onClick={() => navigate('/')} aria-label="Back to role selection">
          <span aria-hidden="true">←</span> Back
        </button>
        <div className="login-brand">
          <span className="login-brand-title">SignBank</span>
          <span className="login-brand-sub">Admin Access</span>
        </div>
        <div />
      </header>

      <div className="login-body">
        <div className="login-card" role="region" aria-label="Login form">
          <span className="login-badge">Secure Login</span>
          <h2>Admin Portal</h2>
          <p className="login-hint">Enter your credentials to continue</p>

          <form onSubmit={handleSubmit} noValidate>
            <div className="input-group">
              <label htmlFor="admin-username">Username / User ID</label>
              <input
                id="admin-username"
                type="text"
                placeholder="admin or U000"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="username"
                aria-required="true"
                aria-invalid={!!error && !username.trim()}
              />
            </div>
            <div className="input-group">
              <label htmlFor="admin-password">Password</label>
              <input
                id="admin-password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                aria-required="true"
                aria-invalid={!!error && !password.trim()}
              />
            </div>
            {error && (
              <div className="banner-error" role="alert">
                <span aria-hidden="true">⚠</span> {error}
              </div>
            )}
            <button type="submit" className="login-submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="login-demo">
            Demo: <strong>admin</strong> / <strong>admin123</strong>
          </p>
        </div>
      </div>
    </div>
  );
}
