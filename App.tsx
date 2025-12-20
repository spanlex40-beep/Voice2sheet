

import React, { useState, useEffect } from 'react';
import { Recorder } from './components/Recorder';
import { HistoryTable } from './components/HistoryTable';
import { LogEntry } from './types';
import { transcribeAudio } from './services/geminiService';

// --- CONFIGURACIÓN URL GOOGLE SCRIPT ---
// SUSTITUYE ESTA URL SI AL RE-IMPLEMENTAR GOOGLE TE DA UNA NUEVA
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
    
    setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, status: 'Syncing' } : e));

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
      
      setEntries(prev => prev.map(e => e.id === entry.id ? { 
        ...e, 
        status: 'Synced', 
        reminderDate,
        transcription: transcription // Aseguramos que se guarde la final
      } : e));
    } catch (e) {
      console.error("Webhook error:", e);
      setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, status: 'Error' } : e));
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

  const saveEmail = (val: string) => {
    setEmail(val);
    localStorage.setItem('v2s_email', val);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-indigo-600 to-violet-700 w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg rotate-3">
              <i className="fas fa-microphone-lines text-xl"></i>
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-800 tracking-tight">Voice2Sheet</h1>
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${email ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                  {email ? 'Email Activo' : 'Falta Configurar'}
                </span>
              </div>
            </div>
          </div>
          
          <button 
            onClick={() => setShowSettings(true)} 
            className={`p-2.5 rounded-2xl transition-all border-2 ${email ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-white border-slate-100 text-slate-400 hover:border-indigo-200'}`}
          >
            <i className={`fas ${email ? 'fa-user-check' : 'fa-cog'} text-lg`}></i>
          </button>
        </div>
      </header>

      {showSettings && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md p-8 animate-in fade-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="font-black text-2xl text-slate-800 tracking-tight">Ajustes</h2>
                <p className="text-[10px] text-indigo-600 uppercase font-black tracking-widest mt-1">Notificaciones Push-Mail</p>
              </div>
              <button onClick={() => setShowSettings(false)} className="bg-slate-100 text-slate-400 hover:text-rose-500 p-3 rounded-2xl transition-colors">
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-5 rounded-[1.5rem] border border-indigo-100">
                <div className="flex gap-3">
                  <i className="fas fa-info-circle text-indigo-500 mt-1"></i>
                  <p className="text-xs text-indigo-900 leading-relaxed font-semibold">
                    ¿No recibes los correos? Revisa tu carpeta de <b>SPAM</b> o asegúrate de haber dado permisos en el Apps Script de Google.
                  </p>
                </div>
              </div>
              
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email Destinatario</label>
                <div className="relative group">
                  <i className="fas fa-at absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors"></i>
                  <input 
                    type="email"
                    placeholder="tu@correo.com"
                    className="w-full pl-11 pr-5 py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-indigo-500 focus:bg-white transition-all font-bold text-slate-700"
                    value={email}
                    onChange={(e) => saveEmail(e.target.value)}
                  />
                </div>
              </div>

              <button 
                onClick={() => setShowSettings(false)} 
                className="w-full py-5 bg-slate-900 text-white font-black rounded-2xl shadow-xl shadow-slate-200 active:scale-95 transition-all text-sm uppercase tracking-widest"
              >
                Guardar Configuración
              </button>
            </div>
          </div>
        </div>
      )}

      {reminderModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-sm p-10 text-center animate-in slide-in-from-bottom duration-500">
            <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-[2rem] flex items-center justify-center mx-auto mb-8 border-4 border-amber-100 shadow-inner">
              <i className="fas fa-bell text-3xl"></i>
            </div>
            <h3 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">Programar Aviso</h3>
            <p className="text-xs text-slate-400 mb-8 px-4 font-medium italic leading-relaxed">"{reminderModal.tempTranscription}"</p>
            
            <input 
              type="datetime-local"
              className="w-full px-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl mb-8 text-sm outline-none focus:border-amber-500 font-bold text-slate-700"
              value={selectedReminderDate}
              onChange={(e) => setSelectedReminderDate(e.target.value)}
            />
            
            <button 
              onClick={handleReminderSubmit}
              disabled={!selectedReminderDate}
              className="w-full py-5 bg-amber-500 text-white font-black rounded-2xl disabled:opacity-30 shadow-xl shadow-amber-100 active:scale-95 transition-all uppercase tracking-widest text-xs"
            >
              Agendar en Google
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-5 space-y-8">
            <Recorder onRecordingComplete={handleRecordingComplete} isProcessing={isProcessing} />
            
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 relative overflow-hidden group hover:shadow-md transition-shadow">
              <div className="relative z-10">
                <h4 className="font-black text-slate-800 text-sm uppercase tracking-widest mb-4">¿Cómo funciona?</h4>
                <ul className="space-y-4">
                  {[
                    {icon: 'fa-wand-sparkles', text: 'La IA transcribe tu voz al instante', color: 'text-indigo-500'},
                    {icon: 'fa-table', text: 'Se añade una fila en tu Excel de Google', color: 'text-emerald-500'},
                    {icon: 'fa-paper-plane', text: 'Recibes un correo con la nota', color: 'text-blue-500'}
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-lg ${item.color.replace('text', 'bg')}/10 ${item.color} flex items-center justify-center shrink-0`}>
                        <i className={`fas ${item.icon} text-xs`}></i>
                      </div>
                      <span className="text-xs font-bold text-slate-600">{item.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <i className="fas fa-bolt-lightning absolute -bottom-6 -right-6 text-9xl text-slate-50/50 group-hover:scale-110 transition-transform"></i>
            </div>
          </div>
            
          <div className="lg:col-span-7">
            <HistoryTable entries={entries} onDeleteEntry={handleDeleteEntry} />
          </div>
        </div>
      </main>
      
      <footer className="p-10 text-center">
        <div className="inline-flex items-center gap-3 px-6 py-3 bg-white rounded-full border border-slate-200 shadow-sm">
          <div className={`w-2 h-2 rounded-full ${email ? 'bg-emerald-500' : 'bg-rose-400 animate-pulse'}`}></div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            {email ? `Destino: ${email}` : 'Sin email de destino'}
          </span>
        </div>
      </footer>
    </div>
  );
};

export default App;
