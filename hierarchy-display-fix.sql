-- Fix User Hierarchy Display - Users can only see their subordinates
-- Run this in Supabase SQL Editor

-- 1. Function to get subordinates based on user type and ID
CREATE OR REPLACE FUNCTION get_user_subordinates_restricted(
  p_user_id INTEGER,
  p_user_type VARCHAR
)
RETURNS TABLE (
  id INTEGER,
  username VARCHAR,
  login_name VARCHAR,
  user_type VARCHAR,
  balance DECIMAL,
  blocked BOOLEAN,
  created_at TIMESTAMP,
  win_commission DECIMAL,
  loss_commission DECIMAL
) AS $$
BEGIN
  IF p_user_type = 'superMaster' THEN
    -- SuperMaster can only see their own masters
    RETURN QUERY
    SELECT m.id, m.username, m.login_name, 'master'::VARCHAR, m.balance, m.blocked, m.created_at, m.win_commission, m.loss_commission
    FROM masters m
    WHERE m.supermaster_id = p_user_id AND m.blocked = false
    ORDER BY m.created_at DESC;
    
  ELSIF p_user_type = 'master' THEN
    -- Master can only see their own agents
    RETURN QUERY
    SELECT a.id, a.username, a.login_name, 'agent'::VARCHAR, a.balance, a.blocked, a.created_at, a.win_commission, a.loss_commission
    FROM agents a
    WHERE a.master_id = p_user_id AND a.blocked = false
    ORDER BY a.created_at DESC;
    
  ELSIF p_user_type = 'agent' THEN
    -- Agent can only see their own clients
    RETURN QUERY
    SELECT c.id, c.username, c.login_name, 'client'::VARCHAR, c.balance, c.blocked, c.created_at, NULL::DECIMAL as win_commission, NULL::DECIMAL as loss_commission
    FROM clients c
    WHERE c.agent_id = p_user_id AND c.blocked = false
    ORDER BY c.created_at DESC;
    
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 2. Function to get user statistics for dashboard (restricted to subordinates only)
CREATE OR REPLACE FUNCTION get_user_dashboard_stats(
  p_user_id INTEGER,
  p_user_type VARCHAR
)
RETURNS TABLE (
  total_subordinates INTEGER,
  total_agents INTEGER,
  total_clients INTEGER,
  total_balance DECIMAL
) AS $$
DECLARE
  subordinate_count INTEGER := 0;
  agent_count INTEGER := 0;
  client_count INTEGER := 0;
  balance_sum DECIMAL := 0;
BEGIN
  IF p_user_type = 'superMaster' THEN
    -- Count masters under this supermaster
    SELECT COUNT(*), COALESCE(SUM(balance), 0)
    INTO subordinate_count, balance_sum
    FROM masters
    WHERE supermaster_id = p_user_id AND blocked = false;
    
    -- Count agents under masters of this supermaster
    SELECT COUNT(*)
    INTO agent_count
    FROM agents a
    JOIN masters m ON a.master_id = m.id
    WHERE m.supermaster_id = p_user_id AND a.blocked = false AND m.blocked = false;
    
    -- Count clients under agents of masters of this supermaster
    SELECT COUNT(*)
    INTO client_count
    FROM clients c
    JOIN agents a ON c.agent_id = a.id
    JOIN masters m ON a.master_id = m.id
    WHERE m.supermaster_id = p_user_id AND c.blocked = false AND a.blocked = false AND m.blocked = false;
    
  ELSIF p_user_type = 'master' THEN
    -- Count agents under this master
    SELECT COUNT(*), COALESCE(SUM(balance), 0)
    INTO subordinate_count, balance_sum
    FROM agents
    WHERE master_id = p_user_id AND blocked = false;
    
    agent_count := subordinate_count;
    
    -- Count clients under agents of this master
    SELECT COUNT(*)
    INTO client_count
    FROM clients c
    JOIN agents a ON c.agent_id = a.id
    WHERE a.master_id = p_user_id AND c.blocked = false AND a.blocked = false;
    
  ELSIF p_user_type = 'agent' THEN
    -- Count clients under this agent
    SELECT COUNT(*), COALESCE(SUM(balance), 0)
    INTO subordinate_count, balance_sum
    FROM clients
    WHERE agent_id = p_user_id AND blocked = false;
    
    client_count := subordinate_count;
    
  END IF;
  
  RETURN QUERY SELECT subordinate_count, agent_count, client_count, balance_sum;
END;
$$ LANGUAGE plpgsql;

-- 3. Function to validate if a user can view another user (hierarchy check)
CREATE OR REPLACE FUNCTION can_user_view_subordinate(
  p_viewer_id INTEGER,
  p_viewer_type VARCHAR,
  p_target_id INTEGER,
  p_target_type VARCHAR
)
RETURNS BOOLEAN AS $$
DECLARE
  can_view BOOLEAN := false;
