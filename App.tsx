
import React, { useState, useEffect } from 'react';
import { Recorder } from './components/Recorder';
import { HistoryTable } from './components/HistoryTable';
import { LogEntry, AIResponse } from './types';
import { transcribeAudio } from './services/geminiService';

// Reemplaza esto con tu URL de Google Apps Script cuando la tengas
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
    const interval = setInterval(checkReminders, 15000);
    return () => clearInterval(interval);
  }, [entries]);

  const checkReminders = () => {
    const now = new Date();
    let hasChanges = false;
    const newEntries = entries.map(entry => {
      if (entry.reminderDate && !entry.isNotified) {
        const remDate = new Date(entry.reminderDate);
        if (remDate <= now) {
          showNativeNotification(entry);
          hasChanges = true;
          return { ...entry, isNotified: true };
        }
      }
      return entry;
    });

    if (hasChanges) setEntries(newEntries);
  };

  const showNativeNotification = (entry: LogEntry) => {
    if (Notification.permission === "granted") {
      new Notification("🔔 Tarea Pendiente", {
        body: entry.transcription,
        icon: "https://cdn-icons-png.flaticon.com/512/5968/5968517.png"
      });
    }
  };

  const syncWithGoogleSheets = async (entry: LogEntry) => {
    try {
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors', // Importante para evitar problemas de CORS con Apps Script
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entry),
      });
      console.log('Syncing status: Sended to Google Sheets');
    } catch (error) {
      console.error('Error syncing with Google Sheets:', error);
    }
  };

  const handleRecordingComplete = async (base64Data: string, mimeType: string, durationSeconds: number) => {
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

  const saveEntry = async () => {
    if (!editingEntry) return;

    let targetEntry: LogEntry;

    if (editingEntry.id) {
      setEntries(prev => prev.map(e => {
        if (e.id === editingEntry.id) {
          const updated = {
            ...e,
            transcription: editingEntry.text,
            reminderDate: editingEntry.date,
            type: (editingEntry.date ? 'reminder' : 'note') as 'reminder' | 'note',
            isNotified: false 
          };
          targetEntry = updated;
          return updated;
        }
        return e;
      }));
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
      targetEntry = newEntry;
      setEntries(prev => [newEntry, ...prev]);
    }
    
    // @ts-ignore - ya que targetEntry se asigna en ambos bloques
    if (targetEntry) {
      syncWithGoogleSheets(targetEntry);
    }

    setEditingEntry(null);
  };

  const clearList = (type: 'pending' | 'notified') => {
    if (confirm(`¿Borrar todas las notas ${type === 'pending' ? 'pendientes' : 'ya avisadas'}?`)) {
      setEntries(prev => prev.filter(e => {
        const isEntryNotified = e.reminderDate && e.isNotified;
        return type === 'pending' ? isEntryNotified : !isEntryNotified;
      }));
    }
  };

  const pendingEntries = entries.filter(e => !e.reminderDate || !e.isNotified);
  const notifiedEntries = entries.filter(e => e.reminderDate && e.isNotified);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans select-none pb-20">
      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200 px-6 py-4 sticky top-0 z-40 safe-top">
        <div className="max-w-xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 w-8 h-8 rounded-lg flex items-center justify-center text-white">
              <i className="fas fa-layer-group text-xs"></i>
            </div>
            <h1 className="text-sm font-black text-slate-800 uppercase tracking-widest">Smart <span className="text-indigo-600">Tasks</span></h1>
          </div>
          <button onClick={() => setShowSettings(true)} className="p-2 text-slate-400">
            <i className="fas fa-question-circle"></i>
          </button>
        </div>
      </header>

      {editingEntry && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-300">
            <div className="p-8 space-y-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-pen-nib text-2xl"></i>
                </div>
                <h2 className="text-2xl font-black text-slate-800">{editingEntry.id ? 'Editar Tarea' : 'Nueva Tarea'}</h2>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contenido</label>
                  <textarea 
                    className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-700 h-32 outline-none focus:border-indigo-500 transition-all"
                    value={editingEntry.text}
                    onChange={(e) => setEditingEntry({...editingEntry, text: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Aviso (Opcional)</label>
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
                <button onClick={saveEntry} className="flex-[2] py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-200 uppercase tracking-widest text-[10px]">Guardar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-[3rem] sm:rounded-[2.5rem] shadow-2xl w-full max-w-sm p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-black text-xl text-slate-800">Ayuda y Ajustes</h2>
              <button onClick={() => setShowSettings(false)} className="text-slate-300"><i className="fas fa-times-circle text-xl"></i></button>
            </div>
            
            <div className="space-y-6">
              <div className="bg-indigo-50 rounded-2xl p-4">
                <h3 className="text-[10px] font-black text-indigo-600 uppercase mb-3">¿Cómo instalar en el móvil?</h3>
                <div className="space-y-3 text-xs font-bold text-slate-600">
                  <div className="flex gap-3">
                    <i className="fab fa-apple text-lg"></i>
                    <p>En <span className="text-indigo-600">iOS (Safari)</span>: Botón compartir <i className="fas fa-share-square"></i> y "Añadir a pantalla de inicio".</p>
                  </div>
                  <div className="flex gap-3">
                    <i className="fab fa-android text-lg"></i>
                    <p>En <span className="text-indigo-600">Android (Chrome)</span>: Menú <i className="fas fa-ellipsis-v"></i> e "Instalar aplicación".</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Limpieza total</label>
                <button onClick={() => { if(confirm("¿Borrar TODO?")) { localStorage.clear(); window.location.reload(); } }} className="w-full py-4 bg-rose-50 text-rose-600 font-black rounded-xl uppercase tracking-widest text-[10px] border border-rose-100">Resetear Aplicación</button>
              </div>
            </div>
            <button onClick={() => setShowSettings(false)} className="w-full mt-8 py-4 bg-slate-800 text-white font-black rounded-xl uppercase tracking-widest text-[10px]">Entendido</button>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-lg w-full mx-auto px-6 py-10 space-y-12">
        <Recorder onRecordingComplete={handleRecordingComplete} isProcessing={isProcessing} />
        
        <div className="space-y-4">
          <div className="flex justify-between items-center px-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <h2 className="text-[10px] font-black text-slate-800 uppercase tracking-[0.3em]">Pendientes ({pendingEntries.length})</h2>
            </div>
            {pendingEntries.length > 0 && (
              <button onClick={() => clearList('pending')} className="text-[9px] font-black text-rose-500 uppercase tracking-widest hover:bg-rose-50 px-2 py-1 rounded-lg transition-all">Borrar todo</button>
            )}
          </div>
          <HistoryTable 
            entries={pendingEntries} 
            variant="pending"
            onDeleteEntry={(id) => setEntries(prev => prev.filter(e => e.id !== id))} 
            onEditEntry={(entry) => setEditingEntry({ id: entry.id, text: entry.transcription, date: entry.reminderDate || '' })}
          />
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center px-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Ya Avisados ({notifiedEntries.length})</h2>
            </div>
            {notifiedEntries.length > 0 && (
              <button onClick={() => clearList('notified')} className="text-[9px] font-black text-slate-400 uppercase tracking-widest hover:bg-slate-100 px-2 py-1 rounded-lg transition-all">Borrar historial</button>
            )}
          </div>
          <HistoryTable 
            entries={notifiedEntries} 
            variant="notified"
            onDeleteEntry={(id) => setEntries(prev => prev.filter(e => e.id !== id))} 
          />
        </div>
      </main>
    </div>
  );
};

export default App;
