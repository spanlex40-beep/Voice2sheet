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
    // Quitar el loader estático
    const loader = document.getElementById('initial-loader');
    if (loader) loader.remove();

    const savedEntries = localStorage.getItem('vlog_internal_data');
    if (savedEntries) setEntries(JSON.parse(savedEntries));
  }, []);

  useEffect(() => {
    localStorage.setItem('vlog_internal_data', JSON.stringify(entries));
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
      alert("Error al procesar: " + err.message);
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
        type: editingEntry.date ? 'reminder' : 'note'
      } : e));
    } else {
      const now = new Date();
      const newEntry: LogEntry = {
        id: Math.random().toString(36).substring(2, 11),
        date: now.toLocaleDateString(),
        time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        transcription: editingEntry.text,
        duration: "Voice",
        status: 'Synced',
        type: editingEntry.date ? 'reminder' : 'note',
        reminderDate: editingEntry.date
      };
      setEntries(prev => [newEntry, ...prev]);
    }
    setEditingEntry(null);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans overflow-x-hidden">
      {/* HEADER */}
      <header className="bg-indigo-600 text-white p-6 sticky top-0 z-40 shadow-lg">
        <div className="max-w-xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <i className="fas fa-layer-group text-xl"></i>
            <h1 className="font-black uppercase tracking-tighter text-lg">Mi Log Interno</h1>
          </div>
          <div className="text-[10px] font-bold bg-indigo-500 px-3 py-1 rounded-full border border-indigo-400">
            {entries.length} REGISTROS
          </div>
        </div>
      </header>

      {/* MODAL DE EDICIÓN / CONFIRMACIÓN */}
      {editingEntry && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md p-6 space-y-5 animate-in fade-in zoom-in duration-300">
            <div className="text-center pb-2 border-b border-slate-100">
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Revisar Registro</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Contenido</label>
                <textarea 
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-slate-700 h-32 focus:border-indigo-500 outline-none"
                  value={editingEntry.text}
                  onChange={(e) => setEditingEntry({...editingEntry, text: e.target.value})}
                />
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Fecha Detectada (Opcional)</label>
                <input 
                  type="datetime-local"
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-indigo-600 outline-none"
                  value={editingEntry.date}
                  onChange={(e) => setEditingEntry({...editingEntry, date: e.target.value})}
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditingEntry(null)} className="flex-1 py-4 text-slate-400 font-bold uppercase text-[10px]">Descartar</button>
              <button onClick={finalizeSave} className="flex-[2] py-4 bg-indigo-600 text-white font-black rounded-xl shadow-lg shadow-indigo-100 uppercase text-[10px]">Guardar Internamente</button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-lg w-full mx-auto px-4 py-8 space-y-10">
        {/* GRABADOR */}
        <section>
          <Recorder onRecordingComplete={handleRecordingComplete} isProcessing={isProcessing} />
        </section>
        
        {/* LISTA INTERNA */}
        <section className="space-y-4 pb-12">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Registros de Hoy</h2>
            <button 
              onClick={() => { if(confirm('¿Borrar todo el historial?')) setEntries([]); }}
              className="text-[9px] font-bold text-rose-500 hover:underline uppercase"
            >
              Limpiar Todo
            </button>
          </div>
          
          <HistoryTable 
            entries={entries} 
            variant="pending"
            onDeleteEntry={(id) => setEntries(prev => prev.filter(e => e.id !== id))} 
            onEditEntry={(entry) => setEditingEntry({ id: entry.id, text: entry.transcription, date: entry.reminderDate || '' })}
          />
        </section>
      </main>

      {/* FOOTER INDICATOR */}
      <footer className="fixed bottom-0 w-full bg-white/80 backdrop-blur-md border-t border-slate-200 py-3 text-center safe-bottom">
        <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em]">IA Local Engine Active</p>
      </footer>
    </div>
  );
};

export default App;
