import { LabDefinition, NetworkHost, ExamQuestion } from '../../types/simulator';

export const LAB2_HOSTS: NetworkHost[] = [
  {
    id: 'fintech-dmz-1',
    ip: '172.16.50.20',
    hostname: 'banking-portal.fintech.local',
    subnet: 'dmz',
    os: 'Linux Debian',
    x: 280,
    y: 120,
    discovered: false,
    compromised: false,
    rootCompromised: false,
    ports: [
      { port: 22, protocol: 'tcp', service: 'ssh', version: 'OpenSSH 8.4p1 Debian', banner: 'SSH-2.0-OpenSSH_8.4p1 Debian' },
      { port: 80, protocol: 'tcp', service: 'http', version: 'nginx/1.18.0 (Spring Boot Reverse Proxy)', banner: 'nginx/1.18.0' },
      { port: 8080, protocol: 'tcp', service: 'http', version: 'Spring Boot 2.5.4 Actuator', banner: 'Tomcat/Embedded Spring' }
    ],
    flags: [
      {
        id: 'flag-fintech-spring',
        name: 'Spring Actuator Env Flag',
        path: '/actuator/env',
        value: 'FLAG_SPRING_LEAK{actuator_env_dump_exposed_secrets}',
        description: 'Obtenida extrayendo secretos de producción expuestos en los endpoints de Spring Boot Actuator.',
        found: false
      }
    ],
    notes: 'Portal bancario con Spring Boot Actuator desprotegido en /actuator/env y /actuator/heapdump filtrando credenciales.',
    credentials: [
      { username: 'appuser', password: 'SpringAdmin2024!', service: 'Spring / SSH' }
    ]
  },
  {
    id: 'fintech-dmz-2',
    ip: '172.16.50.35',
    hostname: 'nfs-storage.fintech.local',
    subnet: 'dmz',
    os: 'Linux Ubuntu',
    x: 280,
    y: 260,
    discovered: false,
    compromised: false,
    rootCompromised: false,
    ports: [
      { port: 22, protocol: 'tcp', service: 'ssh', version: 'OpenSSH 8.2p1 Ubuntu', banner: 'SSH-2.0-OpenSSH_8.2p1' },
      { port: 111, protocol: 'tcp', service: 'rpcbind', version: 'RPCbind 2-4', banner: 'rpcbind' },
      { port: 2049, protocol: 'tcp', service: 'nfs', version: 'NFSv4 (no_root_squash)', banner: 'Network File System' }
    ],
    flags: [
      {
        id: 'flag-fintech-nfs',
        name: 'NFS Export SUID Root Flag',
        path: '/exports/finance/root_flag.txt',
        value: 'FLAG_NFS_ROOT{no_root_squash_privesc_expert}',
        description: 'Explotación de export NFS montable sin autenticación con opción no_root_squash.',
        found: false
      }
    ],
    notes: 'Servidor de almacenamiento NFS expuesto en puerto 2049. La exportación /exports/finance permite montaje remoto sin root squash.',
    credentials: [
      { username: 'storageadmin', password: 'StoragePass#2024', service: 'SSH' }
    ]
  },
  {
    id: 'fintech-dmz-3',
    ip: '172.16.50.100',
    hostname: 'edge-gateway.fintech.local',
    subnet: 'dmz',
    os: 'Linux Ubuntu',
    isPivotGateway: true,
    secondaryIp: '10.20.30.1',
    x: 480,
    y: 190,
    discovered: false,
    compromised: false,
    rootCompromised: false,
    ports: [
      { port: 22, protocol: 'tcp', service: 'ssh', version: 'OpenSSH 8.2p1 Ubuntu', banner: 'SSH-2.0-OpenSSH_8.2p1' },
      { port: 80, protocol: 'tcp', service: 'http', version: 'pfSense / Router Admin', banner: 'Lighttpd/Router' }
    ],
    flags: [
      {
        id: 'flag-fintech-pivot',
        name: 'Financial Gateway Pivot Flag',
        path: '/etc/network/vpn_token.txt',
        value: 'FLAG_FINTECH_PIVOT{dual_edge_tunnel_authorized}',
        description: 'Encontrada en el router pasarela perimetral que interconecta DMZ con la red de sucursal bancaria.',
        found: false
      }
    ],
    notes: 'PASARELA DE PIVOTING: Interfaz externa eth0: 172.16.50.100, Interfaz interna eth1: 10.20.30.1. Permite túnel SSH SOCKS5 dinámico o Chisel.',
    credentials: [
      { username: 'routeradm', password: 'FinTechTunnel#2024', service: 'SSH / SOCKS' }
    ]
  },
  {
    id: 'fintech-internal-4',
    ip: '10.20.30.50',
    hostname: 'dc01.fintech.branch',
    subnet: 'internal',
    os: 'Windows Server 2016',
    x: 680,
    y: 110,
    discovered: false,
    compromised: false,
    rootCompromised: false,
    ports: [
      { port: 53, protocol: 'tcp', service: 'domain', version: 'Microsoft DNS', banner: 'DNS' },
      { port: 88, protocol: 'tcp', service: 'kerberos-sec', version: 'Microsoft Windows Kerberos', banner: 'Kerberos' },
      { port: 389, protocol: 'tcp', service: 'ldap', version: 'Microsoft Windows Active Directory LDAP', banner: 'LDAP' },
      { port: 445, protocol: 'tcp', service: 'microsoft-ds', version: 'Windows Server 2016 DC', banner: 'SMB' },
      { port: 3389, protocol: 'tcp', service: 'ms-wbt-server', version: 'RDP', banner: 'Terminal Server' }
    ],
    flags: [
      {
        id: 'flag-ad-domain-root',
        name: 'Active Directory Domain Admin Flag',
        path: 'C:\\Users\\Administrator\\Desktop\\domain_flag.txt',
        value: 'FLAG_AD_DOMAIN_ROOT{active_directory_kerberos_pwnd}',
        description: 'Compromiso total del Controlador de Dominio de Active Directory mediante Kerberoasting y Pass-The-Hash.',
        found: false
      }
    ],
    notes: 'Controlador de Dominio Active Directory interno (FINTECH.BRANCH). Vulnerable a Kerberoasting en cuenta de servicio mssql_svc.',
    credentials: [
      { username: 'finadmin', password: 'DomainAdmin#2024!', service: 'Kerberos / SMB' }
    ]
  },
  {
    id: 'fintech-internal-5',
    ip: '10.20.30.75',
    hostname: 'jenkins-ci.fintech.branch',
    subnet: 'internal',
    os: 'Linux CentOS',
    x: 680,
    y: 220,
    discovered: false,
    compromised: false,
    rootCompromised: false,
    ports: [
      { port: 22, protocol: 'tcp', service: 'ssh', version: 'OpenSSH 7.4', banner: 'OpenSSH' },
      { port: 8080, protocol: 'tcp', service: 'http', version: 'Jenkins 2.289.1', banner: 'Jenkins CI' }
    ],
    flags: [
      {
        id: 'flag-jenkins-groovy',
        name: 'Jenkins Groovy Pipeline Flag',
        path: '/var/lib/jenkins/flag.txt',
        value: 'FLAG_JENKINS_GROOVY{rce_build_pipeline_compromised}',
        description: 'Ejecución remota de comandos en Jenkins Script Console mediante Groovy scripts.',
        found: false
      }
    ],
    notes: 'Servidor Jenkins de integración continua en red interna. Acceso al script console /script permite ejecución remota de comandos como usuario jenkins.',
    credentials: [
      { username: 'jenkins', password: 'jenkinsadmin2024', service: 'Web / Groovy' }
    ]
  },
  {
    id: 'fintech-internal-6',
    ip: '10.20.30.90',
    hostname: 'mssql-vault.fintech.branch',
    subnet: 'internal',
    os: 'Windows Server 2019',
    x: 680,
    y: 330,
    discovered: false,
    compromised: false,
    rootCompromised: false,
    ports: [
      { port: 1433, protocol: 'tcp', service: 'ms-sql-s', version: 'Microsoft SQL Server 2019 15.0.2000', banner: 'Microsoft SQL Server 2019' },
      { port: 445, protocol: 'tcp', service: 'microsoft-ds', version: 'Windows Server 2019', banner: 'SMB' }
    ],
    flags: [
      {
        id: 'flag-fintech-vault',
        name: 'Bank Vault Master Ledger Flag',
        path: 'C:\\Vault\\ledger_master_flag.txt',
        value: 'FLAG_FINTECH_VAULT{bank_ledger_decrypted_100}',
        description: 'Bandera maestra de la bóveda de transacciones bancarias obtenida con xp_cmdshell en MSSQL.',
        found: false
      }
    ],
    notes: 'Servidor de base de datos transaccional MSSQL en puerto 1433. Credencial sa:SqlAdmin2024! con procedimiento xp_cmdshell habilitable.',
    credentials: [
      { username: 'sa', password: 'SqlAdmin2024!', service: 'MSSQL' }
    ]
  }
];

