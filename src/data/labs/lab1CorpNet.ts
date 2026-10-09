import { LabDefinition, NetworkHost, ExamQuestion } from '../../types/simulator';

export const LAB1_HOSTS: NetworkHost[] = [
  {
    id: 'target-dmz-1',
    ip: '192.168.100.50',
    hostname: 'target-web-01.corp.local',
    subnet: 'dmz',
    os: 'Linux Ubuntu',
    x: 280,
    y: 120,
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
    notes: 'Servidor web perimetral DMZ. Apache 2.4.41 con portal PHP vulnerable a LFI en /blog/view.php?page=...',
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
    x: 280,
    y: 260,
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
    notes: 'Servidor FTP & utilidades en DMZ. vsftpd 3.0.3 con acceso anonymous habilitado y contraseñas de usuario mike.',
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
    x: 480,
    y: 190,
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
    notes: 'MÁQUINA PIVOT CLAVE (DUAL-HOMED): Conecta la red DMZ (192.168.100.0/24) con la red interna privada (10.10.10.0/24). Samba contiene maintenance.sh con credenciales.',
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
    x: 680,
    y: 110,
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
    x: 680,
    y: 220,
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
    notes: 'Controlador de servidores Windows Server 2019. Explotable con Metasploit exploit/windows/smb/psexec usando credenciales itadmin.',
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
    x: 680,
    y: 330,
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
        description: 'Flag final de la bóveda de seguridad corporativa. Completa el examen eJPTv2.',
        found: false
      }
    ],
    notes: 'Estación de trabajo bóveda de seguridad. Alojando BadBlue 2.7 vulnerable a desbordamiento de búfer.',
    credentials: [
      { username: 'Administrator', password: 'SuperSecret2024!', service: 'SYSTEM' }
    ]
  }
];

