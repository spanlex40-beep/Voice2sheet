
import React, { useState, useEffect } from 'react';
import { Recorder } from './components/Recorder';
import { HistoryTable } from './components/HistoryTable';
import { LogEntry, AIResponse } from './types';
import { transcribeAudio } from './services/geminiService';

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
    // Pedir permisos de notificación
    if ("Notification" in window) {
      if (Notification.permission !== "granted" && Notification.permission !== "denied") {
        Notification.requestPermission();
      }
    }
    
    // Cargar desde LocalStorage
    const saved = localStorage.getItem('v2s_entries');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setEntries(parsed);
      } catch (e) {
        console.error("Error al cargar datos locales", e);
      }
    }
  }, []);

  // Guardar en LocalStorage automáticamente
  useEffect(() => {
    localStorage.setItem('v2s_entries', JSON.stringify(entries));
  }, [entries]);

  // Chequeo de recordatorios cada 10 segundos
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      let updated = false;
      
      const newEntries = entries.map(entry => {
        if (entry.reminderDate && !entry.isNotified) {
          const target = new Date(entry.reminderDate);
          if (target <= now) {
            updated = true;
            triggerLocalNotification(entry);
            return { ...entry, isNotified: true, status: 'Synced' as const };
          }
        }
        return entry;
      });

      if (updated) setEntries(newEntries);
    }, 10000);

    return () => clearInterval(timer);
  }, [entries]);

  const triggerLocalNotification = (entry: LogEntry) => {
    if ("Notification" in window && Notification.permission === "granted") {
      // FIX: Removed 'vibrate' property as it is not part of standard NotificationOptions for the constructor
      new Notification("Recordatorio V2S", {
        body: entry.transcription,
        icon: "https://cdn-icons-png.flaticon.com/512/5968/5968517.png"
      });
    }
  };

  const handleRecordingComplete = async (base64Data: string, mimeType: string) => {
    setIsProcessing(true);
    try {
      const result: AIResponse = await transcribeAudio(base64Data, mimeType);
      setEditingEntry({
        text: result.text,
        date: result.detectedDate || '',
      });
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const finalizeSave = () => {
    if (!editingEntry) return;

    if (editingEntry.id) {
      setEntries(prev => prev.map(e => e.id === editingEntry.id ? {
        ...e,
        transcription: editingEntry.text,
        reminderDate: editingEntry.date,
        type: editingEntry.date ? 'reminder' : 'note',
        isNotified: false
      } : e));
    } else {
      const now = new Date();
      const newEntry: LogEntry = {
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
      setEntries(prev => [newEntry, ...prev]);
    }
    setEditingEntry(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans select-none pb-20">
      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200 px-6 py-4 sticky top-0 z-40 safe-top">
        <div className="max-w-xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-[10px]">V2S</div>
            <h1 className="text-sm font-black text-slate-800 uppercase tracking-widest">IA <span className="text-indigo-600">Privada</span></h1>
          </div>
          <button onClick={() => setShowSettings(true)} className="p-2 text-slate-400">
            <i className="fas fa-cog"></i>
          </button>
        </div>
      </header>

      {editingEntry && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md p-6 space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-black text-slate-800">Confirmar Nota Local</h2>
            </div>
            <div className="space-y-4">
              <textarea 
                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-700 h-32 outline-none focus:border-indigo-500 transition-all"
                value={editingEntry.text}
                onChange={(e) => setEditingEntry({...editingEntry, text: e.target.value})}
              />
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha de recordatorio</label>
                <input 
                  type="datetime-local"
                  className="w-full p-4 bg-indigo-50 border-2 border-indigo-100 rounded-2xl font-black text-indigo-700 outline-none"
                  value={editingEntry.date}
                  onChange={(e) => setEditingEntry({...editingEntry, date: e.target.value})}
                />
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setEditingEntry(null)} className="flex-1 py-4 text-slate-400 font-black uppercase text-[10px]">Cancelar</button>
              <button onClick={finalizeSave} className="flex-[2] py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-200 uppercase text-[10px]">Guardar en Teléfono</button>
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm p-8 space-y-6">
            <h2 className="font-black text-xl text-slate-800 text-center">Configuración</h2>
            <div className="bg-blue-50 p-4 rounded-xl text-[11px] text-blue-700 font-bold leading-relaxed">
              <i className="fas fa-shield-alt mr-2"></i>
              Tus datos se guardan exclusivamente en el almacenamiento local (LocalStorage) de este navegador.
            </div>
            <button onClick={() => { if(confirm('¿Borrar TODO permanentemente?')) { localStorage.clear(); window.location.reload(); } }} className="w-full py-4 text-rose-500 font-black rounded-xl uppercase tracking-widest text-[10px] border border-rose-100 hover:bg-rose-50">Borrar Base de Datos</button>
            <button onClick={() => setShowSettings(false)} className="w-full py-4 bg-slate-800 text-white font-black rounded-xl uppercase tracking-widest text-[10px]">Volver</button>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-lg w-full mx-auto px-6 py-10 space-y-12">
        <Recorder onRecordingComplete={handleRecordingComplete} isProcessing={isProcessing} />
        
        <div className="space-y-4">
          <h2 className="text-[10px] font-black text-slate-800 uppercase tracking-[0.3em] px-2">Pendientes</h2>
          <HistoryTable 
            entries={entries.filter(e => !e.reminderDate || !e.isNotified)} 
            variant="pending"
            onDeleteEntry={(id) => setEntries(prev => prev.filter(e => e.id !== id))} 
            onEditEntry={(entry) => setEditingEntry({ id: entry.id, text: entry.transcription, date: entry.reminderDate || '' })}
          />
        </div>

        <div className="space-y-4 opacity-70">
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] px-2">Historial Pasado</h2>
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
