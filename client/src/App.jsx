import React, { useState, useEffect } from 'react';
import { socket } from './socket';
import HeaderBanner from './components/HeaderBanner';
import HomeView from './components/HomeView';
import CreateRoomModal from './components/CreateRoomModal';
import JoinRoomModal from './components/JoinRoomModal';
import LobbyView from './components/LobbyView';
import LiveGameView from './components/LiveGameView';
import ShowdownModal from './components/ShowdownModal';
import SessionSummaryModal from './components/SessionSummaryModal';
import HistoryModal from './components/HistoryModal';
import QRCodeModal from './components/QRCodeModal';
import { sounds } from './utils/audio';
import { AlertTriangle } from 'lucide-react';

export default function App() {
  const [view, setView] = useState('HOME'); // 'HOME' | 'LOBBY' | 'LIVE_GAME'
  const [room, setRoom] = useState(null);
  const [socketId, setSocketId] = useState('');
  const [connected, setConnected] = useState(socket.connected);
  const [lanUrl, setLanUrl] = useState('');

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createdRoomData, setCreatedRoomData] = useState(null);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [showdownOpen, setShowdownOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setJoinModalOpen(true);
    }

    fetch('/api/network-info')
      .then(res => res.json())
      .then(data => {
        if (data && data.lanUrl) {
          setLanUrl(data.lanUrl);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    function onConnect() {
      setConnected(true);
      setSocketId(socket.id);
    }

    function onDisconnect() {
      setConnected(false);
    }

    function onRoomUpdated(updatedRoom) {
      setRoom(updatedRoom);

      if (updatedRoom.status === 'PLAYING') {
        setView('LIVE_GAME');
      } else if (updatedRoom.status === 'LOBBY') {
        setView('LOBBY');
      }
    }

    function onActionPerformed({ action, amount }) {
      sounds.playActionSound();
    }

    function onKicked() {
      alert('คุณถูก Host เชิญให้ออกจากห้อง');
      setRoom(null);
      setView('HOME');
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('room_updated', onRoomUpdated);
    socket.on('action_performed', onActionPerformed);
    socket.on('kicked', onKicked);

    if (socket.connected) {
      setSocketId(socket.id);
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('room_updated', onRoomUpdated);
      socket.off('action_performed', onActionPerformed);
      socket.off('kicked', onKicked);
    };
  }, []);

  // 1. CREATE ROOM
  const handleCreateRoom = (data, callback) => {
    socket.emit('create_room', data, (res) => {
      if (res && res.success) {
        setRoom(res.room);
        setCreatedRoomData(res.room);
        if (res.lanUrl) setLanUrl(res.lanUrl);
      }
      if (typeof callback === 'function') callback(res);
    });
  };

  // 2. JOIN ROOM
  const handleJoinRoom = (data, callback) => {
    socket.emit('join_room', data, (res) => {
      if (res && res.success) {
        setRoom(res.room);
        setJoinModalOpen(false);
        setView('LOBBY');
      }
      if (typeof callback === 'function') callback(res);
    });
  };

  // 3. START GAME
  const handleStartGame = () => {
    if (!room) return;
    socket.emit('start_hand', { roomCode: room.code }, (res) => {
      if (res && res.error) alert(res.error);
    });
  };

  // 4. PLAYER ACTION
  const handlePlayerAction = ({ action, amount }, callback) => {
    if (!room) return;
    socket.emit('player_action', { roomCode: room.code, action, amount }, callback);
  };

  // 5. NEXT PHASE
  const handleNextPhase = () => {
    if (!room) return;
    socket.emit('next_phase', { roomCode: room.code });
  };

  // 6. DISTRIBUTE POT
  const handleDistributePot = ({ mainPotWinners, sidePotWinners }, callback) => {
    if (!room) return;
    socket.emit('distribute_pot', { roomCode: room.code, mainPotWinners, sidePotWinners }, callback);
  };

  // 7. START NEW HAND
  const handleStartNewHand = () => {
    if (!room) return;
    socket.emit('start_hand', { roomCode: room.code }, (res) => {
      if (res && res.error) alert(res.error);
    });
  };

  // 8. RESET SESSION
  const handleResetSessionConfirm = () => {
    if (!room) return;
    socket.emit('reset_session', { roomCode: room.code }, (res) => {
      setResetConfirmOpen(false);
      if (res && res.error) alert(res.error);
    });
  };

  // 9. REMOVE PLAYER
  const handleRemovePlayer = (targetPlayerId) => {
    if (!room) return;
    socket.emit('remove_player', { roomCode: room.code, targetPlayerId });
  };

  // 10. UPDATE SETTINGS
  const handleUpdateSettings = ({ smallBlind, bigBlind, startingChips }) => {
    if (!room) return;
    socket.emit('update_settings', { roomCode: room.code, smallBlind, bigBlind, startingChips });
  };

  // 11. LEAVE ROOM
  const handleLeaveRoom = () => {
    if (window.confirm('คุณต้องการออกจากห้องนี้ใช่หรือไม่?')) {
      setRoom(null);
      setView('HOME');
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0d14] text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Top Sticky Header */}
      <HeaderBanner
        roomCode={room ? room.code : null}
        onLeaveRoom={room ? handleLeaveRoom : null}
        onOpenQR={() => setQrModalOpen(true)}
      />

      {/* Main View Area */}
      <main className="flex-1">
        {view === 'HOME' && (
          <HomeView
            onCreateClick={() => {
              setCreatedRoomData(null);
              setCreateModalOpen(true);
            }}
            onJoinClick={() => setJoinModalOpen(true)}
          />
        )}

        {view === 'LOBBY' && room && (
          <LobbyView
            room={room}
            socketId={socketId}
            onStartGame={handleStartGame}
            onRemovePlayer={handleRemovePlayer}
            onResetSession={() => setResetConfirmOpen(true)}
            onUpdateSettings={handleUpdateSettings}
            onOpenQR={() => setQrModalOpen(true)}
          />
        )}

        {view === 'LIVE_GAME' && room && (
          <LiveGameView
            room={room}
            socketId={socketId}
            onPlayerAction={handlePlayerAction}
            onNextPhase={handleNextPhase}
            onStartNewHand={handleStartNewHand}
            onResetSession={() => setResetConfirmOpen(true)}
            onOpenShowdown={() => setShowdownOpen(true)}
            onOpenHistory={() => setHistoryOpen(true)}
            onOpenSummary={() => setSummaryOpen(true)}
          />
        )}
      </main>

      {/* Modals */}
      <CreateRoomModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreateRoom={handleCreateRoom}
        createdRoom={createdRoomData}
        onEnterLobby={() => {
          setCreateModalOpen(false);
          setView('LOBBY');
        }}
      />

      <JoinRoomModal
        isOpen={joinModalOpen}
        onClose={() => setJoinModalOpen(false)}
        onJoinRoom={handleJoinRoom}
      />

      <ShowdownModal
        isOpen={showdownOpen}
        onClose={() => setShowdownOpen(false)}
        room={room}
        socketId={socketId}
        onDistributePot={handleDistributePot}
      />

      <SessionSummaryModal
        isOpen={summaryOpen}
        onClose={() => setSummaryOpen(false)}
        room={room}
      />

      <HistoryModal
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        room={room}
      />

      <QRCodeModal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        roomCode={room?.code}
        lanUrl={lanUrl}
      />

      {/* Confirmation Modal for Reset Session */}
      {resetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="glass-panel max-w-sm w-full rounded-2xl p-6 border-2 border-red-500/60 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-950/80 border border-red-500/40 text-red-400 flex items-center justify-center mx-auto text-xl">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-lg text-slate-100">RESET SESSION CHIPS?</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Reset all players to <strong className="text-amber-400 font-mono">{room?.settings?.startingChips?.toLocaleString()} Virtual Chips</strong>?
              ประวัติชิปเดิมทั้งหมดจะถูกรีเซ็ต
            </p>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setResetConfirmOpen(false)}
                className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
              >
                CANCEL
              </button>
              <button
                onClick={handleResetSessionConfirm}
                className="py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs transition shadow-lg shadow-red-600/30"
              >
                YES, RESET
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
