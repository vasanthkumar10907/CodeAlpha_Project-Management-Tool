const db = require('../config/database');

async function getUsers(req, res, next) {
  try {
    const users = db.prepare('SELECT id, name, email, avatar_url, role FROM users').all();
    res.status(200).json({
      success: true,
      data: users,
      message: 'Users list retrieved successfully'
    });
  } catch (err) {
    next(err);
  }
}

async function getUserById(req, res, next) {
  const { id } = req.params;
  try {
    const user = db.prepare('SELECT id, name, email, avatar_url, role, created_at FROM users WHERE id = ?').get(id);
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
      message: 'User retrieved successfully'
    });
  } catch (err) {
    next(err);
  }
}

async function uploadAvatar(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
        message: 'No file uploaded'
      });
    }

    // Generate relative url for the uploaded file
    const avatarUrl = `/uploads/${req.file.filename}`;
    
    // Update user in database
    db.prepare('UPDATE users SET avatar_url = ? WHERE id = ?').run(avatarUrl, req.user.id);

    res.status(200).json({
      success: true,
      data: {
        avatar_url: avatarUrl
      },
      message: 'Avatar uploaded successfully'
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getUsers,
  getUserById,
  uploadAvatar
};
