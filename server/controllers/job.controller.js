const db = require('../config/db');

exports.getAllJobs = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM job_roles ORDER BY id DESC');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching jobs:', error.message);
    res.status(500).json({ error: 'Failed to fetch job roles' });
  }
};

exports.getJobById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM job_roles WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Job role not found' });
    }
    
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching job by ID:', error.message);
    res.status(500).json({ error: 'Failed to fetch job details' });
  }
};