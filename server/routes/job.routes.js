const express = require('express');
const router = express.Router();
const jobController = require('../controllers/job.controller');

router.get('/', jobController.getAllJobs);
router.get('/:id', jobController.getJobById);

module.exports = router;