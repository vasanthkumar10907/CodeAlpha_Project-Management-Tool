const db = require('../config/database');

// Transaction for project creation (ensures member row is created)
const createProjectTransaction = db.transaction((name, description, ownerId, color, icon) => {
  const result = db.prepare(`
    INSERT INTO projects (name, description, owner_id, color, icon, status) 
    VALUES (?, ?, ?, ?, ?, 'active')
  `).run(name, description, ownerId, color, icon);

  const projectId = result.lastInsertRowid;

  db.prepare(`
    INSERT INTO project_members (project_id, user_id, role) 
    VALUES (?, ?, 'owner')
  `).run(projectId, ownerId);

  return projectId;
});

async function getProjects(req, res, next) {
  try {
    // Get all projects where the user is a member
    const projects = db.prepare(`
      SELECT p.*, pm.role as user_role 
      FROM projects p
      JOIN project_members pm ON p.id = pm.project_id
      WHERE pm.user_id = ?
      ORDER BY p.created_at DESC
    `).all(req.user.id);

    res.status(200).json({
      success: true,
      data: projects,
      message: 'Projects retrieved successfully'
    });
  } catch (err) {
    next(err);
  }
}

async function createProject(req, res, next) {
  const { name, description, color, icon } = req.body;
  const ownerId = req.user.id;

  try {
    const projectId = createProjectTransaction(name, description, ownerId, color, icon);
    const newProject = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);

    res.status(201).json({
      success: true,
      data: newProject,
      message: 'Project created successfully'
    });
  } catch (err) {
    next(err);
  }
}

async function getProjectById(req, res, next) {
  const { id } = req.params;

  try {
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
        message: 'Project not found'
      });
    }

    // Get all members of project
    const members = db.prepare(`
      SELECT pm.user_id as id, u.name, u.email, u.avatar_url, pm.role, pm.joined_at
      FROM project_members pm
      JOIN users u ON pm.user_id = u.id
      WHERE pm.project_id = ?
    `).all(id);

    res.status(200).json({
      success: true,
      data: {
        ...project,
        members
      },
      message: 'Project fetched successfully'
    });
  } catch (err) {
    next(err);
  }
}

async function updateProject(req, res, next) {
  const { id } = req.params;
  const { name, description, color, icon, status } = req.body;

  try {
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
        message: 'Project not found'
      });
    }

    // Check project membership and role (only owner/editor can update)
    const membership = db.prepare('SELECT role FROM project_members WHERE project_id = ? AND user_id = ?').get(id, req.user.id);
    if (!membership || (membership.role !== 'owner' && membership.role !== 'editor')) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Only project owners and editors can update project details.',
        message: 'Access denied. Only project owners and editors can update project details.'
      });
    }

    db.prepare(`
      UPDATE projects 
      SET name = COALESCE(?, name), 
          description = COALESCE(?, description), 
          color = COALESCE(?, color), 
          icon = COALESCE(?, icon), 
          status = COALESCE(?, status),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name, description, color, icon, status, id);

    const updatedProject = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);

    res.status(200).json({
      success: true,
      data: updatedProject,
      message: 'Project updated successfully'
    });
  } catch (err) {
    next(err);
  }
}

async function deleteProject(req, res, next) {
  const { id } = req.params;

  try {
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
        message: 'Project not found'
      });
    }

    // Role-based access: only project owner can delete project
    if (project.owner_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Only the project owner can delete this project.',
        message: 'Access denied. Only the project owner can delete this project.'
      });
    }

    db.prepare('DELETE FROM projects WHERE id = ?').run(id);

    res.status(200).json({
      success: true,
      data: {},
      message: 'Project deleted successfully'
    });
  } catch (err) {
    next(err);
  }
}

async function getProjectStats(req, res, next) {
  const { id } = req.params;

  try {
    const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
        message: 'Project not found'
      });
    }

    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as completed
      FROM tasks
      WHERE project_id = ?
    `).get(id);

    const totalTasks = stats.total || 0;
    const completedTasks = stats.completed || 0;
    const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    res.status(200).json({
      success: true,
      data: {
        total_tasks: totalTasks,
        completed_tasks: completedTasks,
        progress_percent: progressPercent
      },
      message: 'Project statistics calculated'
    });
  } catch (err) {
    next(err);
  }
}

// ================= MEMBER OPERATIONS =================

async function getProjectMembers(req, res, next) {
  const { id } = req.params; // project_id

  try {
    const members = db.prepare(`
      SELECT pm.user_id as id, u.name, u.email, u.avatar_url, pm.role, pm.joined_at
      FROM project_members pm
      JOIN users u ON pm.user_id = u.id
      WHERE pm.project_id = ?
    `).all(id);

    res.status(200).json({
      success: true,
      data: members,
      message: 'Project members retrieved'
    });
  } catch (err) {
    next(err);
  }
}