export const LAB1_QUESTIONS_45: ExamQuestion[] = [
  // --- DOMAIN 1: Assessment Methodologies (12 Preguntas) ---
  {
    id: 1,
    domain: 'Assessment Methodologies',
    question: '¿Cuál es el rango de red CIDR asignado inicialmente en la interfaz tun0 para comenzar la auditoría perimetral (DMZ)?',
    options: ['10.10.10.0/24', '192.168.100.0/24', '172.16.50.0/24', '192.168.1.0/24'],
    correctAnswer: 1,
    hint: 'Ejecuta `ip a` o `ifconfig tun0` en Kali Linux.',
    explanation: 'La interfaz tun0 de la máquina atacante está conectada a la subred DMZ 192.168.100.0/24 con IP 192.168.100.10/24.'
  },
  {
    id: 2,
    domain: 'Assessment Methodologies',
    question: '¿Cuántos hosts activos (vivos) responden al barrido de red (sweep) en la subred 192.168.100.0/24 (excluyendo la máquina atacante)?',
    options: ['2 hosts', '3 hosts', '5 hosts', '7 hosts'],
    correctAnswer: 1,
    hint: 'Usa `netdiscover -r 192.168.100.0/24` o `nmap -sn 192.168.100.0/24`.',
    explanation: 'Se descubren 3 hosts activos en la DMZ: 192.168.100.50, 192.168.100.55 y 192.168.100.60.'
  },
  {
    id: 3,
    domain: 'Assessment Methodologies',
    question: '¿Qué versión exacta del servidor web Apache se encuentra en ejecución en el host 192.168.100.50?',
    options: ['Apache/2.4.29', 'Apache/2.4.41', 'Apache/2.2.15', 'nginx/1.18.0'],
    correctAnswer: 1,
    hint: 'Usa `nmap -sV -p 80 192.168.100.50` o `curl -I http://192.168.100.50`.',
    explanation: 'Nmap reporta el servicio como Apache httpd 2.4.41 ((Ubuntu)) en el puerto 80 TCP.'
  },
  {
    id: 4,
    domain: 'Assessment Methodologies',
    question: 'En el objetivo 192.168.100.55, ¿qué software y versión responde en el puerto 21/TCP?',
    options: ['ProFTPD 1.3.5', 'Pure-FTPd 1.0.49', 'vsftpd 3.0.3', 'FileZilla Server 0.9.41'],
    correctAnswer: 2,
    hint: 'Usa `nmap -sV -p 21 192.168.100.55`.',
    explanation: 'El servicio expuesto es vsftpd versión 3.0.3, el cual permite inicio de sesión con usuario anonymous.'
  },
  {
    id: 5,
    domain: 'Assessment Methodologies',
    question: '¿Permite el servidor FTP en 192.168.100.55 el inicio de sesión anónimo (anonymous)?',
    options: ['No, requiere credenciales válidas', 'Sí, permite autenticación anónima y lectura', 'Solo en modo FTPS', 'El servicio está bloqueado por firewall'],
    correctAnswer: 1,
    hint: 'Ejecuta `nmap --script=ftp-anon -p 21 192.168.100.55`.',
    explanation: 'El script de nmap ftp-anon confirma: "Anonymous FTP login allowed (FTP code 230)".'
  },
  {
    id: 6,
    domain: 'Assessment Methodologies',
    question: 'Al enumerar recursos compartidos SMB en 192.168.100.60 mediante sesión nula, ¿qué recurso compartido se encuentra expuesto?',
    options: ['IPC$', 'public', 'admin$', 'backups'],
    correctAnswer: 1,
    hint: 'Ejecuta `smbclient -L //192.168.100.60 -N`.',
    explanation: 'El recurso "public" tiene permisos de lectura anónima y contiene scripts de mantenimiento.'
  },
  {
    id: 7,
    domain: 'Assessment Methodologies',
    question: '¿Qué herramienta de enumeración web revela directorios ocultos como /admin y /blog en 192.168.100.50?',
    options: ['gobuster o dirb con diccionario common.txt', 'wireshark', 'aircrack-ng', 'dnsenum'],
    correctAnswer: 0,
    hint: 'Ejecuta `gobuster dir -u http://192.168.100.50 -w /usr/share/wordlists/dirb/common.txt`.',
    explanation: 'Gobuster o dirb realizan fuerza bruta de directorios HTTP revelando códigos 200/301.'
  },
  {
    id: 8,
    domain: 'Assessment Methodologies',
    question: '¿Qué valor de TTL devuelve el comando ping hacia 192.168.100.50, indicando que el SO es GNU/Linux?',
    options: ['TTL = 32', 'TTL = 64', 'TTL = 128', 'TTL = 255'],
    correctAnswer: 1,
    hint: 'Ejecuta `ping -c 1 192.168.100.50`. Linux suele usar TTL=64 y Windows TTL=128.',
    explanation: 'Linux por defecto envía paquetes ICMP con TTL 64, mientras que Windows utiliza TTL 128.'
  },
  {
    id: 9,
    domain: 'Assessment Methodologies',
    question: 'Al escanear un objetivo a través de un proxy SOCKS (pivoting) con proxychains y nmap, ¿cuál es la técnica requerida?',
    options: ['SYN Stealth Scan (-sS)', 'TCP Connect Scan (-sT -Pn)', 'UDP Scan (-sU)', 'FIN Scan (-sF)'],
    correctAnswer: 1,
    hint: 'Los proxies SOCKS no admiten el envío de paquetes SYN sin handshake completo.',
    explanation: 'Al rutear a través de un proxy SOCKS4/5 se debe usar TCP Connect scan (-sT) y desactivar ping (-Pn).'
  },
  {
    id: 10,
    domain: 'Assessment Methodologies',
    question: '¿Qué puerto TCP se encuentra filtrado o bloqueado al público en el host 192.168.100.50?',
    options: ['Puerto 22', 'Puerto 80', 'Puerto 3306 (MySQL)', 'Puerto 8080'],
    correctAnswer: 2,
    hint: 'Revisa la salida de `nmap -p- 192.168.100.50`.',
    explanation: 'El puerto 3306/tcp aparece como "filtered" en 192.168.100.50.'
  },
  {
    id: 11,
    domain: 'Assessment Methodologies',
    question: '¿Qué parámetro de Nmap permite omitir la fase de resolución DNS inversa para acelerar el escaneo en redes corporativas?',
    options: ['-n', '-R', '-sP', '-O'],
    correctAnswer: 0,
    hint: 'La opción `-n` le indica a Nmap que nunca intente resolver nombres de dominio.',
    explanation: 'La bandera `-n` desactiva la resolución inversa de DNS reduciendo el tiempo de escaneo.'
  },
  {
    id: 12,
    domain: 'Assessment Methodologies',
    question: '¿Qué cabecera HTTP estándar revela qué servidor web y sistema operativo se está ejecutando en 192.168.100.50?',
    options: ['User-Agent', 'Server', 'Host', 'Authorization'],
    correctAnswer: 1,
    hint: 'Inspecciona las cabeceras con `curl -I http://192.168.100.50`.',
    explanation: 'La cabecera `Server: Apache/2.4.41 (Ubuntu)` expone el software del servidor.'
  },

  // --- DOMAIN 2: Host & Network Pentesting (18 Preguntas) ---
  {
    id: 13,
    domain: 'Host & Network Pentesting',
    question: 'Al comprometer el host 192.168.100.60, ¿cuál es la dirección IP de la segunda interfaz de red (eth1) hacia la red interna?',
    options: ['10.10.10.1', '172.16.0.1', '192.168.200.1', '10.0.2.15'],
    correctAnswer: 0,
    hint: 'Inicia sesión como `pivotuser` en 192.168.100.60 y ejecuta `ip a`.',
    explanation: 'La interfaz eth1 de 192.168.100.60 tiene la IP 10.10.10.1/24 como gateway interno.'
  },
  {
    id: 14,
    domain: 'Host & Network Pentesting',
    question: '¿Cuál es el bloque de red (CIDR) de la subred interna oculta accesible únicamente a través del pivot?',
    options: ['192.168.1.0/24', '10.10.10.0/24', '172.20.10.0/24', '10.0.0.0/8'],
    correctAnswer: 1,
    hint: 'Verifica la tabla de enrutamiento con `ip route` en el gateway.',
    explanation: 'La tabla de enrutamiento local muestra la red 10.10.10.0/24 vinculada a eth1.'
  },
  {
    id: 15,
    domain: 'Host & Network Pentesting',
    question: '¿Qué comando de SSH crea un proxy dinámico SOCKS5 en el puerto 1080 hacia el host pivot?',
    options: [
      'ssh -R 1080:localhost:80 pivotuser@192.168.100.60',
      'ssh -L 1080:10.10.10.1:80 pivotuser@192.168.100.60',
      'ssh -D 1080 -N -f pivotuser@192.168.100.60',
      'ssh -p 1080 pivotuser@192.168.100.60'
    ],
    correctAnswer: 2,
    hint: 'La opción `-D <puerto>` establece Dynamic Port Forwarding.',
    explanation: '`ssh -D 1080` levanta un listener SOCKS en la máquina local para proxychains.'
  },
  {
    id: 16,
    domain: 'Host & Network Pentesting',
    question: 'En Metasploit Framework, ¿qué comando de post-explotación añade una ruta a la tabla de enrutamiento interna de MSF?',
    options: ['run autoroute -s 10.10.10.0/24', 'route add default 10.10.10.1', 'use post/windows/gather/enum_routes', 'pivot-enable 10.10.10.0'],
    correctAnswer: 0,
    hint: 'Dentro de una sesión meterpreter activa, ejecuta `run autoroute -s ...`.',
    explanation: 'El comando `run autoroute -s 10.10.10.0/24` enruta los módulos de Metasploit a la subred interna.'
  },
  {
    id: 17,
    domain: 'Host & Network Pentesting',
    question: '¿Qué archivo de configuración en Kali Linux debe modificarse o verificarse para especificar el puerto 1080 del túnel SOCKS?',
    options: ['/etc/network/interfaces', '/etc/proxychains4.conf', '/etc/ssh/sshd_config', '/etc/hosts'],
    correctAnswer: 1,
    hint: 'Es el archivo que lee la utilidad proxychains.',
    explanation: 'En `/etc/proxychains4.conf` se define la directiva `socks5 127.0.0.1 1080`.'
  },
  {
    id: 18,
    domain: 'Host & Network Pentesting',
    question: 'Una vez establecido el pivoting hacia 10.10.10.0/24, ¿cuántos hosts activos se detectan en dicha red interna?',
    options: ['1 host', '3 hosts (10.10.10.20, 10.10.10.25, 10.10.10.30)', '6 hosts', '10 hosts'],
    correctAnswer: 1,
    hint: 'Usa `proxychains nmap -sT -Pn 10.10.10.20,25,30`.',
    explanation: 'La red interna contiene 3 hosts objetivos: el servidor DB .20, Windows .25 y la bóveda .30.'
  },
  {
    id: 19,
    domain: 'Host & Network Pentesting',
    question: '¿Qué sistema operativo está instalado en el host interno 10.10.10.25 según los puertos MSRPC y SMB?',
    options: ['Ubuntu Linux 22.04', 'Windows Server 2019 Standard', 'CentOS Linux 7', 'FreeBSD 13'],
    correctAnswer: 1,
    hint: 'Usa `proxychains nmap -sT -sV -p 135,445 10.10.10.25`.',
    explanation: 'El escaneo de SMB y MSRPC revela Windows Server 2019 (Build 17763).'
  },
  {
    id: 20,
    domain: 'Host & Network Pentesting',
    question: '¿Cuál es la contraseña válida recuperada para el usuario `mike` en el host 192.168.100.55?',
    options: ['admin123', 'password123', 'hunter2', 'mike2024'],
    correctAnswer: 1,
    hint: 'Usa `hydra -l mike -P /usr/share/wordlists/rockyou.txt ssh://192.168.100.55`.',
    explanation: 'Hydra o la nota de FTP confirman las credenciales mike:password123.'
  },
  {
    id: 21,
    domain: 'Host & Network Pentesting',
    question: 'En el host 192.168.100.50, ¿qué binario con bit SUID o permiso sudo permite escalar privilegios a root?',
    options: ['/usr/bin/find', '/usr/bin/vim', '/bin/bash', '/usr/bin/python3'],
    correctAnswer: 0,
    hint: 'Ejecuta `sudo -l` una vez conectado como sysadmin.',
    explanation: 'El binario `/usr/bin/find` con permisos sudo permite ejecutar comandos como root vía GTFOBins.'
  },
  {
    id: 22,
    domain: 'Host & Network Pentesting',
    question: '¿Cuál es el valor exacto de la bandera encontrada en la máquina gateway (FLAG_PIVOT_GATEWAY)?',
    options: ['FLAG_PIVOT_GATEWAY{dual_h0med_r0ute_unl0cked}', 'FLAG_GATEWAY{fail}', 'FLAG_INTERNAL{pivot_10_10_10}', 'FLAG_ROOT{none}'],
    correctAnswer: 0,
    isFlagQuestion: true,
    flagKey: 'flag-dmz-gateway',
    hint: 'Busca en `/home/pivotuser/flag.txt` en el host 192.168.100.60.',
    explanation: 'La flag en /home/pivotuser/flag.txt es `FLAG_PIVOT_GATEWAY{dual_h0med_r0ute_unl0cked}`.'
  },
  {
    id: 23,
    domain: 'Host & Network Pentesting',
    question: '¿Qué módulo de Metasploit permite obtener una sesión interactiva como SYSTEM en Windows (10.10.10.25) utilizando credenciales válidas?',
    options: ['exploit/windows/smb/psexec', 'exploit/multi/handler', 'auxiliary/scanner/portscan/tcp', 'exploit/unix/ftp/vsftpd_234_backdoor'],
    correctAnswer: 0,
    hint: 'El clásico psexec de Metasploit carga un servicio remoto autenticado en Windows.',
    explanation: '`exploit/windows/smb/psexec` se autentica en SMB y despliega meterpreter con SYSTEM.'
  },
  {
    id: 24,
    domain: 'Host & Network Pentesting',
    question: '¿Qué nivel de privilegios devuelve el comando `getuid` en Meterpreter al explotar con éxito el host Windows 10.10.10.25?',
    options: ['NT AUTHORITY\\SYSTEM', 'target-win-05\\Guest', 'target-win-05\\itadmin', 'NT AUTHORITY\\LOCAL SERVICE'],
    correctAnswer: 0,
    hint: 'Psexec crea un servicio del sistema en Windows.',
    explanation: 'Al ejecutarse como servicio de Windows, psexec eleva la sesión a NT AUTHORITY\\SYSTEM.'
  },
  {
    id: 25,
    domain: 'Host & Network Pentesting',
    question: '¿Cuál es la bandera ubicada en el escritorio del Administrador de 10.10.10.25 (C:\\Users\\Administrator\\Desktop\\flag.txt)?',
    options: ['FLAG_WIN_SYSTEM{w1nd0ws_psexec_system_cr4cked}', 'FLAG_WIN_SYSTEM{not_found}', 'FLAG_DOMAIN{eternal}', 'FLAG_METERPRETER{stolen}'],
    correctAnswer: 0,
    isFlagQuestion: true,
    flagKey: 'flag-internal-win',
    hint: 'Usa `type C:\\Users\\Administrator\\Desktop\\flag.txt` en meterpreter.',
    explanation: 'La flag en el escritorio del Administrador de Windows es `FLAG_WIN_SYSTEM{w1nd0ws_psexec_system_cr4cked}`.'
  },
  {
    id: 26,
    domain: 'Host & Network Pentesting',
    question: '¿Qué comando de Meterpreter permite interactuar directamente con la consola de comandos nativa de Windows (cmd.exe)?',
    options: ['shell', 'cmd', 'exec -f cmd.exe', 'powershell'],
    correctAnswer: 0,
    hint: 'Escribe `shell` en el prompt de meterpreter.',
    explanation: 'El comando `shell` en meterpreter abre una sesión nativa cmd.exe.'
  },
  {
    id: 27,
    domain: 'Host & Network Pentesting',
    question: '¿Qué comando de Linux permite transferir archivos de forma cifrada a través de SSH hacia la máquina de auditoría?',
    options: ['scp', 'ftp', 'tftp', 'telnet'],
    correctAnswer: 0,
    hint: 'La utilidad Secure Copy Protocol se invoca con `scp`.',
    explanation: '`scp` utiliza el protocolo SSH para transferir archivos de forma segura.'
  },
  {
    id: 28,
    domain: 'Host & Network Pentesting',
    question: 'Al auditar permisos de usuario en Linux, ¿qué archivo contiene los grupos secundarios a los que pertenece un usuario?',
    options: ['/etc/group', '/etc/shadow', '/etc/sudoers', '/etc/fstab'],
    correctAnswer: 0,
    hint: 'Es el archivo legible /etc/group.',
    explanation: '`/etc/group` define los grupos del sistema y sus integrantes.'
  },
  {
    id: 29,
    domain: 'Host & Network Pentesting',
    question: '¿Qué puerto TCP estándar utiliza el servicio de administración remota de Windows (WinRM) en texto plano/HTTP?',
    options: ['5985', '5986', '3389', '445'],
    correctAnswer: 0,
    hint: 'El puerto 5985 es WinRM HTTP, mientras que 5986 es HTTPS.',
    explanation: 'WinRM utiliza el puerto TCP 5985 para comunicación HTTP.'
  },
  {
    id: 30,
    domain: 'Host & Network Pentesting',
    question: 'En Windows, ¿qué comando muestra todos los adaptadores y direcciones IP asignadas a la máquina?',
    options: ['ipconfig /all', 'ifconfig -a', 'netstat -r', 'route print'],
    correctAnswer: 0,
    hint: 'El comando nativo de Windows es ipconfig.',
    explanation: '`ipconfig /all` detalla las tarjetas de red, IPs, máscaras y servidores DNS.'
  },

  // --- DOMAIN 3: Web App Pentesting (15 Preguntas) ---
  {
    id: 31,
    domain: 'Web App Pentesting',
    question: 'En el sitio web de 192.168.100.50, ¿qué tipo de vulnerabilidad crítica existe en `/blog/view.php?page=...`?',
    options: ['Cross-Site Scripting (XSS)', 'Local File Inclusion (LFI)', 'Inyección de comandos ciega', 'CSRF'],
    correctAnswer: 1,
    hint: 'Prueba pasar `../../../../etc/passwd`.',
    explanation: 'El script PHP incluye ficheros sin sanitizar permitiendo Local File Inclusion (LFI).'
  },
  {
    id: 32,
    domain: 'Web App Pentesting',
    question: 'Al explotar el LFI en 192.168.100.50, ¿qué archivo del sistema permite descubrir qué usuarios tienen una shell interactiva (/bin/bash)?',
    options: ['/etc/passwd', '/etc/shadow', '/etc/fstab', '/var/log/apache2/access.log'],
    correctAnswer: 0,
    hint: 'Es el archivo legible por todo usuario en Unix.',
    explanation: '`/etc/passwd` muestra los usuarios locales y sus shells asignadas.'
  },
  {
    id: 33,
    domain: 'Web App Pentesting',
    question: 'A través de LFI o backup en `/var/backups/db_config.php.bak`, ¿qué contraseña fue descubierta para el usuario `sysadmin`?',
    options: ['admin123', 'P@ssw0rd2024!', 'roottoor', 'welcome123'],
    correctAnswer: 1,
    hint: 'Usa `curl http://192.168.100.50/blog/view.php?page=../../../../var/backups/db_config.php.bak`.',
    explanation: 'El archivo de respaldo PHP contenía la clave: `P@ssw0rd2024!`.'
  },
  {
    id: 34,
    domain: 'Web App Pentesting',
    question: '¿Cuál es la bandera obtenida al escalar privilegios en el servidor web (FLAG_DMZ_WEB)?',
    options: ['FLAG_DMZ_WEB{lfi_2_pr1v_esc_success}', 'FLAG_WEB{fail}', 'FLAG_DMZ{php_shell}', 'FLAG_ROOT{none}'],
    correctAnswer: 0,
    isFlagQuestion: true,
    flagKey: 'flag-dmz-web',
    hint: 'Encuentra `/root/flag.txt` en 192.168.100.50 tras escalar privilegios.',
    explanation: 'La flag en `/root/flag.txt` es `FLAG_DMZ_WEB{lfi_2_pr1v_esc_success}`.'
  },
  {
    id: 35,
    domain: 'Web App Pentesting',
    question: 'En la red interna, el servidor 10.10.10.20 tiene una API en `/api/employees?id=1`. ¿Qué técnica permite extraer los registros de la base de datos?',
    options: ['SQL Injection basada en UNION o booleana', 'Inyección LDAP', 'Subida de archivos maliciosos', 'SSTI'],
    correctAnswer: 0,
    hint: 'Prueba `proxychains sqlmap -u "http://10.10.10.20/api/employees?id=1"`.',
    explanation: 'El parámetro `id` es vulnerable a SQL Injection basado en UNION y booleano.'
  },
  {
    id: 36,
    domain: 'Web App Pentesting',
    question: '¿Qué motor y versión de Base de Datos está detrás de la API en 10.10.10.20 según la respuesta de SQL injection?',
    options: ['PostgreSQL 14.1', 'MySQL 5.7.35', 'Microsoft SQL Server 2016', 'SQLite 3'],
    correctAnswer: 1,
    hint: 'Usa `sqlmap` o la función `SELECT @@version;`.',
    explanation: 'El motor responde: `5.7.35-log MySQL Community Server`.'
  },
  {
    id: 37,
    domain: 'Web App Pentesting',
    question: '¿Cuál es el nombre de la base de datos corporativa interna encontrada en 10.10.10.20 que contiene las credenciales administrativas?',
    options: ['corp_internal', 'wordpress_db', 'production_sales', 'ejpt_testing'],
    correctAnswer: 0,
    hint: 'Usa `proxychains sqlmap -u "http://10.10.10.20/api/employees?id=1" --dbs`.',
    explanation: 'El volcado revela la base de datos `corp_internal`.'
  },
  {
    id: 38,
    domain: 'Web App Pentesting',
    question: '¿Cuál es el valor de la bandera almacenada en la tabla `system_secrets` de la base de datos `corp_internal`?',
    options: ['FLAG_INTERNAL_SQL{sql_injecti0n_pivot_d0ne}', 'FLAG_SQL{dump}', 'FLAG_DB{leak}', 'FLAG_SECRET{none}'],
    correctAnswer: 0,
    isFlagQuestion: true,
    flagKey: 'flag-internal-sql',
    hint: 'Vuelca la tabla system_secrets con sqlmap.',
    explanation: 'El registro contiene `FLAG_INTERNAL_SQL{sql_injecti0n_pivot_d0ne}`.'
  },
  {
    id: 39,
    domain: 'Web App Pentesting',
    question: 'La tabla `corp_internal.users` almacena las contraseñas en formato hash. ¿Qué algoritmo se utilizó?',
    options: ['MD5 (32 caracteres hexadecimales)', 'bcrypt ($2a$)', 'Argon2id', 'SHA-512 crypt'],
    correctAnswer: 0,
    hint: '32 caracteres hexadecimales = 128 bits.',
    explanation: 'El hash almacenado tiene 32 caracteres hexadecimales correspondientes a MD5.'
  },
  {
    id: 40,
    domain: 'Web App Pentesting',
    question: 'Al crackear el hash del usuario `itadmin` obtenido de la base de datos interna mediante john o hashcat, ¿qué contraseña se obtiene?',
    options: ['P@ssw0rd2024!', 'qwerty12345', 'administrator', 'ilovepizza'],
    correctAnswer: 0,
    hint: 'Usa `john --format=raw-md5 --wordlist=rockyou.txt hash.txt`.',
    explanation: 'El hash MD5 corresponde a la clave `P@ssw0rd2024!`.'
  },
  {
    id: 41,
    domain: 'Web App Pentesting',
    question: 'En el host 10.10.10.30, ¿qué software vulnerable a desbordamiento de búfer está alojado en el puerto 80?',
    options: ['BadBlue 2.7', 'Easy File Sharing Web Server 7.2', 'Apache Tomcat 8.5', 'IIS 10.0'],
    correctAnswer: 0,
    hint: 'Ejecuta `proxychains curl -I http://10.10.10.30`.',
    explanation: 'El servidor HTTP responde Server: BadBlue/2.7.'
  },
  {
    id: 42,
    domain: 'Web App Pentesting',
    question: '¿Cuál es la bandera final de la bóveda (Master Flag) encontrada en 10.10.10.30 (C:\\Vault\\master_flag.txt)?',
    options: ['FLAG_VAULT_FINAL{ejptv2_master_penetration_tester}', 'FLAG_VAULT{end}', 'FLAG_FINAL{win}', 'FLAG_CERT{done}'],
    correctAnswer: 0,
    isFlagQuestion: true,
    flagKey: 'flag-internal-vault',
    hint: 'Accede a la máquina 10.10.10.30 y lee `C:\\Vault\\master_flag.txt`.',
    explanation: 'La flag definitiva de la bóveda es `FLAG_VAULT_FINAL{ejptv2_master_penetration_tester}`.'
  },
  {
    id: 43,
    domain: 'Web App Pentesting',
    question: '¿Qué código de estado HTTP devuelve típicamente un servidor web Apache cuando se solicita un recurso protegido que requiere autenticación pero no se proporcionan credenciales?',
    options: ['401 Unauthorized', '403 Forbidden', '404 Not Found', '500 Internal Server Error'],
    correctAnswer: 0,
    hint: 'El código 401 indica falta de credenciales de autenticación.',
    explanation: 'HTTP 401 Unauthorized se devuelve cuando se requiere cabecera Authorization válida.'
  },
  {
    id: 44,
    domain: 'Web App Pentesting',
    question: '¿Cuál es la directiva en el archivo php.ini de PHP que impide que la función include() cargue archivos remotos vía HTTP/FTP (mitigando Remote File Inclusion)?',
    options: ['allow_url_include = Off', 'disable_functions = all', 'expose_php = Off', 'session.cookie_httponly = 1'],
    correctAnswer: 0,
    hint: 'Busca la directiva relacionada con URLs en includes.',
    explanation: '`allow_url_include = Off` previene la inclusión de código remoto (RFI).'
  },
  {
    id: 45,
    domain: 'Web App Pentesting',
    question: '¿Qué método de petición HTTP se utiliza normalmente para consultar información sin modificar el estado del recurso en el servidor?',
    options: ['GET', 'POST', 'PUT', 'DELETE'],
    correctAnswer: 0,
    hint: 'Es el método HTTP idempotente estándar de lectura.',
    explanation: 'El método GET recupera datos de una URL especificada sin provocar efectos secundarios en el servidor.'
  }
];

export const LAB_CORPNET: LabDefinition = {
  id: 'lab-corpnet',
  name: 'Laboratorio 1: Red Empresarial CorpNet',
  codeName: 'CORPNET-EJPT',
  description: 'Topología estándar con DMZ pública y red interna privada. Incluye servidores web PHP con LFI, FTP anónimo, pasarela Linux dual-homed con Samba, base de datos MySQL y controlador Windows Server 2019.',
  difficulty: 'Intermedio (eJPT Estándar)',
  attackerIp: '192.168.100.10',
  dmzSubnet: '192.168.100.0/24',
  internalSubnet: '10.10.10.0/24',
  pivotGatewayIp: '192.168.100.60',
  hosts: LAB1_HOSTS,
  questions: LAB1_QUESTIONS_45,
  instructions: 'Comienza en tun0 (192.168.100.10). Escanea la DMZ 192.168.100.0/24, compromete la máquina pivote 192.168.100.60 y establece un túnel SOCKS5 dinámico hacia 10.10.10.0/24 para auditar Windows y MySQL.'
};
