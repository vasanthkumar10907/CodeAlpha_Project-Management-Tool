const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');

let io;

function initSocket(server, corsOrigin) {
  io = socketIO(server, {
    cors: {
      origin: corsOrigin || '*',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Authentication Middleware for Socket.io
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    
    if (token) {
      jwt.verify(token, process.env.JWT_SECRET || 'your_super_secret_key', (err, decoded) => {
        if (err) {
          console.log(`Socket Auth Failed: ${err.message}`);
          // Allow connection as guest/unauthenticated, or can do next(new Error('Auth error'));
          // Let's allow but don't set userId
          return next();
        }
        socket.userId = decoded.id;
        next();
      });
    } else {
      next();
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id} (User ID: ${socket.userId || 'Guest'})`);

    // If authenticated, join user-specific room for notifications
    if (socket.userId) {
      const userRoom = `user:${socket.userId}`;
      socket.join(userRoom);
      console.log(`Socket ${socket.id} joined private room: ${userRoom}`);
    }

    // Client listens
    socket.on('joinProject', (projectId) => {
      const room = `project:${projectId}`;
      socket.join(room);
      console.log(`Socket ${socket.id} joined project room: ${room}`);
    });

    socket.on('leaveProject', (projectId) => {
      const room = `project:${projectId}`;
      socket.leave(room);
      console.log(`Socket ${socket.id} left project room: ${room}`);
    });

    socket.on('joinTask', (taskId) => {
      const room = `task:${taskId}`;
      socket.join(room);
      console.log(`Socket ${socket.id} joined task room: ${room}`);
    });

    // Explicit room join helper in case frontend doesn't use token auth at handshake
    socket.on('registerUser', (userId) => {
      const room = `user:${userId}`;
      socket.join(room);
      console.log(`Socket ${socket.id} registered & joined room: ${room}`);
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
}

function getIO() {
  if (!io) {
    throw new Error('Socket.io has not been initialized. Call initSocket first.');
  }
  return io;
}

module.exports = {
  initSocket,
  getIO
};
