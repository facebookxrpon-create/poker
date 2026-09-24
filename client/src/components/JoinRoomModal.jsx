import React, { useState, useEffect } from 'react';
import { X, LogIn, Key, User } from 'lucide-react';

const AVATARS = ['♠️', '♥️', '♦️', '♣️', '🎩', '🦁', '🐯', '🦅', '🐉', '🤖', '🔥', '👑'];

export default function JoinRoomModal({ isOpen, onClose, onJoinRoom }) {
  const [roomCode, setRoomCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [avatar, setAvatar] = useState('♠️');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Auto-fill room code from URL parameter if present
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const roomParam = params.get('room');
      if (roomParam) {
        setRoomCode(roomParam.toUpperCase());
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!roomCode.trim()) {
      setError('กรุณากรอก Room Code');
      return;
    }
    if (!nickname.trim()) {
      setError('กรุณากรอก Nickname ของคุณ');
      return;
    }

    setError('');
    setLoading(true);

    onJoinRoom({
      roomCode: roomCode.trim().toUpperCase(),
      nickname: nickname.trim(),
      avatar
    }, (res) => {
      setLoading(false);
      if (res && res.error) {
        setError(res.error);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="glass-panel w-full max-w-md rounded-2xl border border-emerald-500/30 overflow-hidden shadow-2xl shadow-emerald-950/50">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
              <LogIn className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-slate-100">JOIN ROOM</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-950/60 border border-red-500/40 text-red-300 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Room Code Input */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-emerald-400" /> Room Code
            </label>
            <input
              type="text"
              required
              maxLength={6}
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="เช่น F7K29"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-center text-xl font-mono font-black text-amber-400 uppercase tracking-widest focus:outline-none focus:border-emerald-500 transition shadow-inner"
            />
          </div>

          {/* Nickname & Avatar */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-emerald-400" /> Nickname & Avatar
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="เช่น Pon, Bank, Mark"
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition"
              />
              <select
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xl text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                {AVATARS.map((emoji) => (
                  <option key={emoji} value={emoji}>
                    {emoji}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500 hover:from-emerald-400 hover:to-emerald-300 text-slate-950 font-black text-base tracking-wide shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition active:scale-[0.99] disabled:opacity-50"
          >
            {loading ? 'Joining...' : 'JOIN ROOM'}
          </button>
        </form>
      </div>
    </div>
  );
}
