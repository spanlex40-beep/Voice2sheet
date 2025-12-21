
import React, { useState, useEffect } from 'react';
import { Recorder } from './components/Recorder';
import { HistoryTable } from './components/HistoryTable';
import { LogEntry, AIResponse } from './types';
import { transcribeAudio } from './services/geminiService';

// Reemplaza esto con tu URL de Google Apps Script
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbytmXCpeBF-LEYkpZtXC_NAYYB-JpSjZKK0wXRQY99G7PbYOayxwjfbuKB3tzz9RCW4/exec"; 

const App: React.FC = () => {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  const [editingEntry, setEditingEntry] = useState<{
    id?: string;
    text: string;
    date: string;
  } | null>(null);

  useEffect(() => {
    if ("Notification" in window) {
      Notification.requestPermission();
    }
    const saved = localStorage.getItem('v2s_entries');
    if (saved) setEntries(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('v2s_entries', JSON.stringify(entries));
  }, [entries]);

  useEffect(() => {
    const interval = setInterval(checkReminders, 20000);
    return () => clearInterval(interval);
  }, [entries]);

  const checkReminders = () => {
    const now = new Date();
    let changed = false;
    const updated = entries.map(entry => {
      if (entry.reminderDate && !entry.isNotified) {
        if (new Date(entry.reminderDate) <= now) {
          showNativeNotification(entry);
          changed = true;
          return { ...entry, isNotified: true };
        }
      }
      return entry;
    });
    if (changed) setEntries(updated);
  };

  const showNativeNotification = (entry: LogEntry) => {
    if (Notification.permission === "granted") {
      new Notification("🔔 Tarea Pendiente", { body: entry.transcription });
    }
  };

  const syncWithGoogleSheets = async (entry: LogEntry) => {
    if (GOOGLE_SCRIPT_URL.includes("macros/s/")) {
      try {
        await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry),
        });
      } catch (err) {
        console.error('Sheet Sync Error:', err);
      }
    }
  };

  const handleRecordingComplete = async (base64Data: string, mimeType: string) => {
    setIsProcessing(true);
    try {
      const aiResult: AIResponse = await transcribeAudio(base64Data, mimeType);
      setEditingEntry({
        text: aiResult.text,
        date: aiResult.detectedDate || '',
      });
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const saveEntry = async () => {
    if (!editingEntry) return;

    let finalEntry: LogEntry;

    if (editingEntry.id) {
      const existing = entries.find(e => e.id === editingEntry.id);
      if (!existing) return;
      finalEntry = {
        ...existing,
        transcription: editingEntry.text,
        reminderDate: editingEntry.date,
        type: editingEntry.date ? 'reminder' : 'note',
        isNotified: false
      };
      setEntries(prev => prev.map(e => e.id === editingEntry.id ? finalEntry : e));
    } else {
      const now = new Date();
      finalEntry = {
        id: Math.random().toString(36).substring(2, 11),
        date: now.toLocaleDateString(),
        time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        transcription: editingEntry.text,
        duration: "0s",
        status: 'Synced',
        type: editingEntry.date ? 'reminder' : 'note',
        reminderDate: editingEntry.date,
        isNotified: false
      };
      setEntries(prev => [finalEntry, ...prev]);
    }
    
    syncWithGoogleSheets(finalEntry);
    setEditingEntry(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans select-none pb-20">
      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200 px-6 py-4 sticky top-0 z-40 safe-top">
        <div className="max-w-xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-[10px]">V2S</div>
            <h1 className="text-sm font-black text-slate-800 uppercase tracking-widest">Smart <span className="text-indigo-600">Tasks</span></h1>
          </div>
          <button onClick={() => setShowSettings(true)} className="p-2 text-slate-400">
            <i className="fas fa-cog"></i>
          </button>
        </div>
      </header>

      {editingEntry && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-md p-8 space-y-8 animate-in zoom-in duration-300">
            <div className="text-center">
              <h2 className="text-2xl font-black text-slate-800">{editingEntry.id ? 'Editar' : 'Confirmar'}</h2>
              <p className="text-xs text-slate-400 mt-1 font-bold">Revisa lo que la IA ha entendido</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nota</label>
                <textarea 
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-700 h-32 outline-none focus:border-indigo-500 transition-all"
                  value={editingEntry.text}
                  onChange={(e) => setEditingEntry({...editingEntry, text: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Recordatorio</label>
                <input 
                  type="datetime-local"
                  className="w-full p-4 bg-indigo-50 border-2 border-indigo-100 rounded-2xl font-black text-indigo-700 outline-none"
                  value={editingEntry.date}
                  onChange={(e) => setEditingEntry({...editingEntry, date: e.target.value})}
                />
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setEditingEntry(null)} className="flex-1 py-4 bg-slate-100 text-slate-500 font-black rounded-2xl uppercase tracking-widest text-[10px]">Cancelar</button>
              <button onClick={saveEntry} className="flex-[2] py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-200 uppercase tracking-widest text-[10px]">Guardar y Enviar</button>
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm p-8 space-y-6">
            <h2 className="font-black text-xl text-slate-800">Ajustes</h2>
            <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
              <h3 className="text-[10px] font-black text-slate-400 uppercase">Estado Google Sheets</h3>
              <p className="text-xs font-bold text-emerald-600 truncate">{GOOGLE_SCRIPT_URL}</p>
            </div>
            <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="w-full py-4 bg-rose-50 text-rose-600 font-black rounded-xl uppercase tracking-widest text-[10px] border border-rose-100">Resetear App</button>
            <button onClick={() => setShowSettings(false)} className="w-full py-4 bg-slate-800 text-white font-black rounded-xl uppercase tracking-widest text-[10px]">Cerrar</button>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-lg w-full mx-auto px-6 py-10 space-y-12">
        <Recorder onRecordingComplete={handleRecordingComplete} isProcessing={isProcessing} />
        
        <div className="space-y-4">
          <div className="flex justify-between items-center px-2">
            <h2 className="text-[10px] font-black text-slate-800 uppercase tracking-[0.3em]">Próximos Avisos</h2>
            <button onClick={() => setEntries(prev => prev.filter(e => !e.reminderDate || !e.isNotified))} className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Borrar todo</button>
          </div>
          <HistoryTable 
            entries={entries.filter(e => !e.reminderDate || !e.isNotified)} 
            variant="pending"
            onDeleteEntry={(id) => setEntries(prev => prev.filter(e => e.id !== id))} 
            onEditEntry={(entry) => setEditingEntry({ id: entry.id, text: entry.transcription, date: entry.reminderDate || '' })}
          />
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center px-2">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Historial / Sheets</h2>
            <button onClick={() => setEntries(prev => prev.filter(e => e.reminderDate && !e.isNotified))} className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Limpiar</button>
          </div>
          <HistoryTable 
            entries={entries.filter(e => e.reminderDate && e.isNotified)} 
            variant="notified"
            onDeleteEntry={(id) => setEntries(prev => prev.filter(e => e.id !== id))} 
          />
        </div>
      </main>
    </div>
  );
};

export default App;
