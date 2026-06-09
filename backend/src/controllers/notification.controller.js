const db = require('../config/database');

async function getNotifications(req, res, next) {
  try {
    const notifications = db.prepare(`
      SELECT * FROM notifications 
      WHERE user_id = ? 
      ORDER BY created_at DESC
    `).all(req.user.id);

    // SQLite store boolean as 0/1. Let's convert to boolean true/false for consistent JSON response.
    const formattedNotifications = notifications.map(notif => ({
      ...notif,
      is_read: !!notif.is_read
    }));

    res.status(200).json({
      success: true,
      data: formattedNotifications,
      message: 'Notifications retrieved successfully'
    });
  } catch (err) {
    next(err);
  }
}

async function markRead(req, res, next) {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const notif = db.prepare('SELECT * FROM notifications WHERE id = ?').get(id);
    if (!notif) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found',
        message: 'Notification not found'
      });
    }

    if (notif.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You do not own this notification.',
        message: 'Access denied. You do not own this notification.'
      });
    }

    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(id);

    const updatedNotif = db.prepare('SELECT * FROM notifications WHERE id = ?').get(id);
    res.status(200).json({
      success: true,
      data: {
        ...updatedNotif,
        is_read: !!updatedNotif.is_read
      },
      message: 'Notification marked as read'
    });
  } catch (err) {
    next(err);
  }
}

async function markAllRead(req, res, next) {
  const userId = req.user.id;

  try {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(userId);
    res.status(200).json({
      success: true,
      data: {},
      message: 'All notifications marked as read'
    });
  } catch (err) {
    next(err);
  }
}

async function deleteNotification(req, res, next) {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const notif = db.prepare('SELECT * FROM notifications WHERE id = ?').get(id);
    if (!notif) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found',
        message: 'Notification not found'
      });
    }

    if (notif.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You do not own this notification.',
        message: 'Access denied. You do not own this notification.'
      });
    }

    db.prepare('DELETE FROM notifications WHERE id = ?').run(id);

    res.status(200).json({
      success: true,
      data: { id: parseInt(id) },
      message: 'Notification deleted successfully'
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getNotifications,
  markRead,
  markAllRead,
  deleteNotification
};
