import React, { useState, useRef, useEffect } from 'react';
import { TerminalOutputLine } from '../types/simulator';
import { 
  CommandContext, 
  getCommandHistory, 
  addCommandToHistory, 
  navigateHistory 
} from '../utils/commandEngine';
import { Terminal as TerminalIcon, Play, RotateCcw, Copy, Check, Sparkles, Zap } from 'lucide-react';

const MetasploitPanel = React.lazy(() => import('./MetasploitPanel'));

interface TerminalProps {
  outputs: TerminalOutputLine[];
  onExecute: (cmd: string) => void;
  onClear: () => void;
  context: CommandContext;
  externalHistory?: string[];
  onHistoryUpdate?: (history: string[]) => void;
}

export const Terminal: React.FC<TerminalProps> = ({ 
  outputs, 
  onExecute, 
  onClear, 
  context,
  externalHistory,
  onHistoryUpdate
}) => {
  const [inputVal, setInputVal] = useState('');
  const [history, setHistory] = useState<string[]>(() => {
    if (externalHistory && externalHistory.length > 0) return externalHistory;
    return getCommandHistory();
  });
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [draftVal, setDraftVal] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isMsfPanelOpen, setIsMsfPanelOpen] = useState<boolean>(() => {
    return context.shellMode === 'msf' || context.shellMode === 'meterpreter' || !!context.msfModule;
  });
  const [isMsfModalOpen, setIsMsfModalOpen] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-open panel if entering msf or meterpreter shell mode
  useEffect(() => {
    if (context.shellMode === 'msf' || context.shellMode === 'meterpreter') {
      setIsMsfPanelOpen(true);
    }
  }, [context.shellMode]);

  // Sync if external history changes
  useEffect(() => {
    if (externalHistory && externalHistory.length > 0) {
      setHistory(externalHistory);
    }
  }, [externalHistory]);

  // Auto-scroll when outputs change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [outputs]);

  // Focus input on click anywhere inside terminal
  const handleTerminalClick = () => {
    inputRef.current?.focus();
  };

  const getPromptText = () => {
    switch (context.shellMode) {
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
        return context.msfModule ? `msf6 (${context.msfModule.split('/').slice(-2).join('/')}) > ` : 'msf6 > ';
      case 'meterpreter':
        return 'meterpreter > ';
      case 'win_cmd':
        return 'C:\\Windows\\system32> ';
      case 'kali':
      default:
        return 'kali@kali:~$ ';
    }
  };

  const getPromptBadgeColor = () => {
    switch (context.shellMode) {
      case 'ssh_target50_root':
      case 'ssh_target55_root':
      case 'ssh_target60_root':
      case 'ssh_fintech100_root':
        return 'text-rose-400 font-bold';
      case 'ssh_target50':
      case 'ssh_target55':
      case 'ssh_target60':
      case 'ssh_fintech100':
        return 'text-amber-400 font-semibold';
      case 'msf':
        return 'text-blue-400 font-bold';
      case 'meterpreter':
        return 'text-emerald-400 font-bold';
      case 'win_cmd':
        return 'text-cyan-300 font-mono';
      default:
        return 'text-emerald-400 font-medium';
    }
  };

  const setCursorToEnd = (length: number) => {
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.selectionStart = length;
        inputRef.current.selectionEnd = length;
      }
    }, 0);
  };

  const submitCommand = (cmdText: string) => {
    const trimmed = cmdText.trim();
    if (!trimmed) return;

    // Persist to sessionStorage via commandEngine helper
    const updated = addCommandToHistory(trimmed);
    setHistory(updated);
    onHistoryUpdate?.(updated);

    setHistoryIndex(-1);
    setDraftVal('');
    onExecute(trimmed);
    setInputVal('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitCommand(inputVal);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const latestHistory = getCommandHistory();
      if (latestHistory.length === 0) return;

      const currentDraft = historyIndex === -1 ? inputVal : draftVal;
      if (historyIndex === -1) {
        setDraftVal(inputVal);
      }

      const { nextIndex, value } = navigateHistory(latestHistory, historyIndex, 'up', currentDraft);
      setHistory(latestHistory);
      setHistoryIndex(nextIndex);
      setInputVal(value);
      setCursorToEnd(value.length);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      // Only navigate down if user is actively browsing history
      if (historyIndex === -1) return;

      const latestHistory = getCommandHistory();
      const { nextIndex, value } = navigateHistory(latestHistory, historyIndex, 'down', draftVal);
      setHistory(latestHistory);
      setHistoryIndex(nextIndex);
      setInputVal(value);
      setCursorToEnd(value.length);
      if (nextIndex === -1) {
        setDraftVal('');
      }
    } else if (e.key === 'Escape') {
      // Escape restores the unsubmitted draft and exits history browsing
      if (historyIndex !== -1) {
        e.preventDefault();
        setInputVal(draftVal);
        setHistoryIndex(-1);
        setDraftVal('');
        setCursorToEnd(draftVal.length);
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const current = inputVal;
      if (!current.trim()) return;

      // 1. Metasploit Shell Mode Autocompletions
      if (context.shellMode === 'msf') {
        const msfCompletions = [
          'use exploit/windows/smb/psexec',
          'use exploit/windows/http/badblue_ext_overflow',
          'use post/multi/manage/autoroute',
          'use auxiliary/server/socks_proxy',
          'set RHOSTS 10.10.10.25',
          'set RHOSTS 10.10.10.30',
          'set LHOST 192.168.100.10',
          'set SMBUser itadmin',
          'set SMBPass P@ssw0rd2024!',
          'set SRVPORT 1080',
          'show options',
          'show payloads',
          'exploit',
          'run',
          'sessions -l',
          'sessions -i 1',
          'back',
          'exit'
        ];
        const match = msfCompletions.find(c => c.toLowerCase().startsWith(current.toLowerCase()));
        if (match) {
          setInputVal(match);
          setCursorToEnd(match.length);
          return;
        }
      }

      // 2. Meterpreter Shell Mode Autocompletions
      if (context.shellMode === 'meterpreter') {
        const meterpreterCompletions = [
          'sysinfo',
          'getuid',
          'ipconfig',
          'run autoroute -s 10.10.10.0/24',
          'shell',
          'cat flag.txt',
          'cat /Users/Administrator/Desktop/flag.txt',
          'background',
          'exit',
          'help'
        ];
        const match = meterpreterCompletions.find(c => c.toLowerCase().startsWith(current.toLowerCase()));
        if (match) {
          setInputVal(match);
          setCursorToEnd(match.length);
          return;
        }
      }

      // 3. Word/Token Level Autocompletion (Binaries, Flags, File Paths, Wordlists)
      const lastSpaceIdx = current.lastIndexOf(' ');
      const lastToken = lastSpaceIdx !== -1 ? current.slice(lastSpaceIdx + 1) : current;
      const prefix = lastSpaceIdx !== -1 ? current.slice(0, lastSpaceIdx + 1) : '';

      const dictionaryWords = [
        // Core eJPTv2 Tools & Binaries
        'nmap', 'netdiscover', 'gobuster', 'dirb', 'nikto', 'sqlmap', 'smbclient',
        'enum4linux', 'enum4linux-ng', 'crackmapexec', 'cme', 'hydra', 'john',
        'hashcat', 'searchsploit', 'msfconsole', 'proxychains', 'linpeas.sh',
        './linpeas.sh', 'winpeas.bat', 'winpeas.exe', 'curl', 'wget', 'ssh', 'ping',
        'ifconfig', 'route', 'generate-wordlist', 'cewl', 'crunch', 'whoami',
        'sudo', 'cat', 'ls', 'cd', 'pwd', 'clear', 'exit', 'ejpt-help',
        
        // Critical Paths & Wordlists
        '/etc/passwd', '/etc/shadow', '/etc/proxychains4.conf', '/var/www/html',
        '/var/backups/db_config.php.bak', '/usr/share/wordlists/dirb/common.txt',
        '/usr/share/wordlists/rockyou.txt', '/root/loot/users.txt',
        '/root/loot/passwords.txt', '/root/loot/', 'flag.txt', 'notes.txt',
        'hash.txt',
        
        // Target Hosts & Subnets
        '192.168.100.50', '192.168.100.55', '192.168.100.60',
        '10.10.10.20', '10.10.10.25', '10.10.10.30',
        '172.16.50.20', '172.16.50.35', '172.16.50.100', '10.20.30.50'
      ];

      if (lastToken.length > 0) {
        const tokenMatch = dictionaryWords.find(w => w.toLowerCase().startsWith(lastToken.toLowerCase()) && w.toLowerCase() !== lastToken.toLowerCase());
        if (tokenMatch) {
          const completed = prefix + tokenMatch;
          setInputVal(completed);
          setCursorToEnd(completed.length);
          return;
        }
      }

      // 4. Full Command Templates Autocompletion
      const fullTemplates = [
        'netdiscover -r 192.168.100.0/24',
        'nmap -sn 192.168.100.0/24',
        'nmap -sV -sC -p- 192.168.100.50',
        'nmap -sV -sC -p- 192.168.100.55',
        'nmap -sV -sC -p- 192.168.100.60',
        'gobuster dir -u http://192.168.100.50 -w /usr/share/wordlists/dirb/common.txt',
        'curl "http://192.168.100.50/blog/view.php?page=../../../../etc/passwd"',
        'curl "http://192.168.100.50/blog/view.php?page=../../../../var/backups/db_config.php.bak"',
        'smbclient -L //192.168.100.60 -N',
        'smbclient //192.168.100.60/public -N',
        'enum4linux-ng -A 192.168.100.60',
        'crackmapexec smb 192.168.100.60 -u \'\' -p \'\' --shares',
        'ssh -D 1080 -N -f pivotuser@192.168.100.60',
        'proxychains nmap -sT -Pn 10.10.10.20',
        'proxychains nmap -sT -Pn 10.10.10.25',
        'proxychains nmap -sT -Pn 10.10.10.30',
        'proxychains sqlmap -u "http://10.10.10.20/api/employees?id=1" --dump',
        'hydra -L /root/loot/users.txt -P /root/loot/passwords.txt 192.168.100.55 ssh',
        'john --format=raw-md5 --wordlist=/usr/share/wordlists/rockyou.txt hash.txt',
        'hashcat -m 0 hash.txt /usr/share/wordlists/rockyou.txt',
        './linpeas.sh',
        'winpeas.bat',
        'msfconsole',
        'ejpt-help',
        'ifconfig',
        'ip route'
      ];
      const matchFull = fullTemplates.find(c => c.toLowerCase().startsWith(current.toLowerCase()));
      if (matchFull) {
        setInputVal(matchFull);
        setCursorToEnd(matchFull.length);
      }
    }
  };

  const copyTerminalText = () => {
    const text = outputs.map(o => (o.prompt ? `${o.prompt}${o.text}` : o.text)).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const quickCommands = [
    { label: 'Recon DMZ', cmd: 'netdiscover -r 192.168.100.0/24' },
    { label: 'Scan Web .50', cmd: 'nmap -sV -sC 192.168.100.50' },
    { label: 'LFI Passwd', cmd: 'curl "http://192.168.100.50/blog/view.php?page=../../../../etc/passwd"' },
    { label: 'SMB Share .60', cmd: 'smbclient //192.168.100.60/public -N' },
    { label: 'SSH Pivot (-D 1080)', cmd: 'ssh -D 1080 -N -f pivotuser@192.168.100.60' },
    { label: 'Proxychains Nmap', cmd: 'proxychains nmap -sT -Pn 10.10.10.20' },
    { label: 'SQL Injection', cmd: 'proxychains sqlmap -u "http://10.10.10.20/api/employees?id=1" --dump' },
    { label: 'MSF Console', cmd: 'msfconsole' }
  ];

  return (
    <div className="flex flex-col h-full bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl font-mono text-sm">
      {/* Terminal Title Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 select-none">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-rose-500/80 hover:bg-rose-500 transition-colors cursor-pointer" />
          <div className="w-3 h-3 rounded-full bg-amber-500/80 hover:bg-amber-500 transition-colors cursor-pointer" />
          <div className="w-3 h-3 rounded-full bg-emerald-500/80 hover:bg-emerald-500 transition-colors cursor-pointer" />
          <div className="h-4 w-[1px] bg-slate-700 mx-2" />
          <div className="flex items-center space-x-1.5 text-xs text-slate-300 font-medium">
            <TerminalIcon className="w-3.5 h-3.5 text-emerald-400" />
            <span>kali@kali: ~ (eJPTv2 Lab Session)</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Metasploit Panel Toggle Button */}
          <button
            onClick={() => setIsMsfPanelOpen(!isMsfPanelOpen)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-all border ${
              isMsfPanelOpen || context.shellMode === 'msf' || context.shellMode === 'meterpreter'
                ? 'bg-sky-500/20 text-sky-300 border-sky-500/50 shadow-sm shadow-sky-950/40 ring-1 ring-sky-500/30'
                : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700/80 border-slate-700/60'
            }`}
            title="Panel de Opciones y Módulos de Metasploit (RHOSTS, LHOST, PAYLOAD)"
          >
            <Zap className={`w-3.5 h-3.5 ${context.shellMode === 'msf' || isMsfPanelOpen ? 'text-sky-400 animate-pulse' : 'text-slate-400'}`} />
            <span>Metasploit Hub</span>
            {context.msfModule && (
              <span className="hidden xl:inline text-[10px] text-sky-400 font-normal">
                ({context.msfModule.split('/').pop()})
              </span>
            )}
          </button>

          {context.pivoting.isPivoted && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 animate-pulse">
              ● SOCKS5 (Port 1080) PIVOT ACTIVO
            </span>
          )}
          <button
            onClick={copyTerminalText}
            className="p-1.5 text-slate-400 hover:text-slate-100 rounded hover:bg-slate-800 transition-colors"
            title="Copiar salida de terminal"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onClear}
            className="p-1.5 text-slate-400 hover:text-slate-100 rounded hover:bg-slate-800 transition-colors"
            title="Limpiar pantalla (clear)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Quick Access Snippets */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/60 border-b border-slate-800/80 overflow-x-auto text-[11px] no-scrollbar">
        <span className="text-slate-500 flex items-center gap-1 shrink-0">
          <Sparkles className="w-3 h-3 text-amber-400" /> Comandos Rápidos:
        </span>
        {quickCommands.map(item => (
          <button
            key={item.label}
            onClick={() => {
              setInputVal(item.cmd);
              inputRef.current?.focus();
            }}
            className="px-2 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-emerald-300 border border-slate-700/60 transition-colors shrink-0"
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Dedicated In-Terminal Metasploit Options & Modules Panel */}
      {isMsfPanelOpen && (
        <React.Suspense fallback={
          <div className="p-4 bg-slate-900/90 border-b border-teal-500/30 flex items-center justify-center gap-2 text-teal-400 font-mono text-xs">
            <span className="w-3.5 h-3.5 rounded-full border-2 border-teal-400 border-t-transparent animate-spin" />
            <span>Cargando Metasploit Hub...</span>
          </div>
        }>
          <MetasploitPanel
            context={context}
            onExecuteCommand={submitCommand}
            onToggleExpandModal={() => setIsMsfModalOpen(true)}
            onClose={() => setIsMsfPanelOpen(false)}
          />
        </React.Suspense>
      )}

      {/* Terminal Output Area */}
      <div
        ref={scrollRef}
        onClick={handleTerminalClick}
        className="flex-1 p-4 overflow-y-auto space-y-1 cursor-text selection:bg-emerald-500 selection:text-black leading-relaxed"
      >
        {outputs.map((line) => {
          if (line.text === '__CLEAR__') return null;

          if (line.type === 'command') {
            return (
              <div key={line.id} className="flex items-start text-slate-200 mt-2">
                <span className={getPromptBadgeColor()}>{line.prompt || 'kali@kali:~$ '}</span>
                <span className="font-semibold text-white ml-1">{line.text}</span>
              </div>
            );
          }

          if (line.type === 'success') {
            return (
              <div key={line.id} className="text-emerald-400 whitespace-pre-wrap font-medium">
                {line.text}
              </div>
            );
          }

          if (line.type === 'error') {
            return (
              <div key={line.id} className="text-rose-400 whitespace-pre-wrap">
                {line.text}
              </div>
            );
          }

          if (line.type === 'system') {
            return (
              <div key={line.id} className="text-cyan-400 whitespace-pre-wrap font-semibold">
                {line.text}
              </div>
            );
          }

          if (line.type === 'msf') {
            return (
              <div key={line.id} className="text-sky-300 whitespace-pre-wrap">
                {line.text}
              </div>
            );
          }

          if (line.type === 'meterpreter') {
            return (
              <div key={line.id} className="text-teal-300 whitespace-pre-wrap">
                {line.text}
              </div>
            );
          }

          return (
            <div key={line.id} className="text-slate-300 whitespace-pre-wrap">
              {line.text}
            </div>
          );
        })}

        {/* Input Line */}
        <div className="flex items-center pt-1">
          <span className={`${getPromptBadgeColor()} shrink-0 select-none mr-1.5`}>
            {getPromptText()}
          </span>
          <div className="flex-1 relative flex items-center">
            <input
              ref={inputRef}
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={handleKeyDown}
              spellCheck={false}
              autoComplete="off"
              autoFocus
              className="w-full bg-transparent border-none outline-none text-slate-100 font-mono caret-emerald-400 p-0 m-0 shadow-none focus:ring-0"
              placeholder="Introduce un comando (ej: ejpt-help, nmap, curl, proxychains)..."
            />
          </div>
          {inputVal.trim() && (
            <button
              onClick={() => submitCommand(inputVal)}
              className="ml-2 text-emerald-400 hover:text-emerald-300 p-1 cursor-pointer transition-colors"
              title="Ejecutar comando (Enter)"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
            </button>
          )}
        </div>
      </div>

      {/* Terminal Footer Bar with Shortcuts & History Navigation Indicator */}
      <div className="px-4 py-1.5 bg-slate-900 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 select-none">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-slate-300">
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] text-emerald-400 font-bold">↑</kbd>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] text-emerald-400 font-bold">↓</kbd>
            <span className="text-slate-400">Historial ({history.length} comandos)</span>
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 text-slate-400">
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] text-slate-300 font-bold">Tab</kbd>
            <span>Autocompletar</span>
          </span>
        </div>

        {historyIndex !== -1 && (
          <div className="flex items-center gap-1 text-amber-400 font-mono text-[10px] bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
            <span>↑/↓ Historial (sessionStorage): {historyIndex + 1} / {history.length}</span>
          </div>
        )}
      </div>

      {/* Full Dedicated Metasploit Exploit Hub Modal */}
      {isMsfModalOpen && (
        <React.Suspense fallback={
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="bg-slate-900 border border-teal-500/30 rounded-2xl p-6 flex flex-col items-center">
              <span className="w-8 h-8 rounded-full border-2 border-teal-400 border-t-transparent animate-spin mb-3" />
              <span className="text-white text-xs font-mono">Iniciando Metasploit Framework Hub...</span>
            </div>
          </div>
        }>
          <MetasploitPanel
            context={context}
            onExecuteCommand={submitCommand}
            isModal={true}
            isOpen={true}
            onClose={() => setIsMsfModalOpen(false)}
          />
        </React.Suspense>
      )}
    </div>
  );
};
