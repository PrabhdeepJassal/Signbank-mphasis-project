import apiClient from './client';
import type { Role, User, Gesture, Page, Command, CommandMapping } from '../types';

// ── Roles ─────────────────────────────────────────────────────────────────────
export const fetchRoles = (): Promise<Role[]> =>
  apiClient.get('/api/admin/roles').then(r => r.data);

// ── Users ─────────────────────────────────────────────────────────────────────
export const fetchUsers = (): Promise<User[]> =>
  apiClient.get('/api/admin/users').then(r => r.data);

export const createUser = (payload: {
  userId:        string;
  username:      string;
  roleId:        string;
  email:         string;
  passwordHash?: string;   // raw password — backend hashes it
  gestureHash?:  string;
}): Promise<User> =>
  apiClient.post('/api/admin/users', payload).then(r => r.data);

export const updateUser = (id: string, payload: {
  username:      string;
  roleId:        string;
  email:         string;
  passwordHash?: string;   // raw new password — backend re-hashes it; omit to keep existing
}): Promise<User> =>
  apiClient.put(`/api/admin/users/${id}`, payload).then(r => r.data);

export const deleteUser = (id: string): Promise<void> =>
  apiClient.delete(`/api/admin/users/${id}`).then(r => r.data);

// ── Gestures ──────────────────────────────────────────────────────────────────
export const fetchGestures = (): Promise<Gesture[]> =>
  apiClient.get('/api/admin/gestures').then(r => r.data);

export const createGesture = (payload: {
  gestureName:   string;
  gestureSymbol: string;
}): Promise<Gesture> =>
  apiClient.post('/api/admin/gestures', payload).then(r => r.data);

export const updateGesture = (id: string, payload: {
  gestureName:   string;
  gestureSymbol: string;
}): Promise<Gesture> =>
  apiClient.put(`/api/admin/gestures/${id}`, payload).then(r => r.data);

export const deleteGesture = (id: string): Promise<void> =>
  apiClient.delete(`/api/admin/gestures/${id}`).then(r => r.data);

// ── Pages ─────────────────────────────────────────────────────────────────────
export const fetchPages = (): Promise<Page[]> =>
  apiClient.get('/api/admin/pages').then(r => r.data);

export const createPage = (payload: {
  pageName: string;
  roleId:   string;
}): Promise<Page> =>
  apiClient.post('/api/admin/pages', payload).then(r => r.data);

export const updatePage = (id: string, payload: {
  pageName: string;
  roleId:   string;
}): Promise<Page> =>
  apiClient.put(`/api/admin/pages/${id}`, payload).then(r => r.data);

export const deletePage = (id: string): Promise<void> =>
  apiClient.delete(`/api/admin/pages/${id}`).then(r => r.data);

// ── Commands ──────────────────────────────────────────────────────────────────
export const fetchCommands = (): Promise<Command[]> =>
  apiClient.get('/api/admin/commands').then(r => r.data);

export const createCommand = (payload: {
  commandName:        string;
  commandDescription: string;
  pageId:             string;
}): Promise<Command> =>
  apiClient.post('/api/admin/commands', payload).then(r => r.data);

export const updateCommand = (id: string, payload: {
  commandName:        string;
  commandDescription: string;
  pageId:             string;
}): Promise<Command> =>
  apiClient.put(`/api/admin/commands/${id}`, payload).then(r => r.data);

export const deleteCommand = (id: string): Promise<void> =>
  apiClient.delete(`/api/admin/commands/${id}`).then(r => r.data);

// ── Mappings ──────────────────────────────────────────────────────────────────
export const fetchMappings = (): Promise<CommandMapping[]> =>
  apiClient.get('/api/admin/mappings').then(r => r.data);

export const createMapping = (payload: {
  commandId: string;
  gestureId: string;
  roleId:    string;
  userId?:   string | null;
  isActive?: boolean;
}): Promise<CommandMapping> =>
  apiClient.post('/api/admin/mappings', payload).then(r => r.data);

export const updateMapping = (mapId: string, payload: {
  gestureId: string;
  isActive?: boolean;
}): Promise<CommandMapping> =>
  apiClient.put(`/api/admin/mappings/${mapId}`, payload).then(r => r.data);

export const deleteMapping = (mapId: string): Promise<void> =>
  apiClient.delete(`/api/admin/mappings/${mapId}`).then(r => r.data);

export const patchMappingStatus = (mapId: string, active: boolean): Promise<void> =>
  apiClient.patch(`/api/admin/mappings/${mapId}/status`, null, {
    params: { active },
  }).then(r => r.data);