// SignBank Enterprise — shared domain types
// Field names match backend JSON (camelCase from Spring Boot Jackson serialization)

export interface Role {
  roleId: string;
  roleName: 'admin' | 'operator' | 'viewer';
}

export interface User {
  userId: string;
  username: string;
  email: string;
  roleId: string;
  roleName?: string;
  createdAt: string;
  passwordSet: boolean;
}

export interface Gesture {
  gestureId: string;
  gestureName: string;
  gestureSymbol: string;
}

export interface Page {
  pageId: string;
  pageName: string;
  role: { roleId: string; roleName: string };
}

export interface Command {
  commandId: string;
  commandName: string;
  commandDescription: string;
  page: { pageId: string; pageName: string };
}

export interface CommandMapping {
  mapId: string;
  commandId: string;
  commandName?: string;
  gestureId: string;
  gestureName?: string;
  roleId: string;
  roleName?: string;
  userId: string | null;
  isActive: boolean;
}

export interface InteractionLog {
  interactionId: string;
  command: { commandId: string; commandName: string } | null;
  user: { userId: string; username: string } | null;
  gesture: { gestureId: string; gestureName: string; gestureSymbol: string } | null;
  executedAt: string;
  status: string;
  metadata: string;
}
