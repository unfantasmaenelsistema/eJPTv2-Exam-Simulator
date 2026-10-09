import React, { useState, useEffect } from 'react';
import { 
  FileEdit, 
  Download, 
  Copy, 
  Check, 
  RotateCcw, 
  ShieldAlert, 
  BarChart2, 
  Columns, 
  FileText,
  Activity,
  Layers,
  Server
} from 'lucide-react';
import { NetworkHost, LabDefinition } from '../types/simulator';

const CompromiseProgressChart = React.lazy(() => import('./CompromiseProgressChart'));

interface ExamNotesProps {
  onOpenPentestReport?: () => void;
  hosts?: NetworkHost[];
  compromisedHosts?: Set<string>;
  discoveredHosts?: Set<string>;
  foundFlags?: Set<string>;
  timeRemainingSeconds?: number;
  currentLab?: LabDefinition;
}

const DEFAULT_NOTES_TEMPLATE = `# ==========================================
# NOTAS DE CAMPO - AUDITORÍA eJPTv2
# Desarrollado para Un Fantasma en el Sistema (https://www.unfantasmaenelsistema.com)
# ==========================================

[1] RANGO DMZ: 192.168.100.0/24 (tun0: 192.168.100.10)
------------------------------------------
- 192.168.100.50 (target-web-01):
  * Puertos: 22 (SSH), 80 (Apache 2.4.41), 3306 (MySQL filt.)
  * Web: /blog/view.php (LFI vulnerable)
  * Creds: sysadmin : P@ssw0rd2024!
  * Privesc: SUID /usr/bin/find -> root
  * Flag: FLAG_DMZ_WEB{lfi_2_pr1v_esc_success}

- 192.168.100.55 (target-ftp-02):
  * Puertos: 21 (vsftpd 3.0.3), 22 (SSH), 8080 (HTTP)
  * FTP: anonymous:anonymous -> confidential_note.txt
  * Creds: mike : password123
  * Flag: FLAG_FTP_LEAK{vsftpd_an0n_c0nfidential}

- 192.168.100.60 (target-gateway-03 - DUAL-HOMED PIVOT):
  * Interfaces: eth0: 192.168.100.60, eth1: 10.10.10.1
  * Puertos: 22 (SSH), 80 (nginx), 139, 445 (Samba 4.9.5)
  * SMB: //192.168.100.60/public -> maintenance.sh
  * Creds: pivotuser : pivotpass2024
  * Flag: FLAG_PIVOT_GATEWAY{dual_h0med_r0ute_unl0cked}
  * Comando Pivoting: ssh -D 1080 -N -f pivotuser@192.168.100.60

[2] SUBRED INTERNA: 10.10.10.0/24 (Vía Proxychains)
------------------------------------------
- 10.10.10.20 (target-db-04):
  * Puertos: 22 (SSH), 80 (Apache), 3306 (MySQL 5.7.35)
  * Web: /api/employees?id=1 (SQLi vulnerable)
  * DB: corp_internal
  * Creds: itadmin : P@ssw0rd2024! (MD5 crackeado)
  * Flag: FLAG_INTERNAL_SQL{sql_injecti0n_pivot_d0ne}

- 10.10.10.25 (target-win-05):
  * OS: Windows Server 2019 Standard
  * Puertos: 135, 139, 445 (SMB), 3389 (RDP), 5985 (WinRM)
  * Exploit: msfconsole exploit/windows/smb/psexec
  * Flag: FLAG_WIN_SYSTEM{w1nd0ws_psexec_system_cr4cked}

- 10.10.10.30 (target-vault-06):
  * OS: Windows 10
  * Puerto 80: BadBlue 2.7
  * Flag: FLAG_VAULT_FINAL{ejptv2_master_penetration_tester}
`;

