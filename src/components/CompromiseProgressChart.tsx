import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { NetworkHost, LabDefinition } from '../types/simulator';
import { 
  ShieldCheck, 
  Layers, 
  Clock, 
  Activity, 
  TrendingUp, 
  AlertTriangle,
  Server,
  Zap,
  Filter,
  CheckCircle2,
  Info
} from 'lucide-react';

interface CompromiseProgressChartProps {
  hosts?: NetworkHost[];
  compromisedHosts?: Set<string>;
  discoveredHosts?: Set<string>;
  foundFlags?: Set<string>;
  timeRemainingSeconds?: number;
  currentLab?: LabDefinition;
}

interface TimelinePoint {
  time: string;
  elapsedMinutes: number;
  dmzCompromised: number;
  internalCompromised: number;
  dmzPercentage: number;
  internalPercentage: number;
  totalCompromised: number;
  flagsFound: number;
  milestone: string;
  phase: 'Reconocimiento' | 'Explotación DMZ' | 'Pivoting' | 'Explotación Interna' | 'Post-Explotación';
}

export const CompromiseProgressChart: React.FC<CompromiseProgressChartProps> = ({
  hosts = [],
  compromisedHosts = new Set(),
  discoveredHosts = new Set(),
  foundFlags = new Set(),
  timeRemainingSeconds = 48 * 3600,
  currentLab
}) => {
  const [metricView, setMetricView] = useState<'count' | 'percentage'>('count');
  const [timelineScope, setTimelineScope] = useState<'actual' | 'roadmap'>('actual');

  // Subnet host partitioning
  const dmzHosts = useMemo(() => hosts.filter(h => h.subnet === 'dmz'), [hosts]);
  const internalHosts = useMemo(() => hosts.filter(h => h.subnet === 'internal'), [hosts]);

  const totalDmz = dmzHosts.length || 3;
  const totalInternal = internalHosts.length || 3;

  const currentDmzCompromised = useMemo(() => {
    return dmzHosts.filter(h => compromisedHosts.has(h.ip) || h.compromised).length;
  }, [dmzHosts, compromisedHosts]);

  const currentInternalCompromised = useMemo(() => {
    return internalHosts.filter(h => compromisedHosts.has(h.ip) || h.compromised).length;
  }, [internalHosts, compromisedHosts]);

  const dmzPercent = Math.round((currentDmzCompromised / totalDmz) * 100);
  const internalPercent = Math.round((currentInternalCompromised / totalInternal) * 100);

  // Total time spent (48h max)
  const totalExamDurationSeconds = 48 * 3600;
  const elapsedSeconds = Math.max(0, totalExamDurationSeconds - timeRemainingSeconds);
  const elapsedHours = Math.floor(elapsedSeconds / 3600);
  const elapsedMins = Math.floor((elapsedSeconds % 3600) / 60);

  // Generate realistic timeline data points mapping DMZ and Internal evolution
  const timelineData: TimelinePoint[] = useMemo(() => {
    const points: TimelinePoint[] = [
      {
        time: '00h 00m',
        elapsedMinutes: 0,
        dmzCompromised: 0,
        internalCompromised: 0,
        dmzPercentage: 0,
        internalPercentage: 0,
        totalCompromised: 0,
        flagsFound: 0,
        milestone: 'Inicio del Examen: Descubrimiento ARP (netdiscover)',
        phase: 'Reconocimiento'
      }
    ];

    // Build milestones sequence
    const dmzMilestones = [
      {
        label: 'DMZ: Intrusión Apache/LFI (target-web-01)',
        ip: dmzHosts[0]?.ip || '192.168.100.50',
        min: 25,
        flagInc: 1
      },
      {
        label: 'DMZ: Acceso vsftpd & Fuga de Credenciales (target-ftp-02)',
        ip: dmzHosts[1]?.ip || '192.168.100.55',
        min: 50,
        flagInc: 1
      },
      {
        label: 'DMZ: Compromiso Gateway Dual-Homed (target-gateway-03)',
        ip: dmzHosts[2]?.ip || '192.168.100.60',
        min: 80,
        flagInc: 1
      }
    ];

    const internalMilestones = [
      {
        label: 'INTERNA: Inyección SQLi vía Proxychains (target-db-04)',
        ip: internalHosts[0]?.ip || '10.10.10.20',
        min: 130,
        flagInc: 1
      },
      {
        label: 'INTERNA: Explotación PsExec SMB SYSTEM (target-win-05)',
        ip: internalHosts[1]?.ip || '10.10.10.25',
        min: 195,
        flagInc: 1
      },
      {
        label: 'INTERNA: Buffer Overflow BadBlue (target-vault-06)',
        ip: internalHosts[2]?.ip || '10.10.10.30',
        min: 260,
        flagInc: 1
      }
    ];

    let runningDmz = 0;
    let runningInternal = 0;
    let runningFlags = 0;

    // Phase 1: DMZ
    dmzMilestones.forEach(m => {
      const isCompromised = compromisedHosts.has(m.ip) || hosts.find(h => h.ip === m.ip)?.compromised;
      if (timelineScope === 'roadmap' || isCompromised) {
        runningDmz++;
        runningFlags += m.flagInc;
        const h = Math.floor(m.min / 60);
        const mins = m.min % 60;
        points.push({
          time: `${h.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m`,
          elapsedMinutes: m.min,
          dmzCompromised: runningDmz,
          internalCompromised: runningInternal,
          dmzPercentage: Math.round((runningDmz / totalDmz) * 100),
          internalPercentage: Math.round((runningInternal / totalInternal) * 100),
          totalCompromised: runningDmz + runningInternal,
          flagsFound: Math.min(foundFlags.size || runningFlags, runningFlags),
          milestone: m.label,
          phase: 'Explotación DMZ'
        });
      }
    });

    // Phase 2: Pivoting Gateway Point
    if (runningDmz >= 1 && (timelineScope === 'roadmap' || runningInternal > 0 || currentInternalCompromised > 0)) {
      points.push({
        time: '01h 45m',
        elapsedMinutes: 105,
        dmzCompromised: runningDmz,
        internalCompromised: runningInternal,
        dmzPercentage: Math.round((runningDmz / totalDmz) * 100),
        internalPercentage: Math.round((runningInternal / totalInternal) * 100),
        totalCompromised: runningDmz + runningInternal,
        flagsFound: runningFlags,
        milestone: 'Túnel Dinámico SOCKS5 Establecido (Port 1080)',
        phase: 'Pivoting'
      });
    }

    // Phase 3: Internal
    internalMilestones.forEach(m => {
      const isCompromised = compromisedHosts.has(m.ip) || hosts.find(h => h.ip === m.ip)?.compromised;
      if (timelineScope === 'roadmap' || isCompromised) {
        runningInternal++;
        runningFlags += m.flagInc;
        const h = Math.floor(m.min / 60);
        const mins = m.min % 60;
        points.push({
          time: `${h.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m`,
          elapsedMinutes: m.min,
          dmzCompromised: runningDmz,
          internalCompromised: runningInternal,
          dmzPercentage: Math.round((runningDmz / totalDmz) * 100),
          internalPercentage: Math.round((runningInternal / totalInternal) * 100),
          totalCompromised: runningDmz + runningInternal,
          flagsFound: Math.min(foundFlags.size || runningFlags, runningFlags),
          milestone: m.label,
          phase: 'Explotación Interna'
        });
      }
    });

    // If actual mode and only baseline exists because user is starting
    if (points.length === 1 && timelineScope === 'actual') {
      points.push({
        time: `${elapsedHours.toString().padStart(2, '0')}h ${elapsedMins.toString().padStart(2, '0')}m`,
        elapsedMinutes: Math.floor(elapsedSeconds / 60),
        dmzCompromised: currentDmzCompromised,
        internalCompromised: currentInternalCompromised,
        dmzPercentage: dmzPercent,
        internalPercentage: internalPercent,
        totalCompromised: currentDmzCompromised + currentInternalCompromised,
        flagsFound: foundFlags.size,
        milestone: 'Estado Actual de Auditoría',
        phase: 'Reconocimiento'
      });
    }

    return points;
  }, [
    dmzHosts, 
    internalHosts, 
    compromisedHosts, 
    hosts, 
    timelineScope, 
    totalDmz, 
    totalInternal, 
    foundFlags.size, 
    elapsedHours, 
    elapsedMins, 
    elapsedSeconds, 
    currentDmzCompromised, 
    currentInternalCompromised, 
    dmzPercent, 
    internalPercent
  ]);

  // Subnet Distribution Comparison Bar Data
  const subnetComparisonData = [
    {
      subnet: 'DMZ Perímetro',
      total: totalDmz,
      descubiertos: dmzHosts.filter(h => discoveredHosts.has(h.ip) || h.discovered).length,
      comprometidos: currentDmzCompromised,
      fill: '#10b981'
    },
    {
      subnet: 'Interna (Pivot)',
      total: totalInternal,
      descubiertos: internalHosts.filter(h => discoveredHosts.has(h.ip) || h.discovered).length,
      comprometidos: currentInternalCompromised,
      fill: '#38bdf8'
    }
  ];

  // Custom Dark Cyberpunk Tooltip for AreaChart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const point: TimelinePoint = payload[0].payload;
      return (
        <div className="p-3 bg-slate-950/95 border border-slate-700/80 rounded-xl shadow-2xl backdrop-blur-md text-xs font-mono space-y-2 min-w-[240px]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="text-slate-400 font-semibold flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-sky-400" /> {label}
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-emerald-400 font-bold border border-slate-700">
              {point.phase}
            </span>
          </div>

          <p className="text-slate-200 font-medium text-[11px] leading-tight">
            {point.milestone}
          </p>

          <div className="space-y-1 pt-1 border-t border-slate-800/80 text-[11px]">
            <div className="flex items-center justify-between text-emerald-400 font-semibold">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" /> Subred DMZ:
              </span>
              <span>
                {metricView === 'count' 
                  ? `${point.dmzCompromised} / ${totalDmz} hosts` 
                  : `${point.dmzPercentage}%`}
              </span>
            </div>

            <div className="flex items-center justify-between text-sky-400 font-semibold">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-400" /> Subred Interna:
              </span>
              <span>
                {metricView === 'count' 
                  ? `${point.internalCompromised} / ${totalInternal} hosts` 
                  : `${point.internalPercentage}%`}
              </span>
            </div>

            <div className="flex items-center justify-between text-amber-400 font-medium pt-0.5">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" /> Flags Capturadas:
              </span>
              <span>{point.flagsFound} flags</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {/* 1. TOP KPI SUMMARY CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {/* DMZ Subnet Card */}
        <div className="p-3 rounded-xl bg-slate-900/80 border border-emerald-500/30 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
              <Server className="w-3.5 h-3.5" /> Subred DMZ
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-mono">
              {currentLab?.dmzSubnet || '192.168.100.0/24'}
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div className="text-xl font-bold text-white font-mono">
              {currentDmzCompromised} <span className="text-xs text-slate-400 font-normal">/ {totalDmz} hosts</span>
            </div>
            <span className="text-xs font-bold text-emerald-400 font-mono">
              {dmzPercent}%
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
            <div 
              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500" 
              style={{ width: `${dmzPercent}%` }} 
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-1.5 truncate">
            {currentDmzCompromised === totalDmz ? '✓ Perímetro completamente dominado' : 'Fase de reconocimiento & explotación web'}
          </p>
        </div>

        {/* Internal Subnet Card */}
        <div className="p-3 rounded-xl bg-slate-900/80 border border-sky-500/30 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-sky-400 uppercase tracking-wider flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" /> Subred Interna
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-300 border border-sky-500/20 font-mono">
              {currentLab?.internalSubnet || '10.10.10.0/24'}
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div className="text-xl font-bold text-white font-mono">
              {currentInternalCompromised} <span className="text-xs text-slate-400 font-normal">/ {totalInternal} hosts</span>
            </div>
            <span className="text-xs font-bold text-sky-400 font-mono">
              {internalPercent}%
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
            <div 
              className="bg-sky-400 h-1.5 rounded-full transition-all duration-500" 
              style={{ width: `${internalPercent}%` }} 
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-1.5 truncate">
            {currentInternalCompromised === 0 ? 'Requiere túnel SOCKS5 (Pivoting)' : `${currentInternalCompromised} host(s) internos comprometidos`}
          </p>
        </div>

        {/* Exam Time Spent Card */}
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-400" /> Tiempo Examen
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-mono">
              Límite 48h
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div className="text-xl font-bold text-slate-100 font-mono">
              {elapsedHours}h {elapsedMins}m
            </div>
            <span className="text-[11px] text-slate-400">
              {Math.round((elapsedSeconds / totalExamDurationSeconds) * 100)}%
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
            <div 
              className="bg-amber-400 h-1.5 rounded-full transition-all duration-500" 
              style={{ width: `${Math.min(100, Math.round((elapsedSeconds / totalExamDurationSeconds) * 100))}%` }} 
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-1.5">
            Ritmo de auditoría eJPTv2 estándar
          </p>
        </div>

        {/* Global Compromise Velocity (MTTC) Card */}
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-teal-400" /> Botín & Flags
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-teal-500/10 text-teal-300 border border-teal-500/20 font-mono">
              {foundFlags.size} / 6
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div className="text-xl font-bold text-teal-300 font-mono">
              {currentDmzCompromised + currentInternalCompromised} <span className="text-xs text-slate-400 font-normal">/ {hosts.length || 6} Total</span>
            </div>
            <span className="text-xs font-bold text-teal-400 font-mono">
              {Math.round(((currentDmzCompromised + currentInternalCompromised) / (hosts.length || 6)) * 100)}%
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
            <div 
              className="bg-teal-400 h-1.5 rounded-full transition-all duration-500" 
              style={{ width: `${Math.round(((currentDmzCompromised + currentInternalCompromised) / (hosts.length || 6)) * 100)}%` }} 
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-1.5">
            Control perimetral e interno combinado
          </p>
        </div>
      </div>

      {/* 2. RECHARTS INTERACTIVE AREA CHART: EVOLUCIÓN TEMPORAL DMZ VS INTERNA */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
        {/* Chart Header & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Progreso de Compromisos por Subred a lo Largo del Tiempo</span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Evolución cronológica de la intrusión en DMZ (192.168.100.0/24) vs. Subred Interna (10.10.10.0/24).
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle: Count vs Percentage */}
            <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px]">
              <button
                onClick={() => setMetricView('count')}
                className={`px-2 py-1 rounded-md transition-colors ${
                  metricView === 'count'
                    ? 'bg-slate-800 text-emerald-400 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Nº Hosts
              </button>
              <button
                onClick={() => setMetricView('percentage')}
                className={`px-2 py-1 rounded-md transition-colors ${
                  metricView === 'percentage'
                    ? 'bg-slate-800 text-sky-400 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Porcentaje (%)
              </button>
            </div>

            {/* Timeline Scope: Actual vs Roadmap */}
            <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px]">
              <button
                onClick={() => setTimelineScope('actual')}
                className={`px-2 py-1 rounded-md transition-colors ${
                  timelineScope === 'actual'
                    ? 'bg-slate-800 text-emerald-400 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Muestra el progreso registrado hasta este instante"
              >
                Sesión Real
              </button>
              <button
                onClick={() => setTimelineScope('roadmap')}
                className={`px-2 py-1 rounded-md transition-colors ${
                  timelineScope === 'roadmap'
                    ? 'bg-slate-800 text-sky-400 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Muestra la hoja de ruta cronológica óptima de explotación eJPTv2"
              >
                Ruta Completa
              </button>
            </div>
          </div>
        </div>

        {/* Recharts Area Chart Container */}
        <div className="w-full h-72 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timelineData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <defs>
                {/* DMZ Gradient */}
                <linearGradient id="dmzGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                </linearGradient>
                {/* Internal Subnet Gradient */}
                <linearGradient id="internalGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.02} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis 
                dataKey="time" 
                stroke="#64748b" 
                fontSize={11} 
                tickLine={false}
              />
              <YAxis 
                stroke="#64748b" 
                fontSize={11} 
                tickLine={false}
                domain={metricView === 'count' ? [0, 3] : [0, 100]}
                unit={metricView === 'percentage' ? '%' : ''}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="top" 
                height={32} 
                iconType="circle"
                wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} 
              />

              {/* Area 1: DMZ Subnet */}
              <Area
                type="monotone"
                dataKey={metricView === 'count' ? 'dmzCompromised' : 'dmzPercentage'}
                name="Subred DMZ (Perímetro)"
                stroke="#10b981"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#dmzGradient)"
                activeDot={{ r: 6, fill: '#10b981', stroke: '#022c22', strokeWidth: 2 }}
              />

              {/* Area 2: Internal Subnet */}
              <Area
                type="monotone"
                dataKey={metricView === 'count' ? 'internalCompromised' : 'internalPercentage'}
                name="Subred Interna (Pivot SOCKS5)"
                stroke="#38bdf8"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#internalGradient)"
                activeDot={{ r: 6, fill: '#38bdf8', stroke: '#082f49', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Subnet Progression Legend Details */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400 font-mono">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              <span>DMZ: {currentDmzCompromised} / {totalDmz} ({dmzPercent}%)</span>
            </span>
            <span className="flex items-center gap-1.5 text-sky-400">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block" />
              <span>Interna: {currentInternalCompromised} / {totalInternal} ({internalPercent}%)</span>
            </span>
          </div>

          <div className="flex items-center gap-1 text-slate-400">
            <Info className="w-3.5 h-3.5 text-sky-400" />
            <span>Pasa el cursor sobre la gráfica para ver los hitos y comandos ejecutados</span>
          </div>
        </div>
      </div>

      {/* 3. RECHARTS COMPARISON BAR CHART & AUDIT KILL CHAIN ROADMAP */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Bar Chart: Hosts Totales vs Descubiertos vs Comprometidos */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h4 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-sky-400" />
              <span>Distribución de Objetivos por Subred</span>
            </h4>
            <span className="text-[10px] text-slate-400 font-mono">
              DMZ vs Interna
            </span>
          </div>

          <div className="w-full h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={subnetComparisonData} margin={{ top: 5, right: 15, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="subnet" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} domain={[0, 3]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '11px' }}
                />
                <Legend 
                  verticalAlign="top" 
                  height={24}
                  wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} 
                />
                <Bar dataKey="total" name="Total Hosts" fill="#475569" radius={[4, 4, 0, 0]} />
                <Bar dataKey="descubiertos" name="Descubiertos" fill="#0284c7" radius={[4, 4, 0, 0]} />
                <Bar dataKey="comprometidos" name="Comprometidos" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Timeline Milestones Table (Kill Chain) */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h4 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Cadena de Compromiso (Kill Chain)</span>
            </h4>
            <span className="text-[10px] text-slate-400 font-mono">
              Hitos alcanzados
            </span>
          </div>

          <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
            {timelineData.map((pt, idx) => (
              <div 
                key={idx} 
                className="p-2 rounded-lg bg-slate-950/70 border border-slate-800/80 flex items-center justify-between text-[11px] font-mono hover:bg-slate-950 transition-colors"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-sky-400 font-bold shrink-0">
                    {pt.time}
                  </span>
                  <span className="text-slate-300 truncate">
                    {pt.milestone}
                  </span>
                </div>
                <span className={`px-1.5 py-0.2 rounded text-[10px] shrink-0 ml-2 font-bold ${
                  pt.phase === 'Explotación DMZ' 
                    ? 'text-emerald-400 bg-emerald-500/10' 
                    : pt.phase === 'Explotación Interna'
                    ? 'text-sky-400 bg-sky-500/10'
                    : 'text-amber-400 bg-amber-500/10'
                }`}>
                  {pt.phase}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompromiseProgressChart;
