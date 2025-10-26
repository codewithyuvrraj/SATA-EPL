-- Complete Number System Database Setup
-- Run this in Supabase SQL Editor

-- Drop existing tables if they exist (optional - only if you want to recreate)
-- DROP TABLE IF EXISTS number_bets CASCADE;
-- DROP TABLE IF EXISTS number_results CASCADE;

-- Create number_bets table with all constraints
CREATE TABLE IF NOT EXISTS number_bets (
  id SERIAL PRIMARY KEY,
  game_type VARCHAR(20) NOT NULL CHECK (game_type IN ('ghaziabad', 'faridabad', 'gali', 'disawar', 'harup')),
  number INTEGER NOT NULL CHECK (
    (game_type IN ('ghaziabad', 'faridabad', 'gali', 'disawar') AND number BETWEEN 1 AND 100) OR
    (game_type = 'harup' AND number BETWEEN 1 AND 10)
  ),
  bet_amount DECIMAL(10,2) NOT NULL CHECK (bet_amount > 0),
  user_id INTEGER,
  username VARCHAR(50) DEFAULT 'Admin',
  bet_date DATE DEFAULT CURRENT_DATE,
  multiplier INTEGER DEFAULT 80,
  potential_win DECIMAL(12,2) GENERATED ALWAYS AS (bet_amount * multiplier) STORED,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create number_results table for storing winning numbers
CREATE TABLE IF NOT EXISTS number_results (
  id SERIAL PRIMARY KEY,
  game_type VARCHAR(20) NOT NULL CHECK (game_type IN ('ghaziabad', 'faridabad', 'gali', 'disawar', 'harup')),
  winning_number INTEGER NOT NULL,
  result_date DATE DEFAULT CURRENT_DATE,
  total_bets_on_winner DECIMAL(12,2) DEFAULT 0,
  total_payout DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_number_bets_game_number ON number_bets(game_type, number);
CREATE INDEX IF NOT EXISTS idx_number_bets_date ON number_bets(bet_date);
CREATE INDEX IF NOT EXISTS idx_number_bets_user ON number_bets(username);
CREATE INDEX IF NOT EXISTS idx_number_results_game_date ON number_results(game_type, result_date);

-- Function to get total bets for a specific number
CREATE OR REPLACE FUNCTION get_number_total_bets(
  p_game_type VARCHAR,
  p_number INTEGER,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  total_amount DECIMAL,
  bet_count INTEGER,
  potential_payout DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(bet_amount), 0) as total_amount,
    COUNT(*)::INTEGER as bet_count,
    COALESCE(SUM(potential_win), 0) as potential_payout
  FROM number_bets
  WHERE game_type = p_game_type
    AND number = p_number
    AND bet_date = p_date;
END;
$$ LANGUAGE plpgsql;

-- Function to get all bets for a game type on a specific date
CREATE OR REPLACE FUNCTION get_game_bets_summary(
  p_game_type VARCHAR,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  number INTEGER,
  total_bets DECIMAL,
  bet_count INTEGER,
  potential_payout DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    nb.number,
    SUM(nb.bet_amount) as total_bets,
    COUNT(*)::INTEGER as bet_count,
    SUM(nb.potential_win) as potential_payout
  FROM number_bets nb
  WHERE nb.game_type = p_game_type
    AND nb.bet_date = p_date
  GROUP BY nb.number
  ORDER BY nb.number;
END;
$$ LANGUAGE plpgsql;

-- Insert sample data for testing (uncomment to use)
-- INSERT INTO number_bets (game_type, number, bet_amount, username) VALUES
-- ('ghaziabad', 25, 100.00, 'TestUser1'),
-- ('ghaziabad', 50, 200.00, 'TestUser2'),
-- ('faridabad', 75, 150.00, 'TestUser3'),
-- ('harup', 5, 300.00, 'TestUser4');

-- Verify table creation
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name IN ('number_bets', 'number_results')
ORDER BY table_name, ordinal_position;

-- Test queries to verify functionality

-- Get total bets for Ghaziabad number 25 today
-- SELECT * FROM get_number_total_bets('ghaziabad', 25);

-- Get all bets summary for Ghaziabad today
-- SELECT * FROM get_game_bets_summary('ghaziabad');

-- Get all bets for today
-- SELECT 
--   game_type,
--   number,
--   bet_amount,
--   potential_win,
--   username,
--   created_at
-- FROM number_bets 
-- WHERE bet_date = CURRENT_DATE
-- ORDER BY game_type, number;

-- Get total bets by game type today
-- SELECT 
--   game_type,
--   COUNT(*) as total_bets,
--   SUM(bet_amount) as total_amount,
--   SUM(potential_win) as total_potential_payout
-- FROM number_bets 
-- WHERE bet_date = CURRENT_DATE
-- GROUP BY game_type
-- ORDER BY game_type;