export const ExamNotes: React.FC<ExamNotesProps> = ({ 
  onOpenPentestReport,
  hosts = [],
  compromisedHosts = new Set(),
  discoveredHosts = new Set(),
  foundFlags = new Set(),
  timeRemainingSeconds = 48 * 3600,
  currentLab
}) => {
  const [notes, setNotes] = useState<string>(() => {
    return localStorage.getItem('ejpt_exam_notes') || DEFAULT_NOTES_TEMPLATE;
  });
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'metrics' | 'notes' | 'split'>('metrics');

  useEffect(() => {
    localStorage.setItem('ejpt_exam_notes', notes);
  }, [notes]);

  const copyNotes = () => {
    navigator.clipboard.writeText(notes);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const downloadNotes = () => {
    const blob = new Blob([notes], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ejptv2_pentest_notes_${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const resetNotes = () => {
    if (window.confirm('¿Restablecer las notas a la plantilla original?')) {
      setNotes(DEFAULT_NOTES_TEMPLATE);
    }
  };

  // Subnet summary counts
  const dmzCount = hosts.filter(h => h.subnet === 'dmz' && (compromisedHosts.has(h.ip) || h.compromised)).length;
  const totalDmz = hosts.filter(h => h.subnet === 'dmz').length || 3;
  const internalCount = hosts.filter(h => h.subnet === 'internal' && (compromisedHosts.has(h.ip) || h.compromised)).length;
  const totalInternal = hosts.filter(h => h.subnet === 'internal').length || 3;

  return (
    <div className="flex flex-col h-full bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl font-mono">
      {/* Header Bar */}
      <div className="p-3.5 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 select-none">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400">
            <FileEdit className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white tracking-wide">
                Cuaderno de Notas & Análisis de Compromiso
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 hidden sm:inline-flex items-center gap-1.5 font-mono">
                <span className="text-emerald-400 font-bold">DMZ: {dmzCount}/{totalDmz}</span>
                <span className="text-slate-500">|</span>
                <span className="text-sky-400 font-bold">Interna: {internalCount}/{totalInternal}</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Visualización con Recharts del avance de intrusión (DMZ vs. Interna) a lo largo de las 48h de examen.
            </p>
          </div>
        </div>

        {/* View Mode Toggle & Actions */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Tabs: Métricas vs Notas vs Split */}
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setViewMode('metrics')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1.5 ${
                viewMode === 'metrics'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Panel de Métricas y Gráficos Recharts (DMZ vs Interna a lo largo del tiempo)"
            >
              <BarChart2 className="w-3.5 h-3.5 text-sky-400" />
              <span>Métricas Recharts</span>
            </button>

            <button
              onClick={() => setViewMode('notes')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1.5 ${
                viewMode === 'notes'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Editor de Texto Scratchpad de Auditoría"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              <span>Cuaderno de Notas</span>
            </button>

            <button
              onClick={() => setViewMode('split')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1.5 ${
                viewMode === 'split'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Ver Gráficos y Notas en Pantalla Dividida"
            >
              <Columns className="w-3.5 h-3.5 text-purple-400" />
              <span>Vista Dividida</span>
            </button>
          </div>

          {onOpenPentestReport && (
            <button
              onClick={onOpenPentestReport}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-semibold border border-emerald-500/40 flex items-center gap-1.5 transition-colors shadow-sm"
              title="Generar informe profesional de auditoría para portafolio"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Informe Pentest</span>
            </button>
          )}

          <button
            onClick={copyNotes}
            className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 flex items-center gap-1 transition-colors"
            title="Copiar contenido de notas"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Copiar</span>
          </button>

          <button
            onClick={downloadNotes}
            className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 flex items-center gap-1 transition-colors"
            title="Descargar notas en formato .txt"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Descargar .txt</span>
          </button>

          <button
            onClick={resetNotes}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 border border-slate-700 transition-colors"
            title="Restablecer plantilla original de notas"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Content Area based on viewMode */}
      <div className="flex-1 overflow-hidden p-3 bg-slate-950">
        {viewMode === 'metrics' && (
          <div className="h-full overflow-y-auto pr-1">
            <React.Suspense fallback={
              <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                <span className="w-8 h-8 rounded-full border-2 border-sky-400 border-t-transparent animate-spin mb-3" />
                <span className="font-mono text-xs text-sky-400">Cargando gráficos interactivos Recharts...</span>
              </div>
            }>
              <CompromiseProgressChart
                hosts={hosts}
                compromisedHosts={compromisedHosts}
                discoveredHosts={discoveredHosts}
                foundFlags={foundFlags}
                timeRemainingSeconds={timeRemainingSeconds}
                currentLab={currentLab}
              />
            </React.Suspense>
          </div>
        )}

        {viewMode === 'notes' && (
          <div className="h-full flex flex-col">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              spellCheck={false}
              className="w-full h-full bg-slate-900/70 text-slate-200 border border-slate-800 rounded-xl p-4 font-mono text-xs leading-relaxed resize-none focus:outline-none focus:border-emerald-500 selection:bg-emerald-500 selection:text-black shadow-inner"
              placeholder="Escribe tus notas de pentest aquí..."
            />
          </div>
        )}

        {viewMode === 'split' && (
          <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-3 overflow-hidden">
            {/* Left: Recharts Data Visualization */}
            <div className="h-full overflow-y-auto pr-1 border-b lg:border-b-0 lg:border-r border-slate-800/80">
              <React.Suspense fallback={
                <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                  <span className="w-8 h-8 rounded-full border-2 border-sky-400 border-t-transparent animate-spin mb-3" />
                  <span className="font-mono text-xs text-sky-400">Cargando gráficos Recharts...</span>
                </div>
              }>
                <CompromiseProgressChart
                  hosts={hosts}
                  compromisedHosts={compromisedHosts}
                  discoveredHosts={discoveredHosts}
                  foundFlags={foundFlags}
                  timeRemainingSeconds={timeRemainingSeconds}
                  currentLab={currentLab}
                />
              </React.Suspense>
            </div>

            {/* Right: Notes Textarea */}
            <div className="h-full flex flex-col">
              <div className="pb-1.5 flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold text-slate-300 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Anotaciones y Evidencias de Explotación</span>
                </span>
                <span className="text-[11px] text-slate-500">
                  {notes.length} caracteres
                </span>
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                spellCheck={false}
                className="w-full flex-1 bg-slate-900/70 text-slate-200 border border-slate-800 rounded-xl p-3 font-mono text-xs leading-relaxed resize-none focus:outline-none focus:border-emerald-500 selection:bg-emerald-500 selection:text-black shadow-inner"
                placeholder="Escribe tus notas de pentest aquí mientras monitoreas tu progreso en Recharts..."
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExamNotes;
