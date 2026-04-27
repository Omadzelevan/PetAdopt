import http from 'node:http';
import { Role } from '@prisma/client';
import { Server } from 'socket.io';
import app from './app.js';
import { config } from './config.js';
import { verifyAccessToken } from './lib/jwt.js';
import { prisma } from './lib/prisma.js';

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: config.corsOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.set('io', io);

io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token;

  if (!token) {
    next(new Error('Authentication token required'));
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        name: true,
        role: true,
      },
    });

    if (!user) {
      throw new Error('Invalid user');
    }

    socket.data.user = user;
    next();
  } catch {
    next(new Error('Invalid socket token'));
  }
});

async function canAccessRequest(adoptionRequestId, user) {
  const request = await prisma.adoptionRequest.findUnique({
    where: { id: adoptionRequestId },
    include: {
      pet: {
        select: {
          ownerId: true,
        },
      },
    },
  });

  if (!request) {
    return null;
  }

  const allowed =
    request.requesterId === user.id ||
    request.pet.ownerId === user.id ||
    user.role === Role.ADMIN;

  if (!allowed) {
    return null;
  }

  return request;
}

io.on('connection', (socket) => {
  socket.on('join:request', async (payload) => {
    const adoptionRequestId = String(payload?.adoptionRequestId || '');
    if (!adoptionRequestId) {
      return;
    }

    const request = await canAccessRequest(adoptionRequestId, socket.data.user);

    if (!request) {
      socket.emit('error:request', { message: 'Unauthorized request room' });
      return;
    }

    socket.join(`request:${request.id}`);
  });

  socket.on('message:send', async (payload) => {
    const adoptionRequestId = String(payload?.adoptionRequestId || '');
    const content = String(payload?.content || '').trim();

    if (!adoptionRequestId || !content) {
      return;
    }

    const request = await canAccessRequest(adoptionRequestId, socket.data.user);

    if (!request) {
      socket.emit('error:request', { message: 'Unauthorized message attempt' });
      return;
    }

    const receiverId =
      socket.data.user.id === request.requesterId ? request.pet.ownerId : request.requesterId;

    const message = await prisma.message.create({
      data: {
        adoptionRequestId: request.id,
        senderId: socket.data.user.id,
        receiverId,
        content,
      },
      include: {
        sender: {
          select: {
            id:true,
            name: true,
          },
        },
      },
    });

    io.to(`request:${request.id}`).emit('message:new', message);
  });
});

server.listen(config.port, () => {
  console.log(`PetAdopt API listening on http://localhost:${config.port}`);
});
