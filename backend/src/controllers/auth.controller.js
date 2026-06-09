const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

// Helper to generate access token (JWT)
function generateAccessToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    process.env.JWT_SECRET || 'your_super_secret_key',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// Helper to generate refresh token (simple cryptographically secure random string or JWT)
function generateRefreshToken(user) {
  return jwt.sign(
    { id: user.id, jti: Math.random().toString(36).substring(2) + Date.now() },
    process.env.JWT_SECRET || 'your_super_secret_key',
    { expiresIn: '7d' }
  );
}

async function register(req, res, next) {
  const { name, email, password, role } = req.body;

  try {
    // Check if user already exists
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Email already registered',
        message: 'Email already registered'
      });
    }

    // Hash password
    const hashedPassword = bcrypt.hashSync(password, 10);

    // Insert user
    const userRole = role || 'member';
    const result = db.prepare(`
      INSERT INTO users (name, email, password, role) 
      VALUES (?, ?, ?, ?)
    `).run(name, email, hashedPassword, userRole);

    const userId = result.lastInsertRowid;
    const user = { id: userId, name, email, role: userRole, avatar_url: null };

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Save refresh token to DB (expires in 7 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    db.prepare('INSERT INTO refresh_tokens (token, user_id, expires_at) VALUES (?, ?, ?)').run(
      refreshToken,
      userId,
      expiresAt.toISOString()
    );

    // Set refresh token in HTTP-only cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(201).json({
      success: true,
      data: {
        token: accessToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar_url: user.avatar_url
        }
      },
      message: 'Registration successful'
    });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  const { email, password } = req.body;

  try {
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        message: 'Invalid credentials'
      });
    }

    // Verify password
    const isPasswordValid = bcrypt.compareSync(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        message: 'Invalid credentials'
      });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Save refresh token to DB
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    db.prepare('INSERT INTO refresh_tokens (token, user_id, expires_at) VALUES (?, ?, ?)').run(
      refreshToken,
      user.id,
      expiresAt.toISOString()
    );

    // Set refresh token in HTTP-only cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(200).json({
      success: true,
      data: {
        token: accessToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar_url: user.avatar_url
        }
      },
      message: 'Login successful'
    });
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({
      success: false,
      error: 'Refresh token missing',
      message: 'Refresh token missing'
    });
  }

  try {
    // Find refresh token in database
    const dbToken = db.prepare('SELECT * FROM refresh_tokens WHERE token = ?').get(refreshToken);
    
    if (!dbToken) {
      return res.status(403).json({
        success: false,
        error: 'Invalid refresh token',
        message: 'Invalid refresh token'
      });
    }

    // Check if expired
    if (new Date(dbToken.expires_at) < new Date()) {
      db.prepare('DELETE FROM refresh_tokens WHERE token = ?').run(refreshToken);
      return res.status(403).json({
        success: false,
        error: 'Expired refresh token',
        message: 'Expired refresh token'
      });
    }

    // Get user details
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(dbToken.user_id);
    if (!user) {
      return res.status(403).json({
        success: false,
        error: 'User not found',
        message: 'User not found'
      });
    }

    // Generate new access token
    const accessToken = generateAccessToken(user);

    res.status(200).json({
      success: true,
      data: {
        token: accessToken
      },
      message: 'Token refreshed successfully'
    });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  const refreshToken = req.cookies.refreshToken;

  try {
    if (refreshToken) {
      // Delete token from database
      db.prepare('DELETE FROM refresh_tokens WHERE token = ?').run(refreshToken);
    }

    // Clear client cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    res.status(200).json({
      success: true,
      data: {},
      message: 'Logged out successfully'
    });
  } catch (err) {
    next(err);
  }
}

async function getMe(req, res, next) {
  try {
    const user = db.prepare('SELECT id, name, email, avatar_url, role, created_at FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user,
      message: 'User profile fetched'
    });
  } catch (err) {
    next(err);
  }
}

async function updateMe(req, res, next) {
  const { name, avatar_url } = req.body;
  const userId = req.user.id;

  try {
    db.prepare('UPDATE users SET name = COALESCE(?, name), avatar_url = COALESCE(?, avatar_url) WHERE id = ?').run(
      name,
      avatar_url,
      userId
    );

    const updatedUser = db.prepare('SELECT id, name, email, avatar_url, role FROM users WHERE id = ?').get(userId);

    res.status(200).json({
      success: true,
      data: updatedUser,
      message: 'Profile updated successfully'
    });
  } catch (err) {
    next(err);
  }
}

async function changePassword(req, res, next) {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  try {
    const user = db.prepare('SELECT password FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'User not found'
      });
    }

    const isPasswordValid = bcrypt.compareSync(currentPassword, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        error: 'Current password is incorrect',
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, userId);

    res.status(200).json({
      success: true,
      data: {},
      message: 'Password changed successfully'
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register,
  login,
  refresh,
  logout,
  getMe,
  updateMe,
  changePassword
};
