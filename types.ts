
export interface LogEntry {
  id: string;
  date: string;
  time: string;
  transcription: string;
  duration: string;
  status: 'Syncing' | 'Synced' | 'Error' | 'Scheduled';
  type: 'note' | 'reminder';
  reminderDate?: string;
  isNotified?: boolean; // Nuevo: rastrea si el aviso ya ocurrió
}

export interface AIResponse {
  text: string;
  detectedDate?: string; // ISO String
}
