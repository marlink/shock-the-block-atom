require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl requests)
    if(!origin) return callback(null, true);
    
    // Allow all origins in development
    if(process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    // In production, check against allowed domains
    const allowedDomains = process.env.ALLOWED_ORIGINS ? 
      process.env.ALLOWED_ORIGINS.split(',') : 
      [];
      
    if(allowedDomains.indexOf(origin) !== -1 || origin.endsWith('.yourdomain.com')) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json());

// Serve static files from parent directory with cache control
app.use(express.static(path.join(__dirname, '..'), {
  setHeaders: (res, path) => {
    // Prevent caching of bundle files that might not exist
    if (path.includes('bundle.js')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    // Set cache control for other static files
    else {
      res.setHeader('Cache-Control', 'public, max-age=3600');
    }
  }
}));

// Handle 404 for bundle.js files specifically
app.get('/*.bundle.js', (req, res) => {
  res.status(404).send('Bundle file not found - this application does not use webpack bundles');
});

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err.stack);
  } else {
    console.log('Database connected successfully at:', res.rows[0].now);
  }
});

// API Routes

// Get high scores
app.get('/api/scores', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM player_scores ORDER BY score DESC LIMIT 10');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching scores:', err);
    res.status(500).json({ error: 'Failed to fetch scores' });
  }
});

// Save a new score
app.post('/api/scores', async (req, res) => {
  const { player_name, score, level_reached } = req.body;
  
  if (!player_name || score === undefined) {
    return res.status(400).json({ error: 'Player name and score are required' });
  }
  
  try {
    const result = await pool.query(
      'INSERT INTO player_scores (player_name, score, level_reached, created_at) VALUES ($1, $2, $3, NOW()) RETURNING *',
      [player_name, score, level_reached || 1]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error saving score:', err);
    res.status(500).json({ error: 'Failed to save score' });
  }
});

// Get player stats
app.get('/api/players/:name', async (req, res) => {
  const { name } = req.params;
  
  try {
    const result = await pool.query(
      'SELECT player_name, MAX(score) as high_score, AVG(score) as avg_score, COUNT(*) as games_played FROM player_scores WHERE player_name = $1 GROUP BY player_name',
      [name]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching player stats:', err);
    res.status(500).json({ error: 'Failed to fetch player stats' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});