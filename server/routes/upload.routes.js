const express = require('express');
const router = express.Router();
const upload = require('../middleware/multer');
const uploadController = require('../controllers/upload.controller');

router.post('/', upload.single('resume'), uploadController.uploadResume);

module.exports = router;