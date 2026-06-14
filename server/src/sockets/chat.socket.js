import prisma from '../config/prisma.js';

/**
 * Socket.io Chat Handler
 * Each expense has its own room: `expense_<expenseId>`
 *
 * Events:
 *   joinExpense   { expenseId }                  — join expense chat room
 *   sendMessage   { expenseId, content, userId } — send a message
 *   newMessage    { id, user, content, createdAt } — broadcast to room
 */
export const initChatSocket = (io) => {
  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // Join an expense chat room
    socket.on('joinExpense', ({ expenseId }) => {
      if (!expenseId) return;
      const room = `expense_${expenseId}`;
      socket.join(room);
      console.log(`📥 Socket ${socket.id} joined room: ${room}`);
    });

    // Leave an expense chat room
    socket.on('leaveExpense', ({ expenseId }) => {
      if (!expenseId) return;
      const room = `expense_${expenseId}`;
      socket.leave(room);
      console.log(`📤 Socket ${socket.id} left room: ${room}`);
    });

    // Send a message — persist first, then broadcast
    socket.on('sendMessage', async ({ expenseId, content, userId }) => {
      if (!expenseId || !content || !userId) return;

      try {
        const message = await prisma.message.create({
          data: {
            expenseId,
            userId,
            content: content.trim(),
          },
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        });

        const room = `expense_${expenseId}`;
        io.to(room).emit('newMessage', {
          id: message.id,
          user: message.user,
          content: message.content,
          createdAt: message.createdAt,
        });
      } catch (err) {
        console.error('❌ Socket message error:', err.message);
        socket.emit('messageError', { error: 'Failed to send message.' });
      }
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });
};
