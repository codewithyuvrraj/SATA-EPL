-- Supabase Database Setup for Gaming Panel
-- Run these commands in your Supabase SQL Editor

-- Create supermasters table
CREATE TABLE IF NOT EXISTS supermasters (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  login_name VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(100) NOT NULL,
  win_commission DECIMAL(5,2) DEFAULT 0,
  loss_commission DECIMAL(5,2) DEFAULT 0,
  blocked BOOLEAN DEFAULT false,
  total_commission DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create masters table
CREATE TABLE IF NOT EXISTS masters (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  login_name VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(100) NOT NULL,
  supermaster_id INTEGER REFERENCES supermasters(id),
  win_commission DECIMAL(5,2) DEFAULT 0,
  loss_commission DECIMAL(5,2) DEFAULT 0,
  blocked BOOLEAN DEFAULT false,
  total_commission DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create agents table
CREATE TABLE IF NOT EXISTS agents (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  login_name VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(100) NOT NULL,
  master_id INTEGER REFERENCES masters(id),
  win_commission DECIMAL(5,2) DEFAULT 0,
  loss_commission DECIMAL(5,2) DEFAULT 0,
  blocked BOOLEAN DEFAULT false,
  total_commission DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  login_name VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(100) NOT NULL,
  agent_id INTEGER REFERENCES agents(id),
  balance DECIMAL(10,2) DEFAULT 0,
  blocked BOOLEAN DEFAULT false,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  user_type VARCHAR(20) NOT NULL,
  transaction_type VARCHAR(20) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create game_history table
CREATE TABLE IF NOT EXISTS game_history (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES clients(id),
  game_name VARCHAR(50) NOT NULL,
  bet_amount DECIMAL(10,2) NOT NULL,
  win_amount DECIMAL(10,2) DEFAULT 0,
  result VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create ledger table
CREATE TABLE IF NOT EXISTS ledger (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  user_type VARCHAR(20) NOT NULL,
  transaction_type VARCHAR(20) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  date DATE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200),
  content TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create blocked_games table
CREATE TABLE IF NOT EXISTS blocked_games (
  id SERIAL PRIMARY KEY,
  game_name VARCHAR(50) UNIQUE NOT NULL,
  blocked BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default games (only if not already present)
INSERT INTO blocked_games (game_name, blocked) 
SELECT * FROM (VALUES 
('Mines', false),
('Aviator', false),
('Dragon Tiger', false),
('Lucky 7', false)
) AS v(game_name, blocked)
WHERE NOT EXISTS (SELECT 1 FROM blocked_games WHERE blocked_games.game_name = v.game_name);

-- Enable Row Level Security (optional)
-- ALTER TABLE supermasters ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE masters ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;