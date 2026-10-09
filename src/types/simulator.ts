export interface NetworkHost {
  id: string;
  ip: string;
  hostname: string;
  subnet: 'dmz' | 'internal';
  os: 'Linux Ubuntu' | 'Linux Debian' | 'Linux Alpine' | 'Linux CentOS' | 'Windows Server 2019' | 'Windows 10' | 'Windows Server 2016';
  isPivotGateway?: boolean;
  secondaryIp?: string;
  discovered: boolean;
  compromised: boolean;
  rootCompromised: boolean;
  x?: number;
  y?: number;
  ports: {
    port: number;
    protocol: 'tcp' | 'udp';
    service: string;
    version: string;
    banner?: string;
  }[];
  flags: {
    id: string;
    name: string;
    path: string;
    value: string;
    description: string;
    found: boolean;
  }[];
  notes: string;
  credentials?: {
    username: string;
    password?: string;
    key?: string;
    service: string;
  }[];
}

export type ExamCategory = 'Assessment Methodologies' | 'Host & Network Pentesting' | 'Web App Pentesting';

export interface ExamQuestion {
  id: number;
  domain: ExamCategory;
  question: string;
  options: string[];
  correctAnswer: number | string; // index or exact string
  isFlagQuestion?: boolean;
  flagKey?: string;
  hint: string;
  tieredHints?: [string, string, string]; // [Level 1: Recon, Level 2: Vuln/Tool, Level 3: Exploit/Cmd]
  explanation: string;
  userAnswer?: string | number;
  isCorrect?: boolean;
}

export interface TerminalOutputLine {
  id: string;
  type: 'command' | 'output' | 'error' | 'success' | 'system' | 'msf' | 'meterpreter';
  text: string;
  prompt?: string;
  timestamp: number;
}

export interface PivotingState {
  isPivoted: boolean;
  method: 'ssh_dynamic' | 'msf_autoroute' | 'chisel' | 'none';
  proxyPort: number;
  routedSubnet: string;
  activeSession?: string;
}

export interface LabDefinition {
  id: string;
  name: string;
  codeName: string;
  description: string;
  difficulty: 'Intermedio (eJPT Estándar)' | 'Avanzado (eJPT + Pivoting Complejo)';
  attackerIp: string;
  dmzSubnet: string;
  internalSubnet: string;
  pivotGatewayIp: string;
  hosts: NetworkHost[];
  questions: ExamQuestion[];
  instructions: string;
}

export interface ExamState {
  activeLabId: string;
  mode: 'exam' | 'practice';
  startTime: number;
  timeRemainingSeconds: number;
  isPaused: boolean;
  submitted: boolean;
  score: number;
  totalQuestions: number;
  pivoting: PivotingState;
  discoveredHosts: string[];
  compromisedHosts: string[];
}
