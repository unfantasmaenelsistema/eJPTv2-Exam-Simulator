export interface MetasploitOptionDef {
  name: string;
  defaultValue: string;
  required: boolean;
  description: string;
}

export interface MetasploitModuleDef {
  path: string;
  shortName: string;
  type: 'exploit' | 'auxiliary' | 'post';
  rank: 'Manual' | 'Normal' | 'Good' | 'Great' | 'Excellent';
  disclosureDate: string;
  platform: 'windows' | 'linux' | 'multi';
  cve?: string;
  description: string;
  defaultOptions: Record<string, string>;
  optionsList: MetasploitOptionDef[];
  recommendedPayload?: string;
  ejptExamNote: string;
}

export const POPULAR_PAYLOADS = [
  {
    name: 'windows/x64/meterpreter/reverse_tcp',
    description: 'Windows x64 Meterpreter interactivo estadiado con conexión inversa TCP.',
    arch: 'x64'
  },
  {
    name: 'windows/meterpreter/reverse_tcp',
    description: 'Windows x86 Meterpreter reverse shell estadiado para binarios 32 bits.',
    arch: 'x86'
  },
  {
    name: 'windows/x64/shell/reverse_tcp',
    description: 'Spawn directo de cmd.exe Windows x64 reverse TCP.',
    arch: 'x64'
  },
  {
    name: 'linux/x64/meterpreter/reverse_tcp',
    description: 'Linux ELF x64 Meterpreter reverse TCP stager.',
    arch: 'x64'
  },
  {
    name: 'generic/shell_reverse_tcp',
    description: 'Payload genérico de shell interactiva inversa.',
    arch: 'all'
  }
];

