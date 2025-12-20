import React from 'react';
import { LogEntry } from '../types';

interface HistoryTableProps {
  entries: LogEntry[];
  onDeleteEntry: (id: string) => void;
}

export const HistoryTable: React.FC<HistoryTableProps> = ({ entries, onDeleteEntry }) => {
  return (
    <div className="w-full bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
      <div className="bg-emerald-600 px-4 py-3 flex items-center gap-2 text-white font-medium">
        <i className="fas fa-file-excel"></i>
        <span className="text-sm uppercase tracking-wider font-bold">Registro de Google Sheets</span>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 text-slate-600 text-[10px] uppercase font-bold tracking-widest">
            <tr>
              <th className="px-4 py-4 border-b border-slate-200 w-10 text-center">Tipo</th>
              <th className="px-4 py-4 border-b border-slate-200 w-32">Fecha/Hora</th>
              <th className="px-4 py-4 border-b border-slate-200">Transcripción</th>
              <th className="px-4 py-4 border-b border-slate-200 w-24 text-center">Estado</th>
              <th className="px-4 py-4 border-b border-slate-200 w-16 text-center">Acción</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {entries.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-16 text-center text-slate-400 italic bg-slate-50/30">
                  <div className="flex flex-col items-center gap-3">
                    <i className="fas fa-ghost text-4xl opacity-20"></i>
                    <p>No hay grabaciones todavía.</p>
                  </div>
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr key={entry.id} className="group hover:bg-slate-50 border-b border-slate-100 transition-colors">
                  <td className="px-4 py-4 text-center">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto ${
                      entry.type === 'reminder' ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-500'
                    }`}>
                      <i className={`fas ${entry.type === 'reminder' ? 'fa-bell' : 'fa-sticky-note'} text-xs`}></i>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col">
                      <span className="font-mono text-[11px] text-slate-700 font-bold">{entry.date}</span>
                      <span className="text-[10px] text-slate-400">{entry.time}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-slate-800 leading-relaxed text-xs">{entry.transcription}</p>
                    {entry.reminderDate && (
                      <div className="mt-2 flex items-center gap-1.5 text-[9px] bg-amber-50 text-amber-700 px-2 py-1 rounded-lg inline-flex border border-amber-100 font-bold uppercase tracking-tighter">
                        <i className="fas fa-clock text-[8px]"></i>
                        Aviso: {new Date(entry.reminderDate).toLocaleString()}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-tighter ${
                      entry.status === 'Synced' ? 'bg-emerald-100 text-emerald-700' :
                      entry.status === 'Syncing' ? 'bg-amber-100 text-amber-700 animate-pulse' : 'bg-rose-100 text-rose-700'
                    }`}>
                      {entry.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <button 
                      onClick={() => onDeleteEntry(entry.id)}
                      className="w-8 h-8 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-all flex items-center justify-center group-hover:opacity-100 md:opacity-0"
                      title="Eliminar del historial"
                    >
                      <i className="fas fa-trash-can text-xs"></i>
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
