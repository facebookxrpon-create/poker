import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import {
  rooms,
  createRoom,
  joinRoom,
  startNewHand,
  handlePlayerAction,
  advancePhase,
  distributeShowdownPots,
  resetSession,
  updateRoomSettings,
  logTransaction
} from './gameEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Helper to get local IPv4 address for LAN access (Mobile / iPad)
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

const localIp = getLocalIpAddress();

// Serve static frontend build
const clientBuildPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientBuildPath));

// Endpoint for frontend to fetch local network IP for QR code generation
app.get('/api/network-info', (req, res) => {
  res.json({
    localIp,
    port: PORT,
    lanUrl: `http://${localIp}:${PORT}`
  });
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log(`[Socket Connected] ID: ${socket.id}`);

  // Create Room
  socket.on('create_room', (data, callback) => {
    try {
      const room = createRoom(socket.id, data);
      const result = joinRoom(room.code, socket.id, {
        nickname: data.hostName || 'Host',
        avatar: data.avatar || '👑'
      });

      socket.join(room.code);

      if (typeof callback === 'function') {
        callback({ success: true, room: result.room, player: result.player, lanUrl: `http://${localIp}:${PORT}` });
      }
      io.to(room.code).emit('room_updated', result.room);
    } catch (err) {
      console.error('Error creating room:', err);
      if (typeof callback === 'function') callback({ success: false, error: err.message });
    }
  });

  // Join Room
  socket.on('join_room', ({ roomCode, nickname, avatar }, callback) => {
    try {
      const code = roomCode?.toUpperCase();
      const result = joinRoom(code, socket.id, { nickname, avatar });

      if (result.error) {
        if (typeof callback === 'function') callback({ success: false, error: result.error });
        return;
      }

      socket.join(code);

      if (typeof callback === 'function') {
        callback({ success: true, room: result.room, player: result.player });
      }
      io.to(code).emit('room_updated', result.room);
    } catch (err) {
      console.error('Error joining room:', err);
      if (typeof callback === 'function') callback({ success: false, error: err.message });
    }
  });

  // Start New Hand
  socket.on('start_hand', ({ roomCode }, callback) => {
    const room = rooms.get(roomCode?.toUpperCase());
    if (!room) return;

    const res = startNewHand(room);
    if (res.error) {
      if (typeof callback === 'function') callback({ success: false, error: res.error });
      return;
    }

    if (typeof callback === 'function') callback({ success: true });
    io.to(room.code).emit('room_updated', room);
    io.to(room.code).emit('hand_started', { handNumber: room.hand.handNumber });
  });

  // Player Action (FOLD, CHECK, CALL, BET, RAISE, ALL-IN)
  socket.on('player_action', ({ roomCode, action, amount }, callback) => {
    const room = rooms.get(roomCode?.toUpperCase());
    if (!room) return;

    const res = handlePlayerAction(room, socket.id, { action, amount });
    if (res.error) {
      if (typeof callback === 'function') callback({ success: false, error: res.error });
      return;
    }

    if (typeof callback === 'function') callback({ success: true });
    io.to(room.code).emit('room_updated', room);
    io.to(room.code).emit('action_performed', { action, amount, socketId: socket.id });
  });

  // Next Phase (Host / Dealer manual trigger)
  socket.on('next_phase', ({ roomCode }, callback) => {
    const room = rooms.get(roomCode?.toUpperCase());
    if (!room) return;

    advancePhase(room);
    if (typeof callback === 'function') callback({ success: true });
    io.to(room.code).emit('room_updated', room);
  });

  // Distribute Showdown Pots
  socket.on('distribute_pot', ({ roomCode, mainPotWinners, sidePotWinners }, callback) => {
    const room = rooms.get(roomCode?.toUpperCase());
    if (!room) return;

    const res = distributeShowdownPots(room, { mainPotWinners, sidePotWinners });
    if (res.error) {
      if (typeof callback === 'function') callback({ success: false, error: res.error });
      return;
    }

    if (typeof callback === 'function') callback({ success: true });
    io.to(room.code).emit('room_updated', room);
    io.to(room.code).emit('showdown_complete', { winners: mainPotWinners });
  });

  // Host Action: Reset Session
  socket.on('reset_session', ({ roomCode }, callback) => {
    const room = rooms.get(roomCode?.toUpperCase());
    if (!room) return;

    if (socket.id !== room.hostSocketId) {
      if (typeof callback === 'function') callback({ success: false, error: 'Only the host can reset session' });
      return;
    }

    resetSession(room);
    if (typeof callback === 'function') callback({ success: true });
    io.to(room.code).emit('room_updated', room);
  });

  // Host Action: Update Settings
  socket.on('update_settings', ({ roomCode, smallBlind, bigBlind, startingChips }, callback) => {
    const room = rooms.get(roomCode?.toUpperCase());
    if (!room) return;

    if (socket.id !== room.hostSocketId) {
      if (typeof callback === 'function') callback({ success: false, error: 'Only the host can update settings' });
      return;
    }

    updateRoomSettings(room, { smallBlind, bigBlind, startingChips });
    if (typeof callback === 'function') callback({ success: true });
    io.to(room.code).emit('room_updated', room);
  });

  // Host Action: Remove / Kick Player
  socket.on('remove_player', ({ roomCode, targetPlayerId }, callback) => {
    const room = rooms.get(roomCode?.toUpperCase());
    if (!room) return;

    if (socket.id !== room.hostSocketId) {
      if (typeof callback === 'function') callback({ success: false, error: 'Only host can remove players' });
      return;
    }

    const targetIdx = room.players.findIndex(p => p.id === targetPlayerId);
    if (targetIdx !== -1) {
      const removed = room.players.splice(targetIdx, 1)[0];
      logTransaction(room, 'HOST', 'KICK', 0, `Removed ${removed.name} from room`);
      
      io.to(targetPlayerId).emit('kicked');
    }

    if (typeof callback === 'function') callback({ success: true });
    io.to(room.code).emit('room_updated', room);
  });

  // Socket Disconnect
  socket.on('disconnect', () => {
    console.log(`[Socket Disconnected] ID: ${socket.id}`);
    rooms.forEach(room => {
      const player = room.players.find(p => p.id === socket.id);
      if (player) {
        player.isConnected = false;
        io.to(room.code).emit('room_updated', room);
      }
    });
  });
});

// SPA fallback route
app.get('*', (req, res) => {
  if (req.path.startsWith('/socket.io') || req.path.startsWith('/api')) return;
  res.sendFile(path.join(clientBuildPath, 'index.html'), (err) => {
    if (err) {
      res.send('Poker Bank Server is running.');
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`
=====================================================
♠️ POKER BANK SERVER IS LIVE & READY FOR MOBILE/IPAD!
=====================================================
- Local Computer: http://localhost:${PORT}
- Mobile & iPad (WiFi/LAN): http://${localIp}:${PORT}
=====================================================
  `);
});
