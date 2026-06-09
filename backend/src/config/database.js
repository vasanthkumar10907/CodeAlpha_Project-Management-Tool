const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Ensure database path exists
const dbPath = process.env.DB_PATH || './database.sqlite';
const resolvedDbPath = path.resolve(__dirname, '../../', dbPath);
const dbDir = path.dirname(resolvedDbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Ensure upload directory exists
const uploadDir = process.env.UPLOAD_DIR || './src/uploads';
const resolvedUploadDir = path.resolve(__dirname, '../../', uploadDir);
if (!fs.existsSync(resolvedUploadDir)) {
  fs.mkdirSync(resolvedUploadDir, { recursive: true });
}

console.log(`Connecting to database at: ${resolvedDbPath}`);
const db = new Database(resolvedDbPath, { verbose: console.log });

// Enable Foreign Key support
db.pragma('foreign_keys = ON');

// Initialize database schema
function initDatabase() {
  console.log('Initializing database schema...');

  // Users Table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      avatar_url TEXT,
      role TEXT CHECK(role IN ('admin', 'member')) DEFAULT 'member',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  // Projects Table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      owner_id INTEGER NOT NULL,
      color TEXT,
      icon TEXT,
      status TEXT CHECK(status IN ('active', 'archived')) DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `).run();

  // Project Members Table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS project_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      role TEXT CHECK(role IN ('owner', 'editor', 'viewer')) DEFAULT 'editor',
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(project_id, user_id)
    )
  `).run();

  // Tasks Table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      project_id INTEGER NOT NULL,
      assignee_id INTEGER,
      created_by INTEGER NOT NULL,
      status TEXT CHECK(status IN ('todo', 'inprogress', 'review', 'done')) DEFAULT 'todo',
      priority TEXT CHECK(priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
      due_date TEXT,
      position INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
    )
  `).run();

  // Comments Table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `).run();

  // Notifications Table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read BOOLEAN DEFAULT 0,
      reference_id INTEGER,
      reference_type TEXT CHECK(reference_type IN ('task', 'project', 'comment')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `).run();

  // Refresh Tokens Table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL,
      expires_at DATETIME NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `).run();

  // Auto-seed if database is empty (no users)
  const userCountRow = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (userCountRow.count === 0) {
    console.log('No users found in database. Seeding initial data...');
    try {
      seedDatabase();
    } catch (err) {
      console.error('Error seeding database:', err);
    }
  }
}

function seedDatabase() {
  const hashedPassword = bcrypt.hashSync('password123', 10);

  // Seed 3 Users
  const insertUser = db.prepare(`
    INSERT INTO users (name, email, password, avatar_url, role) 
    VALUES (?, ?, ?, ?, ?)
  `);
  
  const user1 = insertUser.run('Alex Morgan', 'alex@team.io', hashedPassword, null, 'admin');
  const user2 = insertUser.run('Priya Shah', 'priya@team.io', hashedPassword, null, 'member');
  const user3 = insertUser.run('Diego Reyes', 'diego@team.io', hashedPassword, null, 'member');

  const u1Id = user1.lastInsertRowid;
  const u2Id = user2.lastInsertRowid;
  const u3Id = user3.lastInsertRowid;

  // Seed 2 Projects
  const insertProject = db.prepare(`
    INSERT INTO projects (name, description, owner_id, color, icon, status) 
    VALUES (?, ?, ?, ?, ?, 'active')
  `);

  const project1 = insertProject.run('Apollo Web Redesign', 'Marketing site rebuild with new brand', u1Id, '#6366F1', 'layout');
  const project2 = insertProject.run('Mobile App v2', 'iOS & Android shipping next quarter', u2Id, '#14B8A6', 'smartphone');

  const p1Id = project1.lastInsertRowid;
  const p2Id = project2.lastInsertRowid;

  // Seed Project Members
  const insertMember = db.prepare(`
    INSERT INTO project_members (project_id, user_id, role) 
    VALUES (?, ?, ?)
  `);

  // Project 1 members: Alex (owner), Priya (editor), Diego (editor)
  insertMember.run(p1Id, u1Id, 'owner');
  insertMember.run(p1Id, u2Id, 'editor');
  insertMember.run(p1Id, u3Id, 'editor');

  // Project 2 members: Priya (owner), Alex (editor), Diego (viewer)
  insertMember.run(p2Id, u2Id, 'owner');
  insertMember.run(p2Id, u1Id, 'editor');
  insertMember.run(p2Id, u3Id, 'viewer');

  // Seed 10 Tasks (positions 1, 2, 3...)
  const insertTask = db.prepare(`
    INSERT INTO tasks (title, description, project_id, assignee_id, created_by, status, priority, due_date, position)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const today = new Date();
  const addDays = (days) => {
    const d = new Date(today);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  // Project 1 tasks
  const t1 = insertTask.run('Define hero composition', 'Decide between split-screen and centered hero.', p1Id, u3Id, u1Id, 'todo', 'high', addDays(0), 1000);
  const t2 = insertTask.run('Audit competitor sites', 'Pull 6 references and annotate.', p1Id, u1Id, u1Id, 'todo', 'low', addDays(3), 2000);
  const t3 = insertTask.run('Build navigation component', 'Sticky header with collapse on scroll.', p1Id, u2Id, u1Id, 'inprogress', 'medium', addDays(2), 1000);
  const t4 = insertTask.run('Color token migration', 'Move all colors into design tokens.', p1Id, u2Id, u1Id, 'inprogress', 'high', addDays(1), 2000);
  const t5 = insertTask.run('QA pricing page', 'Check responsiveness and links.', p1Id, u3Id, u1Id, 'review', 'medium', addDays(4), 1000);
  const t6 = insertTask.run('Ship footer redesign', 'Deploy the footer updates.', p1Id, u3Id, u1Id, 'done', 'low', addDays(-2), 1000);

  // Project 2 tasks
  const t7 = insertTask.run('Push notification permission flow', 'Implement soft prompt before system dialog.', p2Id, u2Id, u2Id, 'todo', 'medium', addDays(0), 1000);
  const t8 = insertTask.run('Refactor auth module', 'Clean up code and handle edge cases.', p2Id, u1Id, u2Id, 'inprogress', 'high', addDays(5), 1000);
  const t9 = insertTask.run('App icon variants', 'Create options for seasonal icons.', p2Id, u3Id, u2Id, 'done', 'low', addDays(-5), 1000);
  const t10 = insertTask.run('Write welcome copy', 'Draft copy for the new onboarding.', p2Id, u1Id, u2Id, 'review', 'low', addDays(1), 1000);

  // Seed Comments
  const insertComment = db.prepare(`
    INSERT INTO comments (task_id, user_id, content) 
    VALUES (?, ?, ?)
  `);

  insertComment.run(t1.lastInsertRowid, u1Id, "Let's go with split-screen for stronger hierarchy.");
  insertComment.run(t1.lastInsertRowid, u3Id, "Agreed — I'll mock both quickly.");

  // Seed Notifications
  const insertNotification = db.prepare(`
    INSERT INTO notifications (user_id, type, message, is_read, reference_id, reference_type)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertNotification.run(u1Id, 'task_assigned', 'Priya assigned you a task on Apollo Web Redesign', 0, t2.lastInsertRowid, 'task');
  insertNotification.run(u1Id, 'comment_added', 'Diego commented on “Define hero composition”', 0, t1.lastInsertRowid, 'task');
  insertNotification.run(u1Id, 'system', 'Welcome to the project management tool!', 1, null, null);

  console.log('Database successfully seeded.');
}

// Run schema initialization
initDatabase();

module.exports = db;
