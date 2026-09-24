import React from 'react';
import { PlusCircle, LogIn, ShieldAlert, Sparkles, Trophy, Users, Layers, Repeat } from 'lucide-react';

export default function HomeView({ onCreateClick, onJoinClick }) {
  return (
    <div className="min-h-[calc(100vh-60px)] flex flex-col justify-between p-4 md:p-6 max-w-4xl mx-auto">
      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center text-center my-6">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 text-xs font-bold tracking-wide uppercase mb-6 shadow-lg shadow-emerald-950/50">
          <Sparkles className="w-3.5 h-3.5" />
          Real-Life Poker Chip Manager
        </div>

        {/* Title */}
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight mb-3">
          <span className="gold-gradient-text drop-shadow-md">POKER BANK</span>
        </h1>
        
        <p className="text-xl font-bold text-amber-200/90 mb-2">
          Virtual Chips for Real-Life Poker Games
        </p>
        <p className="text-sm text-slate-300 max-w-lg mb-8 leading-relaxed">
          สำหรับเล่นเกมโป๊กเกอร์ด้วยเพื่อน ใช้ชิปเสมือนเท่านั้น
          จัดการ Pot, Side Pot, บันทึกการเดิมพัน และหมุนตำแหน่ง Dealer / Blinds แบบ Real-time
        </p>

        {/* STRICT DISCLAIMER CARD */}
        <div className="w-full max-w-md bg-amber-950/20 border border-amber-500/30 rounded-xl p-3.5 mb-8 flex items-start gap-3 text-left backdrop-blur-sm">
          <ShieldAlert className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-200/80 leading-relaxed">
            <strong className="text-amber-400 font-bold block mb-0.5">ข้อกำหนดความปลอดภัย (Disclaimer):</strong>
            เว็บไซต์นี้ใช้ระบบ <span className="text-amber-300 font-semibold">Virtual Chips</span> เท่านั้น 
            <span className="text-amber-400 font-semibold"> ห้ามฝากเงิน • ห้ามถอนเงิน • ห้ามซื้อชิปด้วยเงินจริง • ชิปไม่มีมูลค่าเงินจริง</span>
          </div>
        </div>

        {/* TWO LARGE BUTTONS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-md">
          <button
            onClick={onCreateClick}
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 p-0.5 shadow-xl shadow-amber-500/20 hover:shadow-amber-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
          >
            <div className="bg-slate-950/90 group-hover:bg-slate-950/70 rounded-[14px] p-5 flex flex-col items-center transition">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center font-black mb-3 shadow-md group-hover:scale-110 transition">
                <PlusCircle className="w-7 h-7" />
              </div>
              <span className="font-extrabold text-lg text-amber-300 group-hover:text-amber-200 tracking-wider">
                CREATE ROOM
              </span>
              <span className="text-xs text-slate-400 mt-1">สร้างห้องใหม่ เป็น Host</span>
            </div>
          </button>

          <button
            onClick={onJoinClick}
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500 p-0.5 shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
          >
            <div className="bg-slate-950/90 group-hover:bg-slate-950/70 rounded-[14px] p-5 flex flex-col items-center transition">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-slate-950 flex items-center justify-center font-black mb-3 shadow-md group-hover:scale-110 transition">
                <LogIn className="w-7 h-7" />
              </div>
              <span className="font-extrabold text-lg text-emerald-300 group-hover:text-emerald-200 tracking-wider">
                JOIN ROOM
              </span>
              <span className="text-xs text-slate-400 mt-1">เข้าร่วมห้องด้วย Room Code</span>
            </div>
          </button>
        </div>
      </div>

      {/* Feature Highlights Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-4">
        <div className="glass-card rounded-xl p-3.5 flex flex-col items-center text-center">
          <Layers className="w-5 h-5 text-amber-400 mb-2" />
          <h4 className="text-xs font-bold text-slate-200">Pot & Side Pot</h4>
          <p className="text-[11px] text-slate-400 mt-0.5">แยก Main Pot และ Side Pot อัตโนมัติเมื่อมี All-in</p>
        </div>

        <div className="glass-card rounded-xl p-3.5 flex flex-col items-center text-center">
          <Repeat className="w-5 h-5 text-emerald-400 mb-2" />
          <h4 className="text-xs font-bold text-slate-200">Blind Rotation</h4>
          <p className="text-[11px] text-slate-400 mt-0.5">หมุน Dealer, SB, BB อัตโนมัติทุกๆ Hand</p>
        </div>

        <div className="glass-card rounded-xl p-3.5 flex flex-col items-center text-center">
          <Users className="w-5 h-5 text-blue-400 mb-2" />
          <h4 className="text-xs font-bold text-slate-200">Real-time Sync</h4>
          <p className="text-[11px] text-slate-400 mt-0.5">อัปเดต Chip และ Action ทุกคนพร้อมกันทันที</p>
        </div>

        <div className="glass-card rounded-xl p-3.5 flex flex-col items-center text-center">
          <Trophy className="w-5 h-5 text-purple-400 mb-2" />
          <h4 className="text-xs font-bold text-slate-200">Session Summary</h4>
          <p className="text-[11px] text-slate-400 mt-0.5">สรุปผลแพ้-ชนะ และ Transaction Log ละเอียด</p>
        </div>
      </div>

      {/* Footer copyright note */}
      <div className="text-center text-[11px] text-slate-500 py-3">
        Poker Bank • Designed for Real Life Hold'em Nights • Purely Virtual Chips
      </div>
    </div>
  );
}
