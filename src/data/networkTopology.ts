import { NetworkHost } from '../types/simulator';

export const INITIAL_NETWORK_TOPOLOGY: NetworkHost[] = [
  {
    id: 'target-dmz-1',
    ip: '192.168.100.50',
    hostname: 'target-web-01.corp.local',
    subnet: 'dmz',
    os: 'Linux Ubuntu',
    discovered: false,
    compromised: false,
    rootCompromised: false,
    ports: [
      { port: 22, protocol: 'tcp', service: 'ssh', version: 'OpenSSH 8.2p1 Ubuntu 4ubuntu0.5', banner: 'SSH-2.0-OpenSSH_8.2p1 Ubuntu-4ubuntu0.5' },
      { port: 80, protocol: 'tcp', service: 'http', version: 'Apache httpd 2.4.41 ((Ubuntu))', banner: 'Apache/2.4.41 (Ubuntu) Server at target-web-01.corp.local Port 80' },
      { port: 3306, protocol: 'tcp', service: 'mysql', version: 'MySQL (filtered)', banner: 'MySQL Community Server' }
    ],
    flags: [
      {
        id: 'flag-dmz-web',
        name: 'Web Server Root Flag',
        path: '/root/flag.txt',
        value: 'FLAG_DMZ_WEB{lfi_2_pr1v_esc_success}',
        description: 'Encontrada tras escalar privilegios aprovechando LFI y el binario SUID find en el servidor web.',
        found: false
      }
    ],
    notes: 'Servidor web perimetral. Descubierto con nmap en la DMZ. Alojando Apache 2.4.41 con portal PHP vulnerable a LFI.',
    credentials: [
      { username: 'sysadmin', password: 'P@ssw0rd2024!', service: 'SSH / Sudo' }
    ]
  },
  {
    id: 'target-dmz-2',
    ip: '192.168.100.55',
    hostname: 'target-ftp-02.corp.local',
    subnet: 'dmz',
    os: 'Linux Debian',
    discovered: false,
    compromised: false,
    rootCompromised: false,
    ports: [
      { port: 21, protocol: 'tcp', service: 'ftp', version: 'vsftpd 3.0.3 (Anonymous Enabled)', banner: '220 (vsFTPd 3.0.3)' },
      { port: 22, protocol: 'tcp', service: 'ssh', version: 'OpenSSH 7.9p1 Debian', banner: 'SSH-2.0-OpenSSH_7.9p1 Debian-10+deb10u2' },
      { port: 8080, protocol: 'tcp', service: 'http', version: 'lighttpd/1.4.53 (Staff Portal)', banner: 'lighttpd/1.4.53' }
    ],
    flags: [
      {
        id: 'flag-dmz-ftp',
        name: 'FTP Leak Flag',
        path: '/srv/ftp/confidential_note.txt',
        value: 'FLAG_FTP_LEAK{vsftpd_an0n_c0nfidential}',
        description: 'Obtenida mediante acceso anónimo al servicio vsftpd 3.0.3.',
        found: false
      }
    ],
    notes: 'Servidor de almacenamiento y utilidades. El servicio FTP permite inicio de sesión con usuario anonymous:anonymous.',
    credentials: [
      { username: 'anonymous', password: '', service: 'FTP' },
      { username: 'mike', password: 'password123', service: 'SSH / FTP' }
    ]
  },
  {
    id: 'target-dmz-3',
    ip: '192.168.100.60',
    hostname: 'target-gateway-03.corp.local',
    subnet: 'dmz',
    os: 'Linux Ubuntu',
    isPivotGateway: true,
    secondaryIp: '10.10.10.1',
    discovered: false,
    compromised: false,
    rootCompromised: false,
    ports: [
      { port: 22, protocol: 'tcp', service: 'ssh', version: 'OpenSSH 8.2p1 Ubuntu', banner: 'SSH-2.0-OpenSSH_8.2p1 Ubuntu' },
      { port: 80, protocol: 'tcp', service: 'http', version: 'nginx/1.18.0 (Gateway Admin)', banner: 'nginx/1.18.0 (Ubuntu)' },
      { port: 139, protocol: 'tcp', service: 'netbios-ssn', version: 'Samba smbd 4.9.5', banner: 'Samba 4.9.5' },
      { port: 445, protocol: 'tcp', service: 'microsoft-ds', version: 'Samba smbd 4.9.5 (workgroup: WORKGROUP)', banner: 'Samba 4.9.5' }
    ],
    flags: [
      {
        id: 'flag-dmz-gateway',
        name: 'Gateway Route Pivot Flag',
        path: '/home/pivotuser/flag.txt',
        value: 'FLAG_PIVOT_GATEWAY{dual_h0med_r0ute_unl0cked}',
        description: 'Encontrada en el usuario pivotuser de la máquina dual-homed. Revela el rango 10.10.10.0/24.',
        found: false
      }
    ],
    notes: 'MÁQUINA PIVOT CLAVE (DUAL-HOMED): Conecta la red DMZ (192.168.100.0/24) con la red interna privada (10.10.10.0/24). Dispone de un recurso Samba público.',
    credentials: [
      { username: 'pivotuser', password: 'pivotpass2024', service: 'SSH / Samba' }
    ]
  },
  {
    id: 'target-internal-4',
    ip: '10.10.10.20',
    hostname: 'target-db-04.corp.internal',
    subnet: 'internal',
    os: 'Linux CentOS',
    discovered: false,
    compromised: false,
    rootCompromised: false,
    ports: [
      { port: 22, protocol: 'tcp', service: 'ssh', version: 'OpenSSH 7.4 CentOS', banner: 'SSH-2.0-OpenSSH_7.4' },
      { port: 80, protocol: 'tcp', service: 'http', version: 'Apache 2.4.6 (Internal API)', banner: 'Apache/2.4.6 (CentOS)' },
      { port: 3306, protocol: 'tcp', service: 'mysql', version: 'MySQL 5.7.35', banner: '5.7.35-log MySQL Community Server (GPL)' }
    ],
    flags: [
      {
        id: 'flag-internal-sql',
        name: 'Internal Database Flag',
        path: 'corp_internal.system_secrets.flag',
        value: 'FLAG_INTERNAL_SQL{sql_injecti0n_pivot_d0ne}',
        description: 'Obtenida extrayendo la base de datos corp_internal mediante SQL Injection a través del túnel proxychains.',
        found: false
      }
    ],
    notes: 'Servidor de base de datos interno. Solo accesible pivoteando a través de 192.168.100.60. API vulnerable en /api/employees?id=1.',
    credentials: [
      { username: 'itadmin', password: 'P@ssw0rd2024!', service: 'Dominio / WinRM / SSH' }
    ]
  },
  {
    id: 'target-internal-5',
    ip: '10.10.10.25',
    hostname: 'target-win-05.corp.internal',
    subnet: 'internal',
    os: 'Windows Server 2019',
    discovered: false,
    compromised: false,
    rootCompromised: false,
    ports: [
      { port: 135, protocol: 'tcp', service: 'msrpc', version: 'Microsoft Windows RPC', banner: 'MSRPC' },
      { port: 139, protocol: 'tcp', service: 'netbios-ssn', version: 'Microsoft Windows netbios-ssn', banner: 'NetBIOS' },
      { port: 445, protocol: 'tcp', service: 'microsoft-ds', version: 'Windows Server 2019 Standard 17763', banner: 'Windows Server 2019' },
      { port: 3389, protocol: 'tcp', service: 'ms-wbt-server', version: 'Microsoft Terminal Services', banner: 'RDP' },
      { port: 5985, protocol: 'tcp', service: 'wsman', version: 'Microsoft HTTPAPI httpd 2.0 (SSDP/UPnP)', banner: 'WinRM' }
    ],
    flags: [
      {
        id: 'flag-internal-win',
        name: 'Windows Administrator Flag',
        path: 'C:\\Users\\Administrator\\Desktop\\flag.txt',
        value: 'FLAG_WIN_SYSTEM{w1nd0ws_psexec_system_cr4cked}',
        description: 'Encontrada en el escritorio del Administrador de Windows mediante psexec / WinRM con credenciales de itadmin.',
        found: false
      }
    ],
    notes: 'Controlador / Servidor Windows Server 2019 interno. Vulnerable a psexec con credenciales itadmin:P@ssw0rd2024! o explotación SMB.',
    credentials: [
      { username: 'itadmin', password: 'P@ssw0rd2024!', service: 'SMB / WinRM / psexec' }
    ]
  },
  {
    id: 'target-internal-6',
    ip: '10.10.10.30',
    hostname: 'target-vault-06.corp.internal',
    subnet: 'internal',
    os: 'Windows 10',
    discovered: false,
    compromised: false,
    rootCompromised: false,
    ports: [
      { port: 80, protocol: 'tcp', service: 'http', version: 'BadBlue 2.7', banner: 'BadBlue/2.7' },
      { port: 445, protocol: 'tcp', service: 'microsoft-ds', version: 'Windows 10 Enterprise', banner: 'Windows 10' }
    ],
    flags: [
      {
        id: 'flag-internal-vault',
        name: 'Final Vault Master Flag',
        path: 'C:\\Vault\\master_flag.txt',
        value: 'FLAG_VAULT_FINAL{ejptv2_master_penetration_tester}',
        description: 'Flag final de la bóveda de seguridad corporativa. Completa el examen eJPTv2 al 100%.',
        found: false
      }
    ],
    notes: 'Estación de trabajo bóveda de seguridad. Alojando BadBlue 2.7 vulnerable a desbordamiento de búfer en Metasploit.',
    credentials: [
      { username: 'Administrator', password: 'SuperSecret2024!', service: 'SYSTEM' }
    ]
  }
];
