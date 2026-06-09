const db = require('../config/database');
const { getIO } = require('../socket/socket.handler');

// Helper to broadcast socket events safely
function broadcastToProject(projectId, event, data) {
  try {
    const io = getIO();
    io.to(`project:${projectId}`).emit(event, data);
  } catch (err) {
    console.log(`Socket broadcast error (project:${projectId}): ${err.message}`);
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

async function getProjectTasks(req, res, next) {
  const projectId = req.params.projectId || req.params.id; // project_id

  try {
    const tasks = db.prepare(`
      SELECT t.*, 
             u.name as assignee_name, u.email as assignee_email, u.avatar_url as assignee_avatar,
             c.name as creator_name, c.avatar_url as creator_avatar
      FROM tasks t
      LEFT JOIN users u ON t.assignee_id = u.id
      LEFT JOIN users c ON t.created_by = c.id
      WHERE t.project_id = ?
      ORDER BY t.status, t.position ASC
    `).all(projectId);

    res.status(200).json({
      success: true,
      data: tasks,
      message: 'Tasks retrieved successfully'
    });
  } catch (err) {
    next(err);
  }
}

async function createTask(req, res, next) {
  const { title, description, project_id, assignee_id, status, priority, due_date } = req.body;
  const createdBy = req.user.id;

  try {
    const taskStatus = status || 'todo';
    const taskPriority = priority || 'medium';

    // Calculate position: max(position) + 1000 in current status column
    const posRow = db.prepare('SELECT COALESCE(MAX(position), 0) as max_pos FROM tasks WHERE project_id = ? AND status = ?')
      .get(project_id, taskStatus);
    const position = posRow.max_pos + 1000;

    const result = db.prepare(`
      INSERT INTO tasks (title, description, project_id, assignee_id, created_by, status, priority, due_date, position)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(title, description, project_id, assignee_id, createdBy, taskStatus, taskPriority, due_date || null, position);

    const taskId = result.lastInsertRowid;
    const newTask = db.prepare(`
      SELECT t.*, u.name as assignee_name, u.avatar_url as assignee_avatar
      FROM tasks t
      LEFT JOIN users u ON t.assignee_id = u.id
      WHERE t.id = ?
    `).get(taskId);

    // Socket.io Broadcast
    broadcastToProject(project_id, 'task:created', newTask);

    // If assigned to another user, send notification
    if (assignee_id && parseInt(assignee_id) !== createdBy) {
      const message = `${req.user.name} assigned you a task: "${title}"`;
      const notifResult = db.prepare(`
        INSERT INTO notifications (user_id, type, message, is_read, reference_id, reference_type)
        VALUES (?, 'task_assigned', ?, 0, ?, 'task')
      `).run(assignee_id, message, taskId);
      
      const newNotif = db.prepare('SELECT * FROM notifications WHERE id = ?').get(notifResult.lastInsertRowid);
      emitNotificationToUser(assignee_id, newNotif);
    }

    res.status(201).json({
      success: true,
      data: newTask,
      message: 'Task created successfully'
    });
  } catch (err) {
    next(err);
  }
}

async function getTaskById(req, res, next) {
  const { id } = req.params;

  try {
    const task = db.prepare(`
      SELECT t.*, 
             u.name as assignee_name, u.email as assignee_email, u.avatar_url as assignee_avatar,
             c.name as creator_name, c.avatar_url as creator_avatar
      FROM tasks t
      LEFT JOIN users u ON t.assignee_id = u.id
      LEFT JOIN users c ON t.created_by = c.id
      WHERE t.id = ?
    `).get(id);

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found',
        message: 'Task not found'
      });
    }

    // Get comments for the task
    const comments = db.prepare(`
      SELECT c.*, u.name as author_name, u.avatar_url as author_avatar
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.task_id = ?
      ORDER BY c.created_at ASC
    `).all(id);

    res.status(200).json({
      success: true,
      data: {
        ...task,
        comments
      },
      message: 'Task retrieved successfully'
    });
  } catch (err) {
    next(err);
  }
}

async function updateTask(req, res, next) {
  const { id } = req.params;
  const { title, description, status, priority, due_date, assignee_id } = req.body;

  try {
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found',
        message: 'Task not found'
      });
    }

    // Handle potential assignment change notification
    let assignmentChanged = false;
    const oldAssignee = task.assignee_id;
    const newAssignee = assignee_id !== undefined ? (assignee_id ? parseInt(assignee_id) : null) : oldAssignee;

    if (newAssignee !== oldAssignee && newAssignee && newAssignee !== req.user.id) {
      assignmentChanged = true;
    }

    db.prepare(`
      UPDATE tasks 
      SET title = COALESCE(?, title),
          description = COALESCE(?, description),
          status = COALESCE(?, status),
          priority = COALESCE(?, priority),
          due_date = COALESCE(?, due_date),
          assignee_id = CASE WHEN ? = 1 THEN ? ELSE assignee_id END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      title,
      description,
      status,
      priority,
      due_date || null,
      assignee_id !== undefined ? 1 : 0,
      newAssignee,
      id
    );

    const updatedTask = db.prepare(`
      SELECT t.*, u.name as assignee_name, u.avatar_url as assignee_avatar
      FROM tasks t
      LEFT JOIN users u ON t.assignee_id = u.id
      WHERE t.id = ?
    `).get(id);

    // Socket.io Broadcast
    broadcastToProject(task.project_id, 'task:updated', updatedTask);

    // Trigger notification if assignment changed
    if (assignmentChanged) {
      const message = `${req.user.name} assigned you a task: "${updatedTask.title}"`;
      const notifResult = db.prepare(`
        INSERT INTO notifications (user_id, type, message, is_read, reference_id, reference_type)
        VALUES (?, 'task_assigned', ?, 0, ?, 'task')
      `).run(newAssignee, message, id);
      
      const newNotif = db.prepare('SELECT * FROM notifications WHERE id = ?').get(notifResult.lastInsertRowid);
      emitNotificationToUser(newNotif.user_id, newNotif);
    }

    res.status(200).json({
      success: true,
      data: updatedTask,
      message: 'Task updated successfully'
    });
  } catch (err) {
    next(err);
  }
}

async function deleteTask(req, res, next) {
  const { id } = req.params;

  try {
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found',
        message: 'Task not found'
      });
    }

    db.prepare('DELETE FROM tasks WHERE id = ?').run(id);

    // Socket.io Broadcast
    broadcastToProject(task.project_id, 'task:deleted', { id: parseInt(id), project_id: task.project_id });

    res.status(200).json({
      success: true,
      data: { id: parseInt(id) },
      message: 'Task deleted successfully'
    });
  } catch (err) {
    next(err);
  }
}