export const METASPLOIT_MODULES: MetasploitModuleDef[] = [
  {
    path: 'exploit/windows/smb/psexec',
    shortName: 'windows/smb/psexec',
    type: 'exploit',
    rank: 'Manual',
    disclosureDate: '1999-01-01',
    platform: 'windows',
    cve: 'CWE-287 / Pass-the-Hash',
    description: 'Ejecuta código con privilegios SYSTEM en hosts Windows mediante autenticación SMB legítima o reutilización de credenciales/hashes robados.',
    recommendedPayload: 'windows/x64/meterpreter/reverse_tcp',
    ejptExamNote: 'Crítico en eJPTv2 para saltar desde el Gateway perimetral a servidores Windows internos usando credenciales descubiertas en bases de datos o archivos de notas.',
    defaultOptions: {
      RHOSTS: '10.10.10.25',
      RPORT: '445',
      SMBUser: 'itadmin',
      SMBPass: 'P@ssw0rd2024!',
      SMBDomain: '.',
      PAYLOAD: 'windows/x64/meterpreter/reverse_tcp',
      LHOST: '192.168.100.10',
      LPORT: '4444'
    },
    optionsList: [
      { name: 'RHOSTS', defaultValue: '10.10.10.25', required: true, description: 'Dirección IP o rango del host objetivo (TARGET-WIN-05)' },
      { name: 'RPORT', defaultValue: '445', required: true, description: 'Puerto del servicio SMB de Windows' },
      { name: 'SMBUser', defaultValue: 'itadmin', required: true, description: 'Usuario administrativo de Windows a autenticar' },
      { name: 'SMBPass', defaultValue: 'P@ssw0rd2024!', required: true, description: 'Contraseña o hash NTLM del usuario' },
      { name: 'SMBDomain', defaultValue: '.', required: false, description: 'Dominio de Active Directory o "." para cuenta local' },
      { name: 'PAYLOAD', defaultValue: 'windows/x64/meterpreter/reverse_tcp', required: true, description: 'Payload a inyectar en memoria' },
      { name: 'LHOST', defaultValue: '192.168.100.10', required: true, description: 'Dirección IP del atacante Kali (tun0)' },
      { name: 'LPORT', defaultValue: '4444', required: true, description: 'Puerto local para recibir la conexión reversa' }
    ]
  },
  {
    path: 'exploit/windows/http/badblue_ext_overflow',
    shortName: 'windows/http/badblue_ext_overflow',
    type: 'exploit',
    rank: 'Great',
    disclosureDate: '2007-12-10',
    platform: 'windows',
    cve: 'CVE-2007-6377',
    description: 'Explotación de desbordamiento de búfer (Buffer Overflow) en la extensión ext.dll del servidor web BadBlue v2.7.',
    recommendedPayload: 'windows/meterpreter/reverse_tcp',
    ejptExamNote: 'Típico vector de explotación de servicios legados vulnerables en eJPT sin necesidad de credenciales previas.',
    defaultOptions: {
      RHOSTS: '10.10.10.30',
      RPORT: '80',
      PAYLOAD: 'windows/meterpreter/reverse_tcp',
      LHOST: '192.168.100.10',
      LPORT: '4445'
    },
    optionsList: [
      { name: 'RHOSTS', defaultValue: '10.10.10.30', required: true, description: 'Host objetivo ejecutando BadBlue v2.7 (TARGET-LEGACY-06)' },
      { name: 'RPORT', defaultValue: '80', required: true, description: 'Puerto HTTP donde corre BadBlue' },
      { name: 'PAYLOAD', defaultValue: 'windows/meterpreter/reverse_tcp', required: true, description: 'Payload compatible de 32 bits' },
      { name: 'LHOST', defaultValue: '192.168.100.10', required: true, description: 'IP atacante para el handler reverso' },
      { name: 'LPORT', defaultValue: '4445', required: true, description: 'Puerto local de escucha para BadBlue' }
    ]
  },
  {
    path: 'post/multi/manage/autoroute',
    shortName: 'multi/manage/autoroute',
    type: 'post',
    rank: 'Normal',
    disclosureDate: '2011-08-01',
    platform: 'multi',
    description: 'Añade rutas de subred interna a la tabla de enrutamiento interna de Metasploit a través de una sesión de Meterpreter activa.',
    ejptExamNote: 'Paso 1 del pivoting en Metasploit. Permite que todos los módulos de MSF alcancen la subred oculta.',
    defaultOptions: {
      CMD: 'add',
      SUBNET: '10.10.10.0',
      NETMASK: '255.255.255.0',
      SESSION: '1'
    },
    optionsList: [
      { name: 'CMD', defaultValue: 'add', required: true, description: 'Acción a realizar: "add", "print", o "delete"' },
      { name: 'SUBNET', defaultValue: '10.10.10.0', required: true, description: 'Subred interna objetivo para el túnel' },
      { name: 'NETMASK', defaultValue: '255.255.255.0', required: true, description: 'Máscara de red de la subred interna' },
      { name: 'SESSION', defaultValue: '1', required: true, description: 'ID de la sesión de Meterpreter comprometida en la pasarela' }
    ]
  },
  {
    path: 'auxiliary/server/socks_proxy',
    shortName: 'server/socks_proxy',
    type: 'auxiliary',
    rank: 'Normal',
    disclosureDate: '2010-06-01',
    platform: 'multi',
    description: 'Inicia un servidor proxy SOCKS4a/5 local en Kali que enruta tráfico TCP a través de las rutas autoroute de Metasploit.',
    ejptExamNote: 'Paso 2 del pivoting en Metasploit. Conecta herramientas externas como proxychains nmap o proxychains sqlmap a la subred interna.',
    defaultOptions: {
      SRVHOST: '127.0.0.1',
      SRVPORT: '1080',
      VERSION: '5'
    },
    optionsList: [
      { name: 'SRVHOST', defaultValue: '127.0.0.1', required: true, description: 'Dirección IP de escucha local para el proxy SOCKS' },
      { name: 'SRVPORT', defaultValue: '1080', required: true, description: 'Puerto de enlace (debe coincidir con /etc/proxychains4.conf)' },
      { name: 'VERSION', defaultValue: '5', required: true, description: 'Versión del protocolo SOCKS (4a o 5)' }
    ]
  },
  {
    path: 'auxiliary/scanner/smb/smb_version',
    shortName: 'scanner/smb/smb_version',
    type: 'auxiliary',
    rank: 'Normal',
    disclosureDate: '2008-01-01',
    platform: 'windows',
    description: 'Determina la versión exacta del sistema operativo Windows y dialecto SMB negociado.',
    ejptExamNote: 'Enumeración no intrusiva esencial para identificar si el objetivo es Windows 2016, 2019 o Samba Linux.',
    defaultOptions: {
      RHOSTS: '10.10.10.0/24',
      THREADS: '16'
    },
    optionsList: [
      { name: 'RHOSTS', defaultValue: '10.10.10.0/24', required: true, description: 'Rango o IP a escanear por SMB' },
      { name: 'THREADS', defaultValue: '16', required: true, description: 'Número de hilos concurrentes' }
    ]
  },
  {
    path: 'auxiliary/scanner/portscan/tcp',
    shortName: 'scanner/portscan/tcp',
    type: 'auxiliary',
    rank: 'Normal',
    disclosureDate: '2008-01-01',
    platform: 'multi',
    description: 'Escáner TCP SYN/Connect nativo dentro de Metasploit utilizando las rutas de autoroute configuradas.',
    ejptExamNote: 'Alternativa rápida a proxychains nmap para descubrir puertos internos sin abandonar la consola msf.',
    defaultOptions: {
      RHOSTS: '10.10.10.25',
      PORTS: '21,22,80,445,3389',
      THREADS: '8'
    },
    optionsList: [
      { name: 'RHOSTS', defaultValue: '10.10.10.25', required: true, description: 'IPs internas a escanear a través del pivot' },
      { name: 'PORTS', defaultValue: '21,22,80,445,3389', required: true, description: 'Puertos a auditar separados por comas' },
      { name: 'THREADS', defaultValue: '8', required: true, description: 'Hilos concurrentes' }
    ]
  }
];

export function getMetasploitModule(path: string): MetasploitModuleDef | undefined {
  if (!path) return undefined;
  const clean = path.trim().toLowerCase();
  return METASPLOIT_MODULES.find(m => 
    m.path.toLowerCase() === clean || 
    m.shortName.toLowerCase() === clean ||
    clean.includes(m.shortName.toLowerCase()) ||
    m.path.toLowerCase().includes(clean)
  );
}
