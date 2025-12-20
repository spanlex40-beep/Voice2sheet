

import React, { useState, useEffect } from 'react';
import { Recorder } from './components/Recorder';
import { HistoryTable } from './components/HistoryTable';
import { LogEntry } from './types';
import { transcribeAudio } from './services/geminiService';

// --- PEGA AQUÍ TU NUEVA URL DE GOOGLE ---
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyEa_p084aiHfByKbRGhCV_DSdDXc8FkvdVXAeWtXC4uhE-kVTRpMDjWJG8yVUoDtbJ/exec"; 

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
        await sendToWebhook({ ...newEntry, transcription: text });
      }
    } catch (err: any) {
      console.error("App Error:", err);
      setEntries(prev => prev.map(e => e.id === entryId ? { ...e, transcription: "Error de IA", status: 'Error' } : e));
    } finally {
      setIsProcessing(false);
    }
  };

  const sendToWebhook = async (entry: LogEntry, reminderDate?: string) => {
    const currentEmail = localStorage.getItem('v2s_email') || '';
    
    setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, status: 'Syncing' } : e));

    try {
      // Usamos no-cors porque Google Apps Script redirige y los navegadores bloquean el cuerpo de la respuesta por seguridad, 
      // pero el envío se realiza igual.
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
    } catch (e) {
      console.error("Error enviando al Webhook:", e);
      setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, status: 'Error' } : e));
    }
  };

  const handleDeleteEntry = (id: string) => {
    setEntries(prev => prev.filter(entry => entry.id !== id));
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
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-indigo-600 to-violet-700 w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg rotate-3">
              <i className="fas fa-microphone-lines text-xl"></i>
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-800 tracking-tight">Voice2Sheet</h1>
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${email ? 'bg-emerald-500 animate-pulse' : 'bg-rose-400'}`}></div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                  {email ? 'Envíos Listos' : 'Falta configurar email'}
                </span>
              </div>
            </div>
          </div>
          
          <button 
            onClick={() => setShowSettings(true)} 
            className={`p-2.5 rounded-2xl transition-all border-2 ${email ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-white border-slate-100 text-rose-400 hover:border-indigo-200'}`}
          >
            <i className={`fas ${email ? 'fa-user-check' : 'fa-envelope-circle-check'} text-lg`}></i>
          </button>
        </div>
      </header>

      {showSettings && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md p-8 animate-in fade-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="font-black text-2xl text-slate-800 tracking-tight">Destino</h2>
                <p className="text-[10px] text-indigo-600 uppercase font-black tracking-widest mt-1">¿A dónde enviamos los audios?</p>
              </div>
              <button onClick={() => setShowSettings(false)} className="bg-slate-100 text-slate-400 hover:text-rose-500 p-3 rounded-2xl transition-colors">
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="bg-amber-50 p-5 rounded-[1.5rem] border border-amber-100">
                <p className="text-[11px] text-amber-900 leading-relaxed font-bold">
                  ⚠️ Si no recibes el correo tras autorizar en Google, revisa la carpeta de <span className="underline uppercase tracking-wider">SPAM</span> de tu gestor de correo.
                </p>
              </div>
              
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email Recibidor</label>
                <div className="relative group">
                  <i className="fas fa-at absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors"></i>
                  <input 
                    type="email"
                    placeholder="ejemplo@gmail.com"
                    className="w-full pl-11 pr-5 py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-indigo-500 transition-all font-bold text-slate-700"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      localStorage.setItem('v2s_email', e.target.value);
                    }}
                  />
                </div>
              </div>

              <button 
                onClick={() => setShowSettings(false)} 
                className="w-full py-5 bg-slate-900 text-white font-black rounded-2xl shadow-xl active:scale-95 transition-all text-sm uppercase tracking-widest"
              >
                Actualizar Destino
              </button>
            </div>
          </div>
        </div>
      )}

      {reminderModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-sm p-10 text-center animate-in slide-in-from-bottom duration-500">
            <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-[2rem] flex items-center justify-center mx-auto mb-8 border-4 border-amber-100 shadow-inner">
              <i className="fas fa-bell text-3xl animate-swing origin-top"></i>
            </div>
            <h3 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">Programar</h3>
            <p className="text-xs text-slate-400 mb-8 px-4 font-medium italic">"{reminderModal.tempTranscription}"</p>
            
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
              Guardar y Notificar
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-5 space-y-8">
            <Recorder onRecordingComplete={handleRecordingComplete} isProcessing={isProcessing} />
            
            <div className="bg-gradient-to-br from-slate-900 to-indigo-950 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden text-white">
              <div className="relative z-10">
                <h4 className="font-black text-indigo-300 text-sm uppercase tracking-widest mb-6 flex items-center gap-2">
                  <i className="fas fa-shield-halved"></i> Flujo Seguro
                </h4>
                <div className="space-y-6">
                  {[
                    {icon: 'fa-brain', text: 'Gemini IA transcribe el audio', sub: 'Velocidad de rayo'},
                    {icon: 'fa-file-excel', text: 'Se registra en Google Sheets', sub: 'Organización total'},
                    {icon: 'fa-envelope-open-text', text: 'Recibes el correo de aviso', sub: 'Sin olvidar nada'}
                  ].map((item, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-indigo-300 border border-white/5">
                        <i className={`fas ${item.icon} text-sm`}></i>
                      </div>
                      <div>
                        <p className="text-xs font-black uppercase tracking-tight">{item.text}</p>
                        <p className="text-[10px] text-white/40 font-bold">{item.sub}</p>
                      </div>
                    </div>
                  ))}
                </div>
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
            {email ? `Conectado a: ${email}` : 'Falta configurar email de aviso'}
          </span>
        </div>
      </footer>
    </div>
  );
};

export default App;
