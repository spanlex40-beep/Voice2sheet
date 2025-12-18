
import React, { useState, useRef } from 'react';

interface RecorderProps {
  onRecordingComplete: (base64Data: string, mimeType: string, duration: number, type: 'note' | 'reminder') => void;
  isProcessing: boolean;
}

export const Recorder: React.FC<RecorderProps> = ({ onRecordingComplete, isProcessing }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [activeType, setActiveType] = useState<'note' | 'reminder' | null>(null);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const startRecording = async (type: 'note' | 'reminder') => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Data = (reader.result as string).split(',')[1];
          onRecordingComplete(base64Data, mediaRecorder.mimeType, duration, type);
        };
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setActiveType(type);
      setDuration(0);
      timerRef.current = window.setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Se requiere acceso al micrófono.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setActiveType(null);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-white rounded-3xl shadow-xl border border-slate-100 w-full max-w-md mx-auto">
      <div className="text-center mb-8">
        <h3 className="text-xl font-bold text-slate-800">¿Qué quieres hacer?</h3>
        <p className="text-slate-500 text-sm mt-1">Pulsa una vez para empezar, otra para parar</p>
      </div>

      <div className="flex gap-6 mb-8 relative">
        {/* Botón Nota Simple */}
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={() => isRecording ? stopRecording() : startRecording('note')}
            disabled={isProcessing || (isRecording && activeType !== 'note')}
            className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-lg active:scale-95 ${
              isRecording && activeType === 'note' ? 'bg-red-500 animate-pulse ring-4 ring-red-100' : 
              isProcessing || (isRecording && activeType !== 'note') ? 'bg-slate-200 opacity-50 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            <i className={`fas ${isRecording && activeType === 'note' ? 'fa-stop' : 'fa-sticky-note'} text-white text-2xl`}></i>
          </button>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Nota Simple</span>
        </div>

        {/* Botón Recordatorio */}
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={() => isRecording ? stopRecording() : startRecording('reminder')}
            disabled={isProcessing || (isRecording && activeType !== 'reminder')}
            className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-lg active:scale-95 ${
              isRecording && activeType === 'reminder' ? 'bg-red-500 animate-pulse ring-4 ring-red-100' : 
              isProcessing || (isRecording && activeType !== 'reminder') ? 'bg-slate-200 opacity-50 cursor-not-allowed' : 'bg-amber-500 hover:bg-amber-600'
            }`}
          >
            <i className={`fas ${isRecording && activeType === 'reminder' ? 'fa-stop' : 'fa-bell'} text-white text-2xl`}></i>
          </button>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Con Aviso</span>
        </div>
      </div>

      {isRecording && (
        <div className="bg-red-50 px-6 py-2 rounded-full border border-red-100 mb-4 flex items-center gap-3">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
          <span className="text-red-700 font-mono font-bold text-lg">{formatTime(duration)}</span>
        </div>
      )}

      {isProcessing && (
        <div className="flex items-center gap-3 text-indigo-600 animate-pulse">
          <i className="fas fa-spinner fa-spin"></i>
          <span className="font-semibold">Procesando con IA...</span>
        </div>
      )}
    </div>
  );
};
