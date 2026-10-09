import React, { useState, useEffect, useRef } from 'react';
import { Terminal } from './components/Terminal';
import { ToastContainer } from './components/ToastContainer';
import { ToastNotification } from './types/toast';
import { playToastSound, isAudioEnabled, setAudioEnabled } from './utils/audioAlerts';
import { ALL_LABS, getLabById } from './data/labs';
import { CommandContext, processCommand, getCommandHistory, getSavedPivotingState, savePivotingState, clearSavedPivotingState } from './utils/commandEngine';
import { ExamQuestion, LabDefinition, NetworkHost, PivotingState, TerminalOutputLine } from './types/simulator';

// Lazy-loaded heavy modules and modals for bundle size optimization
const NetworkMap = React.lazy(() => import('./components/NetworkMap'));
const ExamQuestions = React.lazy(() => import('./components/ExamQuestions'));
const ExamGuide = React.lazy(() => import('./components/ExamGuide'));
const ExamNotes = React.lazy(() => import('./components/ExamNotes'));
const ExamResultsModal = React.lazy(() => import('./components/ExamResultsModal'));
const LabSelectorModal = React.lazy(() => import('./components/LabSelectorModal'));
const LootTrackerModal = React.lazy(() => import('./components/LootTrackerModal'));
const PentestReportModal = React.lazy(() => import('./components/PentestReportModal'));
const MetasploitPanel = React.lazy(() => import('./components/MetasploitPanel'));
import { 
  Terminal as TerminalIcon, 
  Network, 
  HelpCircle, 
  BookOpen, 
  FileText, 
  Clock, 
  ShieldCheck, 
  Play, 
  Pause, 
  RotateCcw, 
  Columns, 
  Award,
  ChevronDown,
  Layers,
  ExternalLink,
  Key,
  Download,
  Upload,
  GraduationCap,
  Lock,
  ShieldAlert,
  Zap,
  Volume2,
  VolumeX
} from 'lucide-react';

// Lightweight loading fallbacks for React.lazy & Suspense
const PanelLoadingFallback: React.FC<{ label?: string }> = ({ label = 'Cargando módulo...' }) => (
  <div className="h-full w-full min-h-[300px] flex flex-col items-center justify-center bg-slate-950/80 border border-slate-800 rounded-xl p-8 text-center animate-fadeIn select-none">
    <div className="relative flex items-center justify-center mb-4">
      <div className="w-12 h-12 rounded-full border-2 border-emerald-500/20 border-t-emerald-400 animate-spin" />
      <TerminalIcon className="w-5 h-5 text-emerald-400 absolute animate-pulse" />
    </div>
    <div className="font-mono text-sm text-slate-200 font-semibold mb-1">
      {label}
    </div>
    <div className="text-xs text-slate-500 font-mono">
      Optimización de rendimiento mediante React.lazy & Suspense
    </div>
  </div>
);

const ModalLoadingFallback: React.FC<{ label?: string }> = ({ label = 'Cargando recurso...' }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col items-center max-w-sm w-full">
      <div className="relative flex items-center justify-center mb-4">
        <div className="w-10 h-10 rounded-full border-2 border-emerald-500/20 border-t-emerald-400 animate-spin" />
        <Zap className="w-4 h-4 text-emerald-400 absolute" />
      </div>
      <h3 className="text-white text-sm font-semibold mb-1">{label}</h3>
      <p className="text-xs text-slate-400 font-mono animate-pulse text-center">
        Desempaquetando módulo seguro bajo demanda...
      </p>
    </div>
  </div>
);

