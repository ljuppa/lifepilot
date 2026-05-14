-- ARCH11: Append-only audit log table
-- Stores consent events, data exports, account deletions, admin actions.
-- No PII in log message fields.

CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type  TEXT NOT NULL,
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient lookups by user and event type
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id       ON audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type    ON audit_logs (event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_event    ON audit_logs (user_id, event_type);

-- RLS: users can only read their own audit log entries
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own audit logs"
  ON audit_logs FOR SELECT
  USING (user_id = auth.uid());

-- Service role bypasses RLS for inserts from server actions
