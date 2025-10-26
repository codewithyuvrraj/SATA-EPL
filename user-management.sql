-- User Management SQL Queries and Views

-- View to get all users with their details across all tables
CREATE OR REPLACE VIEW all_users_view AS
SELECT 
  id,
  username,
  login_name,
  password,
  'superMaster' as user_type,
  win_commission,
  loss_commission,
  blocked,
  balance,
  total_commission,
  created_at
FROM supermasters
UNION ALL
SELECT 
  id,
  username,
  login_name,
  password,
  'master' as user_type,
  win_commission,
  loss_commission,
  blocked,
  balance,
  total_commission,
  created_at
FROM masters
UNION ALL
SELECT 
  id,
  username,
  login_name,
  password,
  'agent' as user_type,
  win_commission,
  loss_commission,
  blocked,
  balance,
  total_commission,
  created_at
FROM agents
UNION ALL
SELECT 
  id,
  username,
  login_name,
  password,
  'client' as user_type,
  NULL as win_commission,
  NULL as loss_commission,
  blocked,
  balance,
  NULL as total_commission,
  created_at
FROM clients
ORDER BY created_at DESC;

-- Function to get user count by type
CREATE OR REPLACE FUNCTION get_user_count(user_type_param VARCHAR)
RETURNS INTEGER AS $$
DECLARE
  count_result INTEGER;
BEGIN
  CASE user_type_param
    WHEN 'superMaster' THEN
      SELECT COUNT(*) INTO count_result FROM supermasters WHERE blocked = false;
    WHEN 'master' THEN
      SELECT COUNT(*) INTO count_result FROM masters WHERE blocked = false;
    WHEN 'agent' THEN
      SELECT COUNT(*) INTO count_result FROM agents WHERE blocked = false;
    WHEN 'client' THEN
      SELECT COUNT(*) INTO count_result FROM clients WHERE blocked = false;
    ELSE
      count_result := 0;
  END CASE;
  
  RETURN count_result;
END;
$$ LANGUAGE plpgsql;

-- Function to search users across all tables
CREATE OR REPLACE FUNCTION search_users(search_term VARCHAR)
RETURNS TABLE (
  id INTEGER,
  username VARCHAR,
  login_name VARCHAR,
  user_type VARCHAR,
  blocked BOOLEAN,
  balance DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM all_users_view
  WHERE username ILIKE '%' || search_term || '%'
     OR login_name ILIKE '%' || search_term || '%';
END;
$$ LANGUAGE plpgsql;

-- Sample usage queries

-- Get all active users
-- SELECT * FROM all_users_view WHERE blocked = false;

-- Get user count by type
-- SELECT get_user_count('superMaster');
-- SELECT get_user_count('master');
-- SELECT get_user_count('agent');
-- SELECT get_user_count('client');

-- Search for users
-- SELECT * FROM search_users('john');

-- Get users with balance greater than 1000
-- SELECT * FROM all_users_view WHERE balance > 1000;

-- Get blocked users
-- SELECT * FROM all_users_view WHERE blocked = true;