BEGIN
  -- Admin can view everyone
  IF p_viewer_type = 'admin' THEN
    RETURN true;
  END IF;
  
  -- SuperMaster can view their masters and their subordinates
  IF p_viewer_type = 'superMaster' THEN
    IF p_target_type = 'master' THEN
      SELECT EXISTS(SELECT 1 FROM masters WHERE id = p_target_id AND supermaster_id = p_viewer_id) INTO can_view;
    ELSIF p_target_type = 'agent' THEN
      SELECT EXISTS(
        SELECT 1 FROM agents a 
        JOIN masters m ON a.master_id = m.id 
        WHERE a.id = p_target_id AND m.supermaster_id = p_viewer_id
      ) INTO can_view;
    ELSIF p_target_type = 'client' THEN
      SELECT EXISTS(
        SELECT 1 FROM clients c
        JOIN agents a ON c.agent_id = a.id
        JOIN masters m ON a.master_id = m.id
        WHERE c.id = p_target_id AND m.supermaster_id = p_viewer_id
      ) INTO can_view;
    END IF;
    
  -- Master can view their agents and clients
  ELSIF p_viewer_type = 'master' THEN
    IF p_target_type = 'agent' THEN
      SELECT EXISTS(SELECT 1 FROM agents WHERE id = p_target_id AND master_id = p_viewer_id) INTO can_view;
    ELSIF p_target_type = 'client' THEN
      SELECT EXISTS(
        SELECT 1 FROM clients c
        JOIN agents a ON c.agent_id = a.id
        WHERE c.id = p_target_id AND a.master_id = p_viewer_id
      ) INTO can_view;
    END IF;
    
  -- Agent can view their clients only
  ELSIF p_viewer_type = 'agent' THEN
    IF p_target_type = 'client' THEN
      SELECT EXISTS(SELECT 1 FROM clients WHERE id = p_target_id AND agent_id = p_viewer_id) INTO can_view;
    END IF;
  END IF;
  
  RETURN can_view;
END;
$$ LANGUAGE plpgsql;

-- 4. Function to get available parent users for user creation (restricted by hierarchy)
CREATE OR REPLACE FUNCTION get_available_parents_restricted(
  p_creator_id INTEGER,
  p_creator_type VARCHAR,
  p_target_type VARCHAR
)
RETURNS TABLE (
  id INTEGER,
  username VARCHAR,
  login_name VARCHAR
) AS $$
BEGIN
  -- Admin can assign to anyone
  IF p_creator_type = 'admin' THEN
    IF p_target_type = 'master' THEN
      RETURN QUERY
      SELECT sm.id, sm.username, sm.login_name
      FROM supermasters sm
      WHERE sm.blocked = false
      ORDER BY sm.username;
    ELSIF p_target_type = 'agent' THEN
      RETURN QUERY
      SELECT m.id, m.username, m.login_name
      FROM masters m
      WHERE m.blocked = false
      ORDER BY m.username;
    ELSIF p_target_type = 'client' THEN
      RETURN QUERY
      SELECT a.id, a.username, a.login_name
      FROM agents a
      WHERE a.blocked = false
      ORDER BY a.username;
    END IF;
    
  -- SuperMaster creating master - can only assign to themselves
  ELSIF p_creator_type = 'superMaster' AND p_target_type = 'master' THEN
    RETURN QUERY
    SELECT sm.id, sm.username, sm.login_name
    FROM supermasters sm
    WHERE sm.id = p_creator_id AND sm.blocked = false;
    
  -- Master creating agent - can only assign to themselves
  ELSIF p_creator_type = 'master' AND p_target_type = 'agent' THEN
    RETURN QUERY
    SELECT m.id, m.username, m.login_name
    FROM masters m
    WHERE m.id = p_creator_id AND m.blocked = false;
    
  -- Agent creating client - can only assign to themselves
  ELSIF p_creator_type = 'agent' AND p_target_type = 'client' THEN
    RETURN QUERY
    SELECT a.id, a.username, a.login_name
    FROM agents a
    WHERE a.id = p_creator_id AND a.blocked = false;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 5. Add RLS (Row Level Security) policies for better data protection
ALTER TABLE supermasters ENABLE ROW LEVEL SECURITY;
ALTER TABLE masters ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Policy for supermasters - can only see their own data
CREATE POLICY supermaster_policy ON supermasters
  FOR ALL USING (
    auth.uid()::text = 'admin' OR 
    id = current_setting('app.current_user_id', true)::integer
  );

-- Policy for masters - can only see their own data and their subordinates
CREATE POLICY master_policy ON masters
  FOR ALL USING (
    auth.uid()::text = 'admin' OR
    id = current_setting('app.current_user_id', true)::integer OR
    supermaster_id = current_setting('app.current_user_id', true)::integer
  );

-- Policy for agents - can only see their own data and their subordinates
CREATE POLICY agent_policy ON agents
  FOR ALL USING (
    auth.uid()::text = 'admin' OR
    id = current_setting('app.current_user_id', true)::integer OR
    master_id = current_setting('app.current_user_id', true)::integer OR
    EXISTS (
      SELECT 1 FROM masters m 
      WHERE m.id = master_id 
      AND m.supermaster_id = current_setting('app.current_user_id', true)::integer
    )
  );

-- Policy for clients - can only see their own data and their superiors can see them
CREATE POLICY client_policy ON clients
  FOR ALL USING (
    auth.uid()::text = 'admin' OR
    id = current_setting('app.current_user_id', true)::integer OR
    agent_id = current_setting('app.current_user_id', true)::integer OR
    EXISTS (
      SELECT 1 FROM agents a 
      WHERE a.id = agent_id 
      AND a.master_id = current_setting('app.current_user_id', true)::integer
    ) OR
    EXISTS (
      SELECT 1 FROM agents a
      JOIN masters m ON a.master_id = m.id
      WHERE a.id = agent_id 
      AND m.supermaster_id = current_setting('app.current_user_id', true)::integer
    )
  );

-- Test the functions
-- SELECT * FROM get_user_subordinates_restricted(1, 'superMaster');
-- SELECT * FROM get_user_dashboard_stats(1, 'superMaster');
-- SELECT can_user_view_subordinate(1, 'superMaster', 2, 'master');
-- SELECT * FROM get_available_parents_restricted(1, 'superMaster', 'master');

SELECT 'User hierarchy display restrictions applied successfully!' as status;