export const LAB2_QUESTIONS_45: ExamQuestion[] = [
  // --- DOMAIN 1: Assessment Methodologies (12 Preguntas) ---
  {
    id: 1,
    domain: 'Assessment Methodologies',
    question: 'En el Laboratorio FinTech, ¿cuál es el rango de red perimetral inicial (DMZ) en la interfaz tun0?',
    options: ['192.168.100.0/24', '172.16.50.0/24', '10.20.30.0/24', '10.0.0.0/16'],
    correctAnswer: 1,
    hint: 'Verifica tu dirección con `ifconfig tun0` o `ip a`.',
    explanation: 'La interfaz tun0 del atacante en el Lab FinTech tiene la IP 172.16.50.10 en la subred 172.16.50.0/24.'
  },
  {
    id: 2,
    domain: 'Assessment Methodologies',
    question: '¿Cuántos hosts activos responden en el barrido de la subred 172.16.50.0/24?',
    options: ['2 hosts', '3 hosts (.20, .35, .100)', '5 hosts', '8 hosts'],
    correctAnswer: 1,
    hint: 'Usa `netdiscover -r 172.16.50.0/24` o `nmap -sn 172.16.50.0/24`.',
    explanation: 'Responden 3 hosts: 172.16.50.20 (Portal), 172.16.50.35 (NFS) y 172.16.50.100 (Gateway).'
  },
  {
    id: 3,
    domain: 'Assessment Methodologies',
    question: '¿Qué puerto TCP responde con el servicio Network File System (NFS) en el host 172.16.50.35?',
    options: ['Puerto 2049', 'Puerto 111', 'Puerto 445', 'Puerto 21'],
    correctAnswer: 0,
    hint: 'NFS escucha en el puerto estándar 2049.',
    explanation: 'El puerto 2049/tcp corresponde al protocolo Network File System (NFSv4).'
  },
  {
    id: 4,
    domain: 'Assessment Methodologies',
    question: '¿Qué comando de Linux permite consultar los recursos compartidos remotos exportados por un servidor NFS?',
    options: ['showmount -e 172.16.50.35', 'smbclient -L 172.16.50.35', 'rpcclient -U "" 172.16.50.35', 'nfs-list 172.16.50.35'],
    correctAnswer: 0,
    hint: 'El comando estándar para listar exports NFS es `showmount -e`.',
    explanation: '`showmount -e <IP>` lista los sistemas de archivos exportados en el servidor NFS.'
  },
  {
    id: 5,
    domain: 'Assessment Methodologies',
    question: 'En el host 172.16.50.20, ¿qué framework Java responde en el puerto 8080 con endpoints de monitorización (/actuator)?',
    options: ['Spring Boot', 'Apache Struts 2', 'JBoss EAP', 'Play Framework'],
    correctAnswer: 0,
    hint: 'Revisa las cabeceras HTTP o la respuesta de /actuator/health.',
    explanation: 'El servidor ejecuta Spring Boot con Actuator habilitado.'
  },
  {
    id: 6,
    domain: 'Assessment Methodologies',
    question: '¿Qué puerto estándar utiliza el servicio RPCBind (portmapper) en sistemas Unix?',
    options: ['Puerto 111', 'Puerto 135', 'Puerto 445', 'Puerto 53'],
    correctAnswer: 0,
    hint: 'Es el puerto 111 TCP/UDP.',
    explanation: 'RPCBind escucha en el puerto 111 para mapear números de programa RPC a puertos de escucha.'
  },
  {
    id: 7,
    domain: 'Assessment Methodologies',
    question: 'Al auditar un servidor NFS, ¿qué opción en /etc/exports representa un riesgo crítico de elevación de privilegios si permite montaje remoto?',
    options: ['no_root_squash', 'root_squash', 'all_squash', 'sync'],
    correctAnswer: 0,
    hint: 'Esta opción no degrada los privilegios del usuario root cliente a nobody.',
    explanation: '`no_root_squash` permite a un cliente root crear archivos SUID en el recurso montado con privilegios de root.'
  },
  {
    id: 8,
    domain: 'Assessment Methodologies',
    question: '¿Qué parámetro de Nmap realiza la detección exhaustiva de versiones de servicios en puertos abiertos?',
    options: ['-sV', '-sS', '-sN', '-O'],
    correctAnswer: 0,
    hint: 'La opción `-sV` sondea los puertos abiertos para determinar la información de servicio/versión.',
    explanation: '`-sV` (Version detection) envía sondas específicas para identificar software y versión.'
  },
  {
    id: 9,
    domain: 'Assessment Methodologies',
    question: '¿Qué herramienta permite realizar descubrimiento de directorios y archivos web multihilo en Go?',
    options: ['gobuster', 'sqlmap', 'hydra', 'john'],
    correctAnswer: 0,
    hint: 'Gobuster está escrita en Go y es muy rápida.',
    explanation: 'Gobuster es una herramienta de fuerza bruta de URIs y DNS escrita en Go.'
  },
  {
    id: 10,
    domain: 'Assessment Methodologies',
    question: '¿Cuál es el valor del TTL en respuestas ICMP habituales que entrega una máquina Windows?',
    options: ['128', '64', '32', '255'],
    correctAnswer: 0,
    hint: 'Windows emplea TTL 128 por defecto.',
    explanation: 'El stack de red de Microsoft Windows utiliza un TTL inicial de 128.'
  },
  {
    id: 11,
    domain: 'Assessment Methodologies',
    question: '¿Qué herramienta de Kali Linux permite auditar debilidades de configuración en servidores web HTTPS?',
    options: ['nikto', 'aircrack-ng', 'wireshark', 'hashcat'],
    correctAnswer: 0,
    hint: 'Nikto realiza escaneos de vulnerabilidades web genéricas.',
    explanation: 'Nikto examina servidores web en busca de elementos peligrosos, archivos obsoletos y errores.'
  },
  {
    id: 12,
    domain: 'Assessment Methodologies',
    question: '¿Qué flag de Nmap deshabilita el ping previo y asume que el host objetivo está encendido?',
    options: ['-Pn', '-p-', '-sn', '-n'],
    correctAnswer: 0,
    hint: 'Esencial al escanear a través de proxies SOCKS o firewalls que bloquean ICMP.',
    explanation: '`-Pn` omite el descubrimiento de hosts y escanea directamente los puertos especificados.'
  },

  // --- DOMAIN 2: Host & Network Pentesting & Pivoting (18 Preguntas) ---
  {
    id: 13,
    domain: 'Host & Network Pentesting',
    question: '¿Cuál es la dirección IP de la interfaz interna eth1 descubierta en la máquina pasarela 172.16.50.100?',
    options: ['10.20.30.1', '192.168.1.1', '10.0.0.1', '172.16.50.1'],
    correctAnswer: 0,
    hint: 'Ejecuta `ip a` en 172.16.50.100 tras autenticarte con routeradm.',
    explanation: 'La interfaz eth1 del gateway FinTech está configurada con 10.20.30.1/24.'
  },
  {
    id: 14,
    domain: 'Host & Network Pentesting',
    question: '¿Cuál es el CIDR de la subred bancaria interna aislada protegida tras la pasarela?',
    options: ['10.20.30.0/24', '192.168.100.0/24', '10.10.10.0/24', '172.20.0.0/16'],
    correctAnswer: 0,
    hint: 'Revisa la tabla de enrutamiento con `ip route`.',
    explanation: 'La subred de sucursal bancaria es 10.20.30.0/24.'
  },
  {
    id: 15,
    domain: 'Host & Network Pentesting',
    question: '¿Qué credenciales válidas se obtienen para el usuario routeradm en la máquina pasarela?',
    options: ['routeradm : FinTechTunnel#2024', 'admin : admin', 'root : toor', 'cisco : cisco'],
    correctAnswer: 0,
    hint: 'Las credenciales están documentadas en el archivo de configuración del router.',
    explanation: 'El acceso SSH al gateway utiliza routeradm:FinTechTunnel#2024.'
  },
  {
    id: 16,
    domain: 'Host & Network Pentesting',
    question: '¿Qué comando establece el túnel SOCKS5 dinámico hacia 172.16.50.100 en el puerto 1080?',
    options: [
      'ssh -D 1080 -N -f routeradm@172.16.50.100',
      'ssh -L 1080:10.20.30.1:80 routeradm@172.16.50.100',
      'ssh -R 1080:localhost:22 routeradm@172.16.50.100',
      'ssh -p 1080 routeradm@172.16.50.100'
    ],
    correctAnswer: 0,
    hint: 'La sintaxis estándar es `ssh -D 1080 -N -f user@ip`.',
    explanation: '`-D 1080` abre un socket SOCKS local en el puerto 1080 que enruta hacia el destino remoto.'
  },
  {
    id: 17,
    domain: 'Host & Network Pentesting',
    question: '¿Cuál es la bandera obtenida en la máquina pasarela (FLAG_FINTECH_PIVOT)?',
    options: [
      'FLAG_FINTECH_PIVOT{dual_edge_tunnel_authorized}',
      'FLAG_PIVOT{fail}',
      'FLAG_ROUTER{unauthorized}',
      'FLAG_GATEWAY{wrong}'
    ],
    correctAnswer: 0,
    isFlagQuestion: true,
    flagKey: 'flag-fintech-pivot',
    hint: 'Revisa `/etc/network/vpn_token.txt` en el gateway.',
    explanation: 'La flag en el gateway es `FLAG_FINTECH_PIVOT{dual_edge_tunnel_authorized}`.'
  },
  {
    id: 18,
    domain: 'Host & Network Pentesting',
    question: 'En la red interna 10.20.30.0/24, ¿qué host actúa como Controlador de Dominio de Active Directory?',
    options: ['10.20.30.50 (dc01.fintech.branch)', '10.20.30.75', '10.20.30.90', '10.20.30.1'],
    correctAnswer: 0,
    hint: 'El host .50 expone Kerberos (88), LDAP (389) y DNS (53).',
    explanation: '10.20.30.50 aloja los servicios esenciales de Active Directory.'
  },
  {
    id: 19,
    domain: 'Host & Network Pentesting',
    question: '¿Qué puerto TCP estándar utiliza el protocolo de autenticación Kerberos en Active Directory?',
    options: ['Puerto 88', 'Puerto 389', 'Puerto 445', 'Puerto 53'],
    correctAnswer: 0,
    hint: 'Es el puerto 88.',
    explanation: 'Kerberos KDC (Key Distribution Center) opera en el puerto 88 TCP/UDP.'
  },
  {
    id: 20,
    domain: 'Host & Network Pentesting',
    question: '¿Qué ataque contra Active Directory solicita TGS (Ticket Granting Service) de cuentas con SPN para crackear los hashes de contraseñas offline?',
    options: ['Kerberoasting', 'Pass the Hash', 'AS-REP Roasting', 'DCSync'],
    correctAnswer: 0,
    hint: 'Kerberoast solicita tickets cifrados con la clave del servicio.',
    explanation: 'Kerberoasting extrae tickets de servicio Kerberos para romper sus contraseñas mediante fuerza bruta offline.'
  },
  {
    id: 21,
    domain: 'Host & Network Pentesting',
    question: '¿Qué herramienta permite ejecutar scripts y comandos en PowerShell o cmd sobre WinRM desde Linux?',
    options: ['evil-winrm', 'impacket-psexec', 'crackmapexec', 'wmic'],
    correctAnswer: 0,
    hint: 'Evil-WinRM es la herramienta predilecta para pentesting en WinRM.',
    explanation: 'Evil-WinRM es el shell interactivo de PowerShell para Linux más utilizado en pentesting de Windows.'
  },
  {
    id: 22,
    domain: 'Host & Network Pentesting',
    question: 'En el host 10.20.30.75, ¿qué aplicación de integración continua escucha en el puerto 8080?',
    options: ['Jenkins CI', 'GitLab', 'Travis CI', 'SonarQube'],
    correctAnswer: 0,
    hint: 'El banner responde Jenkins 2.289.1.',
    explanation: '10.20.30.75 aloja un servidor Jenkins CI en el puerto 8080.'
  },
  {
    id: 23,
    domain: 'Host & Network Pentesting',
    question: '¿Qué consola en Jenkins permite ejecutar código Groovy con privilegios totales del sistema operativo?',
    options: ['Script Console (/script)', 'Build History', 'Manage Credentials', 'System Log'],
    correctAnswer: 0,
    hint: 'Accede a la URL `/script` en Jenkins.',
    explanation: 'La consola de scripts de Jenkins ejecuta código Groovy arbitrario en el servidor maestro.'
  },
  {
    id: 24,
    domain: 'Host & Network Pentesting',
    question: '¿Cuál es la bandera obtenida al comprometer el servidor Jenkins (FLAG_JENKINS_GROOVY)?',
    options: [
      'FLAG_JENKINS_GROOVY{rce_build_pipeline_compromised}',
      'FLAG_JENKINS{fail}',
      'FLAG_GROOVY{none}',
      'FLAG_CI{wrong}'
    ],
    correctAnswer: 0,
    isFlagQuestion: true,
    flagKey: 'flag-jenkins-groovy',
    hint: 'Lee `/var/lib/jenkins/flag.txt` mediante Groovy: `"cat /var/lib/jenkins/flag.txt".execute().text`.',
    explanation: 'La flag de Jenkins es `FLAG_JENKINS_GROOVY{rce_build_pipeline_compromised}`.'
  },
  {
    id: 25,
    domain: 'Host & Network Pentesting',
    question: '¿Qué puerto TCP estándar utiliza el motor de base de datos Microsoft SQL Server (MSSQL)?',
    options: ['Puerto 1433', 'Puerto 3306', 'Puerto 5432', 'Puerto 1521'],
    correctAnswer: 0,
    hint: 'MSSQL escucha en el puerto 1433 por defecto.',
    explanation: 'El puerto 1433 TCP corresponde a Microsoft SQL Server.'
  },
  {
    id: 26,
    domain: 'Host & Network Pentesting',
    question: 'En Microsoft SQL Server, ¿qué procedimiento almacenado extendido permite la ejecución de comandos del sistema operativo?',
    options: ['xp_cmdshell', 'sp_makewebtask', 'xp_dirtree', 'sp_addsrvrolemember'],
    correctAnswer: 0,
    hint: 'El procedimiento es xp_cmdshell.',
    explanation: '`xp_cmdshell` permite ejecutar comandos de Windows en el contexto de servicio de MSSQL.'
  },
  {
    id: 27,
    domain: 'Host & Network Pentesting',
    question: '¿Cuál es la contraseña del usuario `sa` (System Administrator) en el servidor MSSQL (10.20.30.90)?',
    options: ['SqlAdmin2024!', 'Password123', 'admin', 'root'],
    correctAnswer: 0,
    hint: 'Credenciales descubiertas en la configuración de la aplicación.',
    explanation: 'El acceso a MSSQL utiliza sa:SqlAdmin2024!.'
  },
  {
    id: 28,
    domain: 'Host & Network Pentesting',
    question: '¿Cuál es la bandera maestra de la bóveda bancaria en 10.20.30.90 (FLAG_FINTECH_VAULT)?',
    options: [
      'FLAG_FINTECH_VAULT{bank_ledger_decrypted_100}',
      'FLAG_VAULT{wrong}',
      'FLAG_BANK{fail}',
      'FLAG_FINAL{none}'
    ],
    correctAnswer: 0,
    isFlagQuestion: true,
    flagKey: 'flag-fintech-vault',
    hint: 'Lee `C:\\Vault\\ledger_master_flag.txt` con xp_cmdshell.',
    explanation: 'La flag maestra de la bóveda es `FLAG_FINTECH_VAULT{bank_ledger_decrypted_100}`.'
  },
  {
    id: 29,
    domain: 'Host & Network Pentesting',
    question: '¿Cuál es la bandera del Controlador de Dominio de Active Directory (FLAG_AD_DOMAIN_ROOT)?',
    options: [
      'FLAG_AD_DOMAIN_ROOT{active_directory_kerberos_pwnd}',
      'FLAG_AD{failed}',
      'FLAG_DOMAIN{wrong}',
      'FLAG_DC{none}'
    ],
    correctAnswer: 0,
    isFlagQuestion: true,
    flagKey: 'flag-ad-domain-root',
    hint: 'Encontrada en el escritorio del Administrador del DC: `C:\\Users\\Administrator\\Desktop\\domain_flag.txt`.',
    explanation: 'La flag del DC es `FLAG_AD_DOMAIN_ROOT{active_directory_kerberos_pwnd}`.'
  },
  {
    id: 30,
    domain: 'Host & Network Pentesting',
    question: '¿Qué herramienta de la suite Impacket permite interactuar y autenticarse contra Microsoft SQL Server para ejecutar xp_cmdshell?',
    options: ['mssqlclient.py', 'psexec.py', 'secretsdump.py', 'wmiexec.py'],
    correctAnswer: 0,
    hint: 'Es la utilidad mssqlclient de Impacket.',
    explanation: '`mssqlclient.py` proporciona una consola interactiva SQL y ejecución de comandos con xp_cmdshell.'
  },

  // --- DOMAIN 3: Web App Pentesting (15 Preguntas) ---
  {
    id: 31,
    domain: 'Web App Pentesting',
    question: 'En el host 172.16.50.20, ¿qué endpoint de Spring Boot Actuator expone todas las variables de entorno y claves de la aplicación?',
    options: ['/actuator/env', '/actuator/health', '/actuator/beans', '/actuator/info'],
    correctAnswer: 0,
    hint: 'El endpoint es `/actuator/env`.',
    explanation: '`/actuator/env` lista las propiedades del entorno cargadas por la aplicación.'
  },
  {
    id: 32,
    domain: 'Web App Pentesting',
    question: '¿Cuál es la bandera obtenida al inspeccionar los secretos en Spring Boot Actuator (FLAG_SPRING_LEAK)?',
    options: [
      'FLAG_SPRING_LEAK{actuator_env_dump_exposed_secrets}',
      'FLAG_SPRING{fail}',
      'FLAG_LEAK{none}',
      'FLAG_ACTUATOR{wrong}'
    ],
    correctAnswer: 0,
    isFlagQuestion: true,
    flagKey: 'flag-fintech-spring',
    hint: 'Realiza una petición a `http://172.16.50.20:8080/actuator/env`.',
    explanation: 'La flag en el endpoint es `FLAG_SPRING_LEAK{actuator_env_dump_exposed_secrets}`.'
  },
  {
    id: 33,
    domain: 'Web App Pentesting',
    question: '¿Qué endpoint de Spring Boot Actuator permite volcar la memoria de la máquina virtual de Java (JVM) para análisis de credenciales?',
    options: ['/actuator/heapdump', '/actuator/threaddump', '/actuator/dump', '/actuator/mem'],
    correctAnswer: 0,
    hint: 'El volcado de memoria se denomina heapdump.',
    explanation: '`/actuator/heapdump` descarga un volcado HPROF de la memoria JVM analizable con Eclipse MAT o strings.'
  },
  {
    id: 34,
    domain: 'Web App Pentesting',
    question: '¿Qué credencial de usuario de aplicación fue descubierta dentro de las variables de entorno de Spring Boot?',
    options: ['appuser : SpringAdmin2024!', 'root : root', 'admin : admin123', 'guest : guest'],
    correctAnswer: 0,
    hint: 'Busca las propiedades de conexión de la app.',
    explanation: 'El volcado expone la clave `SpringAdmin2024!` para `appuser`.'
  },
  {
    id: 35,
    domain: 'Web App Pentesting',
    question: 'Al montar el recurso NFS `/exports/finance` de 172.16.50.35, ¿cuál es la bandera obtenida (FLAG_NFS_ROOT)?',
    options: [
      'FLAG_NFS_ROOT{no_root_squash_privesc_expert}',
      'FLAG_NFS{fail}',
      'FLAG_ROOT{wrong}',
      'FLAG_STORAGE{none}'
    ],
    correctAnswer: 0,
    isFlagQuestion: true,
    flagKey: 'flag-fintech-nfs',
    hint: 'Monta el recurso localmente con `mount -t nfs 172.16.50.35:/exports/finance /mnt`.',
    explanation: 'La flag en el recurso montado es `FLAG_NFS_ROOT{no_root_squash_privesc_expert}`.'
  },
  {
    id: 36,
    domain: 'Web App Pentesting',
    question: '¿Qué vulnerabilidad web ocurre cuando una aplicación interpreta datos introducidos por el usuario como una plantilla dinámica en el servidor?',
    options: ['Server-Side Template Injection (SSTI)', 'Cross-Site Scripting (XSS)', 'Cross-Site Request Forgery (CSRF)', 'SQL Injection'],
    correctAnswer: 0,
    hint: 'Ocurre en motores de plantillas como Jinja2, Twig o Freemarker.',
    explanation: 'SSTI permite inyectar directivas en el motor de plantillas para ejecutar comandos en el servidor.'
  },
  {
    id: 37,
    domain: 'Web App Pentesting',
    question: '¿Qué cabecera de seguridad HTTP obliga a los navegadores a comunicarse exclusivamente mediante HTTPS durante un período determinado?',
    options: ['Strict-Transport-Security (HSTS)', 'Content-Security-Policy', 'X-Frame-Options', 'X-Content-Type-Options'],
    correctAnswer: 0,
    hint: 'La cabecera es HSTS.',
    explanation: 'HTTP Strict Transport Security (HSTS) previene ataques de reducción de protocolo (downgrade) a HTTP.'
  },
  {
    id: 38,
    domain: 'Web App Pentesting',
    question: '¿Qué mecanismo protege las peticiones sensibles de modificaciones no autorizadas forzadas desde navegadores de terceros (CSRF)?',
    options: ['Tokens anti-CSRF / SameSite Cookies', 'Cabecera Server', 'Cifrado SSLv3', 'Certificados autofirmados'],
    correctAnswer: 0,
    hint: 'Tokens impredecibles asociados a la sesión del usuario.',
    explanation: 'Tokens CSRF y cookies con flag `SameSite=Strict/Lax` mitigan ataques CSRF.'
  },
  {
    id: 39,
    domain: 'Web App Pentesting',
    question: '¿Qué tipo de ataque SQL Injection extrae información haciendo que la base de datos pause su respuesta durante un tiempo determinado (ej: sleep/waitfor)?',
    options: ['Time-Based Blind SQLi', 'Error-Based SQLi', 'UNION Based SQLi', 'Out-of-Band SQLi'],
    correctAnswer: 0,
    hint: 'Se basa en retrasos temporales inducidos.',
    explanation: 'La inyección SQL ciega basada en tiempo evalúa condiciones lógicas mediante pausas de ejecución.'
  },
  {
    id: 40,
    domain: 'Web App Pentesting',
    question: '¿Qué cabecera HTTP previene que una página web sea embebida en un frame o iframe, mitigando ataques de Clickjacking?',
    options: ['X-Frame-Options: DENY / SAMEORIGIN', 'X-XSS-Protection: 1', 'Content-Encoding: gzip', 'Cache-Control: no-cache'],
    correctAnswer: 0,
    hint: 'Protege contra la inserción en marcos visuales.',
    explanation: '`X-Frame-Options` o CSP `frame-ancestors` impiden que el sitio se cargue en iframes externos.'
  },
  {
    id: 41,
    domain: 'Web App Pentesting',
    question: '¿Qué código de estado HTTP representa un redireccionamiento temporal?',
    options: ['302 Found', '200 OK', '404 Not Found', '503 Service Unavailable'],
    correctAnswer: 0,
    hint: '301 es permanente, 302 es temporal.',
    explanation: 'HTTP 302 Found redirige temporalmente al cliente a otra ubicación URI.'
  },
  {
    id: 42,
    domain: 'Web App Pentesting',
    question: '¿Qué atributo de cookie impide que el código JavaScript del lado del cliente pueda leer el valor de una cookie de sesión (mitigando robo por XSS)?',
    options: ['HttpOnly', 'Secure', 'Path', 'Domain'],
    correctAnswer: 0,
    hint: 'La flag es HttpOnly.',
    explanation: 'El flag `HttpOnly` bloquea el acceso a `document.cookie` desde scripts de JavaScript.'
  },
  {
    id: 43,
    domain: 'Web App Pentesting',
    question: '¿Qué método de autenticación moderna en aplicaciones web transmite la identidad en un token estructurado en base64 con tres partes separadas por puntos?',
    options: ['JSON Web Token (JWT)', 'Basic Auth', 'NTLM', 'Digest Auth'],
    correctAnswer: 0,
    hint: 'Consta de Header.Payload.Signature.',
    explanation: 'JWT (JSON Web Token) codifica información de sesión y firma digital en un token compacto.'
  },
  {
    id: 44,
    domain: 'Web App Pentesting',
    question: '¿Cuál es la función principal de la cabecera Content-Security-Policy (CSP)?',
    options: [
      'Restringir los orígenes de recursos (scripts, estilos, imágenes) que el navegador puede cargar',
      'Definir la compresión de datos del servidor',
      'Configurar la dirección IP del servidor proxy',
      'Establecer el tiempo de expiración de la sesión'
    ],
    correctAnswer: 0,
    hint: 'Mitiga XSS restringiendo fuentes de scripts autorizados.',
    explanation: 'CSP declara qué dominios y fuentes de contenido son de confianza para el navegador.'
  },
  {
    id: 45,
    domain: 'Web App Pentesting',
    question: 'En auditorías web, ¿qué herramienta de proxy de interceptación local es el estándar de la industria para modificar peticiones HTTP en tránsito?',
    options: ['Burp Suite / OWASP ZAP', 'Hydra', 'John the Ripper', 'Nmap'],
    correctAnswer: 0,
    hint: 'Burp Suite es el proxy de interceptación líder.',
    explanation: 'Burp Suite y OWASP ZAP permiten interceptar, inspeccionar y manipular tráfico HTTP/HTTPS en tiempo real.'
  }
];

export const LAB_FINTECH: LabDefinition = {
  id: 'lab-fintech',
  name: 'Laboratorio 2: Red Financiera FinTech Secure',
  codeName: 'FINTECH-EJPT',
  description: 'Topología segregada de alta seguridad con DMZ pública y sucursal bancaria interna. Incluye APIs Spring Boot Actuator, almacenamiento NFS sin squash, Active Directory Domain Controller con Kerberos, Jenkins CI/CD con Groovy y Microsoft SQL Server con xp_cmdshell.',
  difficulty: 'Avanzado (eJPT + Pivoting Complejo)',
  attackerIp: '172.16.50.10',
  dmzSubnet: '172.16.50.0/24',
  internalSubnet: '10.20.30.0/24',
  pivotGatewayIp: '172.16.50.100',
  hosts: LAB2_HOSTS,
  questions: LAB2_QUESTIONS_45,
  instructions: 'Comienza en tun0 (172.16.50.10). Explora la subred 172.16.50.0/24, compromete la pasarela 172.16.50.100 (routeradm:FinTechTunnel#2024), enruta hacia 10.20.30.0/24 y audita Active Directory, Jenkins y MSSQL.'
};
