import React, { useState, useEffect } from 'react';
import { Recorder } from './components/Recorder';
import { HistoryTable } from './components/HistoryTable';
import { LogEntry } from './types';
import { transcribeAudio } from './services/geminiService';

// --- CONFIGURACIÓN FIJA DEFINITIVA ---
// Esta es la URL de tu Google Script (la "puerta" a tu Excel)
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbytmXCpeBF-LEYkpZtXC_NAYYB-JpSjZKK0wXRQY99G7PbYOayxwjfbuKB3tzz9RCW4/exec"; 

const App: React.FC = () => {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);
  const [email, setEmail] = useState(localStorage.getItem('v2s_email') || '');
  const [showSettings, setShowSettings] = useState(false);
  
  const [reminderModal, setReminderModal] = useState<{
    isOpen: boolean;
    entryId: string | null;
    tempTranscription: string;
  }>({ isOpen: false, entryId: null, tempTranscription: '' });
  
  const [selectedReminderDate, setSelectedReminderDate] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('v2s_entries');
    if (saved) setEntries(JSON.parse(saved));
    
    // Verificamos si la API_KEY de Gemini está configurada en Vercel
    if (!process.env.API_KEY) {
      setApiKeyMissing(true);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('v2s_entries', JSON.stringify(entries));
  }, [entries]);

  const handleRecordingComplete = async (base64Data: string, mimeType: string, durationSeconds: number, type: 'note' | 'reminder') => {
    setIsProcessing(true);
    const now = new Date();
    const entryId = Math.random().toString(36).substring(2, 11);
    
    const newEntry: LogEntry = {
      id: entryId,
      date: now.toLocaleDateString(),
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      transcription: 'Transcribiendo...',
      duration: `${durationSeconds}s`,
      status: 'Syncing',
      type: type
    };

    setEntries(prev => [newEntry, ...prev]);

    try {
      const text = await transcribeAudio(base64Data, mimeType);
      setEntries(prev => prev.map(e => e.id === entryId ? { ...e, transcription: text } : e));

      if (type === 'reminder') {
        setReminderModal({ isOpen: true, entryId, tempTranscription: text });
      } else {
        await sendToWebhook(newEntry, text);
      }
    } catch (err: any) {
      console.error("App Error:", err);
      let errorMsg = "[Error de IA]";
      if (err.message === "API_KEY missing") {
        errorMsg = "[Falta API KEY en Vercel]";
        setApiKeyMissing(true);
      }
      setEntries(prev => prev.map(e => e.id === entryId ? { ...e, transcription: errorMsg, status: 'Error' } : e));
    } finally {
      setIsProcessing(false);
    }
  };

  const sendToWebhook = async (entry: LogEntry, transcription: string, reminderDate?: string) => {
    try {
      // Enviamos los datos directamente a Google Sheets
      await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify({
          date: entry.date,
          time: entry.time,
          transcription: transcription,
          type: entry.type,
          reminderDate: reminderDate || '',
          targetEmail: email
        })
      });
      setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, status: 'Synced', reminderDate } : e));
    } catch (e) {
      console.error("Webhook Error:", e);
      setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, status: 'Error', reminderDate } : e));
    }
  };

  const handleReminderSubmit = async () => {
    if (!reminderModal.entryId) return;
    const entry = entries.find(e => e.id === reminderModal.entryId);
    if (entry) await sendToWebhook(entry, reminderModal.tempTranscription, selectedReminderDate);
    setReminderModal({ isOpen: false, entryId: null, tempTranscription: '' });
    setSelectedReminderDate('');
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('v2s_email', email);
    setShowSettings(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {apiKeyMissing && (
        <div className="bg-amber-500 text-white px-4 py-2 text-center text-xs font-bold animate-pulse">
          ⚠️ CONFIGURACIÓN PENDIENTE: Añade la API_KEY en Vercel para activar la IA.
        </div>
      )}
      
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg">
              <i className="fas fa-microphone-lines text-xl"></i>
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 leading-tight">Voice2Sheet <span className="text-xs font-normal text-slate-400">AI</span></h1>
              <span className={`text-[10px] ${apiKeyMissing ? 'text-amber-500' : 'text-green-600'} font-bold uppercase tracking-wider flex items-center gap-1`}>
                <span className={`w-1.5 h-1.5 ${apiKeyMissing ? 'bg-amber-500' : 'bg-green-500'} rounded-full`}></span>
                {apiKeyMissing ? 'Sin Conexión IA' : 'Sistema Listo'}
              </span>
            </div>
          </div>
          
          <button onClick={() => setShowSettings(true)} className="p-2 bg-slate-100 rounded-xl text-slate-500 hover:text-indigo-600">
            <i className="fas fa-envelope text-xl"></i>
          </button>
        </div>
      </header>

      {showSettings && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-8 py-6 border-b flex justify-between items-center">
              <h2 className="font-bold text-slate-800">Ajustes de Notificación</h2>
              <button onClick={() => setShowSettings(false)} className="text-slate-400"><i className="fas fa-times"></i></button>
            </div>
            <form onSubmit={handleSaveSettings} className="p-8 space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Tu Email (opcional)</label>
                <input 
                  type="email"
                  placeholder="ejemplo@gmail.com"
                  className="w-full px-5 py-4 bg-slate-50 border rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <button type="submit" className="w-full py-5 bg-indigo-600 text-white font-bold rounded-2xl shadow-xl hover:bg-indigo-700 transition-all">
                Guardar Email
              </button>
            </form>
          </div>
        </div>
      )}

      {reminderModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden p-8 text-center">
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <i className="fas fa-bell text-2xl"></i>
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">¿Cuándo te aviso?</h3>
            <p className="text-xs text-slate-400 mb-6 italic">"{reminderModal.tempTranscription}"</p>
            <input 
              type="datetime-local"
              className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl mb-4"
              value={selectedReminderDate}
              onChange={(e) => setSelectedReminderDate(e.target.value)}
            />
            <button 
              onClick={handleReminderSubmit}
              disabled={!selectedReminderDate}
              className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl disabled:opacity-30"
            >
              Programar
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 flex flex-col gap-6">
            <Recorder onRecordingComplete={handleRecordingComplete} isProcessing={isProcessing} />
            <div className="bg-indigo-600 text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="text-lg font-bold mb-2">LISTO PARA USAR</h3>
                <p className="text-sm text-indigo-100 leading-relaxed opacity-90">
                  La app enviará tus notas directamente al Google Sheet vinculado. Solo graba y olvídate.
                </p>
              </div>
              <i className="fas fa-check-double absolute -bottom-4 -right-4 text-8xl text-white/10"></i>
            </div>
          </div>
          <div className="lg:col-span-7">
            <HistoryTable entries={entries} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
