import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Role, User, Gesture, Page, Command, CommandMapping } from '../types';
import * as adminApi from '../api/adminApi';
import { useAuth } from './AuthContext';

interface DataContextType {
  roles: Role[];
  users: User[];
  gestures: Gesture[];
  pages: Page[];
  commands: Command[];
  mappings: CommandMapping[];
  loading: boolean;
  refreshRoles: () => Promise<void>;
  refreshUsers: () => Promise<void>;
  refreshGestures: () => Promise<void>;
  refreshPages: () => Promise<void>;
  refreshCommands: () => Promise<void>;
  refreshMappings: () => Promise<void>;
}

const DataContext = createContext<DataContextType | null>(null);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const { token } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [gestures, setGestures] = useState<Gesture[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [commands, setCommands] = useState<Command[]>([]);
  const [mappings, setMappings] = useState<CommandMapping[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshRoles    = async () => { try { setRoles(await adminApi.fetchRoles()); } catch {} };
  const refreshUsers    = async () => { try { setUsers(await adminApi.fetchUsers()); } catch {} };
  const refreshGestures = async () => { try { setGestures(await adminApi.fetchGestures()); } catch {} };
  const refreshPages    = async () => { try { setPages(await adminApi.fetchPages()); } catch {} };
  const refreshCommands = async () => { try { setCommands(await adminApi.fetchCommands()); } catch {} };
  const refreshMappings = async () => { try { setMappings(await adminApi.fetchMappings()); } catch {} };

  // Re-fetch whenever the token changes (e.g. after admin login)
  useEffect(() => {
    if (!token) return;
    setLoading(true);
    Promise.allSettled([
      refreshRoles(),
      refreshUsers(),
      refreshGestures(),
      refreshPages(),
      refreshCommands(),
      refreshMappings(),
    ]).finally(() => setLoading(false));
  }, [token]);

  return (
    <DataContext.Provider value={{
      roles, users, gestures, pages, commands, mappings, loading,
      refreshRoles, refreshUsers, refreshGestures, refreshPages, refreshCommands, refreshMappings,
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
};
