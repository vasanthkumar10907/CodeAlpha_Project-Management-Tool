const express = require('express');
const { body } = require('express-validator');
const commentController = require('../controllers/comment.controller');
const { verifyToken } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

// Require authentication for all comment routes
router.use(verifyToken);

router.get('/task/:taskId', commentController.getTaskComments);

router.post(
  '/',
  [
    body('task_id').isInt().withMessage('Task ID must be an integer'),
    body('content').trim().notEmpty().withMessage('Comment content cannot be empty')
  ],
  validate,
  commentController.createComment
);

router.put(
  '/:id',
  [
    body('content').trim().notEmpty().withMessage('Comment content cannot be empty')
  ],
  validate,
  commentController.updateComment
);

router.delete('/:id', commentController.deleteComment);

module.exports = router;
