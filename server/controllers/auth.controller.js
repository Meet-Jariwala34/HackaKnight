const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

// Helper to generate Dual Tokens
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { id: user.user_id, email: user.email, name: user.user_name },
    process.env.ACCESS_TOKEN_SECRET || 'access_secret_key',
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '15m' }
  );

  const refreshToken = jwt.sign(
    { id: user.user_id },
    process.env.REFRESH_TOKEN_SECRET || 'refresh_secret_key',
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY || '7d' }
  );

  return { accessToken, refreshToken };
};

// 1. SIGNUP CONTROLLER
exports.signup = async (req, res) => {
  try {
    const { name, email, password, address, contactNo, linkedIn, github } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    // Check if user already exists in User_table
    const existing = await db.query('SELECT * FROM User_table WHERE Email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'User with this email already exists.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate unique user_id if not using SERIAL
    const idResult = await db.query('SELECT COALESCE(MAX(user_id), 0) + 1 AS next_id FROM User_table');
    const nextUserId = idResult.rows[0].next_id;

    // Insert user into User_table
    const insertQuery = `
      INSERT INTO User_table (
        user_id, user_name, email, password, address, contact_no, 
        current_skills, targeted_skills, linkedin, github
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING user_id, user_name, email, current_skills, targeted_skills;
    `;

    const values = [
      nextUserId,
      name,
      email,
      hashedPassword,
      address || null,
      contactNo || null,
      [], // Empty TEXT[] array for Current_Skills
      [], // Empty TEXT[] array for Targeted_skills
      linkedIn || null,
      github || null
    ];

    const result = await db.query(insertQuery, values);
    const newUser = result.rows[0];

    // Generate Tokens
    const { accessToken, refreshToken } = generateTokens(newUser);

    // Save refresh token in User_table
    await db.query('UPDATE user_table SET refresh_token = $1 WHERE user_id = $2', [refreshToken, newUser.user_id]);

    // Send HTTP-Only Cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: false, // Set to true if using HTTPS in production
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(201).json({
      message: 'Account created successfully!',
      accessToken,
      user: {
        userId: newUser.user_id,
        name: newUser.user_name,
        email: newUser.email,
        currentSkills: newUser.current_skills,
        targetedSkills: newUser.targeted_skills
      }
    });
  } catch (error) {
    console.error('Signup Error:', error.message);
    res.status(500).json({ error: 'Server error during signup.' });
  }
};

// 2. LOGIN CONTROLLER
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    // Fetch user from User_table
    const result = await db.query('SELECT * FROM user_table WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = result.rows[0];

    // Verify Password
    const isMatch = await bcrypt.compare(password, user.password || '');
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Generate Dual Tokens
    const { accessToken, refreshToken } = generateTokens(user);

    // Save refresh token in DB
    await db.query('UPDATE user_table SET refresh_token = $1 WHERE user_id = $2', [refreshToken, user.user_id]);

    // Set HTTP-Only Cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(200).json({
      message: 'Login successful!',
      accessToken,
      user: {
        userId: user.user_id,
        name: user.user_name,
        email: user.email,
        currentSkills: user.current_skills || [],
        targetedSkills: user.targeted_skills || [],
        resumeId: user.resume_id,
        linkedIn: user.linkedin,
        github: user.github
      }
    });
  } catch (error) {
    console.error('Login Error:', error.message);
    res.status(500).json({ error: 'Server error during login.' });
  }
};

// 3. REFRESH TOKEN ROTATION CONTROLLER
exports.refreshToken = async (req, res) => {
  try {
    const token = req.cookies.refreshToken || req.body.refreshToken;

    if (!token) {
      return res.status(401).json({ error: 'No refresh token provided.' });
    }

    const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET || 'refresh_secret_key');

    const result = await db.query('SELECT * FROM User_table WHERE user_id = $1', [decoded.id]);
    if (result.rows.length === 0 || result.rows[0].refresh_token !== token) {
      return res.status(403).json({ error: 'Invalid or expired refresh token.' });
    }

    const user = result.rows[0];
    const tokens = generateTokens(user);

    // Rotate refresh token in DB
    await db.query('UPDATE User_table SET refresh_token = $1 WHERE user_id = $2', [tokens.refreshToken, user.user_id]);

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(200).json({
      accessToken: tokens.accessToken
    });
  } catch (error) {
    console.error('Refresh Token Error:', error.message);
    res.status(403).json({ error: 'Invalid refresh token.' });
  }
};

// 4. DEMO / JUDGES LOGIN CONTROLLER
exports.demoLogin = async (req, res) => {
  try {
    const demoEmail = 'judge.demo@hackaknight.ai';
    let userResult = await db.query('SELECT * FROM User_table WHERE Email = $1', [demoEmail]);

    let user;
    if (userResult.rows.length === 0) {
      const idResult = await db.query('SELECT COALESCE(MAX(user_id), 0) + 1 AS next_id FROM User_table');
      const nextUserId = idResult.rows[0].next_id;

      const created = await db.query(
        `INSERT INTO User_table (
          user_id, User_name, Email, password, Current_Skills, Targeted_skills
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *;`,
        [
          nextUserId,
          'Demo Judge',
          demoEmail,
          'demo123',
          ['React', 'Node.js', 'PostgreSQL'],
          ['AI/ML', 'System Design']
        ]
      );
      user = created.rows[0];
    } else {
      user = userResult.rows[0];
    }

    const { accessToken, refreshToken } = generateTokens(user);

    await db.query('UPDATE User_table SET refresh_token = $1 WHERE user_id = $2', [refreshToken, user.user_id]);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(200).json({
      message: 'Logged in as Demo Judge!',
      accessToken,
      user: {
        userId: user.user_id,
        name: user.user_name,
        email: user.email,
        currentSkills: user.current_skills || [],
        targetedSkills: user.targeted_skills || []
      }
    });
  } catch (error) {
    console.error('Demo Login Error:', error.message);
    res.status(500).json({ error: 'Demo login failed.' });
  }
};