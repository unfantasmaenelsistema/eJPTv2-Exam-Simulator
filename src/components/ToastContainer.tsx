import React, { useState, useEffect } from 'react';
import { 
  Radio, 
  Unlock, 
  Crown, 
  Flag, 
  Zap, 
  CheckCircle, 
  Info, 
  X, 
  ArrowRight, 
  Volume2, 
  VolumeX, 
  Sparkles,
  ShieldAlert
} from 'lucide-react';
import { ToastNotification, ToastType } from '../types/toast';
import { isAudioEnabled, setAudioEnabled, playToastSound } from '../utils/audioAlerts';

interface ToastContainerProps {
  toasts: ToastNotification[];
  onDismiss: (id: string) => void;
  onClearAll?: () => void;
}

interface ToastItemProps {
  toast: ToastNotification;
  onDismiss: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onDismiss }) => {
  const duration = toast.duration || 5500;
  const [progress, setProgress] = useState<number>(100);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  useEffect(() => {
    if (isPaused) return;

    const interval = 50; // update progress every 50ms
    const decrement = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev <= decrement) {
          clearInterval(timer);
          onDismiss(toast.id);
          return 0;
        }
        return prev - decrement;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [isPaused, duration, onDismiss, toast.id]);

  const getStyleConfig = (type: ToastType) => {
    switch (type) {
      case 'flag':
        return {
          icon: <Flag className="w-5 h-5 text-emerald-400 shrink-0 animate-bounce" />,
          badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          badgeText: 'FLAG CAPTURADA',
          border: 'border-emerald-500/60 shadow-emerald-950/50',
          progressBar: 'bg-gradient-to-r from-emerald-500 to-teal-400',
          glow: 'shadow-[0_0_20px_rgba(16,185,129,0.25)]'
        };
      case 'root':
        return {
          icon: <Crown className="w-5 h-5 text-rose-400 shrink-0" />,
          badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
          badgeText: 'ROOT ELEVATION',
          border: 'border-rose-500/60 shadow-rose-950/50',
          progressBar: 'bg-gradient-to-r from-rose-500 to-amber-500',
          glow: 'shadow-[0_0_20px_rgba(244,63,94,0.25)]'
        };
      case 'compromise':
        return {
          icon: <Unlock className="w-5 h-5 text-amber-400 shrink-0 animate-pulse" />,
          badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          badgeText: 'HOST COMPROMETIDO',
          border: 'border-amber-500/60 shadow-amber-950/50',
          progressBar: 'bg-gradient-to-r from-amber-500 to-orange-400',
          glow: 'shadow-[0_0_20px_rgba(245,158,11,0.25)]'
        };
      case 'discovery':
        return {
          icon: <Radio className="w-5 h-5 text-cyan-400 shrink-0 animate-pulse" />,
          badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
          badgeText: 'NUEVO HOST DESCUBIERTO',
          border: 'border-cyan-500/60 shadow-cyan-950/50',
          progressBar: 'bg-gradient-to-r from-cyan-500 to-blue-400',
          glow: 'shadow-[0_0_20px_rgba(6,182,212,0.25)]'
        };
      case 'pivot':
        return {
          icon: <Zap className="w-5 h-5 text-purple-400 shrink-0 animate-pulse" />,
          badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
          badgeText: 'PIVOTING SOCKS5',
          border: 'border-purple-500/60 shadow-purple-950/50',
          progressBar: 'bg-gradient-to-r from-purple-500 to-indigo-400',
          glow: 'shadow-[0_0_20px_rgba(168,85,247,0.25)]'
        };
      default:
        return {
          icon: <Info className="w-5 h-5 text-sky-400 shrink-0" />,
          badgeBg: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
          badgeText: 'SISTEMA',
          border: 'border-slate-700 shadow-slate-950/50',
          progressBar: 'bg-sky-500',
          glow: 'shadow-lg'
        };
    }
  };

  const style = getStyleConfig(toast.type);

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={`relative w-full bg-slate-900/95 backdrop-blur-md border ${style.border} ${style.glow} rounded-xl overflow-hidden shadow-2xl transition-all duration-300 transform translate-x-0 font-sans pointer-events-auto group`}
    >
      {/* Top Banner Row */}
      <div className="p-3.5 flex items-start gap-3">
        {/* Type Icon */}
        <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 shrink-0">
          {style.icon}
        </div>

        {/* Content Info */}
        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border tracking-wider font-mono ${style.badgeBg}`}>
              {style.badgeText}
            </span>
            {toast.ip && (
              <span className="text-[11px] font-mono text-slate-300 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                {toast.ip}
              </span>
            )}
            {toast.subnet && (
              <span className="text-[10px] uppercase font-semibold text-slate-400">
                {toast.subnet}
              </span>
            )}
          </div>

          <h4 className="text-xs font-bold text-white tracking-wide truncate">
            {toast.title}
          </h4>
          <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed line-clamp-2">
            {toast.message}
          </p>

          {/* Action Button */}
          {toast.actionLabel && toast.onAction && (
            <div className="mt-2.5">
              <button
                onClick={() => {
                  toast.onAction?.();
                  onDismiss(toast.id);
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-white hover:text-emerald-300 border border-slate-700 transition-colors shadow-sm"
              >
                <span>{toast.actionLabel}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Close Button */}
        <button
          onClick={() => onDismiss(toast.id)}
          className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800/80 transition-colors shrink-0"
          title="Descartar notificación"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress Auto-Dismiss Bar */}
      <div className="h-1 w-full bg-slate-950">
        <div
          className={`h-full ${style.progressBar} transition-all duration-75`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onDismiss,
  onClearAll
}) => {
  const [audioActive, setAudioActive] = useState<boolean>(() => isAudioEnabled());

  const handleToggleAudio = () => {
    const nextState = !audioActive;
    setAudioActive(nextState);
    setAudioEnabled(nextState);
    if (nextState) {
      playToastSound('info');
    }
  };

  if (!toasts || toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2.5 max-w-sm sm:max-w-md w-full px-3 sm:px-0 pointer-events-none select-none"
    >
      {/* Mini Controls Bar when toasts exist */}
      {toasts.length > 1 && (
        <div className="pointer-events-auto flex items-center gap-2 bg-slate-900/90 backdrop-blur-md border border-slate-800 px-3 py-1 rounded-full text-[11px] shadow-lg">
          <span className="text-slate-400 font-medium">
            {toasts.length} alertas recientes
          </span>
          <span className="text-slate-600">|</span>
          <button
            onClick={handleToggleAudio}
            className="text-slate-300 hover:text-white flex items-center gap-1 transition-colors"
            title={audioActive ? 'Silenciar alertas de audio' : 'Activar alertas de audio'}
          >
            {audioActive ? (
              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-slate-500" />
            )}
          </button>
          {onClearAll && (
            <>
              <span className="text-slate-600">|</span>
              <button
                onClick={onClearAll}
                className="text-slate-400 hover:text-rose-400 font-semibold transition-colors"
              >
                Limpiar todo
              </button>
            </>
          )}
        </div>
      )}

      {/* Render Active Toasts */}
      <div className="flex flex-col gap-2.5 w-full">
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onDismiss={onDismiss}
          />
        ))}
      </div>
    </div>
  );
};
