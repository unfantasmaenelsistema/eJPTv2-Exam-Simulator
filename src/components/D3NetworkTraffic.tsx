import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { NetworkHost, PivotingState } from '../types/simulator';
import { 
  Activity, 
  Play, 
  Pause, 
  Send, 
  RotateCcw, 
  Zap, 
  ShieldCheck, 
  ShieldAlert, 
  Lock, 
  Unlock, 
  Server, 
  Cpu, 
  Radio, 
  ArrowRight, 
  Info,
  CheckCircle2,
  XCircle,
  Clock,
  Gauge
} from 'lucide-react';

interface D3NetworkTrafficProps {
  hosts: NetworkHost[];
  pivoting: PivotingState;
  discoveredHosts: Set<string>;
  compromisedHosts: Set<string>;
  attackerIp: string;
  dmzSubnet: string;
  internalSubnet: string;
  onSelectCommand?: (cmd: string) => void;
}

interface SimulatedPacket {
  id: string;
  sourceId: string;
  targetId: string;
  targetIp: string;
  targetHostname: string;
  subnet: 'dmz' | 'internal';
  protocol: 'SOCKS5' | 'TCP-HTTP' | 'SMB' | 'SSH' | 'ICMP';
  color: string;
  bytes: number;
  latencyMs: number;
  status: 'transit' | 'delivered' | 'dropped';
  startTime: number;
  durationMs: number; // visual transit duration
  pathPoints: [number, number][]; // coordinates for D3 path interpolation
}

interface LatencySample {
  timestamp: number;
  latencyMs: number;
  subnet: 'dmz' | 'internal';
  isPivoted: boolean;
}

