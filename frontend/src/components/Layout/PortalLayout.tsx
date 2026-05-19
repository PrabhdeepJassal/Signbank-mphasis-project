import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import type { ReactNode } from 'react';
import './PortalLayout.css';

interface Props {
  title: string;
  subtitle: string;
  showLogout?: boolean;
  backPath?: string;
  children: ReactNode;
}

export default function PortalLayout({
  title, subtitle,
  showLogout = false,
  backPath,
  children,
}: Props) {
  const { logout } = useAuth();
  const { gestures } = useData();
  const navigate = useNavigate();

  const backGesture = gestures.find(g => g.gestureId === 'G010');
  const backSym = backGesture?.gestureSymbol ?? '🖐️→✊';

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="portal-layout" role="application" aria-label={`${title} portal`}>
      <a href="#portal-content" className="skip-link">Skip to main content</a>
      <header className="portal-header" role="banner">
        <div className="portal-title-block">
          <h1 className="portal-title">{title}</h1>
          <span className="portal-subtitle">{subtitle}</span>
        </div>

        <div className="portal-actions">
          {backPath ? (
            <button
              className="portal-back-btn"
              onClick={() => navigate(backPath)}
              aria-label={`Go back to ${backPath}`}
            >
              <span aria-hidden="true">←</span> Back
              <span className="back-gesture-hint" aria-hidden="true">{backSym}</span>
            </button>
          ) : null}
          {showLogout ? (
            <button
              className="portal-logout-btn"
              onClick={handleLogout}
              aria-label="Logout"
            >
              Logout
            </button>
          ) : null}
        </div>
      </header>
      <main id="portal-content" className="portal-main" role="main">
        {children}
      </main>
    </div>
  );
}
