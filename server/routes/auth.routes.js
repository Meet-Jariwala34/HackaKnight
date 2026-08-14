const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

// 1. User Registration Route
// POST /api/auth/signup
router.post('/signup', authController.signup);

// 2. User Login Route (Dual Token Generation)
// POST /api/auth/login
router.post('/login', authController.login);

// 3. Refresh Token Rotation Route (Exchange refresh token for a new access token)
// POST /api/auth/refresh
router.post('/refresh', authController.refreshToken);

// 4. One-Click Demo/Judge Login Route
// POST /api/auth/demo-login
router.post('/demo-login', authController.demoLogin);

// 5. Logout Route (Clears HTTP-only Refresh Token cookie)
// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    sameSite: 'lax',
    secure: false, // set to true in production with HTTPS
  });
  return res.status(200).json({ message: 'Logged out successfully.' });
});

module.exports = router;