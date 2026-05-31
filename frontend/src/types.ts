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

export interface TrainedGesture {
  id: number | null;
  userId: string;
  slotNumber: number;
  slotLabel: string;
  trained: boolean;
  landmarks?: Array<{ x: number; y: number; z: number }>;
  createdAt: string;
  updatedAt: string;
}

export interface TrainedGestureMatchResult {
  matched: boolean;
  slotNumber: number;
  slotLabel: string;
  confidence: number;
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

export interface FraudAlert {
  alertId: string;
  ruleId: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'NEW' | 'ACKNOWLEDGED' | 'RESOLVED';
  userId: string;
  message: string;
  details: string;
  createdAt: string;
  resolvedAt: string | null;
}

export interface AlertRule {
  ruleId: string;
  name: string;
  category: 'LOGIN' | 'TRANSACTION' | 'VELOCITY';
  description: string;
  enabled: boolean;
  severity: string;
  params: string;
}

export interface Transaction {
  transactionId: string;
  userId: string;
  amount: number;
  type: string;
  description: string;
  status: string;
  timestamp: string;
}

export interface FraudAnalytics {
  totalAlerts: number;
  activeAlerts: number;
  resolvedAlerts: number;
  alertsBySeverity: Record<string, number>;
  alertTrend: Array<{ date: string; count: number }>;
}
