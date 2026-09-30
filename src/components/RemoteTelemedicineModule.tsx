import React, { useState } from 'react';
import { Video, PhoneOff, Mic, MicOff, Camera, Radio, ShieldCheck, Activity, Send, CheckCircle2 } from 'lucide-react';
import { Patient, NetworkCondition } from '../types';

export interface RemoteTelemedicineModuleProps {
  networkCondition: NetworkCondition;
  activePatient?: Patient;
  vitals: {
    temperature: number;
    respiratoryRate: number;
    oxygenSaturation: number;
    heartRate: number;
  };
  onClose?: () => void;
}

export const RemoteTelemedicineModule: React.FC<RemoteTelemedicineModuleProps> = ({
  networkCondition,
  activePatient,
  vitals,
  onClose,
}) => {
  const [isLive, setIsLive] = useState(false);
  const [audioMuted, setAudioMuted] = useState(false);
  const [messages, setMessages] = useState<Array<{ sender: string; text: string; time: string }>>([
    {
      sender: 'Dr. Kenneth (Lodwar Hospital)',
      text: 'Dr. Kenneth connected to field link. Reviewing vitals and auscultation telemetry.',
      time: '10:04 AM',
    },
  ]);
  const [inputMsg, setInputMsg] = useState('');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages((prev) => [
      ...prev,
      { sender: 'CHW Field Worker', text: inputMsg.trim(), time: now },
    ]);
    setInputMsg('');
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
            <Video className="h-4 w-4" />
          </div>
          <div>
            <h4 className="font-semibold text-white">Emergency Telemedicine Uplink</h4>
            <p className="text-[11px] text-slate-400">
              Low-Bandwidth WebRTC / Burst Packet Radio Link to District Referral Hospital
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
            {networkCondition}
          </span>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Patient & Vitals Summary Strip */}
      <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between font-mono text-[11px]">
        <div>
          <span className="text-slate-400">Patient: </span>
          <strong className="text-white">
            {activePatient ? `${activePatient.first_name} ${activePatient.last_name}` : 'Unknown Patient'}
          </strong>
        </div>
        <div className="flex items-center gap-3">
          <span>Temp: <strong className="text-rose-400">{vitals.temperature}°C</strong></span>
          <span>RR: <strong className="text-amber-400">{vitals.respiratoryRate}/m</strong></span>
          <span>SpO2: <strong className="text-cyan-400">{vitals.oxygenSaturation}%</strong></span>
        </div>
      </div>

      {/* Simulated Video & Frame Stream */}
      <div className="relative aspect-video bg-slate-950 rounded-lg border border-slate-800 overflow-hidden flex items-center justify-center">
        {isLive ? (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-b from-slate-900 to-black text-center space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
              <span>LIVE ENCRYPTED UPLINK (14.2 kbps AV1-Field)</span>
            </div>
            <p className="text-slate-400 text-[11px] max-w-xs">
              Transmitting real-time vitals and burst keyframes to Dr. Kenneth Odhiambo at Lodwar Sub-County Hospital.
            </p>
          </div>
        ) : (
          <div className="text-center space-y-2">
            <Camera className="h-8 w-8 text-slate-600 mx-auto" />
            <p className="text-slate-500 text-[11px]">Camera feed standby</p>
          </div>
        )}

        <div className="absolute bottom-2 left-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsLive(!isLive)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow ${
              isLive ? 'bg-rose-600 hover:bg-rose-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            {isLive ? <PhoneOff className="h-3.5 w-3.5" /> : <Video className="h-3.5 w-3.5" />}
            <span>{isLive ? 'Terminate Uplink' : 'Connect Physician Link'}</span>
          </button>
          {isLive && (
            <button
              type="button"
              onClick={() => setAudioMuted(!audioMuted)}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg"
            >
              {audioMuted ? <MicOff className="h-3.5 w-3.5 text-rose-400" /> : <Mic className="h-3.5 w-3.5 text-emerald-400" />}
            </button>
          )}
        </div>
      </div>

      {/* Physician Directives and Chat Feed */}
      <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
        <h5 className="font-semibold text-slate-300 text-[11px] flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-blue-400" />
          <span>Secondary Triage Clinical Guidance</span>
        </h5>

        <div className="max-h-28 overflow-y-auto space-y-2 pr-1">
          {messages.map((m, i) => (
            <div key={i} className="text-[11px] leading-relaxed">
              <span className="font-bold text-cyan-300 font-mono mr-1.5">{m.sender}:</span>
              <span className="text-slate-300">{m.text}</span>
              <span className="text-[9px] text-slate-500 ml-2">({m.time})</span>
            </div>
          ))}
        </div>

        <form onSubmit={handleSend} className="flex gap-2 pt-2 border-t border-slate-800">
          <input
            type="text"
            value={inputMsg}
            onChange={(e) => setInputMsg(e.target.value)}
            placeholder="Type clinical question or request medication order..."
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
          <button
            type="submit"
            className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg flex items-center gap-1"
          >
            <Send className="h-3 w-3" />
            <span>Send</span>
          </button>
        </form>
      </div>
    </div>
  );
};
