import React, { useState } from 'react';
import { NetworkHost, PivotingState } from '../types/simulator';
import { D3NetworkTraffic } from './D3NetworkTraffic';
import { 
  Server, 
  Terminal, 
  ShieldCheck, 
  ShieldAlert, 
  ArrowRight, 
  Lock, 
  Unlock, 
  Database, 
  Globe, 
  FileText, 
  Copy, 
  Check, 
  Cpu, 
  Layers, 
  Map as MapIcon, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  HardDrive,
  Activity,
  ExternalLink
} from 'lucide-react';

interface NetworkMapProps {
  hosts: NetworkHost[];
  pivoting: PivotingState;
  discoveredHosts: Set<string>;
  compromisedHosts: Set<string>;
  foundFlags: Set<string>;
  onSelectCommand?: (cmd: string) => void;
  attackerIp?: string;
  dmzSubnet?: string;
  internalSubnet?: string;
}

export const NetworkMap: React.FC<NetworkMapProps> = ({
  hosts,
  pivoting,
  discoveredHosts,
  compromisedHosts,
  foundFlags,
  onSelectCommand,
  attackerIp = '192.168.100.10',
  dmzSubnet = '192.168.100.0/24',
  internalSubnet = '10.10.10.0/24'
}) => {
  const [viewMode, setViewMode] = useState<'d3_traffic' | 'visual_map' | 'cards'>('d3_traffic');
  const [selectedHostId, setSelectedHostId] = useState<string>(hosts[2]?.id || hosts[0]?.id);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  const selectedHost = hosts.find(h => h.id === selectedHostId) || hosts[0];
  const dmzHosts = hosts.filter(h => h.subnet === 'dmz');
  const internalHosts = hosts.filter(h => h.subnet === 'internal');

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 1800);
  };

  const getHostStatus = (host: NetworkHost) => {
    if (compromisedHosts.has(host.ip)) return 'compromised';
    if (discoveredHosts.has(host.ip)) return 'discovered';
    return 'pending';
  };

  const getHostStatusBadge = (host: NetworkHost) => {
    const status = getHostStatus(host);
    if (status === 'compromised') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30">
          <ShieldAlert className="w-3 h-3" /> Comprometido
        </span>
      );
    }
    if (status === 'discovered') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
          <ShieldCheck className="w-3 h-3" /> Descubierto
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-800/60 px-2 py-0.5 rounded border border-slate-700/40">
        Pendiente
      </span>
    );
  };

  // Node positions on the 1000x520 SVG Canvas
  const nodeCoords: Record<string, { x: number; y: number; label: string; iconType: string }> = {
    // Attacker
    attacker: { x: 90, y: 250, label: `Kali Linux (${attackerIp})`, iconType: 'kali' },
    // DMZ Switch
    dmz_switch: { x: 230, y: 250, label: 'DMZ Switch', iconType: 'switch' },
    // DMZ Hosts
    [dmzHosts[0]?.id || 'dmz1']: { x: 370, y: 120, label: dmzHosts[0]?.hostname?.split('.')[0] || 'Target-1', iconType: 'web' },
    [dmzHosts[1]?.id || 'dmz2']: { x: 370, y: 380, label: dmzHosts[1]?.hostname?.split('.')[0] || 'Target-2', iconType: 'ftp' },
    [dmzHosts[2]?.id || 'dmz3']: { x: 520, y: 250, label: dmzHosts[2]?.hostname?.split('.')[0] || 'Gateway-Pivot', iconType: 'gateway' },
    // Internal Switch
    internal_switch: { x: 690, y: 250, label: 'Internal Switch', iconType: 'switch' },
    // Internal Hosts
    [internalHosts[0]?.id || 'int1']: { x: 840, y: 120, label: internalHosts[0]?.hostname?.split('.')[0] || 'Target-4', iconType: 'db' },
    [internalHosts[1]?.id || 'int2']: { x: 840, y: 250, label: internalHosts[1]?.hostname?.split('.')[0] || 'Target-5', iconType: 'win' },
    [internalHosts[2]?.id || 'int3']: { x: 840, y: 380, label: internalHosts[2]?.hostname?.split('.')[0] || 'Target-6', iconType: 'vault' }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      
      {/* Top Map Toolbar */}
      <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide">
              Mapa de Red & Topología Interactiva
            </h2>
            <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2">
              <span className="text-cyan-400">DMZ: {dmzSubnet}</span>
              <span>➔</span>
              <span className="text-purple-400">Interna: {internalSubnet}</span>
            </div>
          </div>
        </div>

        {/* View Switcher & Pivot Pill */}
        <div className="flex items-center gap-3">
          {/* Pivoting status pill */}
          <div className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 border font-mono ${
            pivoting.isPivoted
              ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-md animate-pulse'
              : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
          }`}>
            {pivoting.isPivoted ? (
              <>
                <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Túnel SOCKS5 Activo (:1080)</span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>Túnel SOCKS Inactivo</span>
              </>
            )}
          </div>

          {/* Community brand link */}
          <a
            href="https://www.unfantasmaenelsistema.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/50 text-[11px] font-semibold text-slate-300 hover:text-emerald-300 transition-colors"
            title="Visitar web oficial de Un Fantasma en el Sistema"
          >
            <img src="/icono.png" alt="Logo" className="w-4 h-4 object-contain" referrerPolicy="no-referrer" />
            <span>unfantasmaenelsistema.com</span>
            <ExternalLink className="w-2.5 h-2.5 text-emerald-400" />
          </a>

          {/* Mode toggle */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setViewMode('d3_traffic')}
              className={`px-2.5 py-1 rounded-md font-medium flex items-center gap-1.5 transition-colors ${
                viewMode === 'd3_traffic' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Visualizador de tráfico en tiempo real entre subredes con D3.js"
            >
              <Activity className="w-3.5 h-3.5 text-emerald-300 animate-pulse" />
              <span>Tráfico D3 (En Vivo)</span>
            </button>
            <button
              onClick={() => setViewMode('visual_map')}
              className={`px-2.5 py-1 rounded-md font-medium flex items-center gap-1.5 transition-colors ${
                viewMode === 'visual_map' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>Diagrama Topología</span>
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`px-2.5 py-1 rounded-md font-medium flex items-center gap-1.5 transition-colors ${
                viewMode === 'cards' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Tarjetas</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      {viewMode === 'd3_traffic' ? (
        <div className="flex-1 overflow-hidden">
          <D3NetworkTraffic
            hosts={hosts}
            pivoting={pivoting}
            discoveredHosts={discoveredHosts}
            compromisedHosts={compromisedHosts}
            attackerIp={attackerIp}
            dmzSubnet={dmzSubnet}
            internalSubnet={internalSubnet}
            onSelectCommand={onSelectCommand}
          />
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        
        {/* Left: Map Visualizer (SVG or Cards) */}
        <div className="lg:col-span-8 p-3 bg-slate-950 flex flex-col overflow-hidden border-r border-slate-800">
          
          {viewMode === 'visual_map' ? (
            <div className="relative flex-1 rounded-xl bg-slate-900/60 border border-slate-800/90 overflow-hidden flex flex-col">
              
              {/* Zoom controls */}
              <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-slate-900/90 border border-slate-700/80 rounded-lg p-1 shadow-lg">
                <button
                  onClick={() => setZoomLevel(prev => Math.min(1.4, prev + 0.1))}
                  className="p-1 text-slate-300 hover:text-white rounded hover:bg-slate-800"
                  title="Acercar (Zoom In)"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setZoomLevel(prev => Math.max(0.7, prev - 0.1))}
                  className="p-1 text-slate-300 hover:text-white rounded hover:bg-slate-800"
                  title="Alejar (Zoom Out)"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setZoomLevel(1)}
                  className="p-1 text-slate-300 hover:text-white rounded hover:bg-slate-800 text-[11px] font-mono px-1.5"
                  title="Restablecer escala"
                >
                  100%
                </button>
              </div>

              {/* Subnet Legend on Top Left */}
              <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-2 text-[11px] font-mono">
                <span className="px-2 py-0.5 rounded bg-blue-950/80 border border-blue-500/40 text-blue-300">
                  Subred 1: DMZ ({dmzSubnet})
                </span>
                <span className={`px-2 py-0.5 rounded border transition-colors ${
                  pivoting.isPivoted
                    ? 'bg-purple-950/80 border-purple-500/50 text-purple-300'
                    : 'bg-slate-900/90 border-slate-700 text-slate-400'
                }`}>
                  Subred 2: Interna ({internalSubnet})
                </span>
              </div>

              {/* SVG Canvas */}
              <div className="flex-1 w-full h-full flex items-center justify-center p-2 overflow-auto">
                <div style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center', transition: 'transform 0.2s ease-out' }}>
                  <svg
                    viewBox="0 0 1000 500"
                    className="w-[940px] h-[470px] select-none"
                  >
                    <defs>
                      {/* Grid Pattern */}
                      <pattern id="grid" width="25" height="25" patternUnits="userSpaceOnUse">
                        <circle cx="2" cy="2" r="0.8" fill="#334155" opacity="0.6" />
                      </pattern>

                      {/* Gradients */}
                      <linearGradient id="dmzGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#1e3a8a" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="#0f172a" stopOpacity="0.05" />
                      </linearGradient>

                      <linearGradient id="internalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#581c87" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="#0f172a" stopOpacity="0.05" />
                      </linearGradient>

                      <linearGradient id="activeTunnelGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="50%" stopColor="#06b6d4" />
                        <stop offset="100%" stopColor="#a855f7" />
                      </linearGradient>

                      {/* Glow Filters */}
                      <filter id="glowGreen" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="4" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>

                      <filter id="glowRed" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="4" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                    </defs>

                    {/* Background Grid */}
                    <rect width="1000" height="500" fill="url(#grid)" />

                    {/* ZONE 1: DMZ Perimetral Box */}
                    <rect
                      x="200"
                      y="40"
                      width="380"
                      height="420"
                      rx="16"
                      fill="url(#dmzGrad)"
                      stroke="#3b82f6"
                      strokeWidth="1.5"
                      strokeDasharray="6 4"
                      opacity="0.8"
                    />
                    <text x="215" y="65" fill="#60a5fa" fontSize="11" fontFamily="monospace" fontWeight="bold">
                      [ZONA DMZ] {dmzSubnet}
                    </text>

                    {/* ZONE 2: Internal Subnet Box */}
                    <rect
                      x="620"
                      y="40"
                      width="360"
                      height="420"
                      rx="16"
                      fill="url(#internalGrad)"
                      stroke={pivoting.isPivoted ? '#a855f7' : '#475569'}
                      strokeWidth="1.5"
                      strokeDasharray="6 4"
                      opacity={pivoting.isPivoted ? '0.9' : '0.5'}
                    />
                    <text x="635" y="65" fill={pivoting.isPivoted ? '#c084fc' : '#64748b'} fontSize="11" fontFamily="monospace" fontWeight="bold">
                      [ZONA INTERNA PRIVADA] {internalSubnet}
                    </text>

                    {/* CONNECTION CABLES / BUS */}
                    
                    {/* Kali -> DMZ Switch */}
                    <path
                      d="M 125 250 L 230 250"
                      stroke="#10b981"
                      strokeWidth="2.5"
                      strokeDasharray="4 4"
                      className="animate-pulse"
                    />

                    {/* DMZ Switch -> Target 1 (Web) */}
                    <path
                      d="M 230 250 C 270 250, 270 120, 370 120"
                      stroke="#38bdf8"
                      strokeWidth="2"
                      fill="none"
                    />

                    {/* DMZ Switch -> Target 2 (FTP/Storage) */}
                    <path
                      d="M 230 250 C 270 250, 270 380, 370 380"
                      stroke="#38bdf8"
                      strokeWidth="2"
                      fill="none"
                    />

                    {/* DMZ Switch -> Target 3 (Gateway) */}
                    <path
                      d="M 230 250 L 520 250"
                      stroke="#38bdf8"
                      strokeWidth="2"
                      fill="none"
                    />

                    {/* PIVOT TUNNEL BRIDGE: Gateway (520,250) -> Internal Switch (690, 250) */}
                    {pivoting.isPivoted ? (
                      <>
                        <path
                          d="M 520 250 L 690 250"
                          stroke="url(#activeTunnelGrad)"
                          strokeWidth="4"
                          fill="none"
                          filter="url(#glowGreen)"
                        />
                        {/* Animated Packet Pulse */}
                        <circle r="4" fill="#10b981">
                          <animateMotion
                            path="M 520 250 L 690 250"
                            dur="1.2s"
                            repeatCount="indefinite"
                          />
                        </circle>
                      </>
                    ) : (
                      <path
                        d="M 520 250 L 690 250"
                        stroke="#f59e0b"
                        strokeWidth="2.5"
                        strokeDasharray="6 6"
                        fill="none"
                      />
                    )}

                    {/* Internal Switch -> Target 4 */}
                    <path
                      d="M 690 250 C 740 250, 740 120, 840 120"
                      stroke={pivoting.isPivoted ? '#c084fc' : '#475569'}
                      strokeWidth="2"
                      fill="none"
                    />

                    {/* Internal Switch -> Target 5 */}
                    <path
                      d="M 690 250 L 840 250"
                      stroke={pivoting.isPivoted ? '#c084fc' : '#475569'}
                      strokeWidth="2"
                      fill="none"
                    />

                    {/* Internal Switch -> Target 6 */}
                    <path
                      d="M 690 250 C 740 250, 740 380, 840 380"
                      stroke={pivoting.isPivoted ? '#c084fc' : '#475569'}
                      strokeWidth="2"
                      fill="none"
                    />

                    {/* SWITCH NODES */}
                    <circle cx="230" cy="250" r="10" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
                    <circle cx="690" cy="250" r="10" fill="#1e293b" stroke={pivoting.isPivoted ? '#a855f7' : '#475569'} strokeWidth="2" />

                    {/* KALI ATTACKER NODE */}
                    <g transform="translate(55, 215)" className="cursor-pointer">
                      <rect
                        width="70"
                        height="70"
                        rx="14"
                        fill="#022c22"
                        stroke="#10b981"
                        strokeWidth="2.5"
                        filter="url(#glowGreen)"
                      />
                      <circle cx="35" cy="30" r="14" fill="#065f46" />
                      <text x="35" y="34" fill="#34d399" fontSize="14" textAnchor="middle" fontWeight="bold">&gt;_</text>
                      <text x="35" y="55" fill="#a7f3d0" fontSize="9" textAnchor="middle" fontFamily="monospace" fontWeight="bold">Kali Linux</text>
                      <text x="35" y="65" fill="#6ee7b7" fontSize="7.5" textAnchor="middle" fontFamily="monospace">{attackerIp}</text>
                    </g>

                    {/* TARGET HOST NODES */}
                    {hosts.map((host, idx) => {
                      const pos = nodeCoords[host.id] || { x: 400 + idx * 70, y: 200, label: host.hostname };
                      const isSelected = host.id === selectedHostId;
                      const status = getHostStatus(host);

                      let borderColor = '#475569';
                      let bgColor = '#0f172a';
                      let iconColor = '#94a3b8';

                      if (status === 'compromised') {
                        borderColor = '#f43f5e';
                        bgColor = '#4c0519';
                        iconColor = '#fb7185';
                      } else if (status === 'discovered') {
                        borderColor = '#10b981';
                        bgColor = '#064e3b';
                        iconColor = '#34d399';
                      } else if (host.isPivotGateway) {
                        borderColor = '#f59e0b';
                        bgColor = '#451a03';
                        iconColor = '#fbbf24';
                      }

                      return (
                        <g
                          key={host.id}
                          transform={`translate(${pos.x - 40}, ${pos.y - 35})`}
                          onClick={() => setSelectedHostId(host.id)}
                          className="cursor-pointer group"
                        >
                          {/* Selection Halo */}
                          {isSelected && (
                            <rect
                              x="-5"
                              y="-5"
                              width="90"
                              height="80"
                              rx="18"
                              fill="none"
                              stroke="#38bdf8"
                              strokeWidth="2.5"
                              strokeDasharray="4 3"
                              className="animate-spin"
                            />
                          )}

                          {/* Node Box */}
                          <rect
                            width="80"
                            height="70"
                            rx="12"
                            fill={bgColor}
                            stroke={borderColor}
                            strokeWidth={isSelected ? '2.5' : '1.5'}
                            className="transition-all group-hover:stroke-cyan-400"
                          />

                          {/* Dual-homed Gateway Badge */}
                          {host.isPivotGateway && (
                            <rect x="18" y="-7" width="44" height="13" rx="4" fill="#d97706" />
                          )}
                          {host.isPivotGateway && (
                            <text x="40" y="2" fill="#fff" fontSize="7.5" textAnchor="middle" fontWeight="bold" fontFamily="monospace">
                              PIVOT
                            </text>
                          )}

                          {/* Host Icon text */}
                          <circle cx="40" cy="24" r="14" fill="#1e293b" stroke={borderColor} strokeWidth="1" />
                          <text x="40" y="28" fill={iconColor} fontSize="11" textAnchor="middle" fontWeight="bold">
                            {host.os.includes('Windows') ? '⊞' : host.ports.some(p => p.service === 'mysql' || p.service === 'ms-sql-s') ? '⛁' : '☁'}
                          </text>

                          {/* Hostname & IP */}
                          <text x="40" y="47" fill="#f8fafc" fontSize="8.5" textAnchor="middle" fontWeight="bold" fontFamily="monospace">
                            {host.hostname.split('.')[0].slice(0, 11)}
                          </text>
                          <text x="40" y="58" fill="#94a3b8" fontSize="7.5" textAnchor="middle" fontFamily="monospace">
                            {host.ip}
                          </text>
                        </g>
                      );
                    })}

                    {/* Pivot Bridge Label in the Middle */}
                    <g transform="translate(605, 232)">
                      <rect
                        width="80"
                        height="36"
                        rx="8"
                        fill="#0f172a"
                        stroke={pivoting.isPivoted ? '#10b981' : '#f59e0b'}
                        strokeWidth="1.5"
                      />
                      <text x="40" y="15" fill={pivoting.isPivoted ? '#34d399' : '#f59e0b'} fontSize="8" textAnchor="middle" fontWeight="bold" fontFamily="monospace">
                        {pivoting.isPivoted ? '🔓 SOCKS5:1080' : '🔒 PIVOT LOCK'}
                      </text>
                      <text x="40" y="27" fill="#94a3b8" fontSize="7" textAnchor="middle" fontFamily="monospace">
                        {pivoting.isPivoted ? 'Enrutado' : 'Requiere Túnel'}
                      </text>
                    </g>
                  </svg>
                </div>
              </div>

              {/* Instructions banner */}
              <div className="p-2 bg-slate-900/90 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Haz clic en cualquier máquina para inspeccionar puertos, flags y lanzar ataques en la terminal.</span>
                <span className="font-mono text-cyan-400">Objetivo: Comprometer los 6 sistemas</span>
              </div>
            </div>
          ) : (
            /* Cards View */
            <div className="flex-1 overflow-y-auto space-y-4">
              
              {/* DMZ Section */}
              <div className="p-3.5 rounded-xl border border-blue-500/30 bg-blue-950/10 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-blue-400 font-mono uppercase">
                    Subred 1: DMZ Perimetral ({dmzSubnet})
                  </span>
                  <span className="text-slate-400 text-[11px]">Directamente alcanzable</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {dmzHosts.map(host => (
                    <button
                      key={host.id}
                      onClick={() => setSelectedHostId(host.id)}
                      className={`text-left p-3 rounded-lg border transition-all ${
                        host.id === selectedHostId
                          ? 'bg-slate-800 border-emerald-500 shadow-md ring-1 ring-emerald-500/50'
                          : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-white truncate">{host.hostname.split('.')[0]}</span>
                        {host.isPivotGateway && (
                          <span className="text-[9px] bg-amber-500/20 text-amber-300 font-bold px-1.5 py-0.2 rounded border border-amber-500/30">
                            PIVOT
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-mono text-cyan-300 mb-2">{host.ip}</div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 text-[10px]">{host.os}</span>
                        {getHostStatusBadge(host)}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Internal Section */}
              <div className={`p-3.5 rounded-xl border space-y-2.5 transition-colors ${
                pivoting.isPivoted
                  ? 'border-purple-500/40 bg-purple-950/15'
                  : 'border-slate-800 bg-slate-900/40 opacity-75'
              }`}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-purple-400 font-mono uppercase">
                    Subred 2: Red Interna Privada ({internalSubnet})
                  </span>
                  <span className="text-slate-400 text-[11px]">
                    {pivoting.isPivoted ? 'Alcanzable vía proxychains' : 'Aislada (Requiere Pivoting)'}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {internalHosts.map(host => (
                    <button
                      key={host.id}
                      onClick={() => setSelectedHostId(host.id)}
                      className={`text-left p-3 rounded-lg border transition-all ${
                        host.id === selectedHostId
                          ? 'bg-slate-800 border-purple-500 shadow-md ring-1 ring-purple-500/50'
                          : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-white truncate">{host.hostname.split('.')[0]}</span>
                        {host.os.includes('Windows') && (
                          <span className="text-[9px] bg-blue-500/20 text-blue-300 font-bold px-1.5 py-0.2 rounded border border-blue-500/30">
                            WIN
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-mono text-purple-300 mb-2">{host.ip}</div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 text-[10px]">{host.os}</span>
                        {getHostStatusBadge(host)}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Right: Target Host Inspector */}
        <div className="lg:col-span-4 p-4 overflow-y-auto space-y-4 bg-slate-900/40">
          
          {/* Target Host Header Card */}
          <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400">
                  {selectedHost.subnet === 'dmz' ? 'Subred DMZ (Perímetro)' : 'Subred Interna (Privada)'}
                </span>
                <h3 className="text-base font-bold text-white">{selectedHost.hostname}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-mono text-emerald-400 font-semibold">{selectedHost.ip}</span>
                  {selectedHost.secondaryIp && (
                    <span className="text-xs font-mono text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/30">
                      eth1: {selectedHost.secondaryIp}
                    </span>
                  )}
                  <button
                    onClick={() => copyToClipboard(selectedHost.ip)}
                    className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
                    title="Copiar IP"
                  >
                    {copiedText === selectedHost.ip ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
              <div>{getHostStatusBadge(selectedHost)}</div>
            </div>

            {/* Quick action buttons for terminal */}
            {onSelectCommand && (
              <div className="pt-2 border-t border-slate-800 flex flex-wrap gap-1.5">
                <button
                  onClick={() => onSelectCommand(selectedHost.subnet === 'internal' 
                    ? `proxychains nmap -sT -Pn ${selectedHost.ip}` 
                    : `nmap -sV -sC -p- ${selectedHost.ip}`)}
                  className="text-[11px] px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono transition-colors"
                >
                  ⚡ Escanear Nmap
                </button>
                {selectedHost.ports.some(p => p.service === 'http') && (
                  <button
                    onClick={() => onSelectCommand(selectedHost.subnet === 'internal'
                      ? `proxychains curl -I http://${selectedHost.ip}`
                      : `curl -I http://${selectedHost.ip}`)}
                    className="text-[11px] px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono transition-colors"
                  >
                    🌐 Curl HTTP
                  </button>
                )}
                {selectedHost.ports.some(p => p.service === 'ssh') && (
                  <button
                    onClick={() => onSelectCommand(
                      selectedHost.ip.includes('100')
                        ? 'ssh routeradm@172.16.50.100'
                        : selectedHost.ip === '192.168.100.60'
                        ? 'ssh pivotuser@192.168.100.60'
                        : selectedHost.ip === '192.168.100.50'
                        ? 'ssh sysadmin@192.168.100.50'
                        : `ssh user@${selectedHost.ip}`
                    )}
                    className="text-[11px] px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono transition-colors"
                  >
                    🔑 Conectar SSH
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Ports & Services */}
          <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl space-y-2.5">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-blue-400" /> Puertos & Servicios Identificados
            </h4>
            <div className="space-y-1.5">
              {selectedHost.ports.map((port) => (
                <div
                  key={port.port}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs font-mono"
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-emerald-400 font-semibold">{port.port}/{port.protocol}</span>
                    <span className="text-slate-300 font-medium">{port.service}</span>
                  </div>
                  <span className="text-slate-400 text-[11px] truncate max-w-[170px]">{port.version}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Discovered Flags */}
          <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl space-y-2.5">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-amber-400" /> Banderas Asociadas
            </h4>
            {selectedHost.flags.map(flag => {
              const isFound = foundFlags.has(flag.id);
              return (
                <div key={flag.id} className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/90 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">{flag.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                      isFound ? 'bg-emerald-500/20 text-emerald-400 font-bold' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {isFound ? 'CAPTURADA' : 'PENDIENTE'}
                    </span>
                  </div>
                  <div className="text-slate-400 text-[11px] font-mono">Ruta: {flag.path}</div>
                  {isFound ? (
                    <div className="p-1.5 bg-emerald-950/60 border border-emerald-500/40 rounded text-emerald-300 font-mono text-[11px] break-all">
                      {flag.value}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500 italic">{flag.description}</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Notes */}
          <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl space-y-2">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Notas de Auditoría
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              {selectedHost.notes}
            </p>
          </div>

        </div>

      </div>
      )}
    </div>
  );
};

export default NetworkMap;
