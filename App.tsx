
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

  // Cargar datos al iniciar
  useEffect(() => {
    if ("Notification" in window) {
      Notification.requestPermission();
    }
    const saved = localStorage.getItem('v2s_entries');
    if (saved) {
      try {
        setEntries(JSON.parse(saved));
      } catch (e) {
        console.error("Error cargando caché local", e);
      }
    }
  }, []);

  // Guardar datos localmente cada vez que cambien
  useEffect(() => {
    localStorage.setItem('v2s_entries', JSON.stringify(entries));
  }, [entries]);

  // Verificar recordatorios cada 15 segundos
  useEffect(() => {
    const interval = setInterval(checkReminders, 15000);
    return () => clearInterval(interval);
  }, [entries]);

  const checkReminders = () => {
    const now = new Date();
    let hasChanges = false;
    const updated = entries.map(entry => {
      if (entry.reminderDate && !entry.isNotified) {
        const remDate = new Date(entry.reminderDate);
        if (remDate <= now) {
          showNativeNotification(entry);
          hasChanges = true;
          return { ...entry, isNotified: true, status: 'Synced' as const };
        }
      }
      return entry;
    });
    if (hasChanges) setEntries(updated);
  };

  const showNativeNotification = (entry: LogEntry) => {
    if (Notification.permission === "granted") {
      new Notification("🔔 Recordatorio", {
        body: entry.transcription,
        icon: "https://cdn-icons-png.flaticon.com/512/5968/5968517.png"
      });
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
      alert("Error de IA: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const saveEntry = () => {
    if (!editingEntry) return;

    if (editingEntry.id) {
      // Editar existente
      setEntries(prev => prev.map(e => {
        if (e.id === editingEntry.id) {
          return {
            ...e,
            transcription: editingEntry.text,
            reminderDate: editingEntry.date,
            type: editingEntry.date ? 'reminder' : 'note',
            isNotified: false 
          };
        }
        return e;
      }));
    } else {
      // Crear nueva
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

  const deleteEntry = (id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans select-none pb-20">
      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200 px-6 py-4 sticky top-0 z-40 safe-top">
        <div className="max-w-xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-[10px]">V2S</div>
            <h1 className="text-sm font-black text-slate-800 uppercase tracking-widest">Smart <span className="text-indigo-600">Local</span></h1>
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
              <h2 className="text-2xl font-black text-slate-800">{editingEntry.id ? 'Editar' : 'Confirmar Nota'}</h2>
              <p className="text-xs text-slate-400 mt-1 font-bold">Se guardará localmente en tu teléfono</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contenido</label>
                <textarea 
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-700 h-32 outline-none focus:border-indigo-500 transition-all"
                  value={editingEntry.text}
                  onChange={(e) => setEditingEntry({...editingEntry, text: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha Aviso (Opcional)</label>
                <input 
                  type="datetime-local"
                  className="w-full p-4 bg-indigo-50 border-2 border-indigo-100 rounded-2xl font-black text-indigo-700 outline-none"
                  value={editingEntry.date}
                  onChange={(e) => setEditingEntry({...editingEntry, date: e.target.value})}
                />
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setEditingEntry(null)} className="flex-1 py-4 bg-slate-100 text-slate-500 font-black rounded-2xl uppercase tracking-widest text-[10px]">Descartar</button>
              <button onClick={saveEntry} className="flex-[2] py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-200 uppercase tracking-widest text-[10px]">Guardar Nota</button>
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm p-8 space-y-6">
            <h2 className="font-black text-xl text-slate-800">Ajustes</h2>
            <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
              <h3 className="text-[10px] font-black text-slate-400 uppercase">Privacidad</h3>
              <p className="text-xs font-bold text-slate-600">Todos los datos se almacenan en la memoria local de este dispositivo.</p>
            </div>
            <button onClick={() => { if(confirm('¿Borrar TODO?')) { localStorage.clear(); window.location.reload(); } }} className="w-full py-4 bg-rose-50 text-rose-600 font-black rounded-xl uppercase tracking-widest text-[10px] border border-rose-100">Borrar todos los datos</button>
            <button onClick={() => setShowSettings(false)} className="w-full py-4 bg-slate-800 text-white font-black rounded-xl uppercase tracking-widest text-[10px]">Cerrar</button>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-lg w-full mx-auto px-6 py-10 space-y-12">
        <Recorder onRecordingComplete={handleRecordingComplete} isProcessing={isProcessing} />
        
        <div className="space-y-4">
          <div className="flex justify-between items-center px-2">
            <h2 className="text-[10px] font-black text-slate-800 uppercase tracking-[0.3em]">Pendientes</h2>
          </div>
          <HistoryTable 
            entries={entries.filter(e => !e.reminderDate || !e.isNotified)} 
            variant="pending"
            onDeleteEntry={deleteEntry} 
            onEditEntry={(entry) => setEditingEntry({ id: entry.id, text: entry.transcription, date: entry.reminderDate || '' })}
          />
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center px-2">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Historial</h2>
            <button onClick={() => setEntries(prev => prev.filter(e => !e.isNotified))} className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Limpiar</button>
          </div>
          <HistoryTable 
            entries={entries.filter(e => e.reminderDate && e.isNotified)} 
            variant="notified"
            onDeleteEntry={deleteEntry} 
          />
        </div>
      </main>
    </div>
  );
};

export default App;
