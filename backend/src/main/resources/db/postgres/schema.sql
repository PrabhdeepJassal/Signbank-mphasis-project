-- SignBank RBAC + gesture command schema (PostgreSQL)

CREATE TABLE IF NOT EXISTS roles (
    role_id VARCHAR(10) PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS users (
    user_id VARCHAR(20) PRIMARY KEY,
    role_id VARCHAR(10) NOT NULL,
    username VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    email VARCHAR(255) NOT NULL UNIQUE,
    gesture_hash VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_role
        FOREIGN KEY (role_id) REFERENCES roles(role_id),
    -- Admin uses password only, Operator/Viewer use gesture only
    CONSTRAINT chk_users_auth_by_role
        CHECK (
            (role_id = 'R000' AND password_hash IS NOT NULL AND gesture_hash IS NULL) OR
            (role_id IN ('R001', 'R002') AND password_hash IS NULL AND gesture_hash IS NOT NULL)
        )
);

CREATE TABLE IF NOT EXISTS gestures (
    gesture_id VARCHAR(10) PRIMARY KEY,
    gesture_name VARCHAR(255) NOT NULL UNIQUE,
    gesture_symbol VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS pages (
    page_id VARCHAR(10) PRIMARY KEY,
    page_name VARCHAR(255) NOT NULL UNIQUE,
    role_id VARCHAR(10) NOT NULL,
    CONSTRAINT fk_pages_role
        FOREIGN KEY (role_id) REFERENCES roles(role_id)
);

CREATE TABLE IF NOT EXISTS commands (
    command_id VARCHAR(10) PRIMARY KEY,
    command_name VARCHAR(255) NOT NULL,
    command_description VARCHAR(500),
    page_id VARCHAR(10) NOT NULL,
    CONSTRAINT fk_commands_page
        FOREIGN KEY (page_id) REFERENCES pages(page_id),
    -- Allows same command_name on different pages, blocks duplicates per page
    CONSTRAINT uq_commands_page_name UNIQUE (page_id, command_name)
);

CREATE TABLE IF NOT EXISTS command_mapping (
    map_id VARCHAR(10) PRIMARY KEY,
    command_id VARCHAR(10) NOT NULL,
    role_id VARCHAR(10) NOT NULL,
    gesture_id VARCHAR(10) NOT NULL,
    user_id VARCHAR(20),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_map_command
        FOREIGN KEY (command_id) REFERENCES commands(command_id),
    CONSTRAINT fk_map_role
        FOREIGN KEY (role_id) REFERENCES roles(role_id),
    CONSTRAINT fk_map_gesture
        FOREIGN KEY (gesture_id) REFERENCES gestures(gesture_id),
    CONSTRAINT fk_map_user
        FOREIGN KEY (user_id) REFERENCES users(user_id),
    -- One active mapping per role/gesture/user context
    CONSTRAINT uq_mapping_unique UNIQUE (role_id, gesture_id, user_id)
);

CREATE TABLE IF NOT EXISTS interaction_log (
    interaction_id VARCHAR(10) PRIMARY KEY,
    command_id VARCHAR(10) NOT NULL,
    user_id VARCHAR(20) NOT NULL,
    gesture_id VARCHAR(10),
    executed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'failed', 'rejected')),
    metadata VARCHAR(500),
    CONSTRAINT fk_log_command
        FOREIGN KEY (command_id) REFERENCES commands(command_id),
    CONSTRAINT fk_log_user
        FOREIGN KEY (user_id) REFERENCES users(user_id),
    CONSTRAINT fk_log_gesture
        FOREIGN KEY (gesture_id) REFERENCES gestures(gesture_id)
);
