
import React from 'react';
import { LogEntry } from '../types';

interface HistoryTableProps {
  entries: LogEntry[];
  variant: 'pending' | 'notified';
  onDeleteEntry: (id: string) => void;
  onEditEntry?: (entry: LogEntry) => void;
}

export const HistoryTable: React.FC<HistoryTableProps> = ({ entries, variant, onDeleteEntry, onEditEntry }) => {
  if (entries.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-slate-200">
        <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <i className="fas fa-microphone-slash text-slate-300"></i>
        </div>
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Tu historial está vacío</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <div 
          key={entry.id} 
          className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col gap-3 group transition-all active:scale-[0.98]"
        >
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] ${
                entry.reminderDate ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'
              }`}>
                <i className={`fas ${entry.reminderDate ? 'fa-clock' : 'fa-font'}`}></i>
              </div>
              <div>
                <h4 className="text-[9px] font-black text-slate-800 uppercase leading-none">{entry.date} <span className="text-slate-300 mx-1">|</span> {entry.time}</h4>
                {entry.reminderDate && (
                  <p className="text-[8px] font-bold text-amber-500 uppercase mt-1">Recordatorio: {new Date(entry.reminderDate).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                )}
              </div>
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={() => onEditEntry && onEditEntry(entry)}
                className="w-8 h-8 flex items-center justify-center bg-slate-50 text-slate-400 rounded-full hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
              >
                <i className="fas fa-pencil-alt text-[10px]"></i>
              </button>
              <button 
                onClick={() => onDeleteEntry(entry.id)}
                className="w-8 h-8 flex items-center justify-center bg-slate-50 text-slate-400 rounded-full hover:bg-rose-50 hover:text-rose-500 transition-colors"
              >
                <i className="fas fa-trash-alt text-[10px]"></i>
              </button>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <p className="text-xs font-semibold text-slate-600 leading-relaxed">
              {entry.transcription}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};
