
export interface LogEntry {
  id: string;
  date: string;
  time: string;
  transcription: string;
  duration: string;
  status: 'Syncing' | 'Synced' | 'Error';
  type: 'note' | 'reminder';
  reminderDate?: string;
}

export interface AppSettings {
  webhookUrl: string;
  language: string;
  email: string;
}
