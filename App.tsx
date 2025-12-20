
import React, { useState, useEffect } from 'react';
import { Recorder } from './components/Recorder';
import { HistoryTable } from './components/HistoryTable';
import { LogEntry } from './types';
import { transcribeAudio } from './services/geminiService';

// --- ⚠️ ¡IMPORTANTE! PEGA AQUÍ TU URL DE GOOGLE SCRIPT (LA QUE TERMINA EN /exec) ---
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbytmXCpeBF-LEYkpZtXC_NAYYB-JpSjZKK0wXRQY99G7PbYOayxwjfbuKB3tzz9RCW4/exec"; 

const App: React.FC = () => {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [email, setEmail] = useState(localStorage.getItem('v2s_email') || '');
  const [showSettings, setShowSettings] = useState(false);
  const [showTroubleshoot, setShowTroubleshoot] = useState(false);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);
  const [isTestingAuth, setIsTestingAuth] = useState(false);
  
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

  const testAuth = async () => {
    if (!email) {
      setShowSettings(true);
      return;
    }
    setIsTestingAuth(true);
    try {
      await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'note',
          transcription: "🔴 TEST DE CONEXIÓN: Si recibes esto, el sistema funciona.",
          date: new Date().toLocaleDateString(),
          time: new Date().toLocaleTimeString(),
          targetEmail: email
        })
      });
      alert("Petición de prueba enviada. Revisa tu email (y carpeta SPAM) en 1 minuto.");
    } catch (e) {
      alert("Error al contactar con el Script. Revisa la URL.");
    } finally {
      setIsTestingAuth(false);
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
      setLastSyncError("Error de envío. ¿La URL es correcta?");
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
                  {email ? 'Sistema de Avisos Listo' : 'Email pendiente'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
             <button 
              onClick={testAuth} 
              disabled={isTestingAuth}
              className={`p-2.5 rounded-2xl transition-all border ${isTestingAuth ? 'bg-slate-100 text-slate-400' : 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100'}`}
              title="Probar Conexión Email"
            >
              <i className={`fas ${isTestingAuth ? 'fa-spinner fa-spin' : 'fa-paper-plane'}`}></i>
            </button>
            <button 
              onClick={() => setShowTroubleshoot(true)} 
              className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100 transition-colors"
              title="Ayuda técnica"
            >
              <i className="fas fa-life-ring"></i>
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

      {lastSyncError && (
        <div className="bg-rose-500 text-white px-6 py-2 text-[10px] font-black uppercase tracking-widest text-center animate-in slide-in-from-top duration-300">
          <i className="fas fa-circle-exclamation mr-2"></i>
          {lastSyncError}
        </div>
      )}

      {showTroubleshoot && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl p-8 animate-in zoom-in duration-300 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <i className="fas fa-microchip text-indigo-500"></i> ¿No recibes correos?
              </h2>
              <button onClick={() => setShowTroubleshoot(false)} className="text-slate-400 hover:text-rose-500">
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>
            
            <div className="space-y-6 text-sm text-slate-600">
              <div className="bg-rose-50 p-6 rounded-2xl border border-rose-100">
                <p className="font-bold text-rose-800 text-xs mb-2 uppercase">IMPORTANTE: Autorización Forzada</p>
                <p className="text-[11px] mb-4">Si al crear el activador no te pidió permiso, Google puede estar bloqueando el envío. Haz esto:</p>
                <ol className="list-decimal list-inside space-y-2 text-[11px] font-medium">
                  <li>En el editor de Google Script, selecciona la función <b><code>testPermisos</code></b> arriba.</li>
                  <li>Pulsa el botón <b>Ejecutar</b> (el triángulo de Play).</li>
                  <li>Te saltará una ventana de "Revisar permisos". <b>Acepta todo</b> (Avanzado -> Ir a Conector Voz).</li>
                  <li>Una vez hecho, el "reloj" ya tendrá permiso para enviar correos solo.</li>
                </ol>
              </div>

              <div className="space-y-4">
                <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest">Otras causas:</h3>
                <ul className="space-y-3">
                  <li className="flex gap-2">
                    <i className="fas fa-clock text-indigo-500 mt-0.5"></i>
                    <span><b>Zona Horaria:</b> En Google Script, ve a Ajustes (engranaje) y asegúrate de que la Zona Horaria sea la misma que tu país.</span>
                  </li>
                  <li className="flex gap-2">
                    <i className="fas fa-envelope-open text-indigo-500 mt-0.5"></i>
                    <span><b>Spam:</b> Revisa siempre la carpeta de Correo No Deseado.</span>
                  </li>
                </ul>
              </div>
            </div>
            
            <button 
              onClick={() => setShowTroubleshoot(false)} 
              className="w-full mt-8 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl transition-all uppercase tracking-widest text-xs"
            >
              Hecho
            </button>
          </div>
        </div>
      )}

      {showSettings && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md p-8 animate-in fade-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-8">
              <h2 className="font-black text-2xl text-slate-800 tracking-tight">Ajustes</h2>
              <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-rose-500 p-3">
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email Destino</label>
                <input 
                  type="email"
                  placeholder="tuemail@gmail.com"
                  className="w-full px-5 py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-indigo-500 transition-all font-bold text-slate-700"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    localStorage.setItem('v2s_email', e.target.value);
                  }}
                />
              </div>

              <button 
                onClick={() => setShowSettings(false)} 
                className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl active:scale-95 transition-all text-sm uppercase tracking-widest"
              >
                Guardar
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
            <h3 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">Programar</h3>
            <p className="text-[11px] text-slate-400 mb-8 px-4 font-bold italic">"{reminderModal.tempTranscription}"</p>
            
            <input 
              type="datetime-local"
              className="w-full px-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl mb-8 text-sm outline-none focus:border-amber-500 font-bold text-slate-700"
              value={selectedReminderDate}
              onChange={(e) => setSelectedReminderDate(e.target.value)}
            />
            
            <button 
              onClick={handleReminderSubmit}
              disabled={!selectedReminderDate}
              className="w-full py-5 bg-amber-500 text-white font-black rounded-2xl disabled:opacity-30 shadow-xl active:scale-95 transition-all uppercase tracking-widest text-xs"
            >
              Agendar Recordatorio
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-5 space-y-8">
            <Recorder onRecordingComplete={handleRecordingComplete} isProcessing={isProcessing} />
            
            <div className="bg-indigo-600 p-8 rounded-[2.5rem] shadow-2xl text-white">
              <h4 className="font-black text-indigo-200 text-xs uppercase tracking-widest mb-4">Estado de la conexión</h4>
              <div className="flex items-center justify-between text-xs mb-3 border-b border-white/10 pb-2">
                <span>Activador Google</span>
                <span className="font-black text-emerald-300">CONFIGURADO</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span>Email configurado</span>
                <span className={`font-black ${email ? 'text-emerald-300' : 'text-rose-300 animate-pulse'}`}>
                  {email ? 'SÍ' : 'NO'}
                </span>
              </div>
            </div>
          </div>
            
          <div className="lg:col-span-7">
            <HistoryTable entries={entries} onDeleteEntry={handleDeleteEntry} />
          </div>
        </div>
      </main>
      
      <footer className="p-10 text-center">
        <div className="inline-flex items-center gap-3 px-6 py-3 bg-white rounded-full border border-slate-200 shadow-sm">
          <div className={`w-2 h-2 rounded-full ${email ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`}></div>
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
            {email ? `Cuenta activa: ${email}` : 'Falta configurar email destino'}
          </span>
        </div>
      </footer>
    </div>
  );
};

export default App;
