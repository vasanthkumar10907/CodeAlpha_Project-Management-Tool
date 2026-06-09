const db = require('../config/database');
const { getIO } = require('../socket/socket.handler');

// Helper to broadcast socket events safely
function broadcastToTask(taskId, event, data) {
  try {
    const io = getIO();
    io.to(`task:${taskId}`).emit(event, data);
  } catch (err) {
    console.log(`Socket broadcast error (task:${taskId}): ${err.message}`);
  }
}

// Helper to emit notification to a user
function emitNotificationToUser(userId, data) {
  try {
    const io = getIO();
    io.to(`user:${userId}`).emit('notification:new', data);
  } catch (err) {
    console.log(`Socket notify error (user:${userId}): ${err.message}`);
  }
}

async function getTaskComments(req, res, next) {
  const { taskId } = req.params;

  try {
    const comments = db.prepare(`
      SELECT c.*, u.name as author_name, u.avatar_url as author_avatar, u.email as author_email
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.task_id = ?
      ORDER BY c.created_at ASC
    `).all(taskId);

    res.status(200).json({
      success: true,
      data: comments,
      message: 'Comments retrieved successfully'
    });
  } catch (err) {
    next(err);
  }
}

async function createComment(req, res, next) {
  const { task_id, content } = req.body;
  const userId = req.user.id;

  try {
    // Check if task exists
    const task = db.prepare('SELECT title, created_by, assignee_id FROM tasks WHERE id = ?').get(task_id);
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found',
        message: 'Task not found'
      });
    }

    const result = db.prepare(`
      INSERT INTO comments (task_id, user_id, content) 
      VALUES (?, ?, ?)
    `).run(task_id, userId, content);

    const commentId = result.lastInsertRowid;
    const newComment = db.prepare(`
      SELECT c.*, u.name as author_name, u.avatar_url as author_avatar
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `).get(commentId);

    // Socket.io Broadcast to task room
    broadcastToTask(task_id, 'comment:added', newComment);

    // Create notifications for relevant users (assignee or creator, if not the commenter)
    const notifyUsers = new Set();
    if (task.assignee_id && task.assignee_id !== userId) {
      notifyUsers.add(task.assignee_id);
    }
    if (task.created_by && task.created_by !== userId) {
      notifyUsers.add(task.created_by);
    }

    notifyUsers.forEach(targetUserId => {
      const message = `${req.user.name} commented on "${task.title}": "${content.slice(0, 30)}${content.length > 30 ? '...' : ''}"`;
      const notifResult = db.prepare(`
        INSERT INTO notifications (user_id, type, message, is_read, reference_id, reference_type)
        VALUES (?, 'comment_added', ?, 0, ?, 'comment')
      `).run(targetUserId, message, commentId);

      const newNotif = db.prepare('SELECT * FROM notifications WHERE id = ?').get(notifResult.lastInsertRowid);
      emitNotificationToUser(targetUserId, newNotif);
    });

    res.status(201).json({
      success: true,
      data: newComment,
      message: 'Comment added successfully'
    });
  } catch (err) {
    next(err);
  }
}

async function updateComment(req, res, next) {
  const { id } = req.params;
  const { content } = req.body;

  try {
    const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(id);
    if (!comment) {
      return res.status(404).json({
        success: false,
        error: 'Comment not found',
        message: 'Comment not found'
      });
    }

    // Auth check: Author only
    if (comment.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You can only edit your own comments.',
        message: 'Access denied. You can only edit your own comments.'
      });
    }

    db.prepare('UPDATE comments SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(content, id);

    const updatedComment = db.prepare(`
      SELECT c.*, u.name as author_name, u.avatar_url as author_avatar
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `).get(id);

    // Socket.io Broadcast
    broadcastToTask(comment.task_id, 'comment:updated', updatedComment);

    res.status(200).json({
      success: true,
      data: updatedComment,
      message: 'Comment updated successfully'
    });
  } catch (err) {
    next(err);
  }
}

async function deleteComment(req, res, next) {
  const { id } = req.params;

  try {
    const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(id);
    if (!comment) {
      return res.status(404).json({
        success: false,
        error: 'Comment not found',
        message: 'Comment not found'
      });
    }

    // Auth check: Author only
    if (comment.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You can only delete your own comments.',
        message: 'Access denied. You can only delete your own comments.'
      });
    }

    db.prepare('DELETE FROM comments WHERE id = ?').run(id);

    // Socket.io Broadcast
    broadcastToTask(comment.task_id, 'comment:deleted', { id: parseInt(id), task_id: comment.task_id });

    res.status(200).json({
      success: true,
      data: { id: parseInt(id) },
      message: 'Comment deleted successfully'
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getTaskComments,
  createComment,
  updateComment,
  deleteComment
};