export const D3NetworkTraffic: React.FC<D3NetworkTrafficProps> = ({
  hosts,
  pivoting,
  discoveredHosts,
  compromisedHosts,
  attackerIp,
  dmzSubnet,
  internalSubnet,
  onSelectCommand
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const latencyChartRef = useRef<SVGSVGElement | null>(null);

  // Simulation controls state
  const [isLiveActive, setIsLiveActive] = useState<boolean>(true);
  const [trafficRate, setTrafficRate] = useState<'slow' | 'medium' | 'fast'>('medium');
  const [selectedProtocol, setSelectedProtocol] = useState<'ALL' | 'SOCKS5' | 'TCP-HTTP' | 'SMB' | 'ICMP'>('ALL');
  const [selectedTargetHost, setSelectedTargetHost] = useState<string | null>(null);
  
  // Real-time metrics state
  const [totalPacketsSent, setTotalPacketsSent] = useState<number>(0);
  const [totalPacketsDelivered, setTotalPacketsDelivered] = useState<number>(0);
  const [totalPacketsDropped, setTotalPacketsDropped] = useState<number>(0);
  const [currentLatency, setCurrentLatency] = useState<number>(pivoting.isPivoted ? 44 : 14);
  const [jitter, setJitter] = useState<number>(3.2);
  const [packetLog, setPacketLog] = useState<{
    id: string;
    time: string;
    proto: string;
    src: string;
    dst: string;
    rtt: string;
    status: 'delivered' | 'dropped';
  }[]>([]);

  // Latency samples history for D3 sparkline
  const [latencyHistory, setLatencyHistory] = useState<LatencySample[]>([
    { timestamp: Date.now() - 5000, latencyMs: 14, subnet: 'dmz', isPivoted: pivoting.isPivoted },
    { timestamp: Date.now() - 4000, latencyMs: 16, subnet: 'dmz', isPivoted: pivoting.isPivoted },
    { timestamp: Date.now() - 3000, latencyMs: 13, subnet: 'dmz', isPivoted: pivoting.isPivoted },
    { timestamp: Date.now() - 2000, latencyMs: 15, subnet: 'dmz', isPivoted: pivoting.isPivoted },
    { timestamp: Date.now() - 1000, latencyMs: 14, subnet: 'dmz', isPivoted: pivoting.isPivoted }
  ]);

  // Topology node coordinates in a 960x460 D3 coordinate space
  const dmzHosts = useMemo(() => hosts.filter(h => h.subnet === 'dmz'), [hosts]);
  const internalHosts = useMemo(() => hosts.filter(h => h.subnet === 'internal'), [hosts]);

  const topologyNodes = useMemo(() => {
    const nodes: Record<string, { id: string; x: number; y: number; label: string; ip: string; type: string; subnet: string }> = {
      attacker: {
        id: 'attacker',
        x: 80,
        y: 230,
        label: 'Kali Linux',
        ip: attackerIp,
        type: 'attacker',
        subnet: 'local'
      },
      dmz_switch: {
        id: 'dmz_switch',
        x: 230,
        y: 230,
        label: 'DMZ Switch',
        ip: '192.168.100.1',
        type: 'switch',
        subnet: 'dmz'
      },
      internal_switch: {
        id: 'internal_switch',
        x: 710,
        y: 230,
        label: 'Internal Switch',
        ip: '10.10.10.1',
        type: 'switch',
        subnet: 'internal'
      }
    };

    // Place DMZ Hosts
    if (dmzHosts[0]) {
      nodes[dmzHosts[0].id] = {
        id: dmzHosts[0].id,
        x: 380,
        y: 110,
        label: dmzHosts[0].hostname.split('.')[0],
        ip: dmzHosts[0].ip,
        type: 'host',
        subnet: 'dmz'
      };
    }
    if (dmzHosts[1]) {
      nodes[dmzHosts[1].id] = {
        id: dmzHosts[1].id,
        x: 380,
        y: 350,
        label: dmzHosts[1].hostname.split('.')[0],
        ip: dmzHosts[1].ip,
        type: 'host',
        subnet: 'dmz'
      };
    }
    // Pivot Gateway (dual-homed in DMZ)
    if (dmzHosts[2]) {
      nodes[dmzHosts[2].id] = {
        id: dmzHosts[2].id,
        x: 530,
        y: 230,
        label: `${dmzHosts[2].hostname.split('.')[0]} (Pivot GW)`,
        ip: dmzHosts[2].ip,
        type: 'gateway',
        subnet: 'dmz'
      };
    }

    // Place Internal Hosts
    if (internalHosts[0]) {
      nodes[internalHosts[0].id] = {
        id: internalHosts[0].id,
        x: 870,
        y: 110,
        label: internalHosts[0].hostname.split('.')[0],
        ip: internalHosts[0].ip,
        type: 'host',
        subnet: 'internal'
      };
    }
    if (internalHosts[1]) {
      nodes[internalHosts[1].id] = {
        id: internalHosts[1].id,
        x: 870,
        y: 230,
        label: internalHosts[1].hostname.split('.')[0],
        ip: internalHosts[1].ip,
        type: 'host',
        subnet: 'internal'
      };
    }
    if (internalHosts[2]) {
      nodes[internalHosts[2].id] = {
        id: internalHosts[2].id,
        x: 870,
        y: 350,
        label: internalHosts[2].hostname.split('.')[0],
        ip: internalHosts[2].ip,
        type: 'host',
        subnet: 'internal'
      };
    }

    return nodes;
  }, [attackerIp, dmzHosts, internalHosts]);

  // Compute multi-hop route for packet animation
  const computeRoute = (targetHostId: string): { points: [number, number][]; subnet: 'dmz' | 'internal' } => {
    const targetNode = topologyNodes[targetHostId];
    if (!targetNode) {
      return {
        points: [[topologyNodes.attacker.x, topologyNodes.attacker.y], [topologyNodes.dmz_switch.x, topologyNodes.dmz_switch.y]],
        subnet: 'dmz'
      };
    }

    const gateway = dmzHosts[2] ? topologyNodes[dmzHosts[2].id] : null;

    if (targetNode.subnet === 'dmz') {
      if (gateway && targetNode.id === gateway.id) {
        // Kali -> Switch -> Gateway
        return {
          points: [
            [topologyNodes.attacker.x, topologyNodes.attacker.y],
            [topologyNodes.dmz_switch.x, topologyNodes.dmz_switch.y],
            [gateway.x, gateway.y]
          ],
          subnet: 'dmz'
        };
      }
      // Kali -> Switch -> DMZ Host
      return {
        points: [
          [topologyNodes.attacker.x, topologyNodes.attacker.y],
          [topologyNodes.dmz_switch.x, topologyNodes.dmz_switch.y],
          [targetNode.x, targetNode.y]
        ],
        subnet: 'dmz'
      };
    }

    // Target is in Internal Subnet!
    if (!pivoting.isPivoted) {
      // Crosses towards internal barrier, then DROPS at the firewall boundary
      const barrierX = 620;
      return {
        points: [
          [topologyNodes.attacker.x, topologyNodes.attacker.y],
          [topologyNodes.dmz_switch.x, topologyNodes.dmz_switch.y],
          gateway ? [gateway.x, gateway.y] : [530, 230],
          [barrierX, 230] // Blocked at barrier
        ],
        subnet: 'internal'
      };
    }

    // Pivoting is active! Complete route through SOCKS5 tunnel
    return {
      points: [
        [topologyNodes.attacker.x, topologyNodes.attacker.y],
        [topologyNodes.dmz_switch.x, topologyNodes.dmz_switch.y],
        gateway ? [gateway.x, gateway.y] : [530, 230],
        [topologyNodes.internal_switch.x, topologyNodes.internal_switch.y],
        [targetNode.x, targetNode.y]
      ],
      subnet: 'internal'
    };
  };

  // Dispatch a simulated packet
  const sendPacket = (forcedTargetId?: string) => {
    // Choose target
    let targetId = forcedTargetId;
    if (!targetId) {
      if (selectedTargetHost) {
        targetId = selectedTargetHost;
      } else {
        // Randomly pick a host based on pivoting state
        const availableTargets = hosts.filter(h => {
          if (!pivoting.isPivoted) {
            // Favor DMZ targets, but occasionally attempt internal to demonstrate firewall drop
            return Math.random() > 0.3 ? h.subnet === 'dmz' : true;
          }
          return true;
        });
        const chosen = availableTargets[Math.floor(Math.random() * availableTargets.length)];
        targetId = chosen?.id || dmzHosts[0]?.id;
      }
    }

    const hostObj = hosts.find(h => h.id === targetId);
    if (!hostObj) return;

    const { points, subnet } = computeRoute(targetId);

    // Protocol determination
    const protoList: ('SOCKS5' | 'TCP-HTTP' | 'SMB' | 'SSH' | 'ICMP')[] = 
      subnet === 'internal' && pivoting.isPivoted 
        ? ['SOCKS5', 'SMB', 'TCP-HTTP'] 
        : ['TCP-HTTP', 'SSH', 'ICMP'];

    const chosenProto = selectedProtocol !== 'ALL' 
      ? selectedProtocol 
      : protoList[Math.floor(Math.random() * protoList.length)];

    // Protocol color mapping
    const colorMap: Record<string, string> = {
      'SOCKS5': '#10b981', // emerald
      'TCP-HTTP': '#38bdf8', // sky
      'SMB': '#a855f7', // purple
      'SSH': '#f59e0b', // amber
      'ICMP': '#eab308' // yellow
    };

    // Calculate realistic simulated latency
    let rtt = 0;
    let isDropped = false;

    if (subnet === 'dmz') {
      // Fast direct DMZ LAN latency: 10ms - 18ms
      const base = 12;
      const j = (Math.random() * 6) - 3;
      rtt = Math.round((base + j) * 10) / 10;
    } else {
      // Internal Subnet
      if (pivoting.isPivoted) {
        // Multi-hop SOCKS5 latency: ~40ms - 55ms
        const base = 46;
        const j = (Math.random() * 8) - 4;
        rtt = Math.round((base + j) * 10) / 10;
      } else {
        // Blocked packet
        isDropped = true;
        rtt = 1000; // Timeout
      }
    }

    const packetId = `pkt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const transitDuration = isDropped ? 900 : Math.max(800, rtt * 25);

    const newPacket: SimulatedPacket = {
      id: packetId,
      sourceId: 'attacker',
      targetId: hostObj.id,
      targetIp: hostObj.ip,
      targetHostname: hostObj.hostname,
      subnet,
      protocol: chosenProto,
      color: colorMap[chosenProto] || '#10b981',
      bytes: Math.floor(Math.random() * 1024) + 64,
      latencyMs: rtt,
      status: 'transit',
      startTime: Date.now(),
      durationMs: transitDuration,
      pathPoints: points
    };

    setTotalPacketsSent(prev => prev + 1);

    // Update real-time latency readout & history
    if (!isDropped) {
      setCurrentLatency(rtt);
      setJitter(Math.round(Math.abs(rtt - (subnet === 'dmz' ? 12 : 46)) * 10) / 10);
      setLatencyHistory(prev => {
        const next = [...prev.slice(-24), {
          timestamp: Date.now(),
          latencyMs: rtt,
          subnet,
          isPivoted: pivoting.isPivoted
        }];
        return next;
      });
    }

    // Animate packet on D3 canvas
    animateD3Packet(newPacket, isDropped);
  };

  // D3 Packet Animation along polyline coordinates
  const animateD3Packet = (packet: SimulatedPacket, isDropped: boolean) => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);

    // Generate SVG path string from points
    const lineGenerator = d3.line<[number, number]>()
      .curve(d3.curveCatmullRom.alpha(0.5));
    const pathD = lineGenerator(packet.pathPoints);

    if (!pathD) return;

    // Create an invisible guide path for smooth point-at-length interpolation
    const guidePath = svg.append('path')
      .attr('d', pathD)
      .attr('fill', 'none')
      .attr('stroke', 'none');

    const pathNode = guidePath.node();
    if (!pathNode) {
      guidePath.remove();
      return;
    }
    const totalLength = pathNode.getTotalLength();

    // Packet group container
    const packetGroup = svg.append('g')
      .attr('class', `packet-${packet.id}`)
      .attr('cursor', 'pointer');

    // Outer glow halo
    const halo = packetGroup.append('circle')
      .attr('r', 8)
      .attr('fill', packet.color)
      .attr('opacity', 0.35);

    // Inner bright core
    const core = packetGroup.append('circle')
      .attr('r', 4.5)
      .attr('fill', '#ffffff')
      .attr('stroke', packet.color)
      .attr('stroke-width', 2);

    // Protocol label tag floating above packet
    const label = packetGroup.append('text')
      .attr('y', -10)
      .attr('text-anchor', 'middle')
      .attr('font-size', '8px')
      .attr('font-family', 'monospace')
      .attr('font-weight', 'bold')
      .attr('fill', packet.color)
      .text(packet.protocol);

    // Animate transition using D3 custom transition
    packetGroup
      .transition()
      .duration(packet.durationMs)
      .ease(d3.easeLinear)
      .attrTween('transform', () => {
        return (t: number) => {
          const point = pathNode.getPointAtLength(t * totalLength);
          return `translate(${point.x}, ${point.y})`;
        };
      })
      .on('end', () => {
        // Cleanup guide path
        guidePath.remove();

        const endPoint = packet.pathPoints[packet.pathPoints.length - 1];

        if (isDropped) {
          // Packet was dropped at firewall barrier!
          setTotalPacketsDropped(prev => prev + 1);

          // Create explosion / spark ripple effect at drop point
          const spark = svg.append('g')
            .attr('transform', `translate(${endPoint[0]}, ${endPoint[1]})`);

          spark.append('circle')
            .attr('r', 5)
            .attr('fill', 'none')
            .attr('stroke', '#ef4444')
            .attr('stroke-width', 2.5)
            .transition()
            .duration(400)
            .attr('r', 24)
            .attr('opacity', 0)
            .remove();

          spark.append('text')
            .attr('y', -12)
            .attr('text-anchor', 'middle')
            .attr('font-size', '9px')
            .attr('font-weight', 'bold')
            .attr('font-family', 'monospace')
            .attr('fill', '#ef4444')
            .text('DROP!')
            .transition()
            .duration(600)
            .attr('y', -24)
            .attr('opacity', 0)
            .remove();

          // Log entry
          const nowStr = new Date().toLocaleTimeString();
          setPacketLog(prev => [
            {
              id: packet.id,
              time: nowStr,
              proto: packet.protocol,
              src: '192.168.100.10',
              dst: packet.targetIp,
              rtt: 'DROP (No Pivot)',
              status: 'dropped'
            },
            ...prev.slice(0, 19)
          ]);

          packetGroup.remove();
        } else {
          // Delivered successfully!
          setTotalPacketsDelivered(prev => prev + 1);

          // Ripple effect at target node
          svg.append('circle')
            .attr('cx', endPoint[0])
            .attr('cy', endPoint[1])
            .attr('r', 6)
            .attr('fill', 'none')
            .attr('stroke', packet.color)
            .attr('stroke-width', 2)
            .transition()
            .duration(450)
            .attr('r', 28)
            .attr('opacity', 0)
            .remove();

          // Log entry
          const nowStr = new Date().toLocaleTimeString();
          setPacketLog(prev => [
            {
              id: packet.id,
              time: nowStr,
              proto: packet.protocol,
              src: '192.168.100.10',
              dst: packet.targetIp,
              rtt: `${packet.latencyMs} ms`,
              status: 'delivered'
            },
            ...prev.slice(0, 19)
          ]);

          packetGroup.remove();
        }
      });
  };

  // Auto-stream interval effect
  useEffect(() => {
    if (!isLiveActive) return;

    const intervalMap = {
      slow: 2200,
      medium: 1300,
      fast: 650
    };

    const intervalId = setInterval(() => {
      sendPacket();
    }, intervalMap[trafficRate]);

    return () => clearInterval(intervalId);
  }, [isLiveActive, trafficRate, pivoting.isPivoted, selectedProtocol, selectedTargetHost, hosts]);

  // Render D3 sparkline / latency chart
  useEffect(() => {
    if (!latencyChartRef.current) return;

    const width = 280;
    const height = 65;
    const margin = { top: 8, right: 12, bottom: 16, left: 28 };

    const svg = d3.select(latencyChartRef.current);
    svg.selectAll('*').remove();

    if (latencyHistory.length < 2) return;

    const xScale = d3.scaleLinear()
      .domain([0, latencyHistory.length - 1])
      .range([margin.left, width - margin.right]);

    const yMax = Math.max(60, d3.max(latencyHistory, d => d.latencyMs) || 50);
    const yScale = d3.scaleLinear()
      .domain([0, yMax])
      .range([height - margin.bottom, margin.top]);

    // Grid line
    svg.append('line')
      .attr('x1', margin.left)
      .attr('x2', width - margin.right)
      .attr('y1', yScale(20))
      .attr('y2', yScale(20))
      .attr('stroke', '#334155')
      .attr('stroke-dasharray', '2 2');

    // Gradient area
    const defs = svg.append('defs');
    const areaGrad = defs.append('linearGradient')
      .attr('id', 'latencyGrad')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '0%').attr('y2', '100%');

    areaGrad.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', pivoting.isPivoted ? '#10b981' : '#38bdf8')
      .attr('stop-opacity', 0.35);

    areaGrad.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#0f172a')
      .attr('stop-opacity', 0);

    const area = d3.area<LatencySample>()
      .x((_, i) => xScale(i))
      .y0(height - margin.bottom)
      .y1(d => yScale(d.latencyMs))
      .curve(d3.curveMonotoneX);

    svg.append('path')
      .datum(latencyHistory)
      .attr('fill', 'url(#latencyGrad)')
      .attr('d', area);

    // Line stroke
    const line = d3.line<LatencySample>()
      .x((_, i) => xScale(i))
      .y(d => yScale(d.latencyMs))
      .curve(d3.curveMonotoneX);

    svg.append('path')
      .datum(latencyHistory)
      .attr('fill', 'none')
      .attr('stroke', pivoting.isPivoted ? '#10b981' : '#38bdf8')
      .attr('stroke-width', 2)
      .attr('d', line);

    // Current point dot
    const lastSample = latencyHistory[latencyHistory.length - 1];
    if (lastSample) {
      svg.append('circle')
        .attr('cx', xScale(latencyHistory.length - 1))
        .attr('cy', yScale(lastSample.latencyMs))
        .attr('r', 3.5)
        .attr('fill', '#ffffff')
        .attr('stroke', pivoting.isPivoted ? '#10b981' : '#38bdf8')
        .attr('stroke-width', 2);
    }

    // Y Axis label
    svg.append('text')
      .attr('x', margin.left - 4)
      .attr('y', margin.top + 6)
      .attr('text-anchor', 'end')
      .attr('fill', '#94a3b8')
      .attr('font-size', '8px')
      .attr('font-family', 'monospace')
      .text(`${Math.round(yMax)}ms`);

    svg.append('text')
      .attr('x', margin.left - 4)
      .attr('y', height - margin.bottom)
      .attr('text-anchor', 'end')
      .attr('fill', '#64748b')
      .attr('font-size', '8px')
      .attr('font-family', 'monospace')
      .text('0ms');

  }, [latencyHistory, pivoting.isPivoted]);

  const deliveryRate = totalPacketsSent > 0 
    ? Math.round((totalPacketsDelivered / totalPacketsSent) * 100) 
    : 100;

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden">
      
      {/* 1. Header Toolbar with Controls */}
      <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
        
        {/* Left: Engine Status */}
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Activity className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white tracking-wider uppercase">
                Monitor de Tráfico D3.js en Tiempo Real
              </span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                pivoting.isPivoted
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              }`}>
                {pivoting.isPivoted ? 'PIVOTING SOCKS5 ACTIVO' : 'PIVOTING BLOQUEADO'}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-2 font-mono">
              <span>Origen: tun0 ({attackerIp})</span>
              <span>➔</span>
              <span>DMZ: {dmzSubnet}</span>
              <span>➔</span>
              <span className={pivoting.isPivoted ? 'text-purple-300 font-semibold' : 'text-slate-500'}>
                Interna: {internalSubnet}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Interactive Simulation Buttons */}
        <div className="flex items-center gap-2">
          {/* Pause / Play */}
          <button
            onClick={() => setIsLiveActive(!isLiveActive)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              isLiveActive
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
            title={isLiveActive ? 'Pausar flujo de paquetes' : 'Reanudar flujo en vivo'}
          >
            {isLiveActive ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pausar</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Iniciar Flujo</span>
              </>
            )}
          </button>

          {/* Send instant probe packet */}
          <button
            onClick={() => sendPacket()}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-cyan-600/20"
            title="Enviar sonda de paquete instantánea (Ping / SOCKS5 handshake)"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Enviar Sonda</span>
          </button>

          {/* Rate selector */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px]">
            {(['slow', 'medium', 'fast'] as const).map(rate => (
              <button
                key={rate}
                onClick={() => setTrafficRate(rate)}
                className={`px-2 py-0.5 rounded capitalize transition-colors ${
                  trafficRate === rate ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {rate === 'slow' ? 'Lento' : rate === 'medium' ? 'Normal' : 'Rápido'}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Protocol Filter & Target Filter */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[11px] font-mono bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
            <span className="text-slate-400">Proto:</span>
            <select
              value={selectedProtocol}
              onChange={e => setSelectedProtocol(e.target.value as any)}
              className="bg-transparent text-emerald-400 font-bold focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900 text-white">Todos</option>
              <option value="SOCKS5" className="bg-slate-900 text-emerald-400">SOCKS5 (:1080)</option>
              <option value="TCP-HTTP" className="bg-slate-900 text-sky-400">TCP HTTP (:80)</option>
              <option value="SMB" className="bg-slate-900 text-purple-400">SMB (:445)</option>
              <option value="ICMP" className="bg-slate-900 text-amber-400">ICMP Ping</option>
            </select>
          </div>

          <div className="flex items-center gap-1 text-[11px] font-mono bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
            <span className="text-slate-400">Destino:</span>
            <select
              value={selectedTargetHost || ''}
              onChange={e => setSelectedTargetHost(e.target.value || null)}
              className="bg-transparent text-cyan-400 font-bold focus:outline-none cursor-pointer"
            >
              <option value="" className="bg-slate-900 text-white">Aleatorio</option>
              {hosts.map(h => (
                <option key={h.id} value={h.id} className="bg-slate-900 text-slate-200">
                  [{h.subnet.toUpperCase()}] {h.hostname.split('.')[0]} ({h.ip})
                </option>
              ))}
            </select>
          </div>
        </div>

      </div>

      {/* 2. Main Content Grid: D3 SVG Visualizer + Telemetry Sidebar */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        
        {/* Left Column (8 Cols): D3 Interactive Canvas */}
        <div className="lg:col-span-8 p-3 bg-slate-950 flex flex-col overflow-hidden border-r border-slate-800 relative">
          
          {/* Pivoting Tunnel HUD Notification */}
          <div className="absolute top-5 left-5 z-10 flex flex-wrap gap-2 text-xs font-mono pointer-events-none">
            <div className="px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-700/80 backdrop-blur shadow-lg flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              <span className="text-blue-300 font-bold">DMZ:</span>
              <span className="text-slate-300">{dmzSubnet} (~12ms)</span>
            </div>

            <div className={`px-2.5 py-1 rounded-lg border backdrop-blur shadow-lg flex items-center gap-2 transition-all ${
              pivoting.isPivoted
                ? 'bg-purple-950/80 border-purple-500/70 text-purple-200'
                : 'bg-rose-950/80 border-rose-500/60 text-rose-300'
            }`}>
              <span className={`w-2 h-2 rounded-full ${pivoting.isPivoted ? 'bg-emerald-400 animate-ping' : 'bg-rose-500'}`} />
              <span className="font-bold">RED INTERNA:</span>
              <span>{internalSubnet}</span>
              <span className={`font-semibold px-1.5 py-0.2 rounded text-[10px] ${
                pivoting.isPivoted ? 'bg-emerald-500/30 text-emerald-300' : 'bg-rose-500/30 text-rose-300'
              }`}>
                {pivoting.isPivoted ? 'ENRUTABLE VIA SOCKS5' : 'BLOQUEADO / FIREWALL'}
              </span>
            </div>
          </div>

          {/* D3 Canvas Container */}
          <div className="flex-1 w-full h-full rounded-xl bg-slate-900/60 border border-slate-800/90 overflow-hidden relative flex items-center justify-center p-2">
            <svg
              ref={svgRef}
              viewBox="0 0 960 460"
              className="w-full h-full select-none"
            >
              <defs>
                {/* Background Grid */}
                <pattern id="d3-grid" width="24" height="24" patternUnits="userSpaceOnUse">
                  <circle cx="2" cy="2" r="0.75" fill="#334155" opacity="0.4" />
                </pattern>

                {/* Subnet Gradients */}
                <linearGradient id="d3-dmz-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#1e3a8a" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#0f172a" stopOpacity="0.04" />
                </linearGradient>

                <linearGradient id="d3-internal-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#581c87" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#0f172a" stopOpacity="0.04" />
                </linearGradient>

                <linearGradient id="tunnelGradLive" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="50%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>

                {/* Filter Glows */}
                <filter id="tunnelGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3.5" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Grid Background */}
              <rect width="960" height="460" fill="url(#d3-grid)" />

              {/* DMZ Zone Container Box */}
              <rect
                x="190"
                y="35"
                width="390"
                height="390"
                rx="14"
                fill="url(#d3-dmz-grad)"
                stroke="#3b82f6"
                strokeWidth="1.5"
                strokeDasharray="6 4"
                opacity="0.8"
              />
              <text x="205" y="60" fill="#60a5fa" fontSize="11" fontFamily="monospace" fontWeight="bold">
                [SUBRED 1: DMZ] {dmzSubnet}
              </text>

              {/* Internal Subnet Box */}
              <rect
                x="640"
                y="35"
                width="300"
                height="390"
                rx="14"
                fill="url(#d3-internal-grad)"
                stroke={pivoting.isPivoted ? '#a855f7' : '#475569'}
                strokeWidth="1.5"
                strokeDasharray="6 4"
                opacity={pivoting.isPivoted ? '0.9' : '0.5'}
              />
              <text x="655" y="60" fill={pivoting.isPivoted ? '#c084fc' : '#64748b'} fontSize="11" fontFamily="monospace" fontWeight="bold">
                [SUBRED 2: PRIVADA] {internalSubnet}
              </text>

              {/* Firewall Barrier between Subnets */}
              {!pivoting.isPivoted && (
                <g>
                  <line
                    x1="615"
                    y1="60"
                    x2="615"
                    y2="400"
                    stroke="#ef4444"
                    strokeWidth="3"
                    strokeDasharray="8 5"
                    className="animate-pulse"
                  />
                  <rect
                    x="585"
                    y="210"
                    width="60"
                    height="40"
                    rx="6"
                    fill="#450a0a"
                    stroke="#ef4444"
                    strokeWidth="1.5"
                  />
                  <text
                    x="615"
                    y="228"
                    textAnchor="middle"
                    fill="#fca5a5"
                    fontSize="9"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    FIREWALL
                  </text>
                  <text
                    x="615"
                    y="242"
                    textAnchor="middle"
                    fill="#f87171"
                    fontSize="8"
                    fontFamily="monospace"
                  >
                    DROP ALL
                  </text>
                </g>
              )}

              {/* BASE NETWORK LINKS / CABLES */}
              
              {/* Kali -> DMZ Switch */}
              <line
                x1={topologyNodes.attacker.x}
                y1={topologyNodes.attacker.y}
                x2={topologyNodes.dmz_switch.x}
                y2={topologyNodes.dmz_switch.y}
                stroke="#10b981"
                strokeWidth="2.5"
                strokeDasharray="4 3"
              />

              {/* DMZ Switch -> Target 1 */}
              {dmzHosts[0] && (
                <path
                  d={`M ${topologyNodes.dmz_switch.x} ${topologyNodes.dmz_switch.y} C 280 230, 280 110, ${topologyNodes[dmzHosts[0].id]?.x || 380} ${topologyNodes[dmzHosts[0].id]?.y || 110}`}
                  stroke="#38bdf8"
                  strokeWidth="2"
                  fill="none"
                  opacity="0.85"
                />
              )}

              {/* DMZ Switch -> Target 2 */}
              {dmzHosts[1] && (
                <path
                  d={`M ${topologyNodes.dmz_switch.x} ${topologyNodes.dmz_switch.y} C 280 230, 280 350, ${topologyNodes[dmzHosts[1].id]?.x || 380} ${topologyNodes[dmzHosts[1].id]?.y || 350}`}
                  stroke="#38bdf8"
                  strokeWidth="2"
                  fill="none"
                  opacity="0.85"
                />
              )}

              {/* DMZ Switch -> Pivot Gateway */}
              {dmzHosts[2] && (
                <line
                  x1={topologyNodes.dmz_switch.x}
                  y1={topologyNodes.dmz_switch.y}
                  x2={topologyNodes[dmzHosts[2].id]?.x || 530}
                  y2={topologyNodes[dmzHosts[2].id]?.y || 230}
                  stroke="#38bdf8"
                  strokeWidth="2.5"
                  opacity="0.85"
                />
              )}

              {/* PIVOT TUNNEL LINK: Gateway -> Internal Switch */}
              {dmzHosts[2] && (
                pivoting.isPivoted ? (
                  <g>
                    <line
                      x1={topologyNodes[dmzHosts[2].id]?.x || 530}
                      y1={topologyNodes[dmzHosts[2].id]?.y || 230}
                      x2={topologyNodes.internal_switch.x}
                      y2={topologyNodes.internal_switch.y}
                      stroke="url(#tunnelGradLive)"
                      strokeWidth="4.5"
                      filter="url(#tunnelGlow)"
                    />
                    <text
                      x="620"
                      y="215"
                      textAnchor="middle"
                      fill="#34d399"
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      SOCKS5 :1080
                    </text>
                  </g>
                ) : (
                  <line
                    x1={topologyNodes[dmzHosts[2].id]?.x || 530}
                    y1={topologyNodes[dmzHosts[2].id]?.y || 230}
                    x2={topologyNodes.internal_switch.x}
                    y2={topologyNodes.internal_switch.y}
                    stroke="#475569"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                  />
                )
              )}

              {/* Internal Switch -> Internal Hosts */}
              {internalHosts[0] && (
                <path
                  d={`M ${topologyNodes.internal_switch.x} ${topologyNodes.internal_switch.y} C 780 230, 780 110, ${topologyNodes[internalHosts[0].id]?.x || 870} ${topologyNodes[internalHosts[0].id]?.y || 110}`}
                  stroke={pivoting.isPivoted ? '#c084fc' : '#475569'}
                  strokeWidth="2"
                  fill="none"
                  opacity="0.85"
                />
              )}
              {internalHosts[1] && (
                <line
                  x1={topologyNodes.internal_switch.x}
                  y1={topologyNodes.internal_switch.y}
                  x2={topologyNodes[internalHosts[1].id]?.x || 870}
                  y2={topologyNodes[internalHosts[1].id]?.y || 230}
                  stroke={pivoting.isPivoted ? '#c084fc' : '#475569'}
                  strokeWidth="2"
                  opacity="0.85"
                />
              )}
              {internalHosts[2] && (
                <path
                  d={`M ${topologyNodes.internal_switch.x} ${topologyNodes.internal_switch.y} C 780 230, 780 350, ${topologyNodes[internalHosts[2].id]?.x || 870} ${topologyNodes[internalHosts[2].id]?.y || 350}`}
                  stroke={pivoting.isPivoted ? '#c084fc' : '#475569'}
                  strokeWidth="2"
                  fill="none"
                  opacity="0.85"
                />
              )}

              {/* RENDER NETWORK NODES */}
              
              {/* 1. Attacker Node (Kali) */}
              <g 
                transform={`translate(${topologyNodes.attacker.x}, ${topologyNodes.attacker.y})`}
                className="cursor-pointer group"
                onClick={() => sendPacket()}
              >
                <circle r="22" fill="#064e3b" stroke="#10b981" strokeWidth="2.5" />
                <circle r="14" fill="#022c22" />
                <text textAnchor="middle" y="4" fill="#6ee7b7" fontSize="11" fontWeight="bold">⚔</text>
                <text textAnchor="middle" y="36" fill="#a7f3d0" fontSize="10" fontFamily="monospace" fontWeight="bold">
                  Kali Linux
                </text>
                <text textAnchor="middle" y="48" fill="#6ee7b7" fontSize="9" fontFamily="monospace">
                  {attackerIp}
                </text>
              </g>

              {/* 2. DMZ Switch */}
              <g transform={`translate(${topologyNodes.dmz_switch.x}, ${topologyNodes.dmz_switch.y})`}>
                <rect x="-14" y="-14" width="28" height="28" rx="6" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
                <text textAnchor="middle" y="3" fill="#38bdf8" fontSize="10" fontFamily="monospace">SW</text>
                <text textAnchor="middle" y="26" fill="#94a3b8" fontSize="9" fontFamily="monospace">
                  DMZ Switch
                </text>
              </g>

              {/* 3. Internal Switch */}
              <g transform={`translate(${topologyNodes.internal_switch.x}, ${topologyNodes.internal_switch.y})`}>
                <rect 
                  x="-14" 
                  y="-14" 
                  width="28" 
                  height="28" 
                  rx="6" 
                  fill="#1e293b" 
                  stroke={pivoting.isPivoted ? '#c084fc' : '#475569'} 
                  strokeWidth="2" 
                />
                <text textAnchor="middle" y="3" fill={pivoting.isPivoted ? '#c084fc' : '#64748b'} fontSize="10" fontFamily="monospace">SW</text>
                <text textAnchor="middle" y="26" fill="#94a3b8" fontSize="9" fontFamily="monospace">
                  Internal SW
                </text>
              </g>

              {/* 4. DMZ Hosts */}
              {dmzHosts.map(host => {
                const node = topologyNodes[host.id];
                if (!node) return null;
                const isGateway = host.isPivotGateway || host === dmzHosts[2];
                const isCompromised = compromisedHosts.has(host.ip);
                const isDiscovered = discoveredHosts.has(host.ip);

                return (
                  <g
                    key={host.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    className="cursor-pointer group"
                    onClick={() => {
                      setSelectedTargetHost(host.id);
                      sendPacket(host.id);
                    }}
                  >
                    {/* Pulsing ring for gateway */}
                    {isGateway && pivoting.isPivoted && (
                      <circle r="26" fill="none" stroke="#10b981" strokeWidth="1.5" className="animate-ping" opacity="0.4" />
                    )}

                    <circle
                      r="20"
                      fill={isCompromised ? '#450a0a' : isGateway ? '#064e3b' : '#0f172a'}
                      stroke={
                        isCompromised ? '#ef4444' :
                        isGateway ? (pivoting.isPivoted ? '#10b981' : '#f59e0b') :
                        isDiscovered ? '#38bdf8' : '#475569'
                      }
                      strokeWidth={isGateway ? 2.5 : 2}
                    />

                    <text textAnchor="middle" y="4" fontSize="10">
                      {isCompromised ? '💀' : isGateway ? '⚡' : '🖥️'}
                    </text>

                    <text textAnchor="middle" y="34" fill="#f8fafc" fontSize="10" fontFamily="monospace" fontWeight="bold">
                      {host.hostname.split('.')[0]}
                    </text>
                    <text textAnchor="middle" y="46" fill="#94a3b8" fontSize="9" fontFamily="monospace">
                      {host.ip}
                    </text>
                    {isGateway && (
                      <text textAnchor="middle" y="58" fill={pivoting.isPivoted ? '#34d399' : '#f59e0b'} fontSize="8" fontFamily="monospace" fontWeight="bold">
                        [PIVOT GATEWAY]
                      </text>
                    )}
                  </g>
                );
              })}

              {/* 5. Internal Hosts */}
              {internalHosts.map(host => {
                const node = topologyNodes[host.id];
                if (!node) return null;
                const isCompromised = compromisedHosts.has(host.ip);
                const isDiscovered = discoveredHosts.has(host.ip);

                return (
                  <g
                    key={host.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    className="cursor-pointer group"
                    onClick={() => {
                      setSelectedTargetHost(host.id);
                      sendPacket(host.id);
                    }}
                  >
                    <circle
                      r="20"
                      fill={isCompromised ? '#450a0a' : pivoting.isPivoted ? '#2e1065' : '#0f172a'}
                      stroke={
                        isCompromised ? '#ef4444' :
                        pivoting.isPivoted ? (isDiscovered ? '#c084fc' : '#a855f7') :
                        '#475569'
                      }
                      strokeWidth={2}
                      opacity={pivoting.isPivoted ? 1 : 0.6}
                    />

                    <text textAnchor="middle" y="4" fontSize="10">
                      {isCompromised ? '💀' : host.os.includes('Windows') ? '🪟' : '🗄️'}
                    </text>

                    <text textAnchor="middle" y="34" fill={pivoting.isPivoted ? '#f8fafc' : '#64748b'} fontSize="10" fontFamily="monospace" fontWeight="bold">
                      {host.hostname.split('.')[0]}
                    </text>
                    <text textAnchor="middle" y="46" fill={pivoting.isPivoted ? '#d8b4fe' : '#475569'} fontSize="9" fontFamily="monospace">
                      {host.ip}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Canvas Bottom Legend */}
          <div className="mt-2 flex flex-wrap items-center justify-between text-[11px] text-slate-400 font-mono px-1">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
                <span>SOCKS5 (:1080)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block" />
                <span>TCP HTTP (:80)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-400 inline-block" />
                <span>SMB (:445)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                <span>SSH (:22)</span>
              </span>
            </div>

            <div className="text-slate-500">
              💡 Haz clic sobre cualquier host para enviar una sonda dirigida
            </div>
          </div>

        </div>

        {/* Right Column (4 Cols): Real-time Telemetry, Sparkline & Packet Inspector */}
        <div className="lg:col-span-4 p-3 bg-slate-900/50 flex flex-col gap-3 overflow-y-auto">
          
          {/* Card 1: Telemetry Counters */}
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-emerald-400" />
                Telemetría en Tiempo Real
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                LIVE 1000Hz
              </span>
            </div>

            {/* Gauges Grid */}
            <div className="grid grid-cols-2 gap-2">
              
              {/* RTT Latency */}
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-400 font-mono">LATENCIA RTT</div>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className={`text-xl font-mono font-black ${
                    currentLatency < 25 ? 'text-emerald-400' : currentLatency < 60 ? 'text-sky-400' : 'text-amber-400'
                  }`}>
                    {currentLatency}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">ms</span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                  Jitter: ±{jitter} ms
                </div>
              </div>

              {/* Delivery Rate */}
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-400 font-mono">ENTREGA DE PAQUETES</div>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className={`text-xl font-mono font-black ${
                    deliveryRate >= 90 ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {deliveryRate}%
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                  {totalPacketsDelivered} / {totalPacketsSent} pkts
                </div>
              </div>

              {/* Dropped / Firewall Blocks */}
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-400 font-mono">DESCARTADOS (DROP)</div>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className={`text-xl font-mono font-black ${
                    totalPacketsDropped > 0 ? 'text-rose-400' : 'text-slate-400'
                  }`}>
                    {totalPacketsDropped}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">bloqueos</span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                  {!pivoting.isPivoted ? 'Regla Firewall DMZ' : '0 descartes'}
                </div>
              </div>

              {/* Pivoting Tunnel Overhead */}
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-400 font-mono">SOBRECARGA PIVOT</div>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-xl font-mono font-black text-purple-400">
                    {pivoting.isPivoted ? '+32' : 'N/A'}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">ms</span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                  {pivoting.isPivoted ? 'Túnel SOCKS Encapsulado' : 'Sin túnel'}
                </div>
              </div>

            </div>

            {/* D3 Latency Sparkline */}
            <div className="pt-2">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                <span>Historial de Latencia (D3 Render)</span>
                <span className="text-emerald-400">Media: ~{pivoting.isPivoted ? '46' : '14'}ms</span>
              </div>
              <div className="bg-slate-950 rounded-lg p-1.5 border border-slate-800 flex items-center justify-center">
                <svg ref={latencyChartRef} width="280" height="65" />
              </div>
            </div>

          </div>

          {/* Card 2: Pivoting Route Inspector */}
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              Ruta de Salto por Subred
            </span>

            <div className="space-y-1.5 text-xs font-mono">
              {/* Hop 1 */}
              <div className="p-2 rounded bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-slate-400">SALTO 1 (Local ➔ DMZ)</div>
                  <div className="text-emerald-400 font-semibold">{attackerIp} ➔ 192.168.100.1</div>
                </div>
                <div className="text-right">
                  <span className="text-emerald-400 text-xs">~12ms</span>
                  <div className="text-[9px] text-slate-500">Ethernet LAN</div>
                </div>
              </div>

              {/* Hop 2 */}
              <div className={`p-2 rounded border flex items-center justify-between transition-colors ${
                pivoting.isPivoted
                  ? 'bg-purple-950/40 border-purple-500/40 text-purple-200'
                  : 'bg-rose-950/30 border-rose-500/30 text-rose-300'
              }`}>
                <div>
                  <div className="text-[10px] text-slate-400">SALTO 2 (Túnel Pivot SOCKS5)</div>
                  <div className="font-semibold">
                    {pivoting.isPivoted ? '192.168.100.30 ➔ 10.10.10.1' : '192.168.100.30 ➔ [BLOQUEADO]'}
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-xs font-bold ${pivoting.isPivoted ? 'text-purple-300' : 'text-rose-400'}`}>
                    {pivoting.isPivoted ? '+34ms' : 'DROP'}
                  </span>
                  <div className="text-[9px] text-slate-400">
                    {pivoting.isPivoted ? 'Proxychains / MSF' : 'Firewall'}
                  </div>
                </div>
              </div>

              {/* Hop 3 */}
              <div className="p-2 rounded bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-slate-400">SALTO 3 (Red Interna Destino)</div>
                  <div className="text-slate-300 font-semibold">10.10.10.1 ➔ Target Hosts</div>
                </div>
                <div className="text-right">
                  <span className={pivoting.isPivoted ? 'text-emerald-400 text-xs' : 'text-slate-600 text-xs'}>
                    {pivoting.isPivoted ? '~48ms Total' : 'Inalcanzable'}
                  </span>
                  <div className="text-[9px] text-slate-500">Subred {internalSubnet}</div>
                </div>
              </div>
            </div>

            {/* Quick terminal command suggestion if not pivoted */}
            {!pivoting.isPivoted && onSelectCommand && (
              <div className="pt-1">
                <button
                  onClick={() => onSelectCommand('run autoroute -s 10.10.10.0/24')}
                  className="w-full py-1.5 px-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 rounded text-emerald-300 text-[11px] font-mono flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>⚡ Cargar comando: autoroute 10.10.10.0/24</span>
                </button>
              </div>
            )}
          </div>

          {/* Card 3: Live Packet Stream Inspector */}
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex-1 flex flex-col min-h-[160px]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-purple-400" />
                Captura de Paquetes en Vivo
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                Últimos {packetLog.length} paquetes
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 font-mono text-[10px]">
              {packetLog.length === 0 ? (
                <div className="text-center py-6 text-slate-500">
                  Esperando tráfico simulado...
                </div>
              ) : (
                packetLog.map(pkt => (
                  <div
                    key={pkt.id}
                    className={`p-1.5 rounded flex items-center justify-between border ${
                      pkt.status === 'delivered'
                        ? 'bg-slate-950/80 border-slate-800/80'
                        : 'bg-rose-950/40 border-rose-500/30'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        pkt.status === 'delivered' ? 'bg-emerald-400' : 'bg-rose-400'
                      }`} />
                      <span className="text-slate-400">{pkt.time}</span>
                      <span className={`px-1 py-0.2 rounded font-bold text-[9px] ${
                        pkt.proto === 'SOCKS5' ? 'bg-emerald-500/20 text-emerald-300' :
                        pkt.proto === 'SMB' ? 'bg-purple-500/20 text-purple-300' :
                        pkt.proto === 'TCP-HTTP' ? 'bg-sky-500/20 text-sky-300' :
                        'bg-amber-500/20 text-amber-300'
                      }`}>
                        {pkt.proto}
                      </span>
                      <span className="text-slate-300">{pkt.dst}</span>
                    </div>

                    <div className="text-right">
                      <span className={pkt.status === 'delivered' ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-bold'}>
                        {pkt.rtt}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
