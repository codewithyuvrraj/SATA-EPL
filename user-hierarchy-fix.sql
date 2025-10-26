-- Fix User Creation Hierarchy and Display Issues
-- Run this in Supabase SQL Editor

-- 1. Create function for admin to create any user type
CREATE OR REPLACE FUNCTION admin_create_user(
  p_user_type VARCHAR,
  p_username VARCHAR,
  p_login_name VARCHAR,
  p_password VARCHAR,
  p_parent_id INTEGER DEFAULT NULL,
  p_win_commission DECIMAL DEFAULT 0,
  p_loss_commission DECIMAL DEFAULT 0,
  p_initial_balance DECIMAL DEFAULT 0
)
RETURNS TABLE (
  success BOOLEAN,
  user_id INTEGER,
  message TEXT
) AS $$
DECLARE
  new_user_id INTEGER;
BEGIN
  -- Admin can create any user type without restrictions
  IF p_user_type = 'superMaster' THEN
    INSERT INTO supermasters (username, login_name, password, win_commission, loss_commission, balance)
    VALUES (p_username, p_login_name, p_password, p_win_commission, p_loss_commission, p_initial_balance)
    RETURNING id INTO new_user_id;
    
  ELSIF p_user_type = 'master' THEN
    INSERT INTO masters (username, login_name, password, supermaster_id, win_commission, loss_commission, balance)
    VALUES (p_username, p_login_name, p_password, p_parent_id, p_win_commission, p_loss_commission, p_initial_balance)
    RETURNING id INTO new_user_id;
    
  ELSIF p_user_type = 'agent' THEN
    INSERT INTO agents (username, login_name, password, master_id, win_commission, loss_commission, balance)
    VALUES (p_username, p_login_name, p_password, p_parent_id, p_win_commission, p_loss_commission, p_initial_balance)
    RETURNING id INTO new_user_id;
    
  ELSIF p_user_type = 'client' THEN
    INSERT INTO clients (username, login_name, password, agent_id, balance)
    VALUES (p_username, p_login_name, p_password, p_parent_id, p_initial_balance)
    RETURNING id INTO new_user_id;
    
  ELSE
    RETURN QUERY SELECT FALSE, 0, 'Invalid user type';
    RETURN;
  END IF;
  
  RETURN QUERY SELECT TRUE, new_user_id, 'User created successfully';
  
EXCEPTION
  WHEN unique_violation THEN
    RETURN QUERY SELECT FALSE, 0, 'Username or login name already exists';
  WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, 0, 'Error creating user: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- 2. Function to get all available parent users for hierarchy
