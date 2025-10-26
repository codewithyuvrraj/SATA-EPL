-- Number System Betting Tables

-- Create number_bets table
CREATE TABLE IF NOT EXISTS number_bets (
  id SERIAL PRIMARY KEY,
  game_type VARCHAR(20) NOT NULL CHECK (game_type IN ('ghaziabad', 'faridabad', 'gali', 'disawar', 'harup')),
  number INTEGER NOT NULL,
  bet_amount DECIMAL(10,2) NOT NULL,
  user_id INTEGER,
  username VARCHAR(50),
  bet_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_number_bets_game ON number_bets(game_type, number);
CREATE INDEX IF NOT EXISTS idx_number_bets_date ON number_bets(bet_date);

-- Create number_results table for storing winning numbers
CREATE TABLE IF NOT EXISTS number_results (
  id SERIAL PRIMARY KEY,
  game_type VARCHAR(20) NOT NULL,
  winning_number INTEGER NOT NULL,
  result_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Function to get total bets for a number
CREATE OR REPLACE FUNCTION get_number_total_bets(
  p_game_type VARCHAR,
  p_number INTEGER,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS DECIMAL AS $$
DECLARE
  total_bets DECIMAL;
BEGIN
  SELECT COALESCE(SUM(bet_amount), 0)
  INTO total_bets
  FROM number_bets
  WHERE game_type = p_game_type
    AND number = p_number
    AND bet_date = p_date;
  
  RETURN total_bets;
END;
$$ LANGUAGE plpgsql;

-- Sample queries

-- Get all bets for a game type today
-- SELECT * FROM number_bets WHERE game_type = 'ghaziabad' AND bet_date = CURRENT_DATE;

-- Get total bets per number for a game
-- SELECT number, SUM(bet_amount) as total_bets, COUNT(*) as bet_count
-- FROM number_bets
-- WHERE game_type = 'ghaziabad' AND bet_date = CURRENT_DATE
-- GROUP BY number
-- ORDER BY number;

-- Get total bets for specific number
-- SELECT get_number_total_bets('ghaziabad', 25);
