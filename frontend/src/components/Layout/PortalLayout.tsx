/**
 * PortalLayout — uses gestures from DataContext (real API with mock fallback).
 *
 * FIX: handleLogout now navigates to '/' (Landing page — role selection screen)
 * instead of '/login/gesture'. The Landing page lets the user pick Admin /
 * User / Viewer, which is the correct post-logout destination.
 *
 * Task 4: Logout button removed from header — dashboards now use gesture confirm modal.
 */
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
  showLogout = false,   // Default false — dashboards handle logout via modal
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
    <div className="portal-layout">
      <header className="portal-header">
        <div className="portal-title-block">
          <h1 className="portal-title">{title}</h1>
          <span className="portal-subtitle">{subtitle}</span>
        </div>

        {backPath ? (
          <button className="portal-back-btn" onClick={() => navigate(backPath)}>
            ← Back
            <span className="back-gesture">{backSym} Dynamic Back</span>
          </button>
        ) : showLogout ? (
          <button className="portal-logout-btn" onClick={handleLogout}>
            Logout <span className="logout-gesture-hint">{backSym} Open→Fist</span>
          </button>
        ) : null}
      </header>
      <main className="portal-main">{children}</main>
    </div>
  );
}