CREATE OR REPLACE FUNCTION get_available_parents(p_user_type VARCHAR)
RETURNS TABLE (
  id INTEGER,
  username VARCHAR,
  login_name VARCHAR
) AS $$
BEGIN
  IF p_user_type = 'master' THEN
    -- Masters can be assigned to any supermaster
    RETURN QUERY
    SELECT sm.id, sm.username, sm.login_name
    FROM supermasters sm
    WHERE sm.blocked = false
    ORDER BY sm.username;
    
  ELSIF p_user_type = 'agent' THEN
    -- Agents can be assigned to any master
    RETURN QUERY
    SELECT m.id, m.username, m.login_name
    FROM masters m
    WHERE m.blocked = false
    ORDER BY m.username;
    
  ELSIF p_user_type = 'client' THEN
    -- Clients can be assigned to any agent
    RETURN QUERY
    SELECT a.id, a.username, a.login_name
    FROM agents a
    WHERE a.blocked = false
    ORDER BY a.username;
    
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 3. Function to get user's subordinates with proper hierarchy
CREATE OR REPLACE FUNCTION get_user_subordinates(p_user_id INTEGER, p_user_type VARCHAR)
RETURNS TABLE (
  id INTEGER,
  username VARCHAR,
  login_name VARCHAR,
  user_type VARCHAR,
  balance DECIMAL,
  blocked BOOLEAN,
  created_at TIMESTAMP
) AS $$
BEGIN
  IF p_user_type = 'superMaster' THEN
    -- Get all masters under this supermaster
    RETURN QUERY
    SELECT m.id, m.username, m.login_name, 'master'::VARCHAR, m.balance, m.blocked, m.created_at
    FROM masters m
    WHERE m.supermaster_id = p_user_id
    ORDER BY m.created_at DESC;
    
  ELSIF p_user_type = 'master' THEN
    -- Get all agents under this master
    RETURN QUERY
    SELECT a.id, a.username, a.login_name, 'agent'::VARCHAR, a.balance, a.blocked, a.created_at
    FROM agents a
    WHERE a.master_id = p_user_id
    ORDER BY a.created_at DESC;
    
  ELSIF p_user_type = 'agent' THEN
    -- Get all clients under this agent
    RETURN QUERY
    SELECT c.id, c.username, c.login_name, 'client'::VARCHAR, c.balance, c.blocked, c.created_at
    FROM clients c
    WHERE c.agent_id = p_user_id
    ORDER BY c.created_at DESC;
    
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 4. Enhanced function to get all users with hierarchy info
CREATE OR REPLACE FUNCTION get_all_users_with_hierarchy()
RETURNS TABLE (
  id INTEGER,
  username VARCHAR,
  login_name VARCHAR,
  user_type VARCHAR,
  balance DECIMAL,
  parent_username VARCHAR,
  blocked BOOLEAN,
  created_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  -- Supermasters
  SELECT sm.id, sm.username, sm.login_name, 'superMaster'::VARCHAR, sm.balance, 
         NULL::VARCHAR as parent_username, sm.blocked, sm.created_at
  FROM supermasters sm
  
  UNION ALL
  
  -- Masters with their supermaster
  SELECT m.id, m.username, m.login_name, 'master'::VARCHAR, m.balance,
         sm.username as parent_username, m.blocked, m.created_at
  FROM masters m
  LEFT JOIN supermasters sm ON m.supermaster_id = sm.id
  
  UNION ALL
  
  -- Agents with their master
  SELECT a.id, a.username, a.login_name, 'agent'::VARCHAR, a.balance,
         m.username as parent_username, a.blocked, a.created_at
  FROM agents a
  LEFT JOIN masters m ON a.master_id = m.id
  
  UNION ALL
  
  -- Clients with their agent
  SELECT c.id, c.username, c.login_name, 'client'::VARCHAR, c.balance,
         a.username as parent_username, c.blocked, c.created_at
  FROM clients c
  LEFT JOIN agents a ON c.agent_id = a.id
  
  ORDER BY user_type, created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 5. Function to validate user creation permissions (for non-admin users)
CREATE OR REPLACE FUNCTION validate_user_creation(
  p_creator_type VARCHAR,
  p_creator_id INTEGER,
  p_target_type VARCHAR
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Admin can create anyone
  IF p_creator_type = 'admin' THEN
    RETURN TRUE;
  END IF;
  
  -- Supermaster can create masters
  IF p_creator_type = 'superMaster' AND p_target_type = 'master' THEN
    RETURN TRUE;
  END IF;
  
  -- Master can create agents
  IF p_creator_type = 'master' AND p_target_type = 'agent' THEN
    RETURN TRUE;
  END IF;
  
  -- Agent can create clients
  IF p_creator_type = 'agent' AND p_target_type = 'client' THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Test the functions
-- SELECT * FROM admin_create_user('superMaster', 'TestSM2', 'testsm2', 'test123', NULL, 15, 15, 1000);
-- SELECT * FROM get_available_parents('master');
-- SELECT * FROM get_user_subordinates(1, 'superMaster');
-- SELECT * FROM get_all_users_with_hierarchy();

SELECT 'User hierarchy fixes applied successfully!' as status;