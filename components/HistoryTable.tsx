
import React from 'react';
import { LogEntry } from '../types';

interface HistoryTableProps {
  entries: LogEntry[];
  onDeleteEntry: (id: string) => void;
}

export const HistoryTable: React.FC<HistoryTableProps> = ({ entries, onDeleteEntry }) => {
  return (
    <div className="w-full bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
      <div className="bg-slate-50/80 px-6 py-5 border-b border-slate-200 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-100 text-indigo-600 p-2 rounded-xl">
            <i className="fas fa-database text-xs"></i>
          </div>
          <span className="text-xs font-black text-slate-700 uppercase tracking-widest">Registros de Voz</span>
        </div>
        <span className="text-[10px] bg-white border border-slate-200 text-slate-700 px-3 py-1 rounded-full font-black">
          {entries.length}
        </span>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-separate border-spacing-0">
          <thead className="bg-slate-50/30 text-slate-400 text-[9px] uppercase font-black tracking-[0.2em]">
            <tr>
              <th className="px-6 py-4 border-b border-slate-100 w-16 text-center">Tipo</th>
              <th className="px-6 py-4 border-b border-slate-100">Contenido</th>
              <th className="px-6 py-4 border-b border-slate-100 w-24 text-center">Borrar</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {entries.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-20 text-center text-slate-300 italic">
                  No hay grabaciones todavía.
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr key={entry.id} className="group hover:bg-slate-50/80 transition-all">
                  <td className="px-6 py-6 text-center align-top">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mx-auto shadow-sm ${
                      entry.type === 'reminder' ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-500'
                    }`}>
                      <i className={`fas ${entry.type === 'reminder' ? 'fa-bell' : 'fa-sticky-note'} text-sm`}></i>
                    </div>
                  </td>
                  <td className="px-6 py-6 align-top">
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase">{entry.date} • {entry.time}</span>
                        <div className={`flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest ${
                          entry.status === 'Synced' ? 'bg-emerald-100 text-emerald-700' : 
                          entry.status === 'Syncing' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                        }`}>
                          {entry.status === 'Synced' ? 'OK' : 'Sinc.'}
                        </div>
                      </div>
                      
                      <p className="text-slate-700 text-sm font-medium leading-relaxed bg-slate-50/50 p-3 rounded-2xl border border-slate-100/50">
                        {entry.transcription}
                      </p>
                      
                      {entry.reminderDate && (
                        <div className="flex items-center gap-2 text-[10px] text-amber-700 font-black bg-amber-50 self-start px-3 py-1.5 rounded-xl border border-amber-100 shadow-sm">
                          <i className="fas fa-clock"></i>
                          Avisar el: {new Date(entry.reminderDate).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-6 text-center align-top">
                    <button 
                      onClick={() => onDeleteEntry(entry.id)}
                      className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center mx-auto"
                    >
                      <i className="fas fa-trash-alt"></i>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
