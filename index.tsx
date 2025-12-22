
import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";

// --- TYPES ---
interface LogEntry {
  id: string;
  date: string;
  time: string;
  transcription: string;
  reminderDate?: string;
}

// --- COMPONENTS ---

// 1. Grabadora
const Recorder = ({ onComplete, isProcessing }: { onComplete: (b64: string, mime: string) => void, isProcessing: boolean }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType });
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          const b64 = (reader.result as string).split(',')[1];
          onComplete(b64, mr.mimeType);
        };
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      setIsRecording(true);
      setDuration(0);
      timerRef.current = window.setInterval(() => setDuration(d => d + 1), 1000);
    } catch (err) { alert("Acceso al micrófono denegado"); }
  };

  const stop = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  return (
    <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100 flex flex-col items-center">
      <h3 className="text-xl font-extrabold text-slate-800 mb-2">Dictado por Voz</h3>
      <p className="text-slate-400 text-xs mb-8 uppercase font-bold tracking-widest">Habla ahora</p>
      
      <button
        onClick={isRecording ? stop : start}
        disabled={isProcessing}
        className={`w-24 h-24 rounded-full flex items-center justify-center transition-all shadow-lg ${
          isRecording ? 'bg-rose-500 scale-110 animate-pulse' : 
          isProcessing ? 'bg-slate-200 cursor-wait' : 'bg-indigo-600 hover:scale-105 active:scale-95'
        }`}
      >
        {isProcessing ? (
          <i className="fas fa-circle-notch fa-spin text-white text-3xl"></i>
        ) : (
          <i className={`fas ${isRecording ? 'fa-stop' : 'fa-microphone'} text-white text-3xl`}></i>
        )}
      </button>

      <div className="mt-6 h-6 flex items-center">
        {isRecording && <span className="text-rose-600 font-black font-mono">{Math.floor(duration/60)}:{String(duration%60).padStart(2,'0')}</span>}
        {isProcessing && <span className="text-indigo-600 text-[10px] font-black uppercase tracking-widest animate-pulse">Procesando...</span>}
      </div>
    </div>
  );
};

// 2. Aplicación Principal
const App = () => {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [tempEntry, setTempEntry] = useState<any>(null);

  useEffect(() => {
    const saved = localStorage.getItem('vlog_standalone_v1');
    if (saved) setEntries(JSON.parse(saved));
    const loader = document.getElementById('app-loader');
    if (loader) loader.remove();
  }, []);

  useEffect(() => {
    localStorage.setItem('vlog_standalone_v1', JSON.stringify(entries));
  }, [entries]);

  const handleRecording = async (base64: string, mime: string) => {
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const res = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [{ inlineData: { mimeType: mime.split(';')[0], data: base64 } }, { text: "Transcribe este audio. Si hay una fecha futura, extráela. Responde en JSON con campos 'text' y 'date' (ISO)." }] },
        config: { 
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING },
              date: { type: Type.STRING }
            },
            required: ["text"]
          }
        }
      });
      const data = JSON.parse(res.text || '{}');
      setTempEntry({ text: data.text, date: data.date });
    } catch (e) { alert("Error con la IA. Prueba de nuevo."); }
    setLoading(false);
  };

  const saveEntry = () => {
    const now = new Date();
    const entry: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      date: now.toLocaleDateString('es-ES'),
      time: now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      transcription: tempEntry.text,
      reminderDate: tempEntry.date
    };
    setEntries([entry, ...entries]);
    setTempEntry(null);
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 p-4 pb-12 flex flex-col gap-6">
      <header className="py-4 px-2 flex justify-between items-center">
        <h1 className="text-xl font-black text-slate-800 tracking-tighter">VOICE<span className="text-indigo-600">LOG</span></h1>
        <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-[10px] font-black uppercase">{entries.length} notas</span>
      </header>

      <Recorder onComplete={handleRecording} isProcessing={loading} />

      <div className="space-y-4">
        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Historial Reciente</h2>
        {entries.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border-2 border-dashed border-slate-200 text-slate-300 text-[10px] font-bold uppercase">Sin registros</div>
        ) : (
          entries.map(e => (
            <div key={e.id} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{e.date} @ {e.time}</span>
                <button onClick={() => setEntries(prev => prev.filter(x => x.id !== e.id))} className="text-slate-300 hover:text-rose-500"><i className="fas fa-trash text-xs"></i></button>
              </div>
              <p className="text-sm font-semibold text-slate-700 leading-tight">{e.transcription}</p>
              {e.reminderDate && <div className="text-[9px] font-black text-amber-500 uppercase bg-amber-50 px-2 py-1 rounded-lg w-fit">Recordatorio: {new Date(e.reminderDate).toLocaleString('es-ES')}</div>}
            </div>
          ))
        )}
      </div>

      {tempEntry && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-6 space-y-6 animate-in slide-in-from-bottom duration-300">
            <h4 className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Revisar Transcripción</h4>
            <textarea 
              className="w-full bg-slate-50 p-4 rounded-2xl border-2 border-slate-100 text-sm font-medium text-slate-600 focus:border-indigo-500 outline-none h-32"
              value={tempEntry.text}
              onChange={(e) => setTempEntry({...tempEntry, text: e.target.value})}
            />
            <div className="flex gap-3">
              <button onClick={() => setTempEntry(null)} className="flex-1 py-4 text-slate-400 font-bold text-xs uppercase">Descartar</button>
              <button onClick={saveEntry} className="flex-[2] py-4 bg-indigo-600 text-white font-black text-xs rounded-2xl uppercase shadow-lg shadow-indigo-200">Guardar Nota</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- MOUNT ---
const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);
