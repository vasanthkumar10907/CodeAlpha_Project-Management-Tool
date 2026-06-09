require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const path = require('path');

// Import database (this executes schema init & seeding on first run)
const db = require('./config/database');

// Import middlewares
const errorHandler = require('./middleware/errorHandler');

// Import socket handler
const { initSocket } = require('./socket/socket.handler');

// Import routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const projectRoutes = require('./routes/project.routes');
const taskRoutes = require('./routes/task.routes');
const commentRoutes = require('./routes/comment.routes');
const notificationRoutes = require('./routes/notification.routes');

const app = express();
const PORT = process.env.PORT || 5000;

// Security and utility Middlewares
app.use(helmet({
  crossOriginResourcePolicy: false // Allow loading avatar images across origins
}));

const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Log incoming requests in dev mode
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Serve uploaded avatars statically
const uploadDir = process.env.UPLOAD_DIR || './src/uploads';
const resolvedUploadPath = path.resolve(__dirname, '../', uploadDir);
app.use('/uploads', express.static(resolvedUploadPath));
console.log(`Serving uploads statically from: ${resolvedUploadPath}`);

// API Versioned Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/projects', projectRoutes);
app.use('/api/v1/tasks', taskRoutes);
app.use('/api/v1/comments', commentRoutes);
app.use('/api/v1/notifications', notificationRoutes);

// Base route for healthcheck
app.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Backend service is healthy' });
});

// Handle 404 Route Not Found
app.use((req, res, next) => {
  const err = new Error(`Route Not Found - ${req.originalUrl}`);
  err.status = 404;
  next(err);
});

// Global Error Handler
app.use(errorHandler);

// Create HTTP Server
const server = http.createServer(app);

// Initialize Socket.io
const io = initSocket(server, corsOptions.origin);

// Start listening
server.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(` Server is running on port ${PORT}`);
  console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(` API URL: http://localhost:${PORT}/api/v1`);
  console.log(` Healthcheck: http://localhost:${PORT}/health`);
  console.log(`==================================================`);
});

module.exports = { app, server };
