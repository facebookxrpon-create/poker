import React, { useState } from 'react';
import { X, Copy, Share2, Check, Sparkles, User, Settings2 } from 'lucide-react';

const AVATARS = ['👑', '♠️', '♥️', '♦️', '♣️', '🎩', '🦁', '🐯', '🦅', '🐉', '🤖', '🔥'];

export default function CreateRoomModal({ isOpen, onClose, onCreateRoom, createdRoom, onEnterLobby }) {
  const [roomName, setRoomName] = useState('Friday Poker');
  const [startingChips, setStartingChips] = useState('10000');
  const [smallBlind, setSmallBlind] = useState('50');
  const [bigBlind, setBigBlind] = useState('100');
  const [maxPlayers, setMaxPlayers] = useState('9');
  const [hostName, setHostName] = useState('Pon');
  const [avatar, setAvatar] = useState('👑');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!hostName.trim()) {
      setError('กรุณากรอกชื่อของคุณ (Nickname)');
      return;
    }
    setError('');
    setLoading(true);

    onCreateRoom({
      roomName: roomName.trim() || 'Friday Poker',
      startingChips: parseInt(startingChips) || 10000,
      smallBlind: parseInt(smallBlind) || 50,
      bigBlind: parseInt(bigBlind) || 100,
      maxPlayers: parseInt(maxPlayers) || 9,
      hostName: hostName.trim(),
      avatar
    }, (res) => {
      setLoading(false);
      if (res && res.error) {
        setError(res.error);
      }
    });
  };

  const copyRoomCode = () => {
    if (!createdRoom) return;
    navigator.clipboard.writeText(createdRoom.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!createdRoom) return;
    const shareData = {
      title: 'Poker Bank Room Code',
      text: `มาร่วมเล่นโป๊กเกอร์ใน Poker Bank! Room Code: ${createdRoom.code}`,
      url: window.location.href
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        copyRoomCode();
      }
    } catch (e) {
      copyRoomCode();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="glass-panel w-full max-w-lg rounded-2xl border border-amber-500/30 overflow-hidden shadow-2xl shadow-amber-950/50">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-slate-100">
              {createdRoom ? 'Room Created!' : 'CREATE ROOM'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {createdRoom ? (
            /* Created Room Code Screen */
            <div className="flex flex-col items-center text-center space-y-6 animate-fadeIn">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center text-2xl font-black shadow-lg shadow-emerald-500/20">
                ✓
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  ROOM CODE
                </h3>
                <div className="text-4xl sm:text-5xl font-mono font-black gold-gradient-text tracking-widest bg-slate-900 border-2 border-amber-500/50 rounded-2xl px-6 py-3 shadow-inner my-2">
                  {createdRoom.code}
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  ส่งรหัสนี้ให้เพื่อนบนโต๊ะเพื่อเข้าร่วมเกม
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 w-full">
                <button
                  onClick={copyRoomCode}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold border border-amber-500/30 transition shadow-md"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'COPIED!' : 'COPY CODE'}
                </button>

                <button
                  onClick={handleShare}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold transition shadow-md"
                >
                  <Share2 className="w-4 h-4" />
                  SHARE
                </button>
              </div>

              <button
                onClick={onEnterLobby}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-extrabold text-base tracking-wide shadow-lg shadow-emerald-600/30 transition"
              >
                ENTER LOBBY →
              </button>
            </div>
          ) : (
            /* Room Creation Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-950/60 border border-red-500/40 text-red-300 text-xs font-semibold">
                  {error}
                </div>
              )}

              {/* Host Name & Avatar */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-amber-400" /> Host Nickname & Avatar
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={hostName}
                    onChange={(e) => setHostName(e.target.value)}
                    placeholder="เช่น Pon, Bank, Host"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 transition"
                  />
                  <select
                    value={avatar}
                    onChange={(e) => setAvatar(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xl text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    {AVATARS.map((emoji) => (
                      <option key={emoji} value={emoji}>
                        {emoji}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Room Name */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Room Name
                </label>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="เช่น Friday Poker, Hold'em Night"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 transition"
                />
              </div>

              {/* Grid: Starting Chips & Max Players */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Starting Chips
                  </label>
                  <input
                    type="number"
                    min="100"
                    step="100"
                    value={startingChips}
                    onChange={(e) => setStartingChips(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono font-bold focus:outline-none focus:border-amber-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Max Players (2–9)
                  </label>
                  <select
                    value={maxPlayers}
                    onChange={(e) => setMaxPlayers(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 transition cursor-pointer"
                  >
                    {[2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                      <option key={n} value={n}>
                        {n} Players
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Grid: Small Blind & Big Blind */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Small Blind
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={smallBlind}
                    onChange={(e) => setSmallBlind(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono font-bold focus:outline-none focus:border-amber-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Big Blind
                  </label>
                  <input
                    type="number"
                    min="2"
                    value={bigBlind}
                    onChange={(e) => setBigBlind(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono font-bold focus:outline-none focus:border-amber-500 transition"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-base tracking-wide shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 transition active:scale-[0.99] disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'CREATE ROOM'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
