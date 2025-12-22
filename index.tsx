
import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";

// --- CONFIGURACIÓN ---
const API_KEY = process.env.API_KEY || "";

// --- APP PRINCIPAL ---
const App = () => {
  const [entries, setEntries] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [tempNote, setTempNote] = useState<any>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  // Cargar datos
  useEffect(() => {
    const saved = localStorage.getItem('vlog_v3_data');
    if (saved) setEntries(JSON.parse(saved));
    
    const loader = document.getElementById('app-loader');
    if (loader) {
      setTimeout(() => {
        loader.style.opacity = '0';
        setTimeout(() => loader.remove(), 500);
      }, 500);
    }
  }, []);

  // Guardar datos
  useEffect(() => {
    localStorage.setItem('vlog_v3_data', JSON.stringify(entries));
  }, [entries]);

  // --- LÓGICA DE GRABACIÓN ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      audioChunksRef.current = [];
      
      mr.ondataavailable = (e) => e.data.size > 0 && audioChunksRef.current.push(e.data);
      mr.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: mr.mimeType });
        processAudio(blob, mr.mimeType);
        stream.getTracks().forEach(t => t.stop());
      };

      mr.start();
      setIsRecording(true);
      setDuration(0);
      timerRef.current = window.setInterval(() => setDuration(d => d + 1), 1000);
    } catch (err) {
      alert("Microfono bloqueado. Revisa los ajustes de tu navegador.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  // --- LÓGICA DE IA ---
  const processAudio = async (blob: Blob, mimeType: string) => {
    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const ai = new GoogleGenAI({ apiKey: API_KEY });
        
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: {
            parts: [
              { inlineData: { mimeType: mimeType.split(';')[0], data: base64 } },
              { text: "Transcribe este audio. Si hay una fecha futura, extráela. Responde SOLO en JSON: { \"text\": \"...\", \"date\": \"ISO_DATE\" }" }
            ]
          },
          config: { 
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING },
                date: { type: Type.STRING, nullable: true }
              },
              required: ["text"]
            }
          }
        });

        const data = JSON.parse(response.text || "{}");
        setTempNote(data);
      };
    } catch (err) {
      alert("Error en la IA. Asegúrate de que el audio sea claro.");
    } finally {
      setIsProcessing(false);
    }
  };

  const finalizeSave = () => {
    const now = new Date();
    const newEntry = {
      id: Date.now().toString(),
      date: now.toLocaleDateString('es-ES'),
      time: now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      text: tempNote.text,
      reminder: tempNote.date
    };
    setEntries([newEntry, ...entries]);
    setTempNote(null);
  };

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col p-4 gap-6">
      <header className="py-6 flex justify-between items-center">
        <h1 className="text-2xl font-black tracking-tighter text-slate-800">VOICE<span className="text-indigo-600">LOG</span></h1>
        <div className="bg-indigo-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase">{entries.length} Notas</div>
      </header>

      {/* Grabadora UI */}
      <div className="bg-white rounded-[3rem] p-8 shadow-xl border border-slate-100 flex flex-col items-center">
        <div className="text-center mb-8">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Estado</p>
          <p className="text-slate-800 font-bold">
            {isRecording ? "Grabando Audio..." : isProcessing ? "IA Analizando..." : "Listo para grabar"}
          </p>
        </div>

        <button 
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isProcessing}
          className={`w-28 h-28 rounded-full flex items-center justify-center transition-all shadow-2xl ${
            isRecording ? 'bg-rose-500 animate-pulse scale-110' : 
            isProcessing ? 'bg-slate-200 cursor-not-allowed' : 'bg-indigo-600 active:scale-90 hover:scale-105'
          }`}
        >
          {isProcessing ? (
            <i className="fas fa-circle-notch fa-spin text-white text-4xl"></i>
          ) : (
            <i className={`fas ${isRecording ? 'fa-stop' : 'fa-microphone'} text-white text-4xl`}></i>
          )}
        </button>

        <div className="mt-8 text-xl font-mono font-black text-slate-800">
          {isRecording && `${Math.floor(duration/60)}:${String(duration%60).padStart(2,'0')}`}
        </div>
      </div>

      {/* Historial */}
      <div className="flex-1 space-y-4">
        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Notas Guardadas</h2>
        {entries.length === 0 ? (
          <div className="text-center py-10 text-slate-300 text-[10px] font-black uppercase border-2 border-dashed border-slate-200 rounded-3xl">Sin registros aún</div>
        ) : (
          entries.map(e => (
            <div key={e.id} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[9px] font-black text-slate-400 uppercase">{e.date} | {e.time}</span>
                <button onClick={() => setEntries(prev => prev.filter(x => x.id !== e.id))} className="text-slate-300 hover:text-rose-500"><i className="fas fa-trash text-xs"></i></button>
              </div>
              <p className="text-sm font-semibold text-slate-700 leading-snug">{e.text}</p>
              {e.reminder && (
                <div className="mt-3 bg-amber-50 text-amber-600 text-[9px] font-black px-2 py-1 rounded-lg w-fit uppercase">
                  <i className="fas fa-clock mr-1"></i> {new Date(e.reminder).toLocaleString('es-ES')}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal de Confirmación */}
      {tempNote && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[100] flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-6 space-y-6 animate-in slide-in-from-bottom duration-300">
            <h3 className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Confirmar Transcripción</h3>
            <textarea 
              className="w-full h-32 bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold text-slate-600 outline-none focus:border-indigo-500"
              value={tempNote.text}
              onChange={(e) => setTempNote({...tempNote, text: e.target.value})}
            />
            <div className="flex gap-3">
              <button onClick={() => setTempNote(null)} className="flex-1 py-4 text-slate-400 font-bold uppercase text-[10px]">Cerrar</button>
              <button onClick={finalizeSave} className="flex-[2] py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-lg uppercase text-[10px]">Guardar Nota</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);
