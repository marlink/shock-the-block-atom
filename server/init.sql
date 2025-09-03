-- Create player_scores table
CREATE TABLE IF NOT EXISTS player_scores (
  id SERIAL PRIMARY KEY,
  player_name VARCHAR(50) NOT NULL,
  score INTEGER NOT NULL,
  level_reached INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on player_name for faster lookups
CREATE INDEX IF NOT EXISTS idx_player_scores_player_name ON player_scores(player_name);

-- Create index on score for high score queries
CREATE INDEX IF NOT EXISTS idx_player_scores_score ON player_scores(score DESC);