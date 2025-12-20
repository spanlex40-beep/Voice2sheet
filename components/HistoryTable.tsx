import React from 'react';
import { LogEntry } from '../types';

interface HistoryTableProps {
  entries: LogEntry[];
  onDeleteEntry: (id: string) => void;
}

export const HistoryTable: React.FC<HistoryTableProps> = ({ entries, onDeleteEntry }) => {
  return (
    <div className="w-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <i className="fas fa-list-ul text-indigo-600"></i>
          <span className="text-sm font-bold text-slate-700 uppercase tracking-wider">Historial Reciente</span>
        </div>
        <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">
          {entries.length} {entries.length === 1 ? 'entrada' : 'entradas'}
        </span>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50/50 text-slate-400 text-[10px] uppercase font-bold tracking-widest">
            <tr>
              <th className="px-5 py-3 border-b border-slate-100 w-12 text-center">Tipo</th>
              <th className="px-5 py-3 border-b border-slate-100">Contenido</th>
              <th className="px-5 py-3 border-b border-slate-100 w-20 text-center">Borrar</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {entries.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-5 py-20 text-center text-slate-400 italic">
                  No hay registros guardados localmente.
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr key={entry.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-5 text-center">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center mx-auto ${
                      entry.type === 'reminder' ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-500'
                    }`}>
                      <i className={`fas ${entry.type === 'reminder' ? 'fa-bell' : 'fa-sticky-note'} text-sm`}></i>
                    </div>
                  </td>
                  <td className="px-5 py-5">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">{entry.date} • {entry.time}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                          entry.status === 'Synced' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {entry.status}
                        </span>
                      </div>
                      <p className="text-slate-700 text-sm leading-relaxed">{entry.transcription}</p>
                      {entry.reminderDate && (
                        <div className="mt-2 text-[10px] text-amber-600 font-bold bg-amber-50 self-start px-2 py-1 rounded-lg border border-amber-100">
                          <i className="fas fa-calendar-check mr-1"></i>
                          Aviso para: {new Date(entry.reminderDate).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-5 text-center">
                    <button 
                      onClick={() => onDeleteEntry(entry.id)}
                      className="w-10 h-10 rounded-full bg-rose-50 text-rose-500 hover:bg-rose-100 transition-all flex items-center justify-center mx-auto"
                    >
                      <i className="fas fa-trash-can"></i>
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
