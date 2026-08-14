const express = require('express');
const cors = require('cors');
const db = require('./config/db');

const jobRoutes = require('./routes/job.routes');
const uploadRoutes = require('./routes/upload.routes');

const app = express();

// Middlewares
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount REST Routes
app.use('/api/jobs', jobRoutes);
app.use('/api/upload', uploadRoutes);

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Backend is running smoothly' });
});

module.exports = app;