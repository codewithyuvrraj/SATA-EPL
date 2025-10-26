-- Fix Balance Display Issues
-- Run this in Supabase SQL Editor

-- Function to get user by username and type (for panel login)
CREATE OR REPLACE FUNCTION get_user_by_username(p_username VARCHAR, p_user_type VARCHAR)
RETURNS TABLE (
  id INTEGER,
  username VARCHAR,
  login_name VARCHAR,
  password VARCHAR,
  balance DECIMAL,
  blocked BOOLEAN,
  win_commission DECIMAL,
  loss_commission DECIMAL,
  total_commission DECIMAL
) AS $$
BEGIN
  IF p_user_type = 'superMaster' THEN
    RETURN QUERY
    SELECT sm.id, sm.username, sm.login_name, sm.password, sm.balance, sm.blocked,
           sm.win_commission, sm.loss_commission, sm.total_commission
    FROM supermasters sm
    WHERE sm.username = p_username;
  ELSIF p_user_type = 'master' THEN
    RETURN QUERY
    SELECT m.id, m.username, m.login_name, m.password, m.balance, m.blocked,
           m.win_commission, m.loss_commission, m.total_commission
    FROM masters m
    WHERE m.username = p_username;
  ELSIF p_user_type = 'agent' THEN
    RETURN QUERY
    SELECT a.id, a.username, a.login_name, a.password, a.balance, a.blocked,
           a.win_commission, a.loss_commission, a.total_commission
    FROM agents a
    WHERE a.username = p_username;
  ELSIF p_user_type = 'client' THEN
    RETURN QUERY
    SELECT c.id, c.username, c.login_name, c.password, c.balance, c.blocked,
           NULL::DECIMAL as win_commission, NULL::DECIMAL as loss_commission, NULL::DECIMAL as total_commission
    FROM clients c
    WHERE c.username = p_username;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to update user balance directly
CREATE OR REPLACE FUNCTION update_user_balance_direct(
  p_user_id INTEGER,
  p_user_type VARCHAR,
  p_amount DECIMAL,
  p_operation VARCHAR -- 'add' or 'subtract'
)
RETURNS BOOLEAN AS $$
DECLARE
  success BOOLEAN := FALSE;
BEGIN
  IF p_user_type = 'superMaster' THEN
    IF p_operation = 'add' THEN
      UPDATE supermasters SET balance = balance + p_amount WHERE id = p_user_id;
    ELSE
      UPDATE supermasters SET balance = balance - p_amount WHERE id = p_user_id;
    END IF;
    success := TRUE;
  ELSIF p_user_type = 'master' THEN
    IF p_operation = 'add' THEN
      UPDATE masters SET balance = balance + p_amount WHERE id = p_user_id;
    ELSE
      UPDATE masters SET balance = balance - p_amount WHERE id = p_user_id;
    END IF;
    success := TRUE;
  ELSIF p_user_type = 'agent' THEN
    IF p_operation = 'add' THEN
      UPDATE agents SET balance = balance + p_amount WHERE id = p_user_id;
    ELSE
      UPDATE agents SET balance = balance - p_amount WHERE id = p_user_id;
    END IF;
    success := TRUE;
  ELSIF p_user_type = 'client' THEN
    IF p_operation = 'add' THEN
      UPDATE clients SET balance = balance + p_amount WHERE id = p_user_id;
    ELSE
      UPDATE clients SET balance = balance - p_amount WHERE id = p_user_id;
    END IF;
    success := TRUE;
  END IF;
  
  RETURN success;
END;
$$ LANGUAGE plpgsql;

-- View to get all user khata entries with user details
CREATE OR REPLACE VIEW user_khata_view AS
SELECT 
  l.id,
  l.user_id,
  l.user_type,
  l.transaction_type,
  l.amount,
  l.description,
  l.date,
  l.created_at,
  CASE 
    WHEN l.user_type = 'superMaster' THEN sm.username
    WHEN l.user_type = 'master' THEN m.username
    WHEN l.user_type = 'agent' THEN a.username
    WHEN l.user_type = 'client' THEN c.username
  END as username
FROM ledger l
LEFT JOIN supermasters sm ON l.user_type = 'superMaster' AND l.user_id = sm.id
LEFT JOIN masters m ON l.user_type = 'master' AND l.user_id = m.id
LEFT JOIN agents a ON l.user_type = 'agent' AND l.user_id = a.id
LEFT JOIN clients c ON l.user_type = 'client' AND l.user_id = c.id;

-- Test the functions
-- SELECT * FROM get_user_by_username('testuser', 'superMaster');
-- SELECT update_user_balance_direct(1, 'superMaster', 100, 'add');
-- SELECT * FROM user_khata_view WHERE username = 'testuser';

SELECT 'Balance display fixes applied successfully' as status;