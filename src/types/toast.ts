export type ToastType = 'discovery' | 'compromise' | 'root' | 'flag' | 'pivot' | 'info' | 'success';

export interface ToastNotification {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  timestamp: number;
  duration?: number; // Duration in ms before auto-dismiss, defaults to 5000ms
  ip?: string;
  hostname?: string;
  subnet?: 'dmz' | 'internal';
  actionLabel?: string;
  onAction?: () => void;
}
