-- Fix Number System Database Setup
-- Run this in Supabase SQL Editor to fix the function error

-- Drop existing functions first
DROP FUNCTION IF EXISTS get_number_total_bets(character varying, integer, date);
DROP FUNCTION IF EXISTS get_game_bets_summary(character varying, date);

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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_number_bets_game_number ON number_bets(game_type, number);
CREATE INDEX IF NOT EXISTS idx_number_bets_date ON number_bets(bet_date);

-- Function to get total bets for a specific number (fixed return type)
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

-- Simple query to test
SELECT 'Number system tables created successfully' as status;