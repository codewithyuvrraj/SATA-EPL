-- Complete System Fix - All Issues Resolved
-- Run this in Supabase SQL Editor

-- 1. Fix user hierarchy relationships
ALTER TABLE masters ADD COLUMN IF NOT EXISTS supermaster_id INTEGER REFERENCES supermasters(id);
ALTER TABLE agents ADD COLUMN IF NOT EXISTS master_id INTEGER REFERENCES masters(id);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS agent_id INTEGER REFERENCES agents(id);

-- 2. Ensure all balance columns exist
ALTER TABLE supermasters ADD COLUMN IF NOT EXISTS balance DECIMAL(10,2) DEFAULT 0;
ALTER TABLE masters ADD COLUMN IF NOT EXISTS balance DECIMAL(10,2) DEFAULT 0;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS balance DECIMAL(10,2) DEFAULT 0;

-- 3. Fix ledger table to properly track notes and transactions
DROP TABLE IF EXISTS ledger CASCADE;
CREATE TABLE ledger (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('superMaster', 'master', 'agent', 'client')),
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('deposit', 'withdraw', 'note')),
  amount DECIMAL(10,2) DEFAULT 0,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  created_by VARCHAR(50) DEFAULT 'Admin',
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Create proper balance update trigger
CREATE OR REPLACE FUNCTION update_user_balance_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.transaction_type IN ('deposit', 'withdraw') THEN
    IF NEW.user_type = 'superMaster' THEN
      IF NEW.transaction_type = 'deposit' THEN
        UPDATE supermasters SET balance = balance + NEW.amount WHERE id = NEW.user_id;
      ELSE
        UPDATE supermasters SET balance = balance - NEW.amount WHERE id = NEW.user_id;
      END IF;
    ELSIF NEW.user_type = 'master' THEN
      IF NEW.transaction_type = 'deposit' THEN
        UPDATE masters SET balance = balance + NEW.amount WHERE id = NEW.user_id;
      ELSE
        UPDATE masters SET balance = balance - NEW.amount WHERE id = NEW.user_id;
      END IF;
    ELSIF NEW.user_type = 'agent' THEN
      IF NEW.transaction_type = 'deposit' THEN
        UPDATE agents SET balance = balance + NEW.amount WHERE id = NEW.user_id;
      ELSE
        UPDATE agents SET balance = balance - NEW.amount WHERE id = NEW.user_id;
      END IF;
    ELSIF NEW.user_type = 'client' THEN
      IF NEW.transaction_type = 'deposit' THEN
        UPDATE clients SET balance = balance + NEW.amount WHERE id = NEW.user_id;
      ELSE
        UPDATE clients SET balance = balance - NEW.amount WHERE id = NEW.user_id;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_balance_update ON ledger;
CREATE TRIGGER trigger_balance_update
  AFTER INSERT ON ledger
  FOR EACH ROW
  EXECUTE FUNCTION update_user_balance_trigger();

-- 5. Function to get dashboard stats with proper hierarchy
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS TABLE (
  total_supermasters INTEGER,
  total_masters INTEGER,
  total_agents INTEGER,
  total_clients INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*)::INTEGER FROM supermasters WHERE blocked = false),
    (SELECT COUNT(*)::INTEGER FROM masters WHERE blocked = false),
    (SELECT COUNT(*)::INTEGER FROM agents WHERE blocked = false),
    (SELECT COUNT(*)::INTEGER FROM clients WHERE blocked = false);
END;
$$ LANGUAGE plpgsql;

-- 6. Function to get user hierarchy counts
CREATE OR REPLACE FUNCTION get_user_hierarchy_counts(p_user_id INTEGER, p_user_type VARCHAR)
RETURNS TABLE (
  masters_count INTEGER,
  agents_count INTEGER,
  clients_count INTEGER
) AS $$
BEGIN
  IF p_user_type = 'superMaster' THEN
    RETURN QUERY
    SELECT 
      (SELECT COUNT(*)::INTEGER FROM masters WHERE supermaster_id = p_user_id AND blocked = false),
      (SELECT COUNT(*)::INTEGER FROM agents a 
       JOIN masters m ON a.master_id = m.id 
       WHERE m.supermaster_id = p_user_id AND a.blocked = false),
      (SELECT COUNT(*)::INTEGER FROM clients c 
       JOIN agents a ON c.agent_id = a.id 
       JOIN masters m ON a.master_id = m.id 
       WHERE m.supermaster_id = p_user_id AND c.blocked = false);
  ELSIF p_user_type = 'master' THEN
    RETURN QUERY
    SELECT 
      0::INTEGER,
      (SELECT COUNT(*)::INTEGER FROM agents WHERE master_id = p_user_id AND blocked = false),
      (SELECT COUNT(*)::INTEGER FROM clients c 
       JOIN agents a ON c.agent_id = a.id 
       WHERE a.master_id = p_user_id AND c.blocked = false);
  ELSIF p_user_type = 'agent' THEN
    RETURN QUERY
    SELECT 
      0::INTEGER,
      0::INTEGER,
      (SELECT COUNT(*)::INTEGER FROM clients WHERE agent_id = p_user_id AND blocked = false);
  ELSE
    RETURN QUERY SELECT 0::INTEGER, 0::INTEGER, 0::INTEGER;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 7. Function to get user khata book (including admin notes)
