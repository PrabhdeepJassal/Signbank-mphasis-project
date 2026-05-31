-- Seed data for SignBank (runs on every startup, uses ON CONFLICT to skip duplicates)

MERGE INTO roles (role_id, role_name) KEY (role_id) VALUES
('R000', 'admin'),
('R001', 'operator'),
('R002', 'viewer');

MERGE INTO gestures (gesture_id, gesture_name, gesture_symbol) KEY (gesture_id) VALUES
('G001', 'One Finger', 'ONE_FINGER'),
('G002', 'Two Finger', 'TWO_FINGER'),
('G003', 'Three Finger', 'THREE_FINGER'),
('G004', 'Closed middle Two Finger', 'CLOSED_MIDDLE_TWO_FINGER'),
('G005', 'Open Palm', 'OPEN_PALM'),
('G006', 'Thumbs Up', 'THUMBS_UP'),
('G007', 'Thumbs Down', 'THUMBS_DOWN'),
('G008', 'Fist', 'FIST'),
('G009', 'Middle Two Closed', 'MIDDLE_TWO_CLOSED');

MERGE INTO users (user_id, username, password_hash, email, gesture_hash, role_id, created_at) KEY (user_id) VALUES
('U000', 'admin', 'admin123', 'admin@signbank.com', NULL, 'R000', '2024-01-01T00:00:00Z'),
('1111', '1111', 'G001-G002-G003', 'operator1@signbank.com', 'G001-G002-G003', 'R001', '2024-01-02T00:00:00Z'),
('1212', '1212', 'G005', 'operator2@signbank.com', 'G005', 'R001', '2024-01-03T00:00:00Z'),
('2111', '2111', 'G001-G002-G001', 'viewer1@signbank.com', 'G001-G002-G001', 'R002', '2024-01-04T00:00:00Z'),
('2212', '2212', 'G003-G004-G005', 'viewer2@signbank.com', 'G003-G004-G005', 'R002', '2024-01-05T00:00:00Z');

MERGE INTO pages (page_id, page_name, role_id) KEY (page_id) VALUES
('P001', 'Operator Dashboard', 'R001'),
('P002', 'Operator Balance Page', 'R001'),
('P003', 'Viewer Dashboard', 'R002'),
('P004', 'Viewer Log Page', 'R002'),
('P005', 'Viewer Analytics Page', 'R002');

MERGE INTO commands (command_id, command_name, command_description, page_id) KEY (command_id) VALUES
('C001', 'Check Balance', 'Used to check the balance of the operator', 'P001'),
('C002', 'Logout', 'Used to logout', 'P001'),
('C003', 'Back', 'Used to go back', 'P002'),
('C004', 'View Logs', 'Used to navigate to the view log page', 'P003'),
('C005', 'View Analytics', 'Used to navigate to the view analytics page', 'P003'),
('C006', 'Logout', 'Used to logout', 'P003'),
('C007', 'Back', 'Used to go back', 'P004'),
('C008', 'Back', 'Used to go back', 'P005');

MERGE INTO command_mapping (map_id, command_id, role_id, gesture_id, user_id, is_active) KEY (map_id) VALUES
('M001', 'C001', 'R001', 'G002', NULL, TRUE),
('M002', 'C002', 'R001', 'G008', NULL, TRUE),
('M003', 'C003', 'R001', 'G008', '1111', TRUE),
('M004', 'C004', 'R002', 'G001', NULL, TRUE),
('M005', 'C005', 'R002', 'G002', NULL, TRUE),
('M006', 'C006', 'R002', 'G008', NULL, TRUE),
('M007', 'C007', 'R002', 'G008', '2111', TRUE),
('M008', 'C008', 'R002', 'G008', '2212', TRUE);

MERGE INTO interaction_log (interaction_id, command_id, user_id, gesture_id, executed_at, status, metadata) KEY (interaction_id) VALUES
('L001', 'C001', '1111', 'G002', '2024-03-01T10:00:00Z', 'success', 'Balance checked'),
('L002', 'C004', '2111', 'G001', '2024-03-01T11:00:00Z', 'success', 'Navigated to logs'),
('L003', 'C005', '2111', 'G002', '2024-03-01T11:30:00Z', 'success', 'Navigated to analytics'),
('L004', 'C002', '1111', 'G008', '2024-03-01T12:00:00Z', 'success', 'Logged out'),
('L005', 'C006', '2212', 'G008', '2024-03-02T09:00:00Z', 'success', 'Logged out'),
('L006', 'C001', '1212', 'G002', '2024-03-02T10:00:00Z', 'failed', 'Gesture not recognized');

-- ── AI Fraud Detection — seed rules ─────────────────────────────────────────
MERGE INTO alert_rules (rule_id, name, category, description, enabled, severity, params) KEY (rule_id) VALUES
('R01', 'Brute Force Login', 'LOGIN', 'More than 3 failed logins in 5 minutes', TRUE, 'HIGH', '{"maxFailures":3,"windowMinutes":5}'),
('R02', 'Off-Hours Login', 'LOGIN', 'Login between 11 PM and 5 AM', TRUE, 'MEDIUM', '{"startHour":23,"endHour":5}'),
('R03', 'New Device Login', 'LOGIN', 'Login from a device never seen before', TRUE, 'MEDIUM', '{}'),
('R04', 'Gesture Spam', 'LOGIN', 'More than 5 failed gesture attempts in 2 minutes', TRUE, 'HIGH', '{"maxFailed":5,"windowMinutes":2}'),
('R05', 'High-Value Transaction', 'TRANSACTION', 'Amount more than 3x the user average', TRUE, 'HIGH', '{"multiplier":3.0}'),
('R06', 'Unusual Transaction Type', 'TRANSACTION', 'Transaction type different from usual pattern', TRUE, 'MEDIUM', '{}'),
('R07', 'First Transaction', 'TRANSACTION', 'User has never done a transaction before', TRUE, 'LOW', '{}'),
('R08', 'Over Limit', 'TRANSACTION', 'Amount exceeds card or user limit', TRUE, 'CRITICAL', '{}'),
('R09', 'High Transaction Velocity', 'VELOCITY', 'More than 3 transactions in 1 minute', TRUE, 'HIGH', '{"maxTransactions":3,"windowMinutes":1}'),
('R10', 'Multiple IPs', 'VELOCITY', 'Same user active from multiple IPs in 1 minute', TRUE, 'CRITICAL', '{"windowMinutes":1}'),
('R11', 'Gesture Velocity', 'VELOCITY', 'More than 10 gesture events per minute', TRUE, 'MEDIUM', '{"maxGestures":10,"windowMinutes":1}');
