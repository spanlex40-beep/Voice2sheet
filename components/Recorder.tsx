
import React, { useState, useRef } from 'react';

interface RecorderProps {
  onRecordingComplete: (base64Data: string, mimeType: string, duration: number) => void;
  isProcessing: boolean;
}

export const Recorder: React.FC<RecorderProps> = ({ onRecordingComplete, isProcessing }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const startRecording = async () => {
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
          onRecordingComplete(base64Data, mediaRecorder.mimeType, duration);
        };
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setDuration(0);
      timerRef.current = window.setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      alert("Permite el acceso al micrófono para grabar.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center justify-center p-10 bg-white rounded-[3rem] shadow-2xl border border-slate-100 w-full max-w-md mx-auto">
      <div className="text-center mb-10">
        <h3 className="text-2xl font-black text-slate-800">Graba tu mensaje</h3>
        <p className="text-slate-400 text-sm mt-2 font-medium">Di qué necesitas y cuándo avisarte</p>
      </div>

      <div className="relative mb-10">
        {isRecording && (
          <div className="absolute inset-0 bg-indigo-500/20 rounded-full animate-ping scale-150"></div>
        )}
        <button
          onClick={() => isRecording ? stopRecording() : startRecording()}
          disabled={isProcessing}
          className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 shadow-2xl relative z-10 ${
            isRecording ? 'bg-rose-500 rotate-90 scale-110' : 
            isProcessing ? 'bg-slate-200 cursor-wait' : 'bg-indigo-600 hover:scale-105 active:scale-95'
          }`}
        >
          {isProcessing ? (
            <i className="fas fa-circle-notch fa-spin text-white text-4xl"></i>
          ) : (
            <i className={`fas ${isRecording ? 'fa-square' : 'fa-microphone'} text-white text-4xl`}></i>
          )}
        </button>
      </div>

      <div className="h-8">
        {isRecording && (
          <div className="flex items-center gap-3 text-rose-600 font-black text-xl font-mono">
            <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></span>
            {formatTime(duration)}
          </div>
        )}
        {isProcessing && (
          <span className="text-indigo-600 font-bold animate-pulse text-sm uppercase tracking-widest">IA Analizando...</span>
        )}
      </div>
    </div>
  );
};
