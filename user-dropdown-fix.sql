-- SQL to verify and fix user data for dropdowns

-- Check if users exist in each table
SELECT 'supermasters' as table_name, COUNT(*) as total_users, 
       COUNT(CASE WHEN blocked = false THEN 1 END) as active_users
FROM supermasters
UNION ALL
SELECT 'masters', COUNT(*), COUNT(CASE WHEN blocked = false THEN 1 END)
FROM masters
UNION ALL
SELECT 'agents', COUNT(*), COUNT(CASE WHEN blocked = false THEN 1 END)
FROM agents
UNION ALL
SELECT 'clients', COUNT(*), COUNT(CASE WHEN blocked = false THEN 1 END)
FROM clients;

-- Insert sample users if tables are empty (for testing)
-- Uncomment and run if you need test data

-- INSERT INTO supermasters (username, login_name, password, win_commission, loss_commission) 
-- VALUES ('TestSM', 'testsm', 'test123', 15, 15)
-- ON CONFLICT (username) DO NOTHING;

-- INSERT INTO masters (username, login_name, password, supermaster_id, win_commission, loss_commission) 
-- VALUES ('TestMaster', 'testmaster', 'test123', 1, 10, 10)
-- ON CONFLICT (username) DO NOTHING;

-- INSERT INTO agents (username, login_name, password, master_id, win_commission, loss_commission) 
-- VALUES ('TestAgent', 'testagent', 'test123', 1, 5, 5)
-- ON CONFLICT (username) DO NOTHING;

-- Query to get all active users for dropdown (what the JS should fetch)
SELECT id, username, login_name, 'superMaster' as user_type FROM supermasters WHERE blocked = false
UNION ALL
SELECT id, username, login_name, 'master' FROM masters WHERE blocked = false
UNION ALL
SELECT id, username, login_name, 'agent' FROM agents WHERE blocked = false
ORDER BY username;
