
import React, { useState, useEffect } from 'react';
import { Recorder } from './components/Recorder';
import { HistoryTable } from './components/HistoryTable';
import { LogEntry, AIResponse } from './types';
import { transcribeAudio } from './services/geminiService';

const App: React.FC = () => {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingEntry, setEditingEntry] = useState<{
    id?: string;
    text: string;
    date: string;
  } | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('vlog_storage_v3');
      if (saved) setEntries(JSON.parse(saved));
    } catch (e) {
      console.error("Error al cargar datos locales");
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('vlog_storage_v3', JSON.stringify(entries));
  }, [entries]);

  const handleRecordingComplete = async (base64Data: string, mimeType: string) => {
    setIsProcessing(true);
    try {
      const result: AIResponse = await transcribeAudio(base64Data, mimeType);
      setEditingEntry({
        text: result.text,
        date: result.detectedDate || '',
      });
    } catch (err: any) {
      alert("Error de IA: Por favor, intenta de nuevo.");
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const finalizeSave = () => {
    if (!editingEntry) return;

    const now = new Date();
    const newEntry: LogEntry = {
      id: Date.now().toString(36),
      date: now.toLocaleDateString('es-ES'),
      time: now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      transcription: editingEntry.text,
      duration: "Audio",
      status: 'Synced',
      type: editingEntry.date ? 'reminder' : 'note',
      reminderDate: editingEntry.date
    };

    setEntries(prev => [newEntry, ...prev]);
    setEditingEntry(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-indigo-100">
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 shadow-sm">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <h1 className="text-sm font-black text-slate-800 uppercase tracking-widest">
            VOICE<span className="text-indigo-600">LOG</span> <span className="text-[10px] text-slate-300 ml-1">v3.0</span>
          </h1>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Local Mode</span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-md w-full mx-auto px-4 py-8 space-y-10">
        <Recorder onRecordingComplete={handleRecordingComplete} isProcessing={isProcessing} />

        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tus Notas</h2>
            {entries.length > 0 && (
              <button 
                onClick={() => confirm('¿Borrar todo?') && setEntries([])}
                className="text-[9px] font-bold text-rose-500 uppercase"
              >
                Limpiar Todo
              </button>
            )}
          </div>
          <HistoryTable 
            entries={entries} 
            variant="pending"
            onDeleteEntry={(id) => setEntries(prev => prev.filter(e => e.id !== id))} 
          />
        </div>
      </main>

      {editingEntry && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm p-6 space-y-6">
            <h2 className="text-center font-black text-slate-800 uppercase text-xs tracking-widest">Guardar Registro</h2>
            <textarea 
              className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-semibold text-slate-600 h-32 focus:border-indigo-500 outline-none"
              value={editingEntry.text}
              onChange={(e) => setEditingEntry({...editingEntry, text: e.target.value})}
            />
            <div className="flex gap-3">
              <button onClick={() => setEditingEntry(null)} className="flex-1 py-4 text-slate-400 font-bold uppercase text-[10px]">Cerrar</button>
              <button onClick={finalizeSave} className="flex-[2] py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-lg shadow-indigo-200 uppercase text-[10px]">Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
