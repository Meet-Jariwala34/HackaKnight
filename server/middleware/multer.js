const multer = require('multer');

// Store files in RAM buffer for fast forwarding to FastAPI microservice
const storage = multer.memoryStorage();
const upload = multer({ storage });

module.exports = upload;