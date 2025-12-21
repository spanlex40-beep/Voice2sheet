
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
      <div className="bg-white/50 rounded-[2rem] p-8 text-center border border-slate-100">
        <p className="text-slate-300 text-[9px] font-black uppercase tracking-widest">
          {variant === 'pending' ? 'Sin tareas pendientes' : 'Historial vacío'}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {entries.map((entry) => (
        <div 
          key={entry.id} 
          className={`bg-white rounded-[2rem] p-5 shadow-sm border transition-all duration-300 ${
            variant === 'pending' 
              ? 'border-emerald-100' 
              : 'border-slate-100 opacity-60'
          }`}
        >
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                variant === 'pending' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-400'
              }`}>
                <i className={`fas ${entry.reminderDate ? 'fa-bell' : 'fa-sticky-note'} text-xs`}></i>
              </div>
              <div>
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                  {entry.date} • {entry.time}
                </div>
                {entry.reminderDate && (
                  <div className={`text-[10px] font-black uppercase mt-0.5 ${
                    variant === 'pending' ? 'text-indigo-600' : 'text-slate-400'
                  }`}>
                    Aviso: {new Date(entry.reminderDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex gap-1">
              {variant === 'pending' && onEditEntry && (
                <button 
                  onClick={() => onEditEntry(entry)}
                  className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-indigo-600 rounded-full transition-all"
                >
                  <i className="fas fa-pencil-alt text-xs"></i>
                </button>
              )}
              <button 
                onClick={() => onDeleteEntry(entry.id)}
                className="w-8 h-8 flex items-center justify-center text-slate-200 hover:text-rose-500 rounded-full transition-all"
              >
                <i className="fas fa-trash text-xs"></i>
              </button>
            </div>
          </div>

          <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100/50">
            <p className={`text-sm font-bold leading-relaxed ${variant === 'pending' ? 'text-slate-700' : 'text-slate-400'}`}>
              {entry.transcription}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};
