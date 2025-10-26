-- Fix Balance Updates and Khata Book Display
-- Run this in Supabase SQL Editor

-- Ensure balance columns exist in all user tables
ALTER TABLE supermasters ADD COLUMN IF NOT EXISTS balance DECIMAL(10,2) DEFAULT 0;
ALTER TABLE masters ADD COLUMN IF NOT EXISTS balance DECIMAL(10,2) DEFAULT 0;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS balance DECIMAL(10,2) DEFAULT 0;
-- clients table already has balance column

-- Create or replace function to update user balance after transaction
CREATE OR REPLACE FUNCTION update_user_balance_on_transaction()
RETURNS TRIGGER AS $$
BEGIN
  -- Update balance based on user type and transaction type
  IF NEW.transaction_type = 'deposit' THEN
    IF NEW.user_type = 'superMaster' THEN
      UPDATE supermasters SET balance = balance + NEW.amount WHERE id = NEW.user_id;
    ELSIF NEW.user_type = 'master' THEN
      UPDATE masters SET balance = balance + NEW.amount WHERE id = NEW.user_id;
    ELSIF NEW.user_type = 'agent' THEN
      UPDATE agents SET balance = balance + NEW.amount WHERE id = NEW.user_id;
    ELSIF NEW.user_type = 'client' THEN
      UPDATE clients SET balance = balance + NEW.amount WHERE id = NEW.user_id;
    END IF;
  ELSIF NEW.transaction_type = 'withdraw' THEN
    IF NEW.user_type = 'superMaster' THEN
      UPDATE supermasters SET balance = balance - NEW.amount WHERE id = NEW.user_id;
    ELSIF NEW.user_type = 'master' THEN
      UPDATE masters SET balance = balance - NEW.amount WHERE id = NEW.user_id;
    ELSIF NEW.user_type = 'agent' THEN
      UPDATE agents SET balance = balance - NEW.amount WHERE id = NEW.user_id;
    ELSIF NEW.user_type = 'client' THEN
      UPDATE clients SET balance = balance - NEW.amount WHERE id = NEW.user_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists and create new one
DROP TRIGGER IF EXISTS trigger_update_user_balance ON transactions;
CREATE TRIGGER trigger_update_user_balance
  AFTER INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_balance_on_transaction();

-- Also create trigger for ledger table
DROP TRIGGER IF EXISTS trigger_update_balance_ledger ON ledger;
CREATE TRIGGER trigger_update_balance_ledger
  AFTER INSERT ON ledger
  FOR EACH ROW
  EXECUTE FUNCTION update_user_balance_on_transaction();

-- Function to get user balance by ID and type
CREATE OR REPLACE FUNCTION get_user_balance(p_user_id INTEGER, p_user_type VARCHAR)
RETURNS DECIMAL AS $$
DECLARE
  user_balance DECIMAL := 0;
BEGIN
  IF p_user_type = 'superMaster' THEN
    SELECT balance INTO user_balance FROM supermasters WHERE id = p_user_id;
  ELSIF p_user_type = 'master' THEN
    SELECT balance INTO user_balance FROM masters WHERE id = p_user_id;
  ELSIF p_user_type = 'agent' THEN
    SELECT balance INTO user_balance FROM agents WHERE id = p_user_id;
  ELSIF p_user_type = 'client' THEN
    SELECT balance INTO user_balance FROM clients WHERE id = p_user_id;
  END IF;
  
  RETURN COALESCE(user_balance, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to get user transactions and notes (for khata book)
CREATE OR REPLACE FUNCTION get_user_khata(p_user_id INTEGER, p_user_type VARCHAR)
RETURNS TABLE (
  id INTEGER,
  transaction_type VARCHAR,
  amount DECIMAL,
  description TEXT,
  date DATE,
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
    l.created_at
  FROM ledger l
  WHERE l.user_id = p_user_id 
    AND l.user_type = p_user_type
  ORDER BY l.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- View to get user details with balance
CREATE OR REPLACE VIEW user_details_with_balance AS
SELECT 
  id, username, login_name, 'superMaster' as user_type, balance, blocked
FROM supermasters
UNION ALL
SELECT 
  id, username, login_name, 'master' as user_type, balance, blocked
FROM masters
UNION ALL
SELECT 
  id, username, login_name, 'agent' as user_type, balance, blocked
FROM agents
UNION ALL
SELECT 
  id, username, login_name, 'client' as user_type, balance, blocked
FROM clients;

-- Test queries
-- Get user balance: SELECT get_user_balance(1, 'superMaster');
-- Get user khata: SELECT * FROM get_user_khata(1, 'superMaster');
-- Get all users with balance: SELECT * FROM user_details_with_balance WHERE blocked = false;

SELECT 'Balance and Khata Book fixes applied successfully' as status;