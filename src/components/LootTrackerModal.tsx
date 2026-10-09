import React, { useState, useMemo } from 'react';
import { NetworkHost, ExamQuestion } from '../types/simulator';
import { 
  Key, 
  Flag, 
  Copy, 
  Check, 
  Terminal, 
  ExternalLink, 
  ShieldCheck, 
  ShieldAlert, 
  Sparkles, 
  Download, 
  X, 
  Search, 
  CheckCircle2, 
  Lock, 
  Unlock, 
  Users, 
  FileText, 
  Zap,
  ArrowRight,
  Database,
  Server,
  HelpCircle
} from 'lucide-react';

interface LootTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  hosts: NetworkHost[];
  foundFlags: Set<string>;
  discoveredHosts: Set<string>;
  compromisedHosts: Set<string>;
  questions: ExamQuestion[];
  onAnswerFlagQuestion?: (questionId: number, answer: number | string) => void;
  onExecuteCommand?: (cmd: string) => void;
  currentLabName: string;
}

export const LootTrackerModal: React.FC<LootTrackerModalProps> = ({
  isOpen,
  onClose,
  hosts,
  foundFlags,
  discoveredHosts,
  compromisedHosts,
  questions,
  onAnswerFlagQuestion,
  onExecuteCommand,
  currentLabName
}) => {
  const [activeTab, setActiveTab] = useState<'flags' | 'creds' | 'wordlists'>('flags');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [filledQuestions, setFilledQuestions] = useState<Set<number>>(new Set());

  // Wordlist generator state
  const [wordlistMode, setWordlistMode] = useState<'user_as_pass' | 'cross_permutations' | 'mutations'>('cross_permutations');
  const [customWordlistInput, setCustomWordlistInput] = useState<string>('');

  if (!isOpen) return null;

  const copyToClipboard = (text: string, keyId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyId);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  // 1. Gather all flags across hosts
  const allFlags = useMemo(() => {
    const list: {
      host: NetworkHost;
      flagId: string;
      name: string;
      path: string;
      value: string;
      description: string;
      isCaptured: boolean;
      associatedQuestion?: ExamQuestion;
    }[] = [];

    hosts.forEach(host => {
      host.flags.forEach(flag => {
        const isCaptured = foundFlags.has(flag.id);
        const associatedQuestion = questions.find(q => q.flagKey === flag.id || q.question.toLowerCase().includes(flag.name.toLowerCase()));
        list.push({
          host,
          flagId: flag.id,
          name: flag.name,
          path: flag.path,
          value: flag.value,
          description: flag.description,
          isCaptured,
          associatedQuestion
        });
      });
    });

    return list;
  }, [hosts, foundFlags, questions]);

  // 2. Gather all credentials across hosts
  const allCredentials = useMemo(() => {
    const list: {
      host: NetworkHost;
      username: string;
      password?: string;
      service: string;
      isHostCompromised: boolean;
    }[] = [];

    hosts.forEach(host => {
      if (host.credentials) {
        host.credentials.forEach(cred => {
          list.push({
            host,
            username: cred.username,
            password: cred.password || '(vacía / anonymous)',
            service: cred.service,
            isHostCompromised: compromisedHosts.has(host.ip)
          });
        });
      }
    });

    return list;
  }, [hosts, compromisedHosts]);

  // 3. Harvest unique usernames discovered across all machines
  const harvestedUsernames = useMemo(() => {
    const userSet = new Set<string>();
    
    // Core usernames from lab hosts
    hosts.forEach(host => {
      if (host.credentials) {
        host.credentials.forEach(c => {
          if (c.username && c.username !== 'anonymous') userSet.add(c.username);
        });
      }
    });

    // Add common eJPTv2 discovered usernames for dictionary attacks
    ['sysadmin', 'mike', 'pivotuser', 'developer', 'itadmin', 'sysuser', 'administrator', 'root'].forEach(u => userSet.add(u));

    return Array.from(userSet);
  }, [hosts]);

  // 4. Generate dynamic wordlist based on selected mode
  const generatedWordlist = useMemo(() => {
    const lines: string[] = [];

    if (wordlistMode === 'user_as_pass') {
      // Each username tested as exact password (User = Pass)
      harvestedUsernames.forEach(u => lines.push(u));
    } else if (wordlistMode === 'cross_permutations') {
      // Cross-user permutations: usernames as passwords, common passwords found in other machines
      harvestedUsernames.forEach(u => lines.push(u));
      harvestedUsernames.forEach(u => lines.push(`${u}123`));
      harvestedUsernames.forEach(u => lines.push(`${u}2024`));
      harvestedUsernames.forEach(u => lines.push(`${u.charAt(0).toUpperCase() + u.slice(1)}123`));
      harvestedUsernames.forEach(u => lines.push(`${u.charAt(0).toUpperCase() + u.slice(1)}2024`));
      
      // Known discovered passwords across targets to test for credential reuse:
      ['P@ssw0rd2024!', 'password123', 'pivotpass2024', 'admin123', 'Password123!', 'Welcome2024'].forEach(p => {
        if (!lines.includes(p)) lines.push(p);
      });
    } else if (wordlistMode === 'mutations') {
      // Aggressive mutation rules
      harvestedUsernames.forEach(u => {
        lines.push(u);
        lines.push(u.toUpperCase());
        lines.push(u.charAt(0).toUpperCase() + u.slice(1));
        lines.push(`${u}123!`);
        lines.push(`${u}@2024`);
        lines.push(`${u}#pass`);
        lines.push(`P@ss_${u}`);
      });
    }

    if (customWordlistInput.trim()) {
      customWordlistInput.split('\n').map(l => l.trim()).filter(Boolean).forEach(w => {
        if (!lines.includes(w)) lines.push(w);
      });
    }

    return Array.from(new Set(lines));
  }, [harvestedUsernames, wordlistMode, customWordlistInput]);

  // Handle auto-answering exam question from captured flag
  const handleFillExamAnswer = (flagObj: typeof allFlags[0]) => {
    if (!flagObj.associatedQuestion || !onAnswerFlagQuestion) return;

    const q = flagObj.associatedQuestion;
    // Find matching option index
    const optIndex = q.options.findIndex(opt => opt.includes(flagObj.value) || opt === flagObj.value);
    
    if (optIndex !== -1) {
      onAnswerFlagQuestion(q.id, optIndex);
      setFilledQuestions(prev => new Set([...prev, q.id]));
    } else {
      // String answer
      onAnswerFlagQuestion(q.id, flagObj.value);
      setFilledQuestions(prev => new Set([...prev, q.id]));
    }
  };

  const downloadFile = (filename: string, content: string) => {
    const element = document.createElement('a');
    const file = new Blob([content], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const capturedCount = allFlags.filter(f => f.isCaptured).length;
  const totalFlagsCount = allFlags.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-100">
        
        {/* 1. Header Toolbar */}
        <div className="px-5 py-3.5 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Gestor de Botín & Flags de Intrusión (Loot Vault)
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                  {currentLabName}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Recolector de banderas oficiales, bóveda de credenciales y generador de diccionarios cruzados para el examen eJPTv2.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick stats badges */}
            <div className="hidden sm:flex items-center gap-2 text-xs font-mono">
              <span className="px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-bold">
                🚩 {capturedCount} / {totalFlagsCount} Flags
              </span>
              <span className="px-2 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-bold">
                🔑 {allCredentials.length} Creds
              </span>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title="Cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2. Navigation Tabs */}
        <div className="px-5 py-2 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab('flags')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'flags'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Flag className="w-3.5 h-3.5" />
              <span>Flags de Intrusión ({capturedCount}/{totalFlagsCount})</span>
            </button>

            <button
              onClick={() => setActiveTab('creds')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'creds'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>Bóveda de Credenciales ({allCredentials.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('wordlists')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'wordlists'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Generador de Diccionarios Cruzados ({generatedWordlist.length} palabras)</span>
            </button>
          </div>

          <div className="hidden md:flex items-center gap-1 text-[11px] text-slate-400 font-mono">
            <span>💡 Auto-sincronizado con la Terminal Kali</span>
          </div>
        </div>

        {/* 3. Main Tab Contents */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {/* TAB 1: FLAGS TRACKER */}
          {activeTab === 'flags' && (
            <div className="space-y-4">
              
              {/* Educational Helper Banner */}
              <div className="p-3 rounded-xl bg-slate-950 border border-emerald-500/30 flex items-start gap-3">
                <div className="p-1 rounded bg-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
                  <Flag className="w-4 h-4" />
                </div>
                <div className="text-xs text-slate-300">
                  <span className="font-bold text-white">Metodología de Examen eJPTv2:</span> En la certificación real, cada flag encontrada confirma la explotación exitosa de un host o servicio. Al capturar una bandera en la terminal mediante comandos como <code className="text-emerald-400">cat /root/flag.txt</code> o volcados SQL, aparecerá aquí desvelada para copiarla o rellenarla directamente en la pregunta correspondiente del cuestionario.
                </div>
              </div>

              {/* Flags List Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {allFlags.map((item, idx) => {
                  const isFilled = item.associatedQuestion && filledQuestions.has(item.associatedQuestion.id);

                  return (
                    <div
                      key={item.flagId}
                      className={`p-3.5 rounded-xl border transition-all ${
                        item.isCaptured
                          ? 'bg-slate-950 border-emerald-500/50 shadow-lg shadow-emerald-950/20'
                          : 'bg-slate-950/70 border-slate-800/80 opacity-85'
                      }`}
                    >
                      {/* Host & Status */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                            item.host.subnet === 'dmz' ? 'bg-blue-500/20 text-blue-300' : 'bg-purple-500/20 text-purple-300'
                          }`}>
                            {item.host.subnet.toUpperCase()}
                          </span>
                          <span className="text-xs font-bold text-white truncate">
                            {item.host.hostname.split('.')[0]} ({item.host.ip})
                          </span>
                        </div>

                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                          item.isCaptured
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}>
                          {item.isCaptured ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              CAPTURADA
                            </>
                          ) : (
                            <>
                              <Lock className="w-3 h-3 text-slate-500" />
                              PENDIENTE
                            </>
                          )}
                        </span>
                      </div>

                      {/* Flag Name & Filepath */}
                      <div className="space-y-1 mb-2.5">
                        <h4 className="text-sm font-semibold text-slate-200">{item.name}</h4>
                        <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                          <span className="text-slate-500">Ruta:</span>
                          <span className="text-amber-300 bg-slate-900 px-1 rounded">{item.path}</span>
                        </div>
                      </div>

                      {/* Flag Value & Actions */}
                      {item.isCaptured ? (
                        <div className="space-y-2 pt-2 border-t border-slate-800">
                          <div className="p-2 rounded bg-emerald-950/50 border border-emerald-500/40 font-mono text-xs text-emerald-300 font-bold break-all flex items-center justify-between gap-2">
                            <span>{item.value}</span>
                            <button
                              onClick={() => copyToClipboard(item.value, item.flagId)}
                              className="p-1 text-emerald-400 hover:text-emerald-200 transition-colors shrink-0 cursor-pointer"
                              title="Copiar bandera al portapapeles"
                            >
                              {copiedKey === item.flagId ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>

                          {/* Associate Exam Question button */}
                          {item.associatedQuestion && (
                            <div className="flex items-center justify-between gap-2 text-xs pt-1">
                              <span className="text-slate-400 text-[11px]">
                                Pregunta #{item.associatedQuestion.id} del examen
                              </span>
                              <button
                                onClick={() => handleFillExamAnswer(item)}
                                disabled={isFilled}
                                className={`px-2 py-1 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors ${
                                  isFilled
                                    ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                                    : 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-sm'
                                }`}
                              >
                                {isFilled ? (
                                  <>
                                    <Check className="w-3 h-3" /> Rellenada en Examen
                                  </>
                                ) : (
                                  <>
                                    <ArrowRight className="w-3 h-3" /> Rellenar Respuesta
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-2 rounded bg-slate-900 border border-slate-800/80 text-[11px] text-slate-400 italic">
                          💡 <span className="font-medium text-slate-300">Pista:</span> {item.description}
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>

            </div>
          )}

          {/* TAB 2: CREDENTIALS VAULT */}
          {activeTab === 'creds' && (
            <div className="space-y-4">
              
              <div className="p-3 rounded-xl bg-slate-950 border border-cyan-500/30 flex items-start gap-3">
                <div className="p-1 rounded bg-cyan-500/20 text-cyan-400 shrink-0 mt-0.5">
                  <Key className="w-4 h-4" />
                </div>
                <div className="text-xs text-slate-300">
                  <span className="font-bold text-white">Bóveda de Credenciales de Auditoría:</span> Aquí se consolidan todas las cuentas de usuario y contraseñas descubiertas a través de archivos de configuración desprotegidos, servicios anónimos, volcados de MySQL y ataques SMB/SSH. Utiliza estas credenciales para pivotear y acceder con mayores privilegios.
                </div>
              </div>

              {/* Table of Credentials */}
              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">Host / Subred</th>
                      <th className="py-2.5 px-3">Usuario</th>
                      <th className="py-2.5 px-3">Contraseña / Hash</th>
                      <th className="py-2.5 px-3">Servicio</th>
                      <th className="py-2.5 px-3">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {allCredentials.map((cred, idx) => {
                      const rowKey = `cred-${idx}-${cred.username}`;
                      return (
                        <tr key={rowKey} className="hover:bg-slate-900/60 transition-colors">
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-white">{cred.host.hostname.split('.')[0]}</div>
                            <div className="text-[10px] text-slate-400">{cred.host.ip} ({cred.host.subnet.toUpperCase()})</div>
                          </td>
                          <td className="py-2.5 px-3 text-emerald-300 font-bold">
                            {cred.username}
                          </td>
                          <td className="py-2.5 px-3 text-amber-300">
                            {cred.password}
                          </td>
                          <td className="py-2.5 px-3 text-slate-300">
                            <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px]">
                              {cred.service}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => copyToClipboard(cred.password || '', `${rowKey}-pass`)}
                                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
                                title="Copiar contraseña"
                              >
                                {copiedKey === `${rowKey}-pass` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                Copiar Pass
                              </button>

                              {onExecuteCommand && cred.service.includes('SSH') && cred.username !== 'anonymous' && (
                                <button
                                  onClick={() => onExecuteCommand(`ssh ${cred.username}@${cred.host.ip}`)}
                                  className="px-2 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
                                  title="Probar conexión SSH en terminal"
                                >
                                  <Terminal className="w-3 h-3" /> Conectar SSH
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {/* TAB 3: CUSTOM WORDLIST GENERATOR (THE EJPTv2 EXAM TECHNIQUE!) */}
          {activeTab === 'wordlists' && (
            <div className="space-y-4">
              
              {/* Highlighted eJPTv2 Real Exam Golden Rule Banner */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-amber-950/60 via-slate-900 to-slate-900 border border-amber-500/40 shadow-lg space-y-2">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-amber-500/20 text-amber-400">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-amber-300 tracking-wide uppercase">
                    Regla de Oro en el Examen eJPTv2: Reutilización de Usuarios como Contraseñas
                  </h3>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  En el examen real es <strong>extremadamente común</strong> que los administradores reutilicen el nombre de usuario de una máquina (por ejemplo, descubierto en la DMZ como <code className="text-amber-300">sysadmin</code>, <code className="text-amber-300">mike</code> o <code className="text-amber-300">developer</code>) como la contraseña de acceso para otro servicio o equipo en la red interna.
                  Este generador construye automáticamente un diccionario cruzado optimizado para ataques con <code className="text-emerald-400">hydra</code> y <code className="text-emerald-400">crackmapexec</code>.
                </p>
              </div>

              {/* Harvested Users Section */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                    <Users className="w-3.5 h-3.5 text-cyan-400" />
                    Usuarios Cosechados en este Laboratorio ({harvestedUsernames.length})
                  </span>
                  <button
                    onClick={() => copyToClipboard(harvestedUsernames.join('\n'), 'users-list')}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === 'users-list' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    Copiar users.txt
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 font-mono text-xs">
                  {harvestedUsernames.map(user => (
                    <span
                      key={user}
                      className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700/80 text-emerald-300 font-semibold flex items-center gap-1"
                    >
                      <span>👤</span>
                      <span>{user}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Mode Selector & Custom Options */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <button
                  onClick={() => setWordlistMode('cross_permutations')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    wordlistMode === 'cross_permutations'
                      ? 'bg-emerald-950/40 border-emerald-500 shadow-md ring-1 ring-emerald-500/40'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="text-xs font-bold text-white mb-1 flex items-center gap-1">
                    <span>1. Permutaciones Cruzadas</span>
                    {wordlistMode === 'cross_permutations' && <span className="text-[10px] text-emerald-400 font-mono">★ RECOMENDADO</span>}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Prueba cada usuario como contraseña de los demás, variantes con año (2024) y claves descubiertas en la red.
                  </p>
                </button>

                <button
                  onClick={() => setWordlistMode('user_as_pass')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    wordlistMode === 'user_as_pass'
                      ? 'bg-emerald-950/40 border-emerald-500 shadow-md ring-1 ring-emerald-500/40'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="text-xs font-bold text-white mb-1">
                    2. Usuario = Contraseña (User=Pass)
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Típico fallo en entornos de laboratorio donde la clave coincide exactamente con el nombre de usuario (ej. mike:mike).
                  </p>
                </button>

                <button
                  onClick={() => setWordlistMode('mutations')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    wordlistMode === 'mutations'
                      ? 'bg-emerald-950/40 border-emerald-500 shadow-md ring-1 ring-emerald-500/40'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="text-xs font-bold text-white mb-1">
                    3. Mutaciones & Símbolos
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Genera mayúsculas, combinaciones con caracteres especiales (!@#) y formatos corporativos habituales.
                  </p>
                </button>
              </div>

              {/* Generated Wordlist Preview & Actions */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Diccionario Generado ({generatedWordlist.length} palabras candidatas)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyToClipboard(generatedWordlist.join('\n'), 'wordlist-full')}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      {copiedKey === 'wordlist-full' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      Copiar Todo
                    </button>

                    <button
                      onClick={() => downloadFile('ejpt_custom_wordlist.txt', generatedWordlist.join('\n'))}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Descargar .txt
                    </button>
                  </div>
                </div>

                {/* Wordlist preview box */}
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 max-h-36 overflow-y-auto font-mono text-xs text-slate-300 space-y-0.5">
                  {generatedWordlist.slice(0, 40).map((word, idx) => (
                    <div key={idx} className="flex items-center justify-between py-0.5 px-1 hover:bg-slate-800 rounded">
                      <span className="text-emerald-400">{word}</span>
                      <span className="text-[10px] text-slate-600">#{idx + 1}</span>
                    </div>
                  ))}
                  {generatedWordlist.length > 40 && (
                    <div className="text-[10px] text-slate-500 italic text-center pt-1">
                      ... y {generatedWordlist.length - 40} palabras adicionales generadas
                    </div>
                  )}
                </div>

                {/* Direct Command Injections */}
                {onExecuteCommand && (
                  <div className="pt-2 border-t border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                        <Terminal className="w-3 h-3 text-emerald-400" />
                        Acciones rápidas de Cracking & Fuerza Bruta para Terminal:
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      <button
                        onClick={() => {
                          onExecuteCommand('hydra -L /root/loot/users.txt -P /root/loot/passwords.txt 192.168.100.55 ssh');
                          onClose();
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer text-left"
                        title="Lanzar ataque cruzado de SSH con Hydra"
                      >
                        <Zap className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="truncate">Hydra SSH (Cruce Usuarios)</span>
                      </button>

                      <button
                        onClick={() => {
                          onExecuteCommand('medusa -h 192.168.100.55 -u mike -P /usr/share/wordlists/rockyou.txt -M ftp');
                          onClose();
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/30 text-sky-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer text-left"
                        title="Probar fuerza bruta FTP con Medusa"
                      >
                        <Terminal className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        <span className="truncate">Medusa FTP (vsftpd)</span>
                      </button>

                      <button
                        onClick={() => {
                          onExecuteCommand('unshadow /etc/passwd /etc/shadow > unshadowed.txt');
                          onClose();
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer text-left"
                        title="Unificar passwd y shadow para John"
                      >
                        <FileText className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="truncate">unshadow (/etc/shadow)</span>
                      </button>

                      <button
                        onClick={() => {
                          onExecuteCommand('john --wordlist=/usr/share/wordlists/rockyou.txt unshadowed.txt');
                          onClose();
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer text-left"
                        title="Crackear hashes con John the Ripper"
                      >
                        <Key className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span className="truncate">John the Ripper (Rockyou)</span>
                      </button>

                      <button
                        onClick={() => {
                          onExecuteCommand('hashcat -m 1800 -a 0 shadow_hashes.txt /usr/share/wordlists/rockyou.txt');
                          onClose();
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer text-left"
                        title="Crackear SHA-512 Unix con Hashcat"
                      >
                        <Zap className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        <span className="truncate">Hashcat -m 1800 (SHA512)</span>
                      </button>

                      <button
                        onClick={() => {
                          onExecuteCommand('cewl http://192.168.100.50 -m 5 -w /root/loot/cewl_wordlist.txt');
                          onClose();
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-teal-600/20 hover:bg-teal-600/30 border border-teal-500/30 text-teal-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer text-left"
                        title="Extraer palabras clave con CeWL"
                      >
                        <Search className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                        <span className="truncate">CeWL (Spider Web Target)</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}

        </div>

        {/* 4. Footer */}
        <div className="px-5 py-3 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <span>Diseñado para aspirantes a la certificación eJPTv2</span>
            <span>•</span>
            <span className="text-emerald-400 font-semibold">{capturedCount} de {totalFlagsCount} flags completadas</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-colors cursor-pointer"
          >
            Cerrar Botín
          </button>
        </div>

      </div>
    </div>
  );
};

export default LootTrackerModal;
