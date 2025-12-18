
import React, { useState, useEffect } from 'react';
import { Recorder } from './components/Recorder';
import { HistoryTable } from './components/HistoryTable';
import { LogEntry, AppSettings } from './types';
import { transcribeAudio } from './services/geminiService';

const App: React.FC = () => {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [settings, setSettings] = useState<AppSettings>({
    webhookUrl: localStorage.getItem('v2s_webhook') || '',
    language: 'es-ES',
    email: localStorage.getItem('v2s_email') || ''
  });
  const [showSettings, setShowSettings] = useState(false);
  const [showMobileAccess, setShowMobileAccess] = useState(false);
  
  const [reminderModal, setReminderModal] = useState<{
    isOpen: boolean;
    entryId: string | null;
    tempTranscription: string;
  }>({ isOpen: false, entryId: null, tempTranscription: '' });
  
  const [selectedReminderDate, setSelectedReminderDate] = useState('');

  const currentUrl = window.location.href;
  const isConfigured = settings.webhookUrl.startsWith('https://script.google.com');

  useEffect(() => {
    const saved = localStorage.getItem('v2s_entries');
    if (saved) setEntries(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('v2s_entries', JSON.stringify(entries));
  }, [entries]);

  const handleRecordingComplete = async (base64Data: string, mimeType: string, durationSeconds: number, type: 'note' | 'reminder') => {
    if (!isConfigured) {
      alert("⚠️ Primero debes configurar la URL de Google Script en Ajustes.");
      setShowSettings(true);
      return;
    }

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
      
      setEntries(prev => prev.map(e => 
        e.id === entryId ? { ...e, transcription: text } : e
      ));

      if (type === 'reminder') {
        setReminderModal({ isOpen: true, entryId, tempTranscription: text });
      } else {
        await sendToWebhook(newEntry, text);
      }
    } catch (err) {
      console.error(err);
      setEntries(prev => prev.map(e => 
        e.id === entryId ? { ...e, transcription: '[Error de IA]', status: 'Error' } : e
      ));
    } finally {
      setIsProcessing(false);
    }
  };

  const sendToWebhook = async (entry: LogEntry, transcription: string, reminderDate?: string) => {
    try {
      await fetch(settings.webhookUrl, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify({
          date: entry.date,
          time: entry.time,
          transcription: transcription,
          type: entry.type,
          reminderDate: reminderDate || '',
          targetEmail: settings.email
        })
      });
      
      setEntries(prev => prev.map(e => 
        e.id === entry.id ? { ...e, status: 'Synced', reminderDate } : e
      ));
    } catch (webhookErr) {
      setEntries(prev => prev.map(e => 
        e.id === entry.id ? { ...e, status: 'Error', reminderDate } : e
      ));
    }
  };

  const handleReminderSubmit = async () => {
    if (!reminderModal.entryId) return;
    const entry = entries.find(e => e.id === reminderModal.entryId);
    if (entry) {
      await sendToWebhook(entry, reminderModal.tempTranscription, selectedReminderDate);
    }
    setReminderModal({ isOpen: false, entryId: null, tempTranscription: '' });
    setSelectedReminderDate('');
  };

  const copyAppLink = () => {
    navigator.clipboard.writeText(currentUrl);
    alert("Enlace copiado. Pégalo en tu WhatsApp y ábrelo en el móvil.");
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('v2s_webhook', settings.webhookUrl);
    localStorage.setItem('v2s_email', settings.email);
    setShowSettings(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header Premium */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-indigo-600 to-violet-700 w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-xl rotate-3">
              <i className="fas fa-microphone-lines text-2xl"></i>
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight italic">Voice2Sheet <span className="text-indigo-600 font-normal not-italic text-sm ml-1">AI</span></h1>
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${isConfigured ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {isConfigured ? 'Motor Conectado' : 'Sin Configurar'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
             <button 
              onClick={() => setShowMobileAccess(true)} 
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl hover:bg-indigo-100 transition-all font-bold text-xs"
            >
              <i className="fas fa-mobile-screen"></i>
              MÓVIL
            </button>
            <button onClick={() => setShowSettings(true)} className="p-3 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all">
              <i className="fas fa-cog text-xl"></i>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8">
        {!isConfigured ? (
          /* Asistente de Configuración Inicial */
          <div className="max-w-xl mx-auto bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100">
            <div className="p-10 text-center space-y-6">
              <div className="w-24 h-24 bg-indigo-100 text-indigo-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                <i className="fas fa-rocket text-4xl"></i>
              </div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">¡Bienvenido!</h2>
              <p className="text-slate-500 text-lg">Para empezar a usar la App, necesitamos conectarla con tu Google Sheet.</p>
              
              <div className="space-y-4 pt-4">
                <div className="flex items-start gap-4 text-left p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-1">1</span>
                  <p className="text-sm text-slate-600">Pega la URL de tu Google Script (la que pone <b>"¡Conector Activo!"</b>) en los ajustes.</p>
                </div>
                
                <button 
                  onClick={() => setShowSettings(true)}
                  className="w-full py-5 bg-indigo-600 text-white font-bold rounded-2xl shadow-xl hover:bg-indigo-700 transition-all transform hover:-translate-y-1 active:scale-95"
                >
                  CONFIGURAR AHORA <i className="fas fa-arrow-right ml-2"></i>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Interfaz Principal de Grabación */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-5 space-y-6">
              <Recorder onRecordingComplete={handleRecordingComplete} isProcessing={isProcessing} />
              <div className="bg-gradient-to-r from-indigo-600 to-violet-700 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
                <i className="fas fa-lightbulb absolute -right-4 -bottom-4 text-8xl opacity-10 group-hover:rotate-12 transition-transform duration-500"></i>
                <h4 className="font-black text-lg mb-2 uppercase tracking-tight">Consejo Maestro</h4>
                <p className="text-sm text-indigo-100 leading-relaxed opacity-90">
                  Usa <b>"Con Aviso"</b> para citas médicas o recordatorios importantes. Podrás elegir fecha y hora después de hablar.
                </p>
              </div>
            </div>
            <div className="lg:col-span-7">
              <HistoryTable entries={entries} />
            </div>
          </div>
        )}
      </main>

      {/* Mobile Access Modal */}
      {showMobileAccess && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-10 bg-indigo-600 text-white text-center relative">
              <button onClick={() => setShowMobileAccess(false)} className="absolute right-8 top-8 opacity-50 hover:opacity-100"><i className="fas fa-times text-2xl"></i></button>
              <h2 className="text-3xl font-black italic tracking-tighter mb-2">Pásala al móvil</h2>
              <p className="text-indigo-100 opacity-80">Sigue estos pasos para tenerla como una App real:</p>
            </div>
            
            <div className="p-10 space-y-8 overflow-y-auto">
              <div className="flex justify-center bg-slate-50 p-6 rounded-3xl border-2 border-dashed border-slate-200">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(currentUrl)}`} 
                  alt="QR" 
                  className="w-44 h-44 shadow-lg rounded-xl"
                />
              </div>

              <div className="space-y-6">
                <div className="flex gap-5">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black shrink-0 shadow-lg">1</div>
                  <p className="text-sm text-slate-600 font-medium pt-2">Escanea el QR o envíate el enlace por WhatsApp.</p>
                </div>
                <div className="flex gap-5">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black shrink-0 shadow-lg">2</div>
                  <p className="text-sm text-slate-600 font-medium pt-2">En Safari/Chrome pulsa <b>"Añadir a pantalla de inicio"</b>.</p>
                </div>
              </div>
              
              <button 
                onClick={copyAppLink}
                className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-200 transition-all"
              >
                <i className="fas fa-link"></i> COPIAR ENLACE DIRECTO
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-10 py-8 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">Configuración</h2>
              <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <i className="fas fa-times text-2xl"></i>
              </button>
            </div>
            <form onSubmit={handleSaveSettings} className="p-10 space-y-8">
              <div className="space-y-4">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">URL del Google Script (/exec)</label>
                <div className="relative">
                  <i className="fas fa-link absolute left-5 top-1/2 -translate-y-1/2 text-slate-300"></i>
                  <input 
                    type="url"
                    required
                    placeholder="https://script.google.com/..."
                    className="w-full pl-12 pr-5 py-5 bg-slate-50 border border-slate-200 rounded-[1.5rem] text-sm focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium"
                    value={settings.webhookUrl}
                    onChange={(e) => setSettings({...settings, webhookUrl: e.target.value})}
                  />
                </div>
                <p className="text-[10px] text-indigo-600 bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                  <i className="fas fa-info-circle mr-1"></i> Asegúrate de que la URL termina en <b>/exec</b>
                </p>
              </div>

              <button type="submit" className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-2xl hover:bg-indigo-700 transition-all transform hover:-translate-y-1 active:scale-95">
                GUARDAR Y CONECTAR
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Reminder Modal */}
      {reminderModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xl z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-sm overflow-hidden p-10 text-center">
            <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner">
              <i className="fas fa-clock text-3xl"></i>
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">¿Cuándo te aviso?</h3>
            <p className="text-sm text-slate-400 mb-8 italic line-clamp-2">"{reminderModal.tempTranscription}"</p>
            <input 
              type="datetime-local"
              className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-[1.5rem] mb-6 outline-none focus:ring-4 focus:ring-amber-500/10 transition-all font-bold"
              value={selectedReminderDate}
              onChange={(e) => setSelectedReminderDate(e.target.value)}
            />
            <button 
              onClick={handleReminderSubmit}
              disabled={!selectedReminderDate}
              className="w-full py-5 bg-slate-900 text-white font-black rounded-2xl shadow-2xl disabled:opacity-20 transition-all active:scale-95 uppercase tracking-wider"
            >
              Confirmar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
