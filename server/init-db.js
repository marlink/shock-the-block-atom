require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function initializeDatabase() {
  try {
    // Read SQL file
    const sqlFilePath = path.join(__dirname, 'init.sql');
    const sqlCommands = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Connect to the database
    const client = await pool.connect();
    
    try {
      // Execute SQL commands
      await client.query(sqlCommands);
      console.log('Database initialized successfully!');
    } finally {
      // Release client back to pool
      client.release();
    }
  } catch (err) {
    console.error('Error initializing database:', err);
    process.exit(1);
  } finally {
    // Close pool
    await pool.end();
  }
}

// Run initialization
initializeDatabase();