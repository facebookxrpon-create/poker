import React, { useState, useEffect } from 'react';
import { X, Trophy, Sparkles, Check, Users } from 'lucide-react';
import confetti from 'canvas-confetti';
import { sounds } from '../utils/audio';

export default function ShowdownModal({ isOpen, onClose, room, onDistributePot }) {
  const [mainWinners, setMainWinners] = useState([]);
  const [sideWinnersMap, setSideWinnersMap] = useState({});
  const [error, setError] = useState('');

  if (!isOpen || !room || !room.hand) return null;

  const hand = room.hand;
  const activePlayers = room.players.filter(p => !p.folded);

  const toggleMainWinner = (name) => {
    if (mainWinners.includes(name)) {
      setMainWinners(mainWinners.filter(w => w !== name));
    } else {
      setMainWinners([...mainWinners, name]);
    }
  };

  const toggleSideWinner = (sideIdx, name) => {
    const current = sideWinnersMap[sideIdx] || [];
    if (current.includes(name)) {
      setSideWinnersMap({
        ...sideWinnersMap,
        [sideIdx]: current.filter(w => w !== name)
      });
    } else {
      setSideWinnersMap({
        ...sideWinnersMap,
        [sideIdx]: [...current, name]
      });
    }
  };

  const handleSubmit = () => {
    if (mainWinners.length === 0) {
      setError('กรุณาเลือกผู้ชนะสำหรับ Main Pot อย่างน้อย 1 คน');
      return;
    }

    sounds.playWinSound();
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });

    onDistributePot({
      mainPotWinners: mainWinners,
      sidePotWinners: sideWinnersMap
    }, (res) => {
      if (res && res.error) {
        setError(res.error);
      } else {
        onClose();
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="glass-panel w-full max-w-xl rounded-2xl border-2 border-amber-500/80 overflow-hidden shadow-2xl shadow-amber-950/80 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-black gold-gradient-text tracking-wide">SHOWDOWN - SELECT WINNER</h2>
              <p className="text-xs text-slate-400">เลือกผู้ชนะเพื่อรับ Chips (รองรับ Split Pot)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* MAIN POT SELECTION */}
          <div className="bg-slate-900/90 p-4 rounded-xl border border-amber-500/40 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-black text-amber-400 tracking-wider uppercase block">MAIN POT</span>
                <span className="font-mono font-black text-2xl text-slate-100">{hand.mainPot.toLocaleString()} CHIPS</span>
              </div>
              <span className="text-[11px] text-slate-400 bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700">
                {mainWinners.length > 1 ? `SPLIT POT (${mainWinners.length} Winners)` : '1 Winner'}
              </span>
            </div>

            <p className="text-xs text-slate-400">เลือกผู้ชนะ Main Pot (กดเลือกหลายคนเพื่อ Split Pot):</p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {activePlayers.map((p) => {
                const isSelected = mainWinners.includes(p.name);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggleMainWinner(p.name)}
                    className={`p-3 rounded-xl border font-bold text-xs flex items-center justify-between transition ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="truncate">{p.avatar} {p.name}</span>
                    {isSelected && <Check className="w-4 h-4 text-amber-400 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* SIDE POTS SELECTION */}
          {hand.sidePots && hand.sidePots.map((sp, sideIdx) => {
            const currentSelected = sideWinnersMap[sideIdx] || [];
            const eligiblePlayers = activePlayers.filter(p => sp.eligiblePlayers.includes(p.name));

            return (
              <div key={sideIdx} className="bg-slate-900/90 p-4 rounded-xl border border-emerald-500/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black text-emerald-400 tracking-wider uppercase block">
                      SIDE POT #{sideIdx + 1}
                    </span>
                    <span className="font-mono font-black text-2xl text-slate-100">{sp.amount.toLocaleString()} CHIPS</span>
                  </div>
                  <span className="text-[11px] text-slate-400 bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700">
                    {currentSelected.length > 1 ? `SPLIT POT (${currentSelected.length})` : '1 Winner'}
                  </span>
                </div>

                <p className="text-xs text-slate-400">ผู้มีสิทธิ์ชนะ Side Pot นี้ (ตามจำนวนชิปที่ All-in):</p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {eligiblePlayers.map((p) => {
                    const isSelected = currentSelected.includes(p.name);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => toggleSideWinner(sideIdx, p.name)}
                        className={`p-3 rounded-xl border font-bold text-xs flex items-center justify-between transition ${
                          isSelected
                            ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-md'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <span className="truncate">{p.avatar} {p.name}</span>
                        {isSelected && <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Odd Chip Rules Disclaimer */}
          <div className="text-[11px] text-slate-400 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            💡 <strong>Odd Chip Rule (กรณี Split Pot):</strong> หากมีเศษชิปจากการหารไม่ลงตัว ระบบจะแจกเศษชิป 1 หน่วยให้ผู้ชนะที่อยู่อยู่ถัดไปทางซ้ายของตำแหน่ง Dealer
          </div>
        </div>

        {/* Footer Action */}
        <div className="p-4 bg-slate-900/90 border-t border-slate-800 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
          >
            CANCEL
          </button>
          <button
            onClick={handleSubmit}
            className="py-3 px-6 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 text-slate-950 font-black text-sm tracking-wide shadow-lg shadow-amber-500/30 transition flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" /> DISTRIBUTE POT
          </button>
        </div>
      </div>
    </div>
  );
}
