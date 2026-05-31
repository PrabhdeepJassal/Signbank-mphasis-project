import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { FraudAlert } from '../types';
import { fetchAlerts, acknowledgeAlert, resolveAlert } from '../api/fraudApi';

interface FraudContextType {
  alerts: FraudAlert[];
  unacknowledgedAlerts: FraudAlert[];
  loading: boolean;
  acknowledge: (id: string) => Promise<void>;
  resolve: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const FraudContext = createContext<FraudContextType | null>(null);

export const FraudProvider = ({ children }: { children: ReactNode }) => {
  const [alerts, setAlerts] = useState<FraudAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchAlerts();
      setAlerts(data);
    } catch {
      // silently fail — backend may not be up yet
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 8000);
    return () => clearInterval(interval);
  }, [refresh]);

  const acknowledge = async (id: string) => {
    await acknowledgeAlert(id);
    await refresh();
  };

  const resolve = async (id: string) => {
    await resolveAlert(id);
    await refresh();
  };

  const unacknowledgedAlerts = alerts.filter(
    a => a.status === 'NEW' && (a.severity === 'HIGH' || a.severity === 'CRITICAL')
  );

  return (
    <FraudContext.Provider value={{ alerts, unacknowledgedAlerts, loading, acknowledge, resolve, refresh }}>
      {children}
    </FraudContext.Provider>
  );
};

export const useFraud = () => {
  const ctx = useContext(FraudContext);
  if (!ctx) throw new Error('useFraud must be used within FraudProvider');
  return ctx;
};
