
import React from 'react';
import { LogEntry } from '../types';

interface HistoryTableProps {
  entries: LogEntry[];
}

export const HistoryTable: React.FC<HistoryTableProps> = ({ entries }) => {
  return (
    <div className="w-full bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
      <div className="bg-emerald-600 px-4 py-2 flex items-center gap-2 text-white font-medium">
        <i className="fas fa-file-excel"></i>
        <span>Google Sheets Sync Log</span>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold">
            <tr>
              <th className="px-4 py-3 border-b border-r border-slate-200 w-10">T</th>
              <th className="px-4 py-3 border-b border-r border-slate-200 w-28">Fecha</th>
              <th className="px-4 py-3 border-b border-r border-slate-200">Transcripción / Recordatorio</th>
              <th className="px-4 py-3 border-b border-r border-slate-200 w-24">Estado</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {entries.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-slate-400 italic">
                  No hay grabaciones todavía.
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-50 border-b border-slate-100 transition-colors">
                  <td className="px-4 py-3 border-r border-slate-100 text-center">
                    <i className={`fas ${entry.type === 'reminder' ? 'fa-bell text-amber-500' : 'fa-sticky-note text-indigo-400'}`}></i>
                  </td>
                  <td className="px-4 py-3 border-r border-slate-100 font-mono text-xs">
                    {entry.date} <br/> <span className="text-slate-400">{entry.time}</span>
                  </td>
                  <td className="px-4 py-3 border-r border-slate-100">
                    <p className="text-slate-800">{entry.transcription}</p>
                    {entry.reminderDate && (
                      <div className="mt-1 flex items-center gap-1.5 text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md inline-flex border border-amber-100">
                        <i className="fas fa-clock"></i>
                        Aviso para: {new Date(entry.reminderDate).toLocaleString()}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      entry.status === 'Synced' ? 'bg-green-100 text-green-700' :
                      entry.status === 'Syncing' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {entry.status}
                    </span>
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
