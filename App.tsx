
import React, { useState, useEffect } from 'react';
import { Recorder } from './components/Recorder';
import { HistoryTable } from './components/HistoryTable';
import { LogEntry } from './types';
import { transcribeAudio } from './services/geminiService';

// --- CONFIGURACIÓN URL GOOGLE SCRIPT ---
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbytmXCpeBF-LEYkpZtXC_NAYYB-JpSjZKK0wXRQY99G7PbYOayxwjfbuKB3tzz9RCW4/exec"; 

const App: React.FC = () => {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [email, setEmail] = useState(localStorage.getItem('v2s_email') || '');
  const [showSettings, setShowSettings] = useState(false);
  const [showTroubleshoot, setShowTroubleshoot] = useState(false);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);
  
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
    setLastSyncError(null);
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
      const updatedEntry = { ...newEntry, transcription: text };
      setEntries(prev => prev.map(e => e.id === entryId ? updatedEntry : e));

      if (type === 'reminder') {
        setReminderModal({ isOpen: true, entryId, tempTranscription: text });
      } else {
        await sendToWebhook(updatedEntry);
      }
    } catch (err: any) {
      console.error("App Error:", err);
      setEntries(prev => prev.map(e => e.id === entryId ? { ...e, transcription: "Error de IA o Micrófono", status: 'Error' } : e));
    } finally {
      setIsProcessing(false);
    }
  };

  const sendToWebhook = async (entry: LogEntry, reminderDate?: string) => {
    const currentEmail = localStorage.getItem('v2s_email') || '';
    if (!currentEmail) {
      setShowSettings(true);
      return;
    }
    
    setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, status: 'Syncing' } : e));

    try {
      await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: entry.date,
          time: entry.time,
          transcription: entry.transcription,
          type: entry.type,
          reminderDate: reminderDate || '',
          targetEmail: currentEmail
        })
      });
      
      setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, status: 'Synced', reminderDate } : e));
    } catch (e: any) {
      console.error("Error enviando:", e);
      setLastSyncError(e.message || "Error de red");
      setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, status: 'Error' } : e));
    }
  };

  const handleDeleteEntry = (id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  const handleReminderSubmit = async () => {
    if (!reminderModal.entryId) return;
    const entry = entries.find(e => e.id === reminderModal.entryId);
    if (entry) {
      const updatedEntry = { ...entry, transcription: reminderModal.tempTranscription };
      await sendToWebhook(updatedEntry, selectedReminderDate);
    }
    setReminderModal({ isOpen: false, entryId: null, tempTranscription: '' });
    setSelectedReminderDate('');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 py-4 sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-indigo-600 to-violet-700 w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg rotate-3">
              <i className="fas fa-clock-rotate-left text-xl"></i>
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-800 tracking-tight">Voice2Sheet <span className="text-indigo-600">PRO</span></h1>
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${email ? 'bg-emerald-500 animate-pulse' : 'bg-rose-400'}`}></div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                  {email ? 'Sistema de Avisos Activo' : 'Email no configurado'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={() => setShowTroubleshoot(true)} 
              className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100 transition-colors"
            >
              <i className="fas fa-bolt-lightning"></i>
            </button>
            <button 
              onClick={() => setShowSettings(true)} 
              className={`p-2.5 rounded-2xl transition-all border-2 ${email ? 'bg-white border-slate-100 text-slate-400' : 'bg-rose-50 border-rose-100 text-rose-500'}`}
            >
              <i className={`fas ${email ? 'fa-cog' : 'fa-envelope'} text-lg`}></i>
            </button>
          </div>
        </div>
      </header>

      {/* MODAL DE CONFIGURACIÓN DEL PROGRAMADOR */}
      {showTroubleshoot && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl p-8 animate-in zoom-in duration-300 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <i className="fas fa-magic text-indigo-500"></i> Configurar el "Reloj" de Avisos
              </h2>
              <button onClick={() => setShowTroubleshoot(false)} className="text-slate-400 hover:text-rose-500">
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>
            
            <div className="space-y-6 text-sm text-slate-600">
              <p className="bg-amber-50 text-amber-700 p-4 rounded-xl border border-amber-100 font-medium">
                Para que los recordatorios lleguen a su hora, debes activar un "Activador" en Google Sheets.
              </p>

              <div className="space-y-4">
                <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest">Paso 1: Nuevo Código en Google Script</h3>
                <p>Copia y reemplaza todo en <b>Código.gs</b> por el nuevo motor que soporta programación (pídemelo si no lo tienes).</p>
                
                <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest">Paso 2: Activar el Reloj</h3>
                <ol className="list-decimal list-inside space-y-3 font-medium bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  <li>En el editor de Google Script, haz clic en el icono de <b>Activadores <i className="fas fa-alarm-clock"></i></b> (un reloj en la barra lateral izquierda).</li>
                  <li>Haz clic en el botón azul <b>"+ Añadir activador"</b> abajo a la derecha.</li>
                  <li>En "Seleccionar función", elige: <b><code>checkReminders</code></b>.</li>
                  <li>En "Seleccionar fuente del evento", elige: <b>Según tiempo</b>.</li>
                  <li>En "Tipo de activador", elige: <b>Temporizador de minutos</b>.</li>
                  <li>En "Intervalo de minutos", elige: <b>Cada minuto</b>.</li>
                  <li>Dale a <b>Guardar</b>.</li>
                </ol>
              </div>
            </div>
            
            <button 
              onClick={() => setShowTroubleshoot(false)} 
              className="w-full mt-8 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl transition-all uppercase tracking-widest text-xs"
            >
              ¡Entendido, voy a configurarlo!
            </button>
          </div>
        </div>
      )}

      {showSettings && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md p-8 animate-in fade-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="font-black text-2xl text-slate-800 tracking-tight">Ajustes</h2>
                <p className="text-[10px] text-indigo-600 uppercase font-black tracking-widest mt-1">Configuración de Envío</p>
              </div>
              <button onClick={() => setShowSettings(false)} className="bg-slate-100 text-slate-400 hover:text-rose-500 p-3 rounded-2xl transition-colors">
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Tu Email (donde recibirás todo)</label>
                <input 
                  type="email"
                  placeholder="ejemplo@gmail.com"
                  className="w-full px-5 py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-indigo-500 transition-all font-bold text-slate-700"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    localStorage.setItem('v2s_email', e.target.value);
                  }}
                />
              </div>

              <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                <p className="text-[10px] text-indigo-400 font-black uppercase mb-2">URL Google Script</p>
                <code className="text-[9px] text-indigo-600 block truncate font-mono">{GOOGLE_SCRIPT_URL}</code>
              </div>

              <button 
                onClick={() => setShowSettings(false)} 
                className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl active:scale-95 transition-all text-sm uppercase tracking-widest"
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}

      {reminderModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-sm p-10 text-center animate-in slide-in-from-bottom duration-500">
            <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-[2rem] flex items-center justify-center mx-auto mb-8 border-4 border-amber-100 shadow-inner">
              <i className="fas fa-calendar-check text-3xl"></i>
            </div>
            <h3 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">¿Cuándo avisarte?</h3>
            <p className="text-[11px] text-slate-400 mb-8 px-4 font-bold italic">"{reminderModal.tempTranscription}"</p>
            
            <input 
              type="datetime-local"
              className="w-full px-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl mb-8 text-sm outline-none focus:border-amber-500 font-bold text-slate-700"
              value={selectedReminderDate}
              onChange={(e) => setSelectedReminderDate(e.target.value)}
            />
            
            <div className="flex flex-col gap-3">
              <button 
                onClick={handleReminderSubmit}
                disabled={!selectedReminderDate}
                className="w-full py-5 bg-amber-500 text-white font-black rounded-2xl disabled:opacity-30 shadow-xl active:scale-95 transition-all uppercase tracking-widest text-xs"
              >
                Programar Aviso
              </button>
              <button 
                onClick={() => setReminderModal({ isOpen: false, entryId: null, tempTranscription: '' })}
                className="text-[10px] font-black text-slate-400 uppercase tracking-widest py-2 hover:text-rose-500"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-5 space-y-8">
            <Recorder onRecordingComplete={handleRecordingComplete} isProcessing={isProcessing} />
            
            <div className="bg-indigo-600 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden text-white group">
              <div className="relative z-10">
                <h4 className="font-black text-indigo-200 text-xs uppercase tracking-widest mb-6">Estado del Sistema</h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-white/10 pb-3">
                    <span className="text-xs opacity-70">Notas Inmediatas</span>
                    <span className="text-xs font-black text-emerald-300">ACTIVO</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-white/10 pb-3">
                    <span className="text-xs opacity-70">Avisos Programados</span>
                    <span className="text-xs font-black text-amber-300">ESPERANDO TRIGGER</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs opacity-70">IA Transcripción</span>
                    <span className="text-xs font-black text-emerald-300">ONLINE</span>
                  </div>
                </div>
              </div>
              <i className="fas fa-microchip absolute -bottom-8 -right-8 text-8xl text-white/10 group-hover:rotate-12 transition-transform"></i>
            </div>
          </div>
            
          <div className="lg:col-span-7">
            <HistoryTable entries={entries} onDeleteEntry={handleDeleteEntry} />
          </div>
        </div>
      </main>
      
      <footer className="p-10 text-center">
        <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] mb-4">Voice2Sheet Intelligent Logging</p>
        <div className="inline-flex items-center gap-3 px-6 py-3 bg-white rounded-full border border-slate-200 shadow-sm">
          <div className={`w-2 h-2 rounded-full ${email ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`}></div>
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
            {email ? `Conectado a: ${email}` : 'Configuración Requerida'}
          </span>
        </div>
      </footer>
    </div>
  );
};

export default App;