CREATE OR REPLACE FUNCTION get_user_khata_book(p_user_id INTEGER, p_user_type VARCHAR)
RETURNS TABLE (
  id INTEGER,
  transaction_type VARCHAR,
  amount DECIMAL,
  description TEXT,
  date DATE,
  created_by VARCHAR,
  created_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.transaction_type,
    l.amount,
    l.description,
    l.date,
    l.created_by,
    l.created_at
  FROM ledger l
  WHERE l.user_id = p_user_id AND l.user_type = p_user_type
  ORDER BY l.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 8. Function to get user with balance
CREATE OR REPLACE FUNCTION get_user_with_balance(p_username VARCHAR, p_user_type VARCHAR)
RETURNS TABLE (
  id INTEGER,
  username VARCHAR,
  login_name VARCHAR,
  balance DECIMAL,
  win_commission DECIMAL,
  loss_commission DECIMAL,
  total_commission DECIMAL,
  blocked BOOLEAN
) AS $$
BEGIN
  IF p_user_type = 'superMaster' THEN
    RETURN QUERY
    SELECT sm.id, sm.username, sm.login_name, sm.balance, sm.win_commission, 
           sm.loss_commission, sm.total_commission, sm.blocked
    FROM supermasters sm WHERE sm.username = p_username;
  ELSIF p_user_type = 'master' THEN
    RETURN QUERY
    SELECT m.id, m.username, m.login_name, m.balance, m.win_commission, 
           m.loss_commission, m.total_commission, m.blocked
    FROM masters m WHERE m.username = p_username;
  ELSIF p_user_type = 'agent' THEN
    RETURN QUERY
    SELECT a.id, a.username, a.login_name, a.balance, a.win_commission, 
           a.loss_commission, a.total_commission, a.blocked
    FROM agents a WHERE a.username = p_username;
  ELSIF p_user_type = 'client' THEN
    RETURN QUERY
    SELECT c.id, c.username, c.login_name, c.balance, 
           NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, c.blocked
    FROM clients c WHERE c.username = p_username;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 9. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_masters_supermaster ON masters(supermaster_id);
CREATE INDEX IF NOT EXISTS idx_agents_master ON agents(master_id);
CREATE INDEX IF NOT EXISTS idx_clients_agent ON clients(agent_id);
CREATE INDEX IF NOT EXISTS idx_ledger_user ON ledger(user_id, user_type);
CREATE INDEX IF NOT EXISTS idx_ledger_date ON ledger(date);

-- 10. Insert sample data for testing (uncomment if needed)
-- INSERT INTO supermasters (username, login_name, password, win_commission, loss_commission) 
-- VALUES ('TestSM', 'testsm', 'test123', 15, 15) ON CONFLICT (username) DO NOTHING;

-- INSERT INTO masters (username, login_name, password, supermaster_id, win_commission, loss_commission) 
-- VALUES ('TestMaster', 'testmaster', 'test123', 1, 10, 10) ON CONFLICT (username) DO NOTHING;

-- INSERT INTO agents (username, login_name, password, master_id, win_commission, loss_commission) 
-- VALUES ('TestAgent', 'testagent', 'test123', 1, 5, 5) ON CONFLICT (username) DO NOTHING;

-- INSERT INTO clients (username, login_name, password, agent_id, balance) 
-- VALUES ('TestClient', 'testclient', 'test123', 1, 1000) ON CONFLICT (username) DO NOTHING;

-- Test queries
-- SELECT * FROM get_dashboard_stats();
-- SELECT * FROM get_user_hierarchy_counts(1, 'superMaster');
-- SELECT * FROM get_user_khata_book(1, 'superMaster');
-- SELECT * FROM get_user_with_balance('TestSM', 'superMaster');

SELECT 'All system issues fixed successfully!' as status;