async function updateTaskStatus(req, res, next) {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found',
        message: 'Task not found'
      });
    }

    // Get max position for this status column
    const posRow = db.prepare('SELECT COALESCE(MAX(position), 0) as max_pos FROM tasks WHERE project_id = ? AND status = ?')
      .get(task.project_id, status);
    const position = posRow.max_pos + 1000;

    db.prepare('UPDATE tasks SET status = ?, position = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(status, position, id);

    const updatedTask = db.prepare(`
      SELECT t.*, u.name as assignee_name, u.avatar_url as assignee_avatar
      FROM tasks t
      LEFT JOIN users u ON t.assignee_id = u.id
      WHERE t.id = ?
    `).get(id);

    // Socket.io Broadcast task:moved
    broadcastToProject(task.project_id, 'task:moved', updatedTask);

    res.status(200).json({
      success: true,
      data: updatedTask,
      message: 'Task status updated successfully'
    });
  } catch (err) {
    next(err);
  }
}

async function updateTaskPosition(req, res, next) {
  const { id } = req.params;
  const { position, status } = req.body; // position is the float/integer position

  try {
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found',
        message: 'Task not found'
      });
    }

    const newStatus = status || task.status;

    db.prepare('UPDATE tasks SET status = ?, position = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(newStatus, position, id);

    const updatedTask = db.prepare(`
      SELECT t.*, u.name as assignee_name, u.avatar_url as assignee_avatar
      FROM tasks t
      LEFT JOIN users u ON t.assignee_id = u.id
      WHERE t.id = ?
    `).get(id);

    // Socket.io Broadcast task:moved
    broadcastToProject(task.project_id, 'task:moved', updatedTask);

    res.status(200).json({
      success: true,
      data: updatedTask,
      message: 'Task position updated successfully'
    });
  } catch (err) {
    next(err);
  }
}

async function assignTask(req, res, next) {
  const { id } = req.params;
  const { assignee_id } = req.body; // ID of assignee or null to unassign

  try {
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found',
        message: 'Task not found'
      });
    }

    const oldAssignee = task.assignee_id;
    const newAssignee = assignee_id ? parseInt(assignee_id) : null;

    db.prepare('UPDATE tasks SET assignee_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(newAssignee, id);

    const updatedTask = db.prepare(`
      SELECT t.*, u.name as assignee_name, u.avatar_url as assignee_avatar
      FROM tasks t
      LEFT JOIN users u ON t.assignee_id = u.id
      WHERE t.id = ?
    `).get(id);

    // Socket.io Broadcast task:updated
    broadcastToProject(task.project_id, 'task:updated', updatedTask);

    // If new assignee and it's not the assignee assigning to themselves
    if (newAssignee && newAssignee !== oldAssignee && newAssignee !== req.user.id) {
      const message = `${req.user.name} assigned you a task: "${task.title}"`;
      const notifResult = db.prepare(`
        INSERT INTO notifications (user_id, type, message, is_read, reference_id, reference_type)
        VALUES (?, 'task_assigned', ?, 0, ?, 'task')
      `).run(newAssignee, message, id);

      const newNotif = db.prepare('SELECT * FROM notifications WHERE id = ?').get(notifResult.lastInsertRowid);
      emitNotificationToUser(newAssignee, newNotif);
    }

    res.status(200).json({
      success: true,
      data: updatedTask,
      message: newAssignee ? 'Task assigned successfully' : 'Task unassigned successfully'
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getProjectTasks,
  createTask,
  getTaskById,
  updateTask,
  deleteTask,
  updateTaskStatus,
  updateTaskPosition,
  assignTask
};
