-- Postgres Schema Setup for Adra Lead Qualification Workflow

-- 1. Leads Table: Stores qualified lead information
CREATE TABLE IF NOT EXISTS leads (
    email TEXT PRIMARY KEY,
    name TEXT,
    company TEXT,
    product_idea TEXT,
    budget INTEGER,
    timeline TEXT,
    market TEXT,
    kpi TEXT,
    expectations TEXT,
    stage TEXT,
    urgency TEXT,
    sessionid TEXT,
    phone TEXT,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Session Active User: Tracks which email is active in a chat session
CREATE TABLE IF NOT EXISTS session_active_user (
    sessionid TEXT PRIMARY KEY,
    current_email TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Session Switch Pending: Tracks OTP and account switch requests
CREATE TABLE IF NOT EXISTS session_switch_pending (
    sessionid TEXT PRIMARY KEY,
    pending_email TEXT,
    phone TEXT,
    otp_sent BOOLEAN DEFAULT FALSE
);

-- 4. Main Flow Chat: For n8n AI memory (Postgres Chat Memory node)
CREATE TABLE IF NOT EXISTS main_flow_chat (
    id SERIAL PRIMARY KEY,
    session_id TEXT,
    message JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster session lookups in memory
CREATE INDEX IF NOT EXISTS idx_main_flow_chat_session ON main_flow_chat(session_id);
