const jwt = require('jsonwebtoken');
const db = require('../config/database');

function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access denied. No token provided.',
      message: 'Access denied. No token provided.'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_super_secret_key');
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token.',
      message: 'Invalid or expired token.'
    });
  }
}

// Middleware to verify user is a project member and optionally check required roles
function checkProjectMember(allowedRoles = ['owner', 'editor', 'viewer']) {
  return (req, res, next) => {
    const projectId = req.params.projectId || req.params.id || req.body.project_id;
    const userId = req.user.id;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        error: 'Project ID is required.',
        message: 'Project ID is required.'
      });
    }

    try {
      const member = db.prepare('SELECT role FROM project_members WHERE project_id = ? AND user_id = ?').get(projectId, userId);

      if (!member) {
        return res.status(403).json({
          success: false,
          error: 'Access denied. You are not a member of this project.',
          message: 'Access denied. You are not a member of this project.'
        });
      }

      if (!allowedRoles.includes(member.role)) {
        return res.status(403).json({
          success: false,
          error: 'Access denied. Insufficient permissions for this project.',
          message: 'Access denied. Insufficient permissions for this project.'
        });
      }

      req.projectRole = member.role;
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = {
  verifyToken,
  checkProjectMember
};