export default function App() {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'terminal' | 'network' | 'questions' | 'guide' | 'notes'>('terminal');
  const [splitView, setSplitView] = useState<boolean>(false);

  // Active Lab State
  const [currentLab, setCurrentLab] = useState<LabDefinition>(() => {
    const savedLabId = localStorage.getItem('ejpt_active_lab_id');
    return savedLabId ? getLabById(savedLabId) : ALL_LABS[0];
  });
  const [isLabModalOpen, setIsLabModalOpen] = useState<boolean>(false);
  const [isLootModalOpen, setIsLootModalOpen] = useState<boolean>(false);
  const [isPentestReportModalOpen, setIsPentestReportModalOpen] = useState<boolean>(false);
  const [isMsfModalOpen, setIsMsfModalOpen] = useState<boolean>(false);

  // Lab and Network State
  const [hosts, setHosts] = useState<NetworkHost[]>(() => currentLab.hosts);
  const [commandContext, setCommandContext] = useState<CommandContext>(() => {
    let savedFlags = new Set<string>();
    let savedCompromised = new Set<string>();
    let savedDiscovered = new Set<string>();
    try {
      const rawF = localStorage.getItem(`ejpt_flags_${currentLab.id}`);
      if (rawF) savedFlags = new Set(JSON.parse(rawF));
      const rawC = localStorage.getItem(`ejpt_compromised_${currentLab.id}`);
      if (rawC) savedCompromised = new Set(JSON.parse(rawC));
      const rawD = localStorage.getItem(`ejpt_discovered_${currentLab.id}`);
      if (rawD) savedDiscovered = new Set(JSON.parse(rawD));
    } catch (e) {}

    const savedPivoting = getSavedPivotingState(currentLab.id);

    return {
      labId: currentLab.id,
      shellMode: 'kali',
      currentPath: '/home/kali',
      msfModule: '',
      pivoting: savedPivoting,
      discoveredHosts: savedDiscovered,
      compromisedHosts: savedCompromised,
      foundFlags: savedFlags,
      hosts: currentLab.hosts
    };
  });

  // Always holds the latest commandContext synchronously, even across multiple
  // onExecuteCommand calls fired back-to-back in the same tick (e.g. MetasploitPanel's
  // batched `use` + `set` + `exploit` sequence), where React state is still stale.
  const commandContextRef = useRef<CommandContext>(commandContext);
  useEffect(() => {
    commandContextRef.current = commandContext;
  }, [commandContext]);

  // Terminal Outputs
  const [terminalOutputs, setTerminalOutputs] = useState<TerminalOutputLine[]>(() => {
    const savedPivoting = getSavedPivotingState(currentLab.id);
    const initialLines: TerminalOutputLine[] = [
      {
        id: 'init-1',
        type: 'system',
        text: '═══════════════════════════════════════════════════════════════════════════════════\n' +
              `  eLearnSecurity Junior Penetration Tester v2 (eJPTv2) - ${currentLab.name.toUpperCase()}\n` +
              '  Desarrollado para: Un Fantasma en el Sistema (https://www.unfantasmaenelsistema.com)\n' +
              '═══════════════════════════════════════════════════════════════════════════════════',
        timestamp: Date.now()
      },
      {
        id: 'init-2',
        type: 'output',
        text: `[+] Conexión VPN OpenVPN establecida con éxito.\n` +
              `[+] Interfaz asignada: tun0 con IP ${currentLab.attackerIp}/24.\n` +
              `[+] Escenario activo: ${currentLab.name} (${currentLab.codeName})\n` +
              `    - Subred DMZ perimetral: ${currentLab.dmzSubnet}\n` +
              `    - Pasarela Dual-Homed: ${currentLab.pivotGatewayIp}\n` +
              `    - Subred Interna aislada: ${currentLab.internalSubnet} (Requiere Pivoting SOCKS5)\n` +
              `[+] Examen oficial cargado: 45 preguntas de certificación práctica.\n` +
              `[+] Comunidad de ciberseguridad: https://www.unfantasmaenelsistema.com\n\n` +
              `💡 Escribe \`ejpt-help\` o pulsa los botones de comandos rápidos para comenzar el reconocimiento.`,
        timestamp: Date.now() + 1
      }
    ];

    if (savedPivoting.isPivoted) {
      initialLines.push({
        id: 'init-pivoting-restored',
        type: 'success',
        text: `[+] [PERSISTENCIA] Estado de Pivoting restaurado desde almacenamiento local: túnel SOCKS5 activo en 127.0.0.1:${savedPivoting.proxyPort} hacia ${savedPivoting.routedSubnet}.`,
        timestamp: Date.now() + 2
      });
    }

    return initialLines;
  });

  // Exam Questions State (45 questions per lab)
  const [questions, setQuestions] = useState<ExamQuestion[]>(() => {
    const saved = localStorage.getItem(`ejpt_answers_${currentLab.id}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return currentLab.questions.map(q => ({
          ...q,
          userAnswer: parsed[q.id]?.userAnswer,
          isCorrect: parsed[q.id]?.isCorrect
        }));
      } catch (e) {
        // fallback
      }
    }
    return currentLab.questions;
  });

  // Timer State (48 Hours = 172800 Seconds) with auto-restore
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number>(() => {
    const saved = localStorage.getItem(`ejpt_time_${currentLab.id}`);
    return saved ? parseInt(saved, 10) : 48 * 3600;
  });
  const [isTimerPaused, setIsTimerPaused] = useState<boolean>(false);
  const [isPracticeMode, setIsPracticeMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('ejpt_is_practice_mode');
    return saved ? JSON.parse(saved) : false;
  });
  const [isResultsModalOpen, setIsResultsModalOpen] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Command History persistent across tab switches
  const [commandHistory, setCommandHistory] = useState<string[]>(() => {
    return getCommandHistory();
  });

  // Toast Notifications State & Sound Control
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [audioAlertsOn, setAudioAlertsOn] = useState<boolean>(() => isAudioEnabled());

  const addToast = (notification: Omit<ToastNotification, 'id' | 'timestamp'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newToast: ToastNotification = {
      ...notification,
      id,
      timestamp: Date.now()
    };
    playToastSound(notification.type);
    setToasts(prev => [newToast, ...prev].slice(0, 5));
  };

  const handleDismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const handleClearAllToasts = () => {
    setToasts([]);
  };

  const toggleAudioAlerts = () => {
    const nextVal = !audioAlertsOn;
    setAudioAlertsOn(nextVal);
    setAudioEnabled(nextVal);
    if (nextVal) {
      playToastSound('info');
    }
  };

  // Sync questions state to localStorage
  useEffect(() => {
    const map: Record<number, { userAnswer?: number | string; isCorrect?: boolean }> = {};
    questions.forEach(q => {
      if (q.userAnswer !== undefined) {
        map[q.id] = { userAnswer: q.userAnswer, isCorrect: q.isCorrect };
      }
    });
    localStorage.setItem(`ejpt_answers_${currentLab.id}`, JSON.stringify(map));
  }, [questions, currentLab.id]);

  // Auto-save session state (timer, flags, mode) to localStorage
  useEffect(() => {
    localStorage.setItem(`ejpt_time_${currentLab.id}`, timeRemainingSeconds.toString());
  }, [timeRemainingSeconds, currentLab.id]);

  useEffect(() => {
    localStorage.setItem('ejpt_is_practice_mode', JSON.stringify(isPracticeMode));
  }, [isPracticeMode]);

  useEffect(() => {
    localStorage.setItem(`ejpt_flags_${currentLab.id}`, JSON.stringify(Array.from(commandContext.foundFlags)));
    localStorage.setItem(`ejpt_compromised_${currentLab.id}`, JSON.stringify(Array.from(commandContext.compromisedHosts)));
    localStorage.setItem(`ejpt_discovered_${currentLab.id}`, JSON.stringify(Array.from(commandContext.discoveredHosts)));
    savePivotingState(currentLab.id, commandContext.pivoting);
  }, [commandContext.foundFlags, commandContext.compromisedHosts, commandContext.discoveredHosts, commandContext.pivoting, currentLab.id]);

  // Export Session to JSON
  const handleExportSession = () => {
    const sessionData = {
      version: 1,
      app: 'eJPTv2 Exam & Pivoting Simulator',
      community: 'Un Fantasma en el Sistema (https://www.unfantasmaenelsistema.com)',
      exportDate: new Date().toISOString(),
      labId: currentLab.id,
      labName: currentLab.name,
      isPracticeMode,
      timeRemainingSeconds,
      questions: questions.map(q => ({
        id: q.id,
        userAnswer: q.userAnswer,
        isCorrect: q.isCorrect
      })),
      foundFlags: Array.from(commandContext.foundFlags),
      compromisedHosts: Array.from(commandContext.compromisedHosts),
      discoveredHosts: Array.from(commandContext.discoveredHosts),
      pivoting: commandContext.pivoting,
      examNotes: localStorage.getItem('ejpt_exam_notes') || '',
      commandHistory
    };

    const blob = new Blob([JSON.stringify(sessionData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ejptv2_backup_${currentLab.codeName.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Import Session from JSON
  const handleImportSession = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (!data || !data.questions || !data.labId) {
          alert('El archivo JSON no contiene una estructura válida de sesión eJPTv2.');
          return;
        }

        const targetLab = getLabById(data.labId) || currentLab;
        setCurrentLab(targetLab);
        localStorage.setItem('ejpt_active_lab_id', targetLab.id);
        setHosts(targetLab.hosts);

        const answerMap: Record<number, { userAnswer?: any; isCorrect?: boolean }> = {};
        data.questions.forEach((item: any) => {
          answerMap[item.id] = { userAnswer: item.userAnswer, isCorrect: item.isCorrect };
        });
        setQuestions(targetLab.questions.map(q => ({
          ...q,
          userAnswer: answerMap[q.id]?.userAnswer,
          isCorrect: answerMap[q.id]?.isCorrect
        })));
        localStorage.setItem(`ejpt_answers_${targetLab.id}`, JSON.stringify(answerMap));

        const importedFlags = new Set<string>(data.foundFlags || []);
        const importedCompromised = new Set<string>(data.compromisedHosts || []);
        const importedDiscovered = new Set<string>(data.discoveredHosts || []);

        const importedPivoting: PivotingState = data.pivoting || {
          isPivoted: false,
          method: 'none',
          proxyPort: 1080,
          routedSubnet: ''
        };
        savePivotingState(targetLab.id, importedPivoting);

        setCommandContext(prev => ({
          ...prev,
          labId: targetLab.id,
          pivoting: importedPivoting,
          foundFlags: importedFlags,
          compromisedHosts: importedCompromised,
          discoveredHosts: importedDiscovered
        }));

        if (typeof data.timeRemainingSeconds === 'number') {
          setTimeRemainingSeconds(data.timeRemainingSeconds);
        }
        if (typeof data.isPracticeMode === 'boolean') {
          setIsPracticeMode(data.isPracticeMode);
        }
        if (data.examNotes) {
          localStorage.setItem('ejpt_exam_notes', data.examNotes);
        }
        if (Array.isArray(data.commandHistory)) {
          setCommandHistory(data.commandHistory);
        }

        setTerminalOutputs(prev => [
          ...prev,
          {
            id: `import-${Date.now()}`,
            type: 'system',
            text: `[+] ¡Sesión de examen importada con éxito desde JSON! Respuestas, notas, botín y túnel SOCKS5 restaurados para ${targetLab.name}.`,
            timestamp: Date.now()
          }
        ]);
      } catch (err) {
        alert('Error al leer o procesar el archivo JSON de respaldo.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Timer tick
  useEffect(() => {
    if (isPracticeMode || isTimerPaused) return;

    const timer = setInterval(() => {
      setTimeRemainingSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsResultsModalOpen(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isTimerPaused, isPracticeMode]);

  // Switch lab handler
  const handleSelectLab = (lab: LabDefinition) => {
    setCurrentLab(lab);
    localStorage.setItem('ejpt_active_lab_id', lab.id);
    setHosts(lab.hosts);

    // Load saved or fresh questions for this lab
    const saved = localStorage.getItem(`ejpt_answers_${lab.id}`);
    let loadedQuestions = lab.questions;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        loadedQuestions = lab.questions.map(q => ({
          ...q,
          userAnswer: parsed[q.id]?.userAnswer,
          isCorrect: parsed[q.id]?.isCorrect
        }));
      } catch (e) {
        // fallback
      }
    }
    setQuestions(loadedQuestions);

    const savedPivoting = getSavedPivotingState(lab.id);
    let savedFlags = new Set<string>();
    let savedCompromised = new Set<string>();
    let savedDiscovered = new Set<string>();
    try {
      const rawF = localStorage.getItem(`ejpt_flags_${lab.id}`);
      if (rawF) savedFlags = new Set(JSON.parse(rawF));
      const rawC = localStorage.getItem(`ejpt_compromised_${lab.id}`);
      if (rawC) savedCompromised = new Set(JSON.parse(rawC));
      const rawD = localStorage.getItem(`ejpt_discovered_${lab.id}`);
      if (rawD) savedDiscovered = new Set(JSON.parse(rawD));
    } catch (e) {}

    // Reset command context with persistent data
    setCommandContext({
      labId: lab.id,
      shellMode: 'kali',
      currentPath: '/home/kali',
      msfModule: '',
      pivoting: savedPivoting,
      discoveredHosts: savedDiscovered,
      compromisedHosts: savedCompromised,
      foundFlags: savedFlags,
      hosts: lab.hosts
    });

    // Reset terminal banner
    const switchOutputs: TerminalOutputLine[] = [
      {
        id: `switch-1-${Date.now()}`,
        type: 'system',
        text: '═══════════════════════════════════════════════════════════════════════════════════\n' +
              `  [LABORATORIO CARGADO] ${lab.name.toUpperCase()}\n` +
              '═══════════════════════════════════════════════════════════════════════════════════',
        timestamp: Date.now()
      },
      {
        id: `switch-2-${Date.now()}`,
        type: 'output',
        text: `[+] Conexión VPN reconfigurada para el nuevo entorno.\n` +
              `[+] Interfaz tun0 asignada: ${lab.attackerIp}/24.\n` +
              `[+] Rango DMZ: ${lab.dmzSubnet} | Red Interna: ${lab.internalSubnet}\n` +
              `[+] Cuestionario de ${lab.questions.length} preguntas preparado.`,
        timestamp: Date.now() + 1
      }
    ];

    if (savedPivoting.isPivoted) {
      switchOutputs.push({
        id: `switch-pivot-${Date.now()}`,
        type: 'success',
        text: `[+] [PIVOTING RESTAURADO] Túnel SOCKS5 activo (127.0.0.1:${savedPivoting.proxyPort}) enrutando hacia ${savedPivoting.routedSubnet}.`,
        timestamp: Date.now() + 2
      });
    }

    setTerminalOutputs(switchOutputs);

    addToast({
      type: 'info',
      title: `Laboratorio: ${lab.name}`,
      message: `VPN tun0 conectada en ${lab.attackerIp}. Subred DMZ: ${lab.dmzSubnet}. ¡Inicia el reconocimiento con netdiscover o nmap!`,
      actionLabel: 'Abrir Terminal',
      onAction: () => setActiveTab('terminal')
    });
  };

  // Command Execution
  const handleExecuteCommand = (cmd: string) => {
    // Read from the ref, not the `commandContext` state closure: callers like
    // MetasploitPanel fire several onExecuteCommand calls synchronously in the
    // same tick (e.g. `use <module>` immediately followed by `exploit`), and
    // React won't have committed the state update from the first call yet.
    const prevCtx = commandContextRef.current;
    const promptText = getPromptString(prevCtx);
    const cmdLine: TerminalOutputLine = {
      // Date.now() alone collides when several commands run within the same
      // millisecond (e.g. MetasploitPanel's batched `set` calls), producing
      // duplicate React keys in Terminal's output list.
      id: `cmd-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: 'command',
      prompt: promptText,
      text: cmd,
      timestamp: Date.now()
    };

    const { lines, nextCtx } = processCommand(cmd, prevCtx);

    // Keep commandHistory state synchronized with sessionStorage
    setCommandHistory(getCommandHistory());

    commandContextRef.current = nextCtx;
    setCommandContext(nextCtx);

    // If clear command
    if (lines.length === 1 && lines[0].text === '__CLEAR__') {
      setTerminalOutputs([]);
      return;
    }

    setTerminalOutputs(prev => [...prev, cmdLine, ...lines]);

    // Update host rootCompromised status if escalated
    if (nextCtx.shellMode.includes('_root')) {
      const rootIpMap: Record<string, string> = {
        ssh_target50_root: '192.168.100.50',
        ssh_target55_root: '192.168.100.55',
        ssh_target60_root: '192.168.100.60',
        ssh_fintech100_root: '172.16.50.100'
      };
      const targetIp = rootIpMap[nextCtx.shellMode];
      if (targetIp) {
        setHosts(prev => prev.map(h => (h.ip === targetIp || h.secondaryIp === targetIp) ? { ...h, rootCompromised: true, compromised: true } : h));
      }
    }

    // 1. Toast Notification for Newly Discovered Hosts
    if (nextCtx.discoveredHosts.size > prevCtx.discoveredHosts.size) {
      const newlyDiscovered = Array.from(nextCtx.discoveredHosts).filter(ip => !prevCtx.discoveredHosts.has(ip));
      newlyDiscovered.forEach(ip => {
        const hostObj = hosts.find(h => h.ip === ip || h.secondaryIp === ip);
        addToast({
          type: 'discovery',
          title: `Nuevo Host Descubierto: ${ip}`,
          message: `${hostObj?.hostname ? `Host ${hostObj.hostname}` : 'Nodo activo'} en subred ${hostObj?.subnet ? hostObj.subnet.toUpperCase() : 'DMZ'} (${hostObj?.os || 'Linux'}). ${hostObj?.ports?.length ? `Puertos: ${hostObj.ports.map(p => p.port).join(', ')}` : ''}`,
          ip,
          hostname: hostObj?.hostname,
          subnet: hostObj?.subnet,
          actionLabel: 'Ver en Mapa',
          onAction: () => setActiveTab('network')
        });
      });
    }

    // 2. Toast Notification for Newly Compromised Machines
    if (nextCtx.compromisedHosts.size > prevCtx.compromisedHosts.size) {
      const newlyCompromised = Array.from(nextCtx.compromisedHosts).filter(ip => !prevCtx.compromisedHosts.has(ip));
      newlyCompromised.forEach(ip => {
        const hostObj = hosts.find(h => h.ip === ip || h.secondaryIp === ip);
        addToast({
          type: 'compromise',
          title: `¡Máquina Comprometida! ${ip}`,
          message: `Acceso y shell obtenida en ${hostObj?.hostname || 'Target'} (${hostObj?.os || 'Sistema'}). ¡Vector de intrusión exitoso!`,
          ip,
          hostname: hostObj?.hostname,
          subnet: hostObj?.subnet,
          actionLabel: 'Ver en Mapa',
          onAction: () => setActiveTab('network')
        });
      });
    }

    // 3. Toast Notification for Root Privilege Escalation
    if (nextCtx.shellMode.includes('_root') && !prevCtx.shellMode.includes('_root')) {
      const rootNames: Record<string, string> = {
        ssh_target50_root: 'target-web-01 (192.168.100.50)',
        ssh_target55_root: 'target-ftp-02 (192.168.100.55)',
        ssh_target60_root: 'target-gateway-03 (192.168.100.60)',
        ssh_fintech100_root: 'edge-gateway (172.16.50.100)'
      };
      const label = rootNames[nextCtx.shellMode] || nextCtx.shellMode;
      addToast({
        type: 'root',
        title: '👑 ¡Escalación a Root Exitosa!',
        message: `Control total y privilegios administrativos de superusuario (uid=0 root) en ${label}.`,
        actionLabel: 'Ver en Mapa',
        onAction: () => setActiveTab('network')
      });
    }

    // 4. Toast Notification for Captured Flags & Auto-fill questions
    if (nextCtx.foundFlags.size > prevCtx.foundFlags.size) {
      const newlyFlags = Array.from(nextCtx.foundFlags).filter(flagId => !prevCtx.foundFlags.has(flagId));
      newlyFlags.forEach(flagId => {
        const relQuestion = questions.find(q => q.flagKey === flagId);
        let flagTitle = flagId;
        for (const h of hosts) {
          const fl = h.flags.find(f => f.id === flagId || f.value.includes(flagId));
          if (fl) {
            flagTitle = fl.name;
            break;
          }
        }
        addToast({
          type: 'flag',
          title: '🚩 ¡Flag de Certificación Capturada!',
          message: `${flagTitle}. Registrada en botín y validada en pregunta #${relQuestion?.id || 'Auto'}.`,
          actionLabel: 'Ver Botín',
          onAction: () => setIsLootModalOpen(true)
        });
      });

      nextCtx.foundFlags.forEach(flagId => {
        setQuestions(prev => prev.map(q => {
          if (q.isFlagQuestion && q.flagKey === flagId && q.userAnswer === undefined) {
            return {
              ...q,
              userAnswer: 0,
              isCorrect: true
            };
          }
          return q;
        }));
      });
    }

    // 5. Toast Notification for Pivoting Activation
    if (nextCtx.pivoting.isPivoted && !prevCtx.pivoting.isPivoted) {
      addToast({
        type: 'pivot',
        title: '⚡ ¡Túnel SOCKS5 Pivoting Activo!',
        message: `Pasarela dinámica 127.0.0.1:${nextCtx.pivoting.proxyPort || 1080} lista. Red interna ${nextCtx.pivoting.routedSubnet || '10.10.10.0/24'} alcanzable vía proxychains.`,
        actionLabel: 'Ver Topología',
        onAction: () => setActiveTab('network')
      });
    }
  };

  const getPromptString = (ctx: CommandContext) => {
    switch (ctx.shellMode) {
      case 'ssh_target50':
        return 'sysadmin@target-web-01:~$ ';
      case 'ssh_target50_root':
        return 'root@target-web-01:~# ';
      case 'ssh_target55':
        return 'mike@target-ftp-02:~$ ';
      case 'ssh_target55_root':
        return 'root@target-ftp-02:~# ';
      case 'ssh_target60':
        return 'pivotuser@target-gateway-03:~$ ';
      case 'ssh_target60_root':
        return 'root@target-gateway-03:~# ';
      case 'ssh_fintech100':
        return 'routeradm@edge-gateway:~$ ';
      case 'ssh_fintech100_root':
        return 'root@edge-gateway:~# ';
      case 'msf':
        return ctx.msfModule ? `msf6 (${ctx.msfModule.split('/').slice(-2).join('/')}) > ` : 'msf6 > ';
      case 'meterpreter':
        return 'meterpreter > ';
      case 'win_cmd':
        return 'C:\\Windows\\system32> ';
      case 'kali':
      default:
        return 'kali@kali:~$ ';
    }
  };

  const handleClearTerminal = () => {
    setTerminalOutputs([]);
  };

  // Question Answer Change
  const handleAnswerChange = (questionId: number, answer: number | string) => {
    setQuestions(prev => prev.map(q => {
      if (q.id === questionId) {
        let isCorrect = false;
        if (q.isFlagQuestion) {
          const strAns = String(answer).trim();
          const expected = q.options[0].trim();
          isCorrect = strAns.toLowerCase() === expected.toLowerCase() || strAns.includes(expected);
        } else {
          isCorrect = answer === q.correctAnswer;
        }

        if (isCorrect && !q.isCorrect && q.isFlagQuestion) {
          addToast({
            type: 'flag',
            title: '¡Flag Confirmada en Examen!',
            message: `Pregunta #${q.id}: Flag validada con éxito. Sumas puntos para el aprobado.`,
            actionLabel: 'Ver Botín',
            onAction: () => setIsLootModalOpen(true)
          });
        }

        return {
          ...q,
          userAnswer: answer,
          isCorrect
        };
      }
      return q;
    }));
  };

  // Submit Exam
  const handleSubmitExam = () => {
    setIsResultsModalOpen(true);
  };

  // Reset Everything
  const handleResetExam = () => {
    if (window.confirm('¿Reiniciar todo el entorno del laboratorio actual, preguntas y terminal?')) {
      localStorage.removeItem(`ejpt_answers_${currentLab.id}`);
      localStorage.removeItem(`ejpt_flags_${currentLab.id}`);
      localStorage.removeItem(`ejpt_compromised_${currentLab.id}`);
      localStorage.removeItem(`ejpt_discovered_${currentLab.id}`);
      clearSavedPivotingState(currentLab.id);
      setQuestions(currentLab.questions.map(q => ({ ...q, userAnswer: undefined, isCorrect: undefined })));
      setTimeRemainingSeconds(48 * 3600);
      setCommandContext({
        labId: currentLab.id,
        shellMode: 'kali',
        currentPath: '/home/kali',
        msfModule: '',
        pivoting: {
          isPivoted: false,
          method: 'none',
          proxyPort: 1080,
          routedSubnet: ''
        },
        discoveredHosts: new Set<string>(),
        compromisedHosts: new Set<string>(),
        foundFlags: new Set<string>(),
        hosts: currentLab.hosts
      });
      setTerminalOutputs([
        {
          id: 'reset-init',
          type: 'system',
          text: `[+] Laboratorio ${currentLab.name} reiniciado. Nueva sesión inicializada en tun0 (${currentLab.attackerIp}).`,
          timestamp: Date.now()
        }
      ]);
    }
  };

  // Format Timer
  const formatTimer = (totalSecs: number) => {
    const hours = Math.floor(totalSecs / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);
    const seconds = totalSecs % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const currentScore = questions.filter(q => q.isCorrect).length;

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans select-none">
      
      {/* 1. TOP STATUS HUD */}
      <header className="h-14 bg-slate-900/90 border-b border-slate-800 px-4 flex items-center justify-between shrink-0 z-20 backdrop-blur">
        
        {/* Brand / Lab Title with Un Fantasma en el Sistema Logo */}
        <div className="flex items-center space-x-3">
          <a
            href="https://www.unfantasmaenelsistema.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative flex items-center justify-center w-10 h-10 rounded-xl bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 hover:border-emerald-500/60 shadow-lg shadow-black/40 transition-all cursor-pointer p-1 shrink-0"
            title="Un Fantasma en el Sistema - Visitar web oficial (www.unfantasmaenelsistema.com)"
          >
            <img
              src="/icono.png"
              alt="Un Fantasma en el Sistema Logo"
              className="w-full h-full object-contain group-hover:scale-110 transition-transform filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
              referrerPolicy="no-referrer"
            />
            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center text-[8px] text-white font-bold" title="Verificado">
              ✓
            </span>
          </a>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm tracking-wide">
                eJPTv2 Lab & Pivoting Simulator
              </span>
              <a
                href="https://www.unfantasmaenelsistema.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 hover:underline transition-colors"
                title="Visitar web oficial de Un Fantasma en el Sistema"
              >
                <span>unfantasmaenelsistema.com</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
              <button
                onClick={() => setIsLabModalOpen(true)}
                className="flex items-center gap-1 text-[11px] font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/40 transition-colors"
                title="Cambiar escenario de laboratorio"
              >
                <span>{currentLab.codeName}</span>
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-2">
              <span className="flex items-center gap-1 font-mono text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                tun0: {currentLab.attackerIp}
              </span>
              <span>•</span>
              <span className="hidden sm:inline">{currentLab.name}</span>
            </div>
          </div>
        </div>

        {/* Center: Pivoting Status Pill */}
        <div className="hidden lg:flex items-center">
          <div className={`px-3 py-1 rounded-full border text-xs font-mono font-semibold flex items-center gap-2 transition-all ${
            commandContext.pivoting.isPivoted
              ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-lg shadow-emerald-500/20 animate-pulse'
              : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
          }`}>
            <span className={`w-2 h-2 rounded-full ${commandContext.pivoting.isPivoted ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            {commandContext.pivoting.isPivoted ? (
              <span>SOCKS5 PIVOT ACTIVO (:1080 ➔ {currentLab.internalSubnet})</span>
            ) : (
              <span>PIVOTING INACTIVO (Red {currentLab.internalSubnet} aislada)</span>
            )}
          </div>
        </div>

        {/* Right Controls: Timer, Mode, Score */}
        <div className="flex items-center space-x-2 sm:space-x-2.5">

          {/* Sound Alerts Toggle */}
          <button
            onClick={toggleAudioAlerts}
            className={`p-1.5 rounded-lg border text-xs transition-colors ${
              audioAlertsOn 
                ? 'bg-slate-800 text-emerald-400 border-slate-700 hover:bg-slate-700' 
                : 'bg-slate-800/60 text-slate-500 border-slate-800 hover:text-slate-300'
            }`}
            title={audioAlertsOn ? 'Alertas sonoras activadas (Click para silenciar)' : 'Alertas sonoras silenciadas (Click para activar)'}
          >
            {audioAlertsOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>
          
          {/* Lab Selector Button */}
          <button
            onClick={() => setIsLabModalOpen(true)}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors"
            title="Cambiar escenario de laboratorio"
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Labs</span>
          </button>

          {/* Backup & Restore Session Buttons */}
          <button
            onClick={handleExportSession}
            className="hidden lg:flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-300 border border-slate-700 text-xs font-medium transition-colors"
            title="Exportar sesión (.json) con respuestas, notas y progreso"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Exportar</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="hidden lg:flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-purple-300 border border-slate-700 text-xs font-medium transition-colors"
            title="Importar sesión guardada (.json)"
          >
            <Upload className="w-3.5 h-3.5 text-purple-400" />
            <span>Importar</span>
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImportSession} 
            accept=".json" 
            className="hidden" 
          />

          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setIsPracticeMode(false)}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1 ${
                !isPracticeMode ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Simulacro Real eJPTv2: Cronómetro de 48h, respuestas y pistas bloqueadas hasta entregar"
            >
              <Lock className="w-3 h-3" />
              <span>Simulacro 48h</span>
            </button>
            <button
              onClick={() => setIsPracticeMode(true)}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1 ${
                isPracticeMode ? 'bg-purple-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Modo Tutor Guiado: Pistas técnicas escalonadas en 3 niveles y evaluación inmediata"
            >
              <GraduationCap className="w-3 h-3" />
              <span>Modo Tutor</span>
            </button>
          </div>

          {/* Exam Timer */}
          {!isPracticeMode && (
            <div className="flex items-center space-x-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 text-xs font-mono">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-bold text-white tracking-wider">{formatTimer(timeRemainingSeconds)}</span>
              <button
                onClick={() => setIsTimerPaused(!isTimerPaused)}
                className="p-0.5 text-slate-400 hover:text-white"
                title={isTimerPaused ? 'Reanudar tiempo' : 'Pausar tiempo'}
              >
                {isTimerPaused ? <Play className="w-3 h-3 text-emerald-400" /> : <Pause className="w-3 h-3" />}
              </button>
            </div>
          )}

          {/* Score counter (45 questions) */}
          <div className="flex items-center space-x-1.5 bg-slate-950 px-3 py-1 rounded-lg border border-slate-800 text-xs">
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-mono font-bold text-emerald-400">{currentScore}</span>
            <span className="text-slate-500 font-mono">/ {questions.length}</span>
          </div>

          {/* Reset button */}
          <button
            onClick={handleResetExam}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-rose-400 rounded-lg border border-slate-700 transition-colors"
            title="Reiniciar laboratorio"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* 2. NAVIGATION BAR */}
      <nav className="h-11 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between shrink-0 text-xs">
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setActiveTab('terminal')}
            className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
              activeTab === 'terminal'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <TerminalIcon className="w-4 h-4 text-emerald-400" />
            <span>Terminal Kali Linux</span>
          </button>

          <button
            onClick={() => setActiveTab('network')}
            className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
              activeTab === 'network'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Network className="w-4 h-4 text-cyan-400" />
            <span>Mapa de Red & Topología ({hosts.length})</span>
            {commandContext.pivoting.isPivoted && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('questions')}
            className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
              activeTab === 'questions'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <HelpCircle className="w-4 h-4 text-amber-400" />
            <span>Cuestionario Oficial ({questions.length})</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
              {currentScore}/{questions.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
              activeTab === 'guide'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4 text-purple-400" />
            <span>Guía & Pivoting</span>
          </button>

          <button
            onClick={() => setActiveTab('notes')}
            className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
              activeTab === 'notes'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <FileText className="w-4 h-4 text-blue-400" />
            <span>Cuaderno de Notas</span>
          </button>

          {/* Loot Vault & Cross-User Wordlists Button */}
          <button
            onClick={() => setIsLootModalOpen(true)}
            className="px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 shadow-sm"
            title="Bóveda de Botín, Flags y Generador de Diccionarios Cruzados (User=Pass, Reutilización eJPTv2)"
          >
            <Key className="w-4 h-4 text-amber-400" />
            <span>Botín & Flags</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/30 text-amber-200 font-bold">
              {commandContext.foundFlags.size}
            </span>
          </button>

          {/* Professional Pentest Report (Portfolio) */}
          <button
            onClick={() => setIsPentestReportModalOpen(true)}
            className="px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 shadow-sm"
            title="Generador de Informe Técnico Profesional de Penetration Testing (Portafolio, CVE, CVSS, PoC y Remediación)"
          >
            <ShieldAlert className="w-4 h-4 text-emerald-400" />
            <span>Informe Pentest</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/30 text-emerald-200 font-bold">
              Portafolio
            </span>
          </button>

          {/* Metasploit Exploit Hub Modal */}
          <button
            onClick={() => setIsMsfModalOpen(true)}
            className="px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all text-sky-300 bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/40 shadow-sm"
            title="Panel de Módulos y Opciones de Metasploit (RHOSTS, LHOST, PAYLOAD, Exploit Runner)"
          >
            <Zap className="w-4 h-4 text-sky-400 animate-pulse" />
            <span>Metasploit Hub</span>
            {commandContext.msfModule && (
              <span className="hidden xl:inline text-[10px] font-mono px-1.5 py-0.2 rounded bg-sky-500/30 text-sky-200">
                {commandContext.msfModule.split('/').pop()}
              </span>
            )}
          </button>
        </div>

        {/* Right Nav Actions: Un Fantasma en el Sistema & Split View */}
        <div className="flex items-center gap-2">
          <a
            href="https://www.unfantasmaenelsistema.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800/80 hover:bg-slate-800 text-slate-200 hover:text-emerald-300 border border-slate-700/80 hover:border-emerald-500/50 transition-all shadow-sm group"
            title="Visitar blog, formación y recursos en https://www.unfantasmaenelsistema.com/"
          >
            <img 
              src="/icono.png" 
              alt="Logo Un Fantasma en el Sistema" 
              className="w-4 h-4 object-contain group-hover:scale-110 transition-transform" 
              referrerPolicy="no-referrer" 
            />
            <span className="hidden sm:inline">Un Fantasma en el Sistema</span>
            <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-emerald-400 transition-colors" />
          </a>

          {/* Split View Toggle */}
          <button
            onClick={() => setSplitView(!splitView)}
            className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
              splitView
                ? 'bg-slate-800 text-emerald-400 border-emerald-500/40'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border-slate-800'
            }`}
            title="Dividir pantalla para ver terminal y panel al mismo tiempo"
          >
            <Columns className="w-3.5 h-3.5" />
            <span>{splitView ? 'Vista Dividida (ON)' : 'Dividir Pantalla'}</span>
          </button>
        </div>
      </nav>

      {/* 3. MAIN WORKSPACE */}
      <main className="flex-1 p-3 overflow-hidden bg-slate-950">
        {splitView ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 h-full">
            {/* Left Column: Fixed Terminal */}
            <div className="h-full">
              <Terminal
                outputs={terminalOutputs}
                onExecute={handleExecuteCommand}
                onClear={handleClearTerminal}
                context={commandContext}
                externalHistory={commandHistory}
                onHistoryUpdate={setCommandHistory}
              />
            </div>

            {/* Right Column: Other active tab */}
            <div className="h-full overflow-hidden">
              <React.Suspense fallback={<PanelLoadingFallback label="Cargando panel de trabajo..." />}>
                {activeTab === 'terminal' ? (
                  <ExamQuestions
                    questions={questions}
                    onAnswerChange={handleAnswerChange}
                    onSubmitExam={handleSubmitExam}
                    isPracticeMode={isPracticeMode}
                    score={currentScore}
                  />
                ) : activeTab === 'network' ? (
                  <NetworkMap
                    hosts={hosts}
                    pivoting={commandContext.pivoting}
                    discoveredHosts={commandContext.discoveredHosts}
                    compromisedHosts={commandContext.compromisedHosts}
                    foundFlags={commandContext.foundFlags}
                    onSelectCommand={handleExecuteCommand}
                    attackerIp={currentLab.attackerIp}
                    dmzSubnet={currentLab.dmzSubnet}
                    internalSubnet={currentLab.internalSubnet}
                  />
                ) : activeTab === 'questions' ? (
                  <ExamQuestions
                    questions={questions}
                    onAnswerChange={handleAnswerChange}
                    onSubmitExam={handleSubmitExam}
                    isPracticeMode={isPracticeMode}
                    score={currentScore}
                  />
                ) : activeTab === 'guide' ? (
                  <ExamGuide onCopyCommand={handleExecuteCommand} />
                ) : (
                  <ExamNotes 
                    onOpenPentestReport={() => setIsPentestReportModalOpen(true)}
                    hosts={hosts}
                    compromisedHosts={commandContext.compromisedHosts}
                    discoveredHosts={commandContext.discoveredHosts}
                    foundFlags={commandContext.foundFlags}
                    timeRemainingSeconds={timeRemainingSeconds}
                    currentLab={currentLab}
                  />
                )}
              </React.Suspense>
            </div>
          </div>
        ) : (
          <div className="h-full">
            {activeTab === 'terminal' && (
              <Terminal
                outputs={terminalOutputs}
                onExecute={handleExecuteCommand}
                onClear={handleClearTerminal}
                context={commandContext}
                externalHistory={commandHistory}
                onHistoryUpdate={setCommandHistory}
              />
            )}
            {activeTab === 'network' && (
              <React.Suspense fallback={<PanelLoadingFallback label="Cargando mapa y topología de red interactiva..." />}>
                <NetworkMap
                  hosts={hosts}
                  pivoting={commandContext.pivoting}
                  discoveredHosts={commandContext.discoveredHosts}
                  compromisedHosts={commandContext.compromisedHosts}
                  foundFlags={commandContext.foundFlags}
                  onSelectCommand={(cmd) => {
                    handleExecuteCommand(cmd);
                    setActiveTab('terminal');
                  }}
                  attackerIp={currentLab.attackerIp}
                  dmzSubnet={currentLab.dmzSubnet}
                  internalSubnet={currentLab.internalSubnet}
                />
              </React.Suspense>
            )}
            {activeTab === 'questions' && (
              <React.Suspense fallback={<PanelLoadingFallback label="Cargando banco de preguntas oficiales eJPTv2..." />}>
                <ExamQuestions
                  questions={questions}
                  onAnswerChange={handleAnswerChange}
                  onSubmitExam={handleSubmitExam}
                  isPracticeMode={isPracticeMode}
                  score={currentScore}
                />
              </React.Suspense>
            )}
            {activeTab === 'guide' && (
              <React.Suspense fallback={<PanelLoadingFallback label="Cargando guía técnica y metodología de pivoting..." />}>
                <ExamGuide onCopyCommand={(cmd) => {
                  handleExecuteCommand(cmd);
                  setActiveTab('terminal');
                }} />
              </React.Suspense>
            )}
            {activeTab === 'notes' && (
              <React.Suspense fallback={<PanelLoadingFallback label="Cargando cuaderno de notas y métricas de auditoría..." />}>
                <ExamNotes 
                  onOpenPentestReport={() => setIsPentestReportModalOpen(true)}
                  hosts={hosts}
                  compromisedHosts={commandContext.compromisedHosts}
                  discoveredHosts={commandContext.discoveredHosts}
                  foundFlags={commandContext.foundFlags}
                  timeRemainingSeconds={timeRemainingSeconds}
                  currentLab={currentLab}
                />
              </React.Suspense>
            )}
          </div>
        )}
      </main>

      {/* 4. LAB SELECTOR MODAL (Lazy Loaded) */}
      {isLabModalOpen && (
        <React.Suspense fallback={<ModalLoadingFallback label="Cargando catálogo de escenarios de laboratorio..." />}>
          <LabSelectorModal
            isOpen={isLabModalOpen}
            onClose={() => setIsLabModalOpen(false)}
            activeLabId={currentLab.id}
            onSelectLab={handleSelectLab}
          />
        </React.Suspense>
      )}

      {/* 5. EXAM RESULTS MODAL (Lazy Loaded) */}
      {isResultsModalOpen && (
        <React.Suspense fallback={<ModalLoadingFallback label="Cargando informe de resultados y certificación..." />}>
          <ExamResultsModal
            isOpen={isResultsModalOpen}
            onClose={() => setIsResultsModalOpen(false)}
            questions={questions}
            onResetExam={handleResetExam}
            totalTimeSpentSeconds={48 * 3600 - timeRemainingSeconds}
            lab={currentLab}
            onOpenPentestReport={() => {
              setIsResultsModalOpen(false);
              setIsPentestReportModalOpen(true);
            }}
          />
        </React.Suspense>
      )}

      {/* 6. LOOT TRACKER & CROSS-USER WORDLISTS MODAL (Lazy Loaded) */}
      {isLootModalOpen && (
        <React.Suspense fallback={<ModalLoadingFallback label="Cargando gestor de botín y contraseñas..." />}>
          <LootTrackerModal
            isOpen={isLootModalOpen}
            onClose={() => setIsLootModalOpen(false)}
            hosts={hosts}
            foundFlags={commandContext.foundFlags}
            discoveredHosts={commandContext.discoveredHosts}
            compromisedHosts={commandContext.compromisedHosts}
            questions={questions}
            onAnswerFlagQuestion={(qid, answer) => handleAnswerChange(qid, answer)}
            onExecuteCommand={(cmd) => {
              handleExecuteCommand(cmd);
              setActiveTab('terminal');
            }}
            currentLabName={currentLab.name}
          />
        </React.Suspense>
      )}

      {/* 7. PROFESSIONAL PENTEST REPORT (PORTFOLIO) MODAL (Lazy Loaded) */}
      {isPentestReportModalOpen && (
        <React.Suspense fallback={<ModalLoadingFallback label="Compilando informe ejecutivo y técnico de pentest..." />}>
          <PentestReportModal
            isOpen={isPentestReportModalOpen}
            onClose={() => setIsPentestReportModalOpen(false)}
            currentLab={currentLab}
          />
        </React.Suspense>
      )}

      {/* 8. METASPLOIT EXPLOIT HUB MODAL (Lazy Loaded) */}
      {isMsfModalOpen && (
        <React.Suspense fallback={<ModalLoadingFallback label="Cargando Metasploit Framework Hub..." />}>
          <MetasploitPanel
            context={commandContext}
            onExecuteCommand={(cmd) => {
              handleExecuteCommand(cmd);
              setActiveTab('terminal');
            }}
            isModal={true}
            isOpen={isMsfModalOpen}
            onClose={() => setIsMsfModalOpen(false)}
          />
        </React.Suspense>
      )}

      {/* 9. REAL-TIME TOAST NOTIFICATIONS */}
      <ToastContainer
        toasts={toasts}
        onDismiss={handleDismissToast}
        onClearAll={handleClearAllToasts}
      />
    </div>
  );
}
