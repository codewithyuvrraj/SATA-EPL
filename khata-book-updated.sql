-- Enhanced Ledger Table for Khata Book with better tracking

-- Drop existing ledger table if you want to recreate with new structure
-- DROP TABLE IF EXISTS ledger CASCADE;

-- Create enhanced ledger table
CREATE TABLE IF NOT EXISTS ledger (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('superMaster', 'master', 'agent', 'client')),
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('deposit', 'withdraw', 'note')),
  amount DECIMAL(10,2) DEFAULT 0,
  date DATE NOT NULL,
  description TEXT,
  created_by VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_ledger_user ON ledger(user_id, user_type);
CREATE INDEX IF NOT EXISTS idx_ledger_date ON ledger(date);
CREATE INDEX IF NOT EXISTS idx_ledger_type ON ledger(transaction_type);

-- Add balance tracking to all user tables if not exists
ALTER TABLE supermasters ADD COLUMN IF NOT EXISTS balance DECIMAL(10,2) DEFAULT 0;
ALTER TABLE masters ADD COLUMN IF NOT EXISTS balance DECIMAL(10,2) DEFAULT 0;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS balance DECIMAL(10,2) DEFAULT 0;

-- Function to update user balance after transaction
CREATE OR REPLACE FUNCTION update_user_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.transaction_type = 'deposit' THEN
    -- Update balance based on user type
    IF NEW.user_type = 'superMaster' THEN
      UPDATE supermasters SET balance = balance + NEW.amount WHERE id = NEW.user_id;
    ELSIF NEW.user_type = 'master' THEN
      UPDATE masters SET balance = balance + NEW.amount WHERE id = NEW.user_id;
    ELSIF NEW.user_type = 'agent' THEN
      UPDATE agents SET balance = balance + NEW.amount WHERE id = NEW.user_id;
    ELSIF NEW.user_type = 'client' THEN
      UPDATE clients SET balance = balance + NEW.amount WHERE id = NEW.user_id;
    END IF;
  ELSIF NEW.transaction_type = 'withdraw' THEN
    -- Update balance based on user type
    IF NEW.user_type = 'superMaster' THEN
      UPDATE supermasters SET balance = balance - NEW.amount WHERE id = NEW.user_id;
    ELSIF NEW.user_type = 'master' THEN
      UPDATE masters SET balance = balance - NEW.amount WHERE id = NEW.user_id;
    ELSIF NEW.user_type = 'agent' THEN
      UPDATE agents SET balance = balance - NEW.amount WHERE id = NEW.user_id;
    ELSIF NEW.user_type = 'client' THEN
      UPDATE clients SET balance = balance - NEW.amount WHERE id = NEW.user_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update balance
DROP TRIGGER IF EXISTS trigger_update_balance ON ledger;
CREATE TRIGGER trigger_update_balance
  AFTER INSERT ON ledger
  FOR EACH ROW
  EXECUTE FUNCTION update_user_balance();

-- Sample queries for khata book

-- Get all entries for a specific user
-- SELECT * FROM ledger WHERE user_id = 1 AND user_type = 'superMaster' ORDER BY created_at DESC;

-- Get deposit/withdraw summary for a user
-- SELECT 
--   transaction_type,
--   SUM(amount) as total_amount,
--   COUNT(*) as transaction_count
-- FROM ledger 
-- WHERE user_id = 1 AND user_type = 'superMaster' AND transaction_type IN ('deposit', 'withdraw')
-- GROUP BY transaction_type;

-- Get daily summary
-- SELECT 
--   date,
--   SUM(CASE WHEN transaction_type = 'deposit' THEN amount ELSE 0 END) as total_deposits,
--   SUM(CASE WHEN transaction_type = 'withdraw' THEN amount ELSE 0 END) as total_withdrawals
-- FROM ledger
-- GROUP BY date
-- ORDER BY date DESC;
