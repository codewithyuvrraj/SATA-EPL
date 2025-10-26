-- Fix Balance Update Issue - Admin deposit/withdraw not reflecting in user accounts
-- Run this in Supabase SQL Editor

-- 1. Function to update user balance with proper table detection
CREATE OR REPLACE FUNCTION admin_update_user_balance(
  p_username VARCHAR,
  p_panel VARCHAR,
  p_amount DECIMAL,
  p_transaction_type VARCHAR
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  new_balance DECIMAL
) AS $$
DECLARE
  user_id INTEGER;
  current_balance DECIMAL := 0;
  new_balance DECIMAL := 0;
  table_name TEXT;
BEGIN
  -- Determine table name based on panel
  CASE p_panel
    WHEN 'superMaster' THEN table_name := 'supermasters';
    WHEN 'master' THEN table_name := 'masters';
    WHEN 'agent' THEN table_name := 'agents';
    WHEN 'client' THEN table_name := 'clients';
    ELSE
      RETURN QUERY SELECT FALSE, 'Invalid panel type', 0::DECIMAL;
      RETURN;
  END CASE;
  
  -- Get user ID and current balance
  EXECUTE format('SELECT id, COALESCE(balance, 0) FROM %I WHERE username = $1 AND blocked = false', table_name)
  INTO user_id, current_balance
  USING p_username;
  
  IF user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'User not found or blocked', 0::DECIMAL;
    RETURN;
  END IF;
  
  -- Calculate new balance
  IF p_transaction_type = 'deposit' THEN
    new_balance := current_balance + p_amount;
  ELSIF p_transaction_type = 'withdraw' THEN
    IF current_balance < p_amount THEN
      RETURN QUERY SELECT FALSE, 'Insufficient balance', current_balance;
      RETURN;
    END IF;
    new_balance := current_balance - p_amount;
  ELSE
    RETURN QUERY SELECT FALSE, 'Invalid transaction type', current_balance;
    RETURN;
  END IF;
  
  -- Update balance in the appropriate table
  EXECUTE format('UPDATE %I SET balance = $1 WHERE id = $2', table_name)
  USING new_balance, user_id;
  
  -- Record transaction in transactions table
  INSERT INTO transactions (user_id, user_type, transaction_type, amount, description, created_at)
  VALUES (user_id, p_panel, p_transaction_type, p_amount, 
          format('Admin %s - Amount: %s', p_transaction_type, p_amount), NOW());
  
  RETURN QUERY SELECT TRUE, format('%s successful. New balance: %s', 
                                  CASE WHEN p_transaction_type = 'deposit' THEN 'Deposit' ELSE 'Withdrawal' END,
                                  new_balance), new_balance;
END;
$$ LANGUAGE plpgsql;

-- 2. Function to get user balance from any table
CREATE OR REPLACE FUNCTION get_user_balance(
  p_username VARCHAR,
  p_panel VARCHAR
)
RETURNS DECIMAL AS $$
DECLARE
  user_balance DECIMAL := 0;
  table_name TEXT;
BEGIN
  -- Determine table name based on panel
  CASE p_panel
    WHEN 'superMaster' THEN table_name := 'supermasters';
    WHEN 'master' THEN table_name := 'masters';
    WHEN 'agent' THEN table_name := 'agents';
    WHEN 'client' THEN table_name := 'clients';
    ELSE
      RETURN 0;
  END CASE;
  
  -- Get current balance
  EXECUTE format('SELECT COALESCE(balance, 0) FROM %I WHERE username = $1 AND blocked = false', table_name)
  INTO user_balance
  USING p_username;
  
  RETURN COALESCE(user_balance, 0);
END;
$$ LANGUAGE plpgsql;

-- 3. Function to validate user exists in specified panel
CREATE OR REPLACE FUNCTION validate_user_in_panel(
  p_username VARCHAR,
  p_panel VARCHAR
)
RETURNS BOOLEAN AS $$
DECLARE
  user_exists BOOLEAN := FALSE;
  table_name TEXT;
BEGIN
  -- Determine table name based on panel
  CASE p_panel
    WHEN 'superMaster' THEN table_name := 'supermasters';
    WHEN 'master' THEN table_name := 'masters';
    WHEN 'agent' THEN table_name := 'agents';
    WHEN 'client' THEN table_name := 'clients';
    ELSE
      RETURN FALSE;
  END CASE;
  
  -- Check if user exists
  EXECUTE format('SELECT EXISTS(SELECT 1 FROM %I WHERE username = $1 AND blocked = false)', table_name)
  INTO user_exists
  USING p_username;
  
  RETURN user_exists;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger function to automatically update balance on transaction insert
CREATE OR REPLACE FUNCTION update_balance_on_transaction()
RETURNS TRIGGER AS $$
DECLARE
  table_name TEXT;
  current_balance DECIMAL;
  new_balance DECIMAL;
BEGIN
  -- Determine table name based on user_type
  CASE NEW.user_type
    WHEN 'superMaster' THEN table_name := 'supermasters';
    WHEN 'master' THEN table_name := 'masters';
    WHEN 'agent' THEN table_name := 'agents';
    WHEN 'client' THEN table_name := 'clients';
    ELSE
      RETURN NEW;
  END CASE;
  
  -- Get current balance
  EXECUTE format('SELECT COALESCE(balance, 0) FROM %I WHERE id = $1', table_name)
  INTO current_balance
  USING NEW.user_id;
  
  -- Calculate new balance based on transaction type
  IF NEW.transaction_type = 'deposit' THEN
    new_balance := current_balance + NEW.amount;
  ELSIF NEW.transaction_type = 'withdraw' THEN
    new_balance := current_balance - NEW.amount;
  ELSE
    RETURN NEW;
  END IF;
  
  -- Update balance in the appropriate table
  EXECUTE format('UPDATE %I SET balance = $1 WHERE id = $2', table_name)
  USING new_balance, NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create trigger for automatic balance updates
DROP TRIGGER IF EXISTS balance_update_trigger ON transactions;
CREATE TRIGGER balance_update_trigger
  AFTER INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_balance_on_transaction();

-- 6. Function to get all users from a specific panel with their balances
CREATE OR REPLACE FUNCTION get_panel_users_with_balance(p_panel VARCHAR)
RETURNS TABLE (
  id INTEGER,
  username VARCHAR,
  login_name VARCHAR,
  balance DECIMAL,
  blocked BOOLEAN
) AS $$
DECLARE
  table_name TEXT;
BEGIN
  -- Determine table name based on panel
  CASE p_panel
    WHEN 'superMaster' THEN table_name := 'supermasters';
    WHEN 'master' THEN table_name := 'masters';
    WHEN 'agent' THEN table_name := 'agents';
    WHEN 'client' THEN table_name := 'clients';
    ELSE
      RETURN;
  END CASE;
  
  -- Return users with their balances
  RETURN QUERY EXECUTE format('
    SELECT id, username, login_name, COALESCE(balance, 0) as balance, blocked 
    FROM %I 
    WHERE blocked = false 
    ORDER BY username', table_name);
END;
$$ LANGUAGE plpgsql;

-- Test the functions
-- SELECT * FROM admin_update_user_balance('testuser', 'superMaster', 1000, 'deposit');
-- SELECT get_user_balance('testuser', 'superMaster');
-- SELECT validate_user_in_panel('testuser', 'superMaster');
-- SELECT * FROM get_panel_users_with_balance('superMaster');

SELECT 'Balance update fix applied successfully!' as status;