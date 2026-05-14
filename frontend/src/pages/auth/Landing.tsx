import { useNavigate } from 'react-router-dom';
import GestureCamera from '../../components/GestureCamera/GestureCamera';
import { useGlobalGestureNav } from '../../hooks/useGlobalGestureNav';
import './Landing.css';

export default function Landing() {
  const navigate = useNavigate();

  const buttons = [
    { id: 'admin', gestureId: 'G001', action: () => navigate('/admin/login'), label: 'Admin Login' },
    { id: 'operator', gestureId: 'G002', action: () => navigate('/login/gesture'), label: 'Operator/Viewer Login' },
  ];

  const { handleGesture } = useGlobalGestureNav({ buttons });

  return (
    <div className="landing-page">
      <div className="landing-brand">
        <div className="landing-logo">SB</div>
        <h1>SignBank Enterprise</h1>
        <p>Gesture Driven Smart Interaction Platform</p>
      </div>
      <div className="landing-cards">
        <div className="landing-card admin" onClick={() => navigate('/admin/login')}>
          <div className="role-badge admin-badge">ADM</div>
          <h2>Admin</h2>
          <p>Platform management</p>
          <div className="gesture-hint-landing">☝️ One Finger</div>
        </div>
        <div className="landing-card operator" onClick={() => navigate('/login/gesture')}>
          <div className="role-badge operator-badge">USR</div>
          <h2>User</h2>
          <p>Gesture-based access</p>
          <div className="gesture-hint-landing">✌️ Two Fingers</div>
        </div>
        <div className="landing-card viewer" onClick={() => navigate('/login/gesture')}>
          <div className="role-badge viewer-badge">VWR</div>
          <h2>Viewer</h2>
          <p>Gesture-based access</p>
          <div className="gesture-hint-landing">✌️ Two Fingers</div>
        </div>
      </div>
      <GestureCamera onGesture={handleGesture} />
    </div>
  );
}
