import React, { useState } from 'react';
import { X, History, Clock, FileText, ChevronDown, ChevronUp } from 'lucide-react';

export default function HistoryModal({ isOpen, onClose, room }) {
  const [activeTab, setActiveTab] = useState('hands'); // 'hands' | 'transactions'
  const [expandedHand, setExpandedHand] = useState(null);

  if (!isOpen || !room) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="glass-panel w-full max-w-xl rounded-2xl border border-slate-700 overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 text-amber-400 flex items-center justify-center">
              <History className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-slate-100">GAME LOGS & HISTORY</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 p-1.5 gap-2">
          <button
            onClick={() => setActiveTab('hands')}
            className={`flex-1 py-2 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 ${
              activeTab === 'hands'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> Hand History ({room.gameHistory?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`flex-1 py-2 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 ${
              activeTab === 'transactions'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" /> Chip Logs ({room.transactionLogs?.length || 0})
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          {activeTab === 'hands' ? (
            /* HAND HISTORY TAB */
            room.gameHistory && room.gameHistory.length > 0 ? (
              room.gameHistory.map((h, idx) => {
                const isExpanded = expandedHand === idx;
                return (
                  <div key={idx} className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 transition">
                    <div
                      onClick={() => setExpandedHand(isExpanded ? null : idx)}
                      className="flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span className="bg-amber-500/20 text-amber-300 font-mono font-bold text-xs px-2 py-0.5 rounded border border-amber-500/30">
                          Hand #{h.handNumber}
                        </span>
                        <span className="font-bold text-slate-200 text-sm">
                          Winner: <strong className="text-amber-400">{h.winner}</strong>
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-emerald-400 text-sm">
                          Pot: {h.pot?.toLocaleString()} Chips
                        </span>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </div>
                    </div>

                    {/* Summary line */}
                    {h.summary && (
                      <p className="text-xs text-slate-400 mt-1.5 pt-1.5 border-t border-slate-800/60">
                        {h.summary}
                      </p>
                    )}

                    {/* Expanded detailed actions */}
                    {isExpanded && h.actionHistory && (
                      <div className="mt-3 pt-3 border-t border-slate-800 space-y-1.5 animate-fadeIn">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          DETAILED HAND ACTIONS:
                        </span>
                        {h.actionHistory.map((act, actIdx) => (
                          <div key={actIdx} className="text-xs text-slate-300 flex items-center justify-between bg-slate-950/60 px-2.5 py-1 rounded border border-slate-800/80">
                            <span><strong className="text-amber-300">[{act.phase}]</strong> {act.action}</span>
                            <span className="text-[10px] text-slate-500 font-mono">{act.timestamp}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-slate-500 text-sm">
                ยังไม่มีประวัติ Hand ในเซสชันนี้
              </div>
            )
          ) : (
            /* TRANSACTION LOGS TAB */
            room.transactionLogs && room.transactionLogs.length > 0 ? (
              room.transactionLogs.map((log) => {
                const isPositive = log.type === 'WIN' || log.type === 'JOIN';
                return (
                  <div key={log.id} className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-200 text-xs">{log.playerName}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold bg-slate-800 text-slate-400">
                          {log.type}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">{log.detail}</div>
                    </div>

                    <div className="text-right">
                      {log.amount !== 0 && (
                        <div className={`font-mono font-bold text-xs ${isPositive ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {log.amount > 0 ? `+${log.amount.toLocaleString()}` : log.amount.toLocaleString()}
                        </div>
                      )}
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">{log.timestamp}</div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-slate-500 text-sm">
                ยังไม่มี Transaction Log
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-900/90 border-t border-slate-800 text-right">
          <button
            onClick={onClose}
            className="py-2.5 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}
