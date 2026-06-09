const express = require('express');
const notificationController = require('../controllers/notification.controller');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Require authentication for all notification routes
router.use(verifyToken);

router.get('/', notificationController.getNotifications);
router.patch('/read-all', notificationController.markAllRead);
router.patch('/:id/read', notificationController.markRead);
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;
