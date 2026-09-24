import React, { useState } from 'react';
import { Users, Play, Copy, Share2, Trash2, RotateCcw, Settings, Crown, Check, Coins, QrCode, Smartphone } from 'lucide-react';

export default function LobbyView({ room, currentPlayer, socketId, onStartGame, onRemovePlayer, onResetSession, onUpdateSettings, onOpenQR }) {
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Settings form state
  const [sb, setSb] = useState(room?.settings?.smallBlind || 50);
  const [bb, setBb] = useState(room?.settings?.bigBlind || 100);
  const [starting, setStarting] = useState(room?.settings?.startingChips || 10000);

  if (!room) return null;

  const isHost = socketId === room.hostSocketId;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    const shareData = {
      title: 'Poker Bank Room Code',
      text: `มาร่วมเล่นเกมใน Poker Bank! Room Code: ${room.code}`,
      url: `${window.location.origin}?room=${room.code}`
    };
    try {
      if (navigator.share) await navigator.share(shareData);
      else handleCopyCode();
    } catch (e) {
      handleCopyCode();
    }
  };

  const handleSaveSettings = (e) => {
    e.preventDefault();
    onUpdateSettings({ smallBlind: sb, bigBlind: bb, startingChips: starting });
    setShowSettings(false);
  };

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-6">
      {/* Top Room Banner */}
      <div className="glass-panel rounded-2xl p-5 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <h2 className="text-2xl font-black gold-gradient-text tracking-wide">{room.name}</h2>
            {isHost && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/40 flex items-center gap-1">
                <Crown className="w-3 h-3" /> HOST
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1 flex items-center justify-center sm:justify-start gap-2">
            <span>Blinds: <strong className="text-slate-200">{room.settings.smallBlind}/{room.settings.bigBlind}</strong></span>
            <span>•</span>
            <span>Starting Chips: <strong className="text-amber-400">{room.settings.startingChips.toLocaleString()}</strong></span>
          </p>
        </div>

        {/* Room Code Badge & Share */}
        <div className="flex items-center gap-2">
          <div className="bg-slate-900 border border-amber-500/40 rounded-xl px-4 py-2 text-center shadow-inner">
            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">ROOM CODE</span>
            <span className="font-mono font-black text-2xl text-amber-400 tracking-widest">{room.code}</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <button
              onClick={onOpenQR}
              className="p-2 rounded-lg bg-emerald-950 hover:bg-emerald-900 text-emerald-400 border border-emerald-500/40 transition text-xs font-bold flex items-center gap-1 shadow-md"
              title="Show QR Code for Mobile/iPad"
            >
              <QrCode className="w-4 h-4" />
            </button>
            <button
              onClick={handleCopyCode}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 transition text-xs font-bold flex items-center gap-1"
              title="Copy Room Code"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* QR Banner Callout for Mobile / iPad */}
      <div
        onClick={onOpenQR}
        className="glass-card rounded-2xl p-4 border border-emerald-500/40 bg-gradient-to-r from-emerald-950/40 via-slate-900/60 to-emerald-950/40 flex items-center justify-between cursor-pointer hover:border-emerald-400 transition shadow-lg group"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 group-hover:scale-105 transition">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-slate-100 text-sm flex items-center gap-1.5">
              <span>สแกน QR Code เข้าเล่นผ่านมือถือ / ไอแพด</span>
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              ให้เพื่อนสแกนผ่านกล้อง iPhone, iPad หรือ Android เพื่อเข้าสู่โต๊ะไพ่ทันที
            </p>
          </div>
        </div>
        <div className="px-3 py-1.5 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-1 flex-shrink-0">
          <QrCode className="w-3.5 h-3.5" /> SHOW QR
        </div>
      </div>

      {/* Players Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-amber-400" />
          <h3 className="font-bold text-slate-200 text-base">
            PLAYERS IN LOBBY ({room.players.length}/{room.settings.maxPlayers})
          </h3>
        </div>
        <span className="text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-3 py-1 rounded-full font-semibold flex items-center gap-1">
          <Coins className="w-3.5 h-3.5" /> Virtual Chips Only
        </span>
      </div>

      {/* Player List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {room.players.map((p, index) => {
          const isMe = p.id === socketId;
          const playerIsHost = p.id === room.hostSocketId;

          return (
            <div
              key={p.id || index}
              className={`glass-card rounded-xl p-4 border transition flex items-center justify-between shadow-md ${
                isMe ? 'border-amber-500/60 bg-amber-950/20' : 'border-slate-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xl shadow-inner relative">
                  {p.avatar || '♠️'}
                  {playerIsHost && (
                    <Crown className="w-3.5 h-3.5 text-amber-400 absolute -top-1 -right-1" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400 font-bold">Seat {p.seatIndex + 1}</span>
                    <span className="font-extrabold text-slate-100 text-sm">{p.name}</span>
                    {isMe && <span className="text-[10px] text-amber-400 font-bold">(You)</span>}
                  </div>
                  <div className="text-xs font-mono font-bold text-amber-400 mt-0.5">
                    {p.stack.toLocaleString()} Chips
                  </div>
                </div>
              </div>

              {isHost && !isMe && (
                <button
                  onClick={() => onRemovePlayer(p.id)}
                  className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-950/40 rounded-lg transition"
                  title="Remove Player"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Host Controls Panel */}
      {isHost && (
        <div className="glass-panel rounded-2xl p-5 border border-amber-500/30 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h4 className="font-extrabold text-amber-400 text-sm tracking-wider uppercase flex items-center gap-2">
              <Crown className="w-4 h-4" /> HOST CONTROLS
            </h4>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold border border-slate-700 flex items-center gap-1 transition"
            >
              <Settings className="w-3.5 h-3.5" /> {showSettings ? 'Hide Settings' : 'Edit Blinds & Chips'}
            </button>
          </div>

          {/* Edit Settings Form */}
          {showSettings && (
            <form onSubmit={handleSaveSettings} className="bg-slate-900/80 p-4 rounded-xl border border-slate-700 space-y-3 animate-fadeIn">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase">Small Blind</label>
                  <input
                    type="number"
                    value={sb}
                    onChange={(e) => setSb(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase">Big Blind</label>
                  <input
                    type="number"
                    value={bb}
                    onChange={(e) => setBb(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase">Starting Chips</label>
                  <input
                    type="number"
                    value={starting}
                    onChange={(e) => setStarting(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-white font-mono font-bold"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition"
              >
                Save Settings
              </button>
            </form>
          )}

          {/* Host Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={onStartGame}
              disabled={room.players.length < 2}
              className="py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500 hover:from-emerald-400 text-slate-950 font-black text-base tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition disabled:opacity-40"
            >
              <Play className="w-5 h-5 fill-slate-950" /> START GAME
            </button>

            <button
              onClick={onResetSession}
              className="py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-sm border border-slate-700 flex items-center justify-center gap-2 transition"
            >
              <RotateCcw className="w-4 h-4 text-amber-400" /> RESET CHIPS
            </button>
          </div>
        </div>
      )}

      {/* Non-host notice */}
      {!isHost && (
        <div className="text-center text-xs text-slate-400 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
          รอ Host กด <strong>Start Game</strong> เพื่อเริ่มเล่น...
        </div>
      )}
    </div>
  );
}
