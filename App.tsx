import React, { useState, useEffect } from 'react';
import { Recorder } from './components/Recorder';
import { HistoryTable } from './components/HistoryTable';
import { LogEntry } from './types';
import { transcribeAudio } from './services/geminiService';

// --- CONFIGURACIÓN FIJA DEFINITIVA ---
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbytmXCpeBF-LEYkpZtXC_NAYYB-JpSjZKK0wXRQY99G7PbYOayxwjfbuKB3tzz9RCW4/exec"; 

const App: React.FC = () => {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
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
      let errorMsg = "Error de transcripción";
      if (err.message === "API_KEY missing") {
        errorMsg = "Configura API_KEY en Vercel";
      }
      setEntries(prev => prev.map(e => e.id === entryId ? { ...e, transcription: errorMsg, status: 'Error' } : e));
    } finally {
      setIsProcessing(false);
    }
  };

  const sendToWebhook = async (entry: LogEntry, transcription: string, reminderDate?: string) => {
    try {
      await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
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
      setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, status: 'Error', reminderDate } : e));
    }
  };

  const handleDeleteEntry = (id: string) => {
    setEntries(prev => prev.filter(entry => entry.id !== id));
  };

  const handleReminderSubmit = async () => {
    if (!reminderModal.entryId) return;
    const entry = entries.find(e => e.id === reminderModal.entryId);
    if (entry) await sendToWebhook(entry, reminderModal.tempTranscription, selectedReminderDate);
    setReminderModal({ isOpen: false, entryId: null, tempTranscription: '' });
    setSelectedReminderDate('');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg">
              <i className="fas fa-microphone-lines text-xl"></i>
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 leading-tight">Voice2Sheet <span className="text-xs font-normal text-slate-400">AI</span></h1>
            </div>
          </div>
          
          <button onClick={() => setShowSettings(true)} className="p-2 bg-slate-100 rounded-xl text-slate-500 hover:text-indigo-600 transition-colors">
            <i className="fas fa-cog text-xl"></i>
          </button>
        </div>
      </header>

      {showSettings && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-bold text-lg">Ajustes</h2>
              <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-600"><i className="fas fa-times"></i></button>
            </div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Email de contacto</label>
            <input 
              type="email"
              placeholder="tu@email.com"
              className="w-full px-4 py-3 bg-slate-50 border rounded-xl mb-6 outline-none focus:ring-2 focus:ring-indigo-500"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                localStorage.setItem('v2s_email', e.target.value);
              }}
            />
            <button onClick={() => setShowSettings(false)} className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl">Cerrar</button>
          </div>
        </div>
      )}

      {reminderModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm p-8 text-center">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Programar Fecha</h3>
            <input 
              type="datetime-local"
              className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl mb-6 text-sm"
              value={selectedReminderDate}
              onChange={(e) => setSelectedReminderDate(e.target.value)}
            />
            <button 
              onClick={handleReminderSubmit}
              disabled={!selectedReminderDate}
              className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl disabled:opacity-30 transition-all"
            >
              Guardar en Sheets
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5">
            <Recorder onRecordingComplete={handleRecordingComplete} isProcessing={isProcessing} />
          </div>
          <div className="lg:col-span-7">
            <HistoryTable entries={entries} onDeleteEntry={handleDeleteEntry} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
