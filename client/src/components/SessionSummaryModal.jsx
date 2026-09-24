import React, { useState } from 'react';
import { X, Trophy, Copy, Check, ShieldAlert, Share2, Coins } from 'lucide-react';

export default function SessionSummaryModal({ isOpen, onClose, room }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !room) return null;

  // Calculate Net Changes and sort by final stack (Leaderboard style)
  const playersSummary = [...room.players].map(p => {
    const starting = p.stats?.startingStack || room.settings.startingChips;
    const final = p.stack;
    const change = final - starting;
    const handsPlayed = p.stats?.handsPlayed || 0;
    const handsWon = p.stats?.handsWon || 0;
    const winRate = handsPlayed > 0 ? Math.round((handsWon / handsPlayed) * 100) : 0;

    return {
      ...p,
      starting,
      final,
      change,
      handsPlayed,
      handsWon,
      winRate
    };
  }).sort((a, b) => b.final - a.final);

  const formatSummaryText = () => {
    let text = `♠️ POKER BANK - SESSION SUMMARY ♠️\nRoom: ${room.name} (${room.code})\n=========================\n`;
    playersSummary.forEach((p, idx) => {
      const rank = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;
      const changeText = p.change >= 0 ? `+${p.change.toLocaleString()}` : `${p.change.toLocaleString()}`;
      text += `${rank} ${p.name}: ${p.final.toLocaleString()} Chips (${changeText}) | Win Rate: ${p.winRate}%\n`;
    });
    text += `=========================\nVirtual Chips for Real-Life Poker • No Real Money Value`;
    return text;
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(formatSummaryText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="glass-panel w-full max-w-xl rounded-2xl border border-amber-500/50 overflow-hidden shadow-2xl shadow-amber-950/80 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-black gold-gradient-text tracking-wide">SESSION SUMMARY</h2>
              <p className="text-xs text-slate-400">สรุปผลลัพธ์ของเซสชันโป๊กเกอร์ล่าสุด</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Virtual Chips Disclaimer */}
          <div className="bg-amber-950/30 border border-amber-500/30 rounded-xl p-3 flex items-center gap-3 text-xs text-amber-200">
            <Coins className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <span>
              <strong>Virtual Chips Only:</strong> ตัวเลขทั้งหมดเป็นสถิติชิปเสมือนในเกมเท่านั้น ไม่มีมูลค่าเป็นเงินจริง
            </span>
          </div>

          {/* Leaderboard Table */}
          <div className="space-y-2">
            {playersSummary.map((p, idx) => {
              const isProfit = p.change > 0;
              const isEven = p.change === 0;

              return (
                <div
                  key={p.id || idx}
                  className={`glass-card rounded-xl p-3.5 border flex items-center justify-between transition ${
                    idx === 0 ? 'border-amber-500/60 bg-amber-950/20' : 'border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-lg font-bold">
                      {idx === 0 ? '👑' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                    </div>
                    <div>
                      <div className="font-extrabold text-slate-100 text-sm flex items-center gap-1.5">
                        <span>{p.avatar}</span>
                        <span>{p.name}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Starting: {p.starting.toLocaleString()} • Played: {p.handsPlayed} • Won: {p.handsWon} ({p.winRate}%)
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-mono font-black text-slate-100 text-base">
                      {p.final.toLocaleString()} Chips
                    </div>
                    <div className={`text-xs font-mono font-bold ${
                      isProfit ? 'text-emerald-400' : isEven ? 'text-slate-400' : 'text-red-400'
                    }`}>
                      {isProfit ? `+${p.change.toLocaleString()}` : p.change.toLocaleString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            onClick={handleCopyText}
            className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs border border-amber-500/30 transition flex items-center gap-1.5"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            {copied ? 'COPIED!' : 'COPY SUMMARY'}
          </button>

          <button
            onClick={onClose}
            className="py-2.5 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs tracking-wider transition"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}
