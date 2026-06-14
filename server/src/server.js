import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import morgan from 'morgan';

import authRoutes from './routes/auth.routes.js';
import groupRoutes from './routes/group.routes.js';
import expenseRoutes from './routes/expense.routes.js';
import settlementRoutes from './routes/settlement.routes.js';
import importRoutes from './routes/import.routes.js';
import balanceRoutes from './routes/balance.routes.js';

import { errorHandler } from './middleware/error.middleware.js';
import { initChatSocket } from './sockets/chat.socket.js';

const app = express();
const server = http.createServer(app);

// ── Socket.io ─────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});
initChatSocket(io);

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(morgan('dev'));

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Server is running.' });
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/groups', groupRoutes);
app.use('/api/v1/expenses', expenseRoutes);
app.use('/api/v1/settlements', settlementRoutes);
app.use('/api/v1/import', importRoutes);
app.use('/api/v1/balances', balanceRoutes);

// ── 404 Handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.', statusCode: 404 });
});

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start Server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

export { app, server };
