const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for Supabase external connections
  },
  max: 10,
  idleTimeoutMillis: 30000,
});

// Test connection on boot
pool.query('SELECT NOW(), current_database();', (err, res) => {
  if (err) {
    console.error('❌ PostgreSQL Connection Test Failed:', err);
  } else {
    console.log(`✅ PostgreSQL Connected to DB "${res.rows[0].current_database}" at ${res.rows[0].now}`);
  }
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};