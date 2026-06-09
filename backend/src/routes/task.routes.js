const express = require('express');
const { body } = require('express-validator');
const taskController = require('../controllers/task.controller');
const { verifyToken, checkProjectMember } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

// Require authentication for all task routes
router.use(verifyToken);

// Get all tasks for a project (checks if user is member of the project)
router.get('/project/:id', checkProjectMember(), taskController.getProjectTasks);

router.post(
  '/',
  [
    body('title').trim().notEmpty().withMessage('Task title is required'),
    body('project_id').isInt().withMessage('Project ID must be an integer'),
    body('assignee_id').optional({ nullable: true }).isInt().withMessage('Assignee ID must be an integer'),
    body('status').optional().isIn(['todo', 'inprogress', 'review', 'done']).withMessage('Status must be todo, inprogress, review, or done'),
    body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Priority must be low, medium, or high'),
    body('due_date').optional({ nullable: true }).isISO8601().withMessage('Due date must be a valid date (YYYY-MM-DD)')
  ],
  validate,
  // Middleware to check project membership of the project_id specified in the body
  checkProjectMember(),
  taskController.createTask
);

router.get('/:id', taskController.getTaskById);

router.put(
  '/:id',
  [
    body('title').optional().trim().notEmpty().withMessage('Task title cannot be empty'),
    body('project_id').optional().isInt().withMessage('Project ID must be an integer'),
    body('assignee_id').optional({ nullable: true }).isInt().withMessage('Assignee ID must be an integer'),
    body('status').optional().isIn(['todo', 'inprogress', 'review', 'done']).withMessage('Status must be todo, inprogress, review, or done'),
    body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Priority must be low, medium, or high'),
    body('due_date').optional({ nullable: true }).isISO8601().withMessage('Due date must be a valid date')
  ],
  validate,
  taskController.updateTask
);

router.delete('/:id', taskController.deleteTask);

router.patch(
  '/:id/status',
  [
    body('status').isIn(['todo', 'inprogress', 'review', 'done']).withMessage('Status must be todo, inprogress, review, or done')
  ],
  validate,
  taskController.updateTaskStatus
);

router.patch(
  '/:id/position',
  [
    body('position').isFloat().withMessage('Position must be a number'),
    body('status').optional().isIn(['todo', 'inprogress', 'review', 'done']).withMessage('Status must be todo, inprogress, review, or done')
  ],
  validate,
  taskController.updateTaskPosition
);

router.patch(
  '/:id/assign',
  [
    body('assignee_id').optional({ nullable: true }).isInt().withMessage('Assignee ID must be an integer or null')
  ],
  validate,
  taskController.assignTask
);

module.exports = router;
