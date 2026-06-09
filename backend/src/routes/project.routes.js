const express = require('express');
const { body } = require('express-validator');
const projectController = require('../controllers/project.controller');
const { verifyToken, checkProjectMember } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

// Require authentication for all project routes
router.use(verifyToken);

// Project CRUD and Stats
router.get('/', projectController.getProjects);

router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Project name is required'),
    body('description').optional().trim(),
    body('color').optional().trim(),
    body('icon').optional().trim()
  ],
  validate,
  projectController.createProject
);

router.get('/:id', checkProjectMember(), projectController.getProjectById);
router.put('/:id', projectController.updateProject);
router.delete('/:id', projectController.deleteProject);
router.get('/:id/stats', checkProjectMember(), projectController.getProjectStats);

// Project Member Management
router.get('/:id/members', checkProjectMember(), projectController.getProjectMembers);

router.post(
  '/:id/members',
  [
    body('email').optional().isEmail().withMessage('Please provide a valid email'),
    body('userId').optional().isInt().withMessage('User ID must be an integer'),
    body('role').optional().isIn(['editor', 'viewer']).withMessage('Role must be either editor or viewer'),
    // Ensure either email or userId is provided
    body().custom((value, { req }) => {
      if (!req.body.email && !req.body.userId) {
        throw new Error('Either email or userId must be provided');
      }
      return true;
    })
  ],
  validate,
  projectController.addProjectMember
);

router.put(
  '/:id/members/:userId',
  [
    body('role').isIn(['editor', 'viewer']).withMessage('Role must be either editor or viewer')
  ],
  validate,
  projectController.updateProjectMemberRole
);

router.delete('/:id/members/:userId', projectController.removeProjectMember);

module.exports = router;
