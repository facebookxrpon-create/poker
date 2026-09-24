import React, { useState, useEffect } from 'react';
import {
  RotateCcw,
  Sparkles,
  Trophy,
  History,
  ShieldAlert,
  ChevronRight,
  Crown,
  Volume2,
  VolumeX,
  Play,
  Check,
  Zap,
  Clock
} from 'lucide-react';
import { sounds } from '../utils/audio';

export default function LiveGameView({
  room,
  socketId,
  onPlayerAction,
  onNextPhase,
  onStartNewHand,
  onResetSession,
  onOpenShowdown,
  onOpenHistory,
  onOpenSummary
}) {
  const [betAmount, setBetAmount] = useState('');
  const [isMuted, setIsMuted] = useState(false);

  if (!room || !room.hand) return null;

  const hand = room.hand;
  const isHost = socketId === room.hostSocketId;
  const me = room.players.find(p => p.id === socketId);
  const isMyTurn = me && hand.currentTurnSeat === me.seatIndex && hand.phase !== 'SHOWDOWN';

  const currentHighest = hand.highestBet || 0;
  const myCurrentBet = me ? me.currentBet || 0 : 0;
  const neededToCall = currentHighest - myCurrentBet;

  // Set default bet amount when turn changes
  useEffect(() => {
    if (isMyTurn && me) {
      if (neededToCall > 0) {
        const defaultBet = Math.min(me.stack + myCurrentBet, Math.max(hand.minRaise, currentHighest * 2));
        setBetAmount(defaultBet.toString());
      } else {
        const defaultBet = Math.min(me.stack, Math.max(room.settings.bigBlind * 2, hand.pot || room.settings.bigBlind));
        setBetAmount(defaultBet.toString());
      }
    }
  }, [hand.currentTurnSeat, hand.phase]);

  const handleAction = (actionType) => {
    if (!isMuted) sounds.playActionSound();

    let amt = 0;
    if (actionType === 'BET' || actionType === 'RAISE') {
      amt = parseInt(betAmount) || 0;
    }

    onPlayerAction({ action: actionType, amount: amt }, (res) => {
      if (res && res.error) {
        alert(res.error);
      }
    });
  };

  const handleQuickBet = (preset) => {
    if (!me) return;
    if (!isMuted) sounds.playChipSound();

    const bb = room.settings.bigBlind;
    const pot = hand.pot;
    const maxChips = me.stack + myCurrentBet;

    let target = 0;
    switch (preset) {
      case 'MIN':
        target = Math.min(maxChips, hand.minRaise || bb * 2);
        break;
      case '2BB':
        target = Math.min(maxChips, bb * 2);
        break;
      case '3BB':
        target = Math.min(maxChips, bb * 3);
        break;
      case 'HALF_POT':
        target = Math.min(maxChips, currentHighest + Math.floor(pot / 2));
        break;
      case 'POT':
        target = Math.min(maxChips, currentHighest + pot);
        break;
      case 'ALL_IN':
        target = maxChips;
        break;
      default:
        target = Math.min(maxChips, hand.minRaise);
    }
    setBetAmount(target.toString());
  };

  const phases = ['PRE-FLOP', 'FLOP', 'TURN', 'RIVER', 'SHOWDOWN'];

  return (
    <div className="min-h-[calc(100vh-60px)] flex flex-col justify-between p-2 sm:p-4 max-w-5xl mx-auto space-y-3">
      {/* 1. TOP HEADER BAR */}
      <div className="glass-panel rounded-xl p-3 border border-amber-500/30 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono font-black text-sm px-2.5 py-1 rounded-lg">
            Hand #{hand.handNumber}
          </div>
          <div className="text-xs text-slate-300 font-semibold">
            Blinds: <span className="text-amber-400 font-mono font-bold">{room.settings.smallBlind}/{room.settings.bigBlind}</span>
          </div>
        </div>

        {/* Phase Badges */}
        <div className="hidden xs:flex items-center gap-1 bg-slate-900/80 p-1 rounded-lg border border-slate-800">
          {phases.map((p) => {
            const isActive = hand.phase === p;
            return (
              <span
                key={p}
                className={`text-[10px] font-black px-2 py-0.5 rounded-md transition ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {p}
              </span>
            );
          })}
        </div>

        {/* Control Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenHistory}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="Hand & Chip History"
          >
            <History className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenSummary}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 transition"
            title="Session Leaderboard Summary"
          >
            <Trophy className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 transition"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>
      </div>

      {/* Mobile Phase Progress Bar */}
      <div className="flex xs:hidden items-center justify-between bg-slate-950 p-2 rounded-xl border border-slate-800 text-[11px] font-bold">
        <span className="text-slate-400">PHASE:</span>
        <span className="text-amber-400 font-black tracking-widest bg-amber-950/60 border border-amber-500/40 px-2.5 py-0.5 rounded-md">
          {hand.phase}
        </span>
        {isHost && hand.phase !== 'SHOWDOWN' && (
          <button
            onClick={onNextPhase}
            className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-0.5 rounded-md border border-slate-700 flex items-center gap-0.5"
          >
            NEXT PHASE <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* AUTO COUNTDOWN TIMER BANNER (5 SECONDS) */}
      {hand.countdown > 0 && (
        <div className="glass-panel rounded-xl p-3 border-2 border-emerald-500/80 bg-emerald-950/60 text-emerald-300 text-center font-black text-sm flex items-center justify-center gap-2 shadow-2xl animate-pulse">
          <Clock className="w-5 h-5 text-emerald-400 animate-spin" />
          <span>แจกชิปเสร็จสิ้น! เริ่มเล่น Hand ถัดไปอัตโนมัติใน {hand.countdown} วินาที...</span>
        </div>
      )}

      {/* 2. POKER TABLE VISUALIZER & POT BAR */}
      <div className="relative rounded-3xl felt-gradient border-4 border-[#1c5c36] p-4 sm:p-8 min-h-[320px] flex flex-col items-center justify-between shadow-2xl overflow-hidden">
        {/* Table Watermark Text */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10 font-black text-6xl sm:text-8xl text-emerald-300 tracking-tighter select-none">
          POKER BANK
        </div>

        {/* CENTER POT DISPLAY CARD */}
        <div className="z-10 bg-slate-950/90 border-2 border-amber-500/60 rounded-2xl px-6 py-3 text-center shadow-2xl backdrop-blur-md animate-fadeIn">
          <span className="text-[10px] font-black text-slate-400 tracking-widest block uppercase">
            CURRENT POT
          </span>
          <div className="font-mono font-black text-3xl sm:text-4xl gold-gradient-text tracking-tight my-0.5">
            {hand.pot.toLocaleString()} <span className="text-lg font-bold text-amber-400">CHIPS</span>
          </div>

          {/* Main & Side Pots Breakdown */}
          {((hand.sidePots && hand.sidePots.length > 0) || hand.mainPot !== hand.pot) && (
            <div className="mt-2 pt-2 border-t border-slate-800/80 flex flex-wrap justify-center gap-2 text-[11px]">
              <div className="bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-mono font-bold px-2 py-0.5 rounded-md">
                Main Pot: {hand.mainPot.toLocaleString()}
              </div>
              {hand.sidePots?.map((sp, idx) => (
                <div key={idx} className="bg-amber-950/80 border border-amber-500/40 text-amber-300 font-mono font-bold px-2 py-0.5 rounded-md">
                  Side Pot #{idx + 1}: {sp.amount.toLocaleString()} ({sp.eligiblePlayers.length} p)
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SEATED PLAYERS GRID */}
        <div className="w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 my-4 z-10">
          {room.players.map((p) => {
            const isTurn = hand.currentTurnSeat === p.seatIndex && hand.phase !== 'SHOWDOWN';
            const isDealer = hand.dealerSeat === p.seatIndex;
            const isSB = hand.sbSeat === p.seatIndex;
            const isBB = hand.bbSeat === p.seatIndex;
            const isMe = p.id === socketId;

            return (
              <div
                key={p.id}
                className={`relative rounded-2xl p-3 backdrop-blur-md transition-all duration-300 flex flex-col justify-between ${
                  p.folded
                    ? 'bg-slate-950/60 border border-slate-900 opacity-50 grayscale'
                    : isTurn
                    ? 'bg-amber-950/80 border-2 border-amber-400 active-turn-pulse shadow-xl shadow-amber-500/20'
                    : 'bg-slate-900/80 border border-slate-800 shadow-md'
                }`}
              >
                {/* Dealer / SB / BB Badges */}
                <div className="absolute -top-2 left-2 flex items-center gap-1">
                  {isDealer && (
                    <span className="w-5 h-5 rounded-full bg-white text-slate-950 font-black text-[10px] flex items-center justify-center shadow-md border border-slate-400">
                      D
                    </span>
                  )}
                  {isSB && (
                    <span className="px-1.5 py-0.2 rounded-md bg-blue-600 text-white font-black text-[9px] shadow-sm">
                      SB
                    </span>
                  )}
                  {isBB && (
                    <span className="px-1.5 py-0.2 rounded-md bg-purple-600 text-white font-black text-[9px] shadow-sm">
                      BB
                    </span>
                  )}
                </div>

                {/* Player Top Info */}
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-base shadow-inner flex-shrink-0">
                    {p.avatar || '♠️'}
                  </div>
                  <div className="overflow-hidden">
                    <div className="text-xs font-extrabold text-slate-100 truncate flex items-center gap-1">
                      {p.name}
                      {isMe && <span className="text-[9px] text-amber-400 font-bold">(You)</span>}
                    </div>
                    <div className="text-xs font-mono font-bold text-amber-400">
                      {p.stack.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Current Action / Bet Tag */}
                <div className="mt-2 pt-1.5 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
                  {p.folded ? (
                    <span className="text-slate-500 font-bold italic">FOLDED</span>
                  ) : p.allIn ? (
                    <span className="text-red-400 font-black tracking-wider bg-red-950/80 border border-red-500/40 px-1.5 py-0.5 rounded">
                      ALL-IN
                    </span>
                  ) : p.lastAction ? (
                    <span className="text-emerald-400 font-bold bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/30">
                      {p.lastAction}
                    </span>
                  ) : (
                    <span className="text-slate-500">In Hand</span>
                  )}

                  {p.currentBet > 0 && !p.folded && (
                    <span className="font-mono font-bold text-amber-300">
                      Bet: {p.currentBet.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. SHOWDOWN PROMPT BANNER */}
      {hand.phase === 'SHOWDOWN' && (
        <div className="glass-panel rounded-2xl p-4 border-2 border-amber-500/80 bg-amber-950/40 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl animate-fadeIn">
          <div className="flex items-center gap-3">
            <Trophy className="w-8 h-8 text-amber-400 flex-shrink-0" />
            <div>
              <h3 className="font-extrabold text-amber-300 text-base">SHOWDOWN PHASE</h3>
              <p className="text-xs text-slate-300">
                {isHost ? 'คุณเป็น Host (คนสร้างห้อง) • กดเพื่อเลือกผู้ชนะและแจก Chips' : 'รอ Host (คนสร้างห้อง) เป็นผู้เลือกผู้ชนะและแจกชิป'}
              </p>
            </div>
          </div>
          <button
            onClick={onOpenShowdown}
            className="w-full sm:w-auto py-3 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 text-slate-950 font-black text-sm tracking-wide shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" /> {isHost ? 'SELECT WINNER & DISTRIBUTE POT' : 'VIEW SHOWDOWN STATUS'}
          </button>
        </div>
      )}

      {/* 4. PLAYER ACTION BAR (MOBILE FIRST DESIGN) */}
      {me && !me.folded && !me.allIn && hand.phase !== 'SHOWDOWN' && (
        <div className={`glass-panel rounded-2xl p-4 border transition shadow-2xl ${
          isMyTurn ? 'border-amber-500/80 bg-slate-950/95' : 'border-slate-800 opacity-90'
        }`}>
          {/* Action Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${isMyTurn ? 'bg-amber-400 animate-ping' : 'bg-slate-600'}`} />
              <h3 className="font-black text-sm uppercase tracking-wider text-slate-100">
                {isMyTurn ? 'YOUR TURN TO ACT' : `WAITING FOR ${room.players.find(p => p.seatIndex === hand.currentTurnSeat)?.name || 'NEXT PLAYER'}`}
              </h3>
            </div>
            <div className="text-xs text-slate-300">
              Current Stack: <strong className="font-mono font-bold text-amber-400 text-sm">{me.stack.toLocaleString()}</strong> Chips
            </div>
          </div>

          {/* Quick Bet Chips Presets */}
          {isMyTurn && (
            <div className="mb-3 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex-shrink-0 mr-1">
                QUICK BET:
              </span>
              <button onClick={() => handleQuickBet('MIN')} className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-bold border border-slate-700 transition">
                MIN
              </button>
              <button onClick={() => handleQuickBet('2BB')} className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-bold border border-slate-700 transition">
                2x BB
              </button>
              <button onClick={() => handleQuickBet('3BB')} className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-bold border border-slate-700 transition">
                3x BB
              </button>
              <button onClick={() => handleQuickBet('HALF_POT')} className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-mono font-bold border border-slate-700 transition">
                1/2 Pot
              </button>
              <button onClick={() => handleQuickBet('POT')} className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-mono font-bold border border-slate-700 transition">
                Pot
              </button>
              <button onClick={() => handleQuickBet('ALL_IN')} className="px-2.5 py-1 rounded-lg bg-red-950/80 hover:bg-red-900 text-red-400 text-xs font-mono font-bold border border-red-500/40 transition">
                All-In
              </button>
            </div>
          )}

          {/* Bet Amount Slider / Input Bar */}
          {isMyTurn && (
            <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 mb-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-bold">BET / RAISE TOTAL AMOUNT:</span>
                <span className="font-mono font-black text-amber-400 text-base">{parseInt(betAmount || 0).toLocaleString()} Chips</span>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={currentHighest ? hand.minRaise : room.settings.bigBlind}
                  max={me.stack + myCurrentBet}
                  step={room.settings.smallBlind}
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  className="flex-1 accent-amber-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
                />
                <input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  className="w-28 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-center text-sm font-mono font-bold text-amber-400 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          )}

          {/* ACTION BUTTONS GRID */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {/* FOLD */}
            <button
              onClick={() => handleAction('FOLD')}
              disabled={!isMyTurn}
              className="py-3 px-2 rounded-xl bg-slate-900 hover:bg-red-950/60 text-slate-300 hover:text-red-400 font-black text-sm border border-slate-800 hover:border-red-500/50 transition disabled:opacity-40"
            >
              FOLD
            </button>

            {/* CHECK / CALL */}
            {neededToCall <= 0 ? (
              <button
                onClick={() => handleAction('CHECK')}
                disabled={!isMyTurn}
                className="py-3 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-black text-sm border border-emerald-500/40 transition disabled:opacity-40"
              >
                CHECK
              </button>
            ) : (
              <button
                onClick={() => handleAction('CALL')}
                disabled={!isMyTurn}
                className="py-3 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-xs sm:text-sm shadow-md transition disabled:opacity-40 flex flex-col items-center justify-center"
              >
                <span>CALL</span>
                <span className="text-[10px] font-mono opacity-90">{Math.min(neededToCall, me.stack).toLocaleString()}</span>
              </button>
            )}

            {/* BET / RAISE */}
            <button
              onClick={() => handleAction(currentHighest > 0 ? 'RAISE' : 'BET')}
              disabled={!isMyTurn}
              className="py-3 px-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 text-slate-950 font-black text-xs sm:text-sm shadow-md transition disabled:opacity-40 flex flex-col items-center justify-center"
            >
              <span>{currentHighest > 0 ? 'RAISE' : 'BET'}</span>
              <span className="text-[10px] font-mono opacity-90">{parseInt(betAmount || 0).toLocaleString()}</span>
            </button>

            {/* ALL-IN */}
            <button
              onClick={() => handleAction('ALL-IN')}
              disabled={!isMyTurn || me.stack <= 0}
              className="py-3 px-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs sm:text-sm shadow-md transition disabled:opacity-40 flex flex-col items-center justify-center"
            >
              <span>ALL-IN</span>
              <span className="text-[10px] font-mono opacity-90">{me.stack.toLocaleString()}</span>
            </button>
          </div>
        </div>
      )}

      {/* 5. HOST / DEALER FOOTER CONTROL TOOLBAR */}
      <div className="glass-panel rounded-xl p-3 border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          {isHost && hand.phase !== 'SHOWDOWN' && (
            <button
              onClick={onNextPhase}
              className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold border border-amber-500/30 transition flex items-center gap-1"
            >
              CHANGE PHASE ({hand.phase}) <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onStartNewHand}
            className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 text-white font-black text-xs tracking-wider shadow-md transition flex items-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5 fill-white" /> NEW HAND
          </button>

          {isHost && (
            <button
              onClick={onResetSession}
              className="py-2 px-3 rounded-lg bg-slate-900 hover:bg-red-950 text-slate-400 hover:text-red-400 font-semibold border border-slate-800 transition"
              title="Reset All Chips to Starting"
            >
              <RotateCcw className="w-3.5 h-3.5 inline mr-1" /> Reset Session
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
