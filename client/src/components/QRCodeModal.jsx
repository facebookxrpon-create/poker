import React, { useState } from 'react';
import { X, QrCode, Smartphone, Copy, Check, Tablet, Wifi } from 'lucide-react';

export default function QRCodeModal({ isOpen, onClose, roomCode, lanUrl }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Full URL for mobile joining
  const targetUrl = lanUrl
    ? `${lanUrl}?room=${roomCode}`
    : `${window.location.protocol}//${window.location.hostname}:3001?room=${roomCode}`;

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(targetUrl)}&color=000000&bgcolor=ffffff&margin=10`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(targetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="glass-panel w-full max-w-sm rounded-2xl border-2 border-emerald-500/60 overflow-hidden shadow-2xl shadow-emerald-950/80 text-center flex flex-col">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
            <h3 className="font-extrabold text-sm text-slate-100 uppercase tracking-wider">
              CONNECT MOBILE / IPAD
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col items-center space-y-4">
          <div className="flex items-center gap-2 text-xs text-slate-300 font-semibold bg-slate-900 px-3 py-1.5 rounded-full border border-slate-800">
            <Wifi className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>เชื่อมต่อ Wi-Fi เดียวกัน เพื่อเข้าใช้งานผ่านมือถือ/ไอแพด</span>
          </div>

          {/* QR Code Container */}
          <div className="p-3 bg-white rounded-2xl shadow-xl border-4 border-amber-500/60 flex flex-col items-center">
            <img
              src={qrImageUrl}
              alt="Scan to join on Mobile or iPad"
              className="w-48 h-48 rounded-lg"
              loading="lazy"
            />
            <span className="text-[10px] text-slate-900 font-bold uppercase mt-1 tracking-wider">
              SCAN WITH CAMERA / IPAD
            </span>
          </div>

          {/* Room Code Banner */}
          <div className="bg-slate-900 border border-amber-500/40 rounded-xl px-4 py-2 w-full">
            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">ROOM CODE</span>
            <span className="font-mono font-black text-2xl text-amber-400 tracking-widest">{roomCode}</span>
          </div>

          {/* Direct LAN Link */}
          <div className="w-full bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
            <span className="font-mono text-slate-300 text-[11px] truncate mr-2">{targetUrl}</span>
            <button
              onClick={handleCopyLink}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-[11px] transition border border-amber-500/30 flex items-center gap-1 flex-shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'COPIED' : 'COPY'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-900/80 border-t border-slate-800">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider transition shadow-md"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}
