import React from 'react';
import { ShieldAlert, Club, Coins, QrCode } from 'lucide-react';

export default function HeaderBanner({ roomCode, onLeaveRoom, onOpenQR }) {
  return (
    <header className="sticky top-0 z-40 bg-[#0d111a]/95 backdrop-blur-md border-b border-amber-500/20 px-4 py-2.5 shadow-lg">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        {/* Logo & Title */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center text-slate-950 shadow-md shadow-amber-500/20 font-black text-xl">
            <Club className="w-5 h-5 fill-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-lg tracking-tight gold-gradient-text">
                POKER BANK
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 font-semibold border border-emerald-500/30 flex items-center gap-1">
                <Coins className="w-3 h-3" /> VIRTUAL CHIPS
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium hidden xs:block">
              Virtual Chips for Real-Life Poker Games • ใช้ชิปเสมือนเท่านั้น
            </p>
          </div>
        </div>

        {/* Room Info / Actions */}
        {roomCode ? (
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenQR}
              className="bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 rounded-lg px-2.5 py-1 text-emerald-400 font-bold text-xs flex items-center gap-1.5 transition shadow-sm"
              title="QR Code for Mobile/iPad"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Mobile / iPad</span>
            </button>

            <div className="bg-slate-900/90 border border-amber-500/30 rounded-lg px-3 py-1 flex items-center gap-2 shadow-inner">
              <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">ROOM</span>
              <span className="font-mono font-black text-amber-400 text-base tracking-widest">{roomCode}</span>
            </div>

            {onLeaveRoom && (
              <button
                onClick={onLeaveRoom}
                className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition font-semibold border border-slate-700"
              >
                Exit Room
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-[11px] text-amber-400/90 bg-amber-950/40 border border-amber-500/30 rounded-lg px-2.5 py-1">
            <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" />
            <span>เกมนี้ใช้ชิปเสมือนเท่านั้น ไม่มีเงินจริง / ห้ามฝาก-ถอน / ไม่มีมูลค่าเงินจริง</span>
          </div>
        )}
      </div>
    </header>
  );
}
