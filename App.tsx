

import React, { useState, useEffect } from 'react';
import { Recorder } from './components/Recorder';
import { HistoryTable } from './components/HistoryTable';
import { LogEntry } from './types';
import { transcribeAudio } from './services/geminiService';

// --- CONFIGURACIÓN FIJA DEFINITIVA ---
// Asegúrate de que esta URL sea la de tu "Nueva implementación" en Apps Script
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
      setEntries(prev => prev.map(e => e.id === entryId ? { ...e, transcription: "Error de IA", status: 'Error' } : e));
    } finally {
      setIsProcessing(false);
    }
  };

  const sendToWebhook = async (entry: LogEntry, transcription: string, reminderDate?: string) => {
    const currentEmail = localStorage.getItem('v2s_email') || '';
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
          targetEmail: currentEmail
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
            <h1 className="text-lg font-bold text-slate-800">Voice2Sheet</h1>
          </div>
          
          <button 
            onClick={() => setShowSettings(true)} 
            className={`p-2 rounded-xl transition-all ${email ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}
          >
            <i className={`fas ${email ? 'fa-check-circle' : 'fa-cog'} text-xl`}></i>
          </button>
        </div>
      </header>

      {showSettings && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden p-8 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="font-bold text-xl text-slate-800">Configuración</h2>
                <p className="text-xs text-slate-400 uppercase font-bold tracking-widest mt-1">Notificaciones por Email</p>
              </div>
              <button onClick={() => setShowSettings(false)} className="text-slate-300 hover:text-slate-600 p-2"><i className="fas fa-times text-xl"></i></button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 mb-6">
                <p className="text-[11px] text-indigo-700 leading-relaxed font-medium">
                  Introduce el correo donde quieres recibir los avisos y las transcripciones. Google Sheets enviará un email automáticamente cada vez que grabes algo.
                </p>
              </div>
              
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 ml-1">Tu dirección de correo</label>
                <div className="relative">
                  <i className="fas fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                  <input 
                    type="email"
                    placeholder="ejemplo@gmail.com"
                    className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                    value={email}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEmail(val);
                      localStorage.setItem('v2s_email', val);
                    }}
                  />
                </div>
              </div>

              <button 
                onClick={() => setShowSettings(false)} 
                className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-200 active:scale-95 transition-all mt-4"
              >
                Guardar y Activar
              </button>
            </div>
          </div>
        </div>
      )}

      {reminderModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm p-8 text-center animate-in zoom-in duration-300">
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <i className="fas fa-calendar-alt text-2xl"></i>
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Programar Recordatorio</h3>
            <p className="text-xs text-slate-400 mb-6 px-4 leading-relaxed">Se guardará en el Excel y se enviará un aviso al email configurado.</p>
            <input 
              type="datetime-local"
              className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl mb-6 text-sm outline-none focus:ring-2 focus:ring-amber-500"
              value={selectedReminderDate}
              onChange={(e) => setSelectedReminderDate(e.target.value)}
            />
            <button 
              onClick={handleReminderSubmit}
              disabled={!selectedReminderDate}
              className="w-full py-5 bg-slate-900 text-white font-bold rounded-2xl disabled:opacity-30 shadow-xl active:scale-95 transition-all"
            >
              Confirmar Envío
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5">
            <Recorder onRecordingComplete={handleRecordingComplete} isProcessing={isProcessing} />
            {!email && (
              <div 
                onClick={() => setShowSettings(true)}
                className="mt-6 bg-amber-50 border border-amber-200 p-4 rounded-2xl cursor-pointer hover:bg-amber-100 transition-colors flex items-center gap-3 animate-pulse"
              >
                <div className="w-10 h-10 bg-amber-200 text-amber-700 rounded-full flex items-center justify-center shrink-0">
                  <i className="fas fa-envelope"></i>
                </div>
                <p className="text-[11px] text-amber-800 font-bold leading-tight uppercase">
                  Configura tu email para recibir los avisos automáticos
                </p>
              </div>
            )}
          </div>
          <div className="lg:col-span-7">
            <HistoryTable entries={entries} onDeleteEntry={handleDeleteEntry} />
          </div>
        </div>
      </main>
      
      <footer className="p-8 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-slate-200 shadow-sm">
          <div className={`w-2 h-2 rounded-full ${email ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            {email ? `Conectado a: ${email}` : 'Sin email configurado'}
          </span>
        </div>
      </footer>
    </div>
  );
};

export default App;
