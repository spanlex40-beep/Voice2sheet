
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

  // Inicialización
  useEffect(() => {
    // Quitar el cargador de index.html una vez React toma el control
    const loader = document.getElementById('app-loader');
    if (loader) loader.remove();

    // Cargar datos guardados
    try {
      const saved = localStorage.getItem('vlog_internal_v2');
      if (saved) setEntries(JSON.parse(saved));
    } catch (e) {
      console.error("Error cargando historial:", e);
    }
  }, []);

  // Guardar datos cada vez que cambian
  useEffect(() => {
    localStorage.setItem('vlog_internal_v2', JSON.stringify(entries));
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
      alert("Error: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const finalizeSave = () => {
    if (!editingEntry) return;

    if (editingEntry.id) {
      // Editar existente
      setEntries(prev => prev.map(e => e.id === editingEntry.id ? {
        ...e,
        transcription: editingEntry.text,
        reminderDate: editingEntry.date,
        type: editingEntry.date ? 'reminder' : 'note'
      } : e));
    } else {
      // Crear nueva nota con fecha y hora actual
      const now = new Date();
      const newEntry: LogEntry = {
        id: Date.now().toString(36),
        date: now.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        time: now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
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
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* HEADER ELEGANTE */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50">
        <div className="max-w-xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-lg">
              <i className="fas fa-microphone text-xs"></i>
            </div>
            <h1 className="text-sm font-black text-slate-800 uppercase tracking-widest">Voice<span className="text-indigo-600">Log</span></h1>
          </div>
          <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-3 py-1 rounded-full">
            {entries.length} NOTAS
          </span>
        </div>
      </header>

      {/* MODAL DE CONFIRMACIÓN */}
      {editingEntry && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-t-[2.5rem] sm:rounded-[2rem] shadow-2xl w-full max-w-md p-6 pb-8 space-y-6 animate-in slide-in-from-bottom duration-300">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto sm:hidden"></div>
            <div className="text-center">
              <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Confirmar Nota</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Transcripción</label>
                <textarea 
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-semibold text-slate-700 h-32 focus:border-indigo-500 outline-none transition-all"
                  value={editingEntry.text}
                  onChange={(e) => setEditingEntry({...editingEntry, text: e.target.value})}
                />
              </div>
              {editingEntry.date && (
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Aviso Detectado</label>
                  <input 
                    type="datetime-local"
                    className="w-full p-4 bg-indigo-50 border-2 border-indigo-100 rounded-2xl font-black text-indigo-600 outline-none"
                    value={editingEntry.date}
                    onChange={(e) => setEditingEntry({...editingEntry, date: e.target.value})}
                  />
                </div>
              )}
            </div>
            <div className="flex gap-4">
              <button onClick={() => setEditingEntry(null)} className="flex-1 py-4 text-slate-400 font-bold uppercase text-[10px] tracking-widest">Cancelar</button>
              <button onClick={finalizeSave} className="flex-[2] py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 uppercase text-[10px] tracking-widest">Guardar Nota</button>
            </div>
          </div>
        </div>
      )}

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 max-w-lg w-full mx-auto px-4 py-8 space-y-12">
        {/* ZONA DE GRABACIÓN */}
        <section>
          <Recorder onRecordingComplete={handleRecordingComplete} isProcessing={isProcessing} />
        </section>
        
        {/* LISTADO DE NOTAS */}
        <section className="space-y-4 pb-24">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Tu Historial Interno</h2>
            {entries.length > 0 && (
              <button 
                onClick={() => { if(confirm('¿Borrar todas las notas?')) setEntries([]); }}
                className="text-[9px] font-bold text-rose-500 hover:text-rose-600 uppercase tracking-widest"
              >
                Limpiar Todo
              </button>
            )}
          </div>
          
          <HistoryTable 
            entries={entries} 
            variant="pending"
            onDeleteEntry={(id) => setEntries(prev => prev.filter(e => e.id !== id))} 
            onEditEntry={(entry) => setEditingEntry({ id: entry.id, text: entry.transcription, date: entry.reminderDate || '' })}
          />
        </section>
      </main>

      {/* FOOTER PERSISTENTE */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-slate-100 py-4 px-6 z-40">
        <div className="max-w-lg mx-auto flex justify-center items-center gap-2">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Almacenamiento Local Activo</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