async function addProjectMember(req, res, next) {
  const { id } = req.params; // project_id
  const { email, userId, role } = req.body;

  try {
    // Check if project exists
    const project = db.prepare('SELECT owner_id FROM projects WHERE id = ?').get(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
        message: 'Project not found'
      });
    }

    // Only owner or editor can add members
    const currentMembership = db.prepare('SELECT role FROM project_members WHERE project_id = ? AND user_id = ?').get(id, req.user.id);
    if (!currentMembership || (currentMembership.role !== 'owner' && currentMembership.role !== 'editor')) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Insufficient permissions to add members.',
        message: 'Access denied. Insufficient permissions to add members.'
      });
    }

    // Find user by email or ID
    let targetUser;
    if (email) {
      targetUser = db.prepare('SELECT id, name FROM users WHERE email = ?').get(email);
    } else if (userId) {
      targetUser = db.prepare('SELECT id, name FROM users WHERE id = ?').get(userId);
    }

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'User not found'
      });
    }

    // Check if already a member
    const existing = db.prepare('SELECT id FROM project_members WHERE project_id = ? AND user_id = ?').get(id, targetUser.id);
    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'User is already a member of this project',
        message: 'User is already a member of this project'
      });
    }

    const memberRole = role || 'editor';
    db.prepare('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)')
      .run(id, targetUser.id, memberRole);

    const newMember = db.prepare(`
      SELECT pm.user_id as id, u.name, u.email, u.avatar_url, pm.role, pm.joined_at
      FROM project_members pm
      JOIN users u ON pm.user_id = u.id
      WHERE pm.project_id = ? AND pm.user_id = ?
    `).get(id, targetUser.id);

    res.status(201).json({
      success: true,
      data: newMember,
      message: 'Member added to project successfully'
    });
  } catch (err) {
    next(err);
  }
}

async function updateProjectMemberRole(req, res, next) {
  const { id, userId } = req.params; // project_id, user_id to update
  const { role } = req.body;

  try {
    // Only owner of the project can change member roles
    const project = db.prepare('SELECT owner_id FROM projects WHERE id = ?').get(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
        message: 'Project not found'
      });
    }

    if (project.owner_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Only the project owner can change member roles.',
        message: 'Access denied. Only the project owner can change member roles.'
      });
    }

    // Check if target member exists
    const member = db.prepare('SELECT role FROM project_members WHERE project_id = ? AND user_id = ?').get(id, userId);
    if (!member) {
      return res.status(404).json({
        success: false,
        error: 'Member not found in this project',
        message: 'Member not found in this project'
      });
    }

    // Owner role cannot be demoted directly this way
    if (member.role === 'owner' && role !== 'owner') {
      return res.status(400).json({
        success: false,
        error: 'The project owner role cannot be changed. Transfer ownership instead.',
        message: 'The project owner role cannot be changed. Transfer ownership instead.'
      });
    }

    // Cannot make someone owner this way (unless owner is transferred, which is a different flow)
    if (role === 'owner') {
      return res.status(400).json({
        success: false,
        error: 'Cannot assign owner role directly. Role must be editor or viewer.',
        message: 'Cannot assign owner role directly. Role must be editor or viewer.'
      });
    }

    db.prepare('UPDATE project_members SET role = ? WHERE project_id = ? AND user_id = ?')
      .run(role, id, userId);

    const updatedMember = db.prepare(`
      SELECT pm.user_id as id, u.name, u.email, u.avatar_url, pm.role, pm.joined_at
      FROM project_members pm
      JOIN users u ON pm.user_id = u.id
      WHERE pm.project_id = ? AND pm.user_id = ?
    `).get(id, userId);

    res.status(200).json({
      success: true,
      data: updatedMember,
      message: 'Member role updated successfully'
    });
  } catch (err) {
    next(err);
  }
}

async function removeProjectMember(req, res, next) {
  const { id, userId } = req.params; // project_id, user_id to remove

  try {
    const project = db.prepare('SELECT owner_id FROM projects WHERE id = ?').get(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
        message: 'Project not found'
      });
    }

    // Check target member
    const targetMember = db.prepare('SELECT role FROM project_members WHERE project_id = ? AND user_id = ?').get(id, userId);
    if (!targetMember) {
      return res.status(404).json({
        success: false,
        error: 'Member not found in this project',
        message: 'Member not found in this project'
      });
    }

    // Permission check: either user is removing themselves (leaving), or the user is the project owner
    const isOwner = project.owner_id === req.user.id;
    const isSelf = parseInt(userId) === req.user.id;

    if (!isOwner && !isSelf) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You can only remove yourself, or project owners can remove members.',
        message: 'Access denied. You can only remove yourself, or project owners can remove members.'
      });
    }

    // Owner cannot leave or be removed
    if (targetMember.role === 'owner') {
      return res.status(400).json({
        success: false,
        error: 'The project owner cannot be removed from the project.',
        message: 'The project owner cannot be removed from the project.'
      });
    }

    db.prepare('DELETE FROM project_members WHERE project_id = ? AND user_id = ?')
      .run(id, userId);

    res.status(200).json({
      success: true,
      data: {},
      message: 'Member removed from project successfully'
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getProjects,
  createProject,
  getProjectById,
  updateProject,
  deleteProject,
  getProjectStats,
  getProjectMembers,
  addProjectMember,
  updateProjectMemberRole,
  removeProjectMember
};
