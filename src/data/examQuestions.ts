import { ExamQuestion } from '../types/simulator';

export const EXAM_QUESTIONS: ExamQuestion[] = [
  // --- DOMAIN 1: Assessment Methodologies (Recon, Footprinting, Scanning) - 10 Preguntas ---
  {
    id: 1,
    domain: 'Assessment Methodologies',
    question: '¿Cuál es el rango de red CIDR asignado inicialmente en la interfaz tun0 para comenzar la auditoría perimetral (DMZ)?',
    options: [
      '10.10.10.0/24',
      '192.168.100.0/24',
      '172.16.50.0/24',
      '192.168.1.0/24'
    ],
    correctAnswer: 1,
    hint: 'Ejecuta `ip a` o `ifconfig tun0` en Kali Linux para verificar tu dirección IP y máscara de red.',
    explanation: 'La interfaz tun0 de la máquina atacante está conectada a la subred DMZ 192.168.100.0/24 con IP 192.168.100.10/24.'
  },
  {
    id: 2,
    domain: 'Assessment Methodologies',
    question: '¿Cuántos hosts activos (vivos) responden al barrido de red (sweep) en la subred 192.168.100.0/24 (excluyendo la máquina atacante)?',
    options: [
      '2 hosts',
      '3 hosts',
      '5 hosts',
      '7 hosts'
    ],
    correctAnswer: 1,
    hint: 'Usa `netdiscover -r 192.168.100.0/24` o `nmap -sn 192.168.100.0/24` para enumerar las máquinas activas en la DMZ.',
    explanation: 'Se descubren 3 hosts activos en la DMZ: 192.168.100.50, 192.168.100.55 y 192.168.100.60.'
  },
  {
    id: 3,
    domain: 'Assessment Methodologies',
    question: '¿Qué versión exacta del servidor web Apache se encuentra en ejecución en el host 192.168.100.50?',
    options: [
      'Apache/2.4.29',
      'Apache/2.4.41',
      'Apache/2.2.15',
      'nginx/1.18.0'
    ],
    correctAnswer: 1,
    hint: 'Usa `nmap -sV -p 80 192.168.100.50` o `curl -I http://192.168.100.50` para examinar la cabecera Server.',
    explanation: 'Nmap reporta el servicio como Apache httpd 2.4.41 ((Ubuntu)) en el puerto 80 TCP.'
  },
  {
    id: 4,
    domain: 'Assessment Methodologies',
    question: 'En el objetivo 192.168.100.55, ¿qué software y versión responde en el puerto 21/TCP?',
    options: [
      'ProFTPD 1.3.5',
      'Pure-FTPd 1.0.49',
      'vsftpd 3.0.3',
      'FileZilla Server 0.9.41'
    ],
    correctAnswer: 2,
    hint: 'Usa `nmap -sV -p 21 192.168.100.55` o conéctate con `ftp 192.168.100.55` para ver el banner.',
    explanation: 'El servicio expuesto es vsftpd versión 3.0.3, el cual permite inicio de sesión con usuario anonymous.'
  },
  {
    id: 5,
    domain: 'Assessment Methodologies',
    question: '¿Permite el servidor FTP en 192.168.100.55 el inicio de sesión anónimo (anonymous)?',
    options: [
      'No, requiere usuario y contraseña válidos obligatoriamente',
      'Sí, permite autenticación anónima y lectura de archivos compartidos',
      'Solo permite acceso anónimo en modo seguro FTPS',
      'El servicio está deshabilitado por el cortafuegos'
    ],
    correctAnswer: 1,
    hint: 'Ejecuta `nmap --script=ftp-anon -p 21 192.168.100.55` o `ftp 192.168.100.55` con usuario "anonymous" y contraseña vacía.',
    explanation: 'El script de nmap ftp-anon confirma: "Anonymous FTP login allowed (FTP code 230)".'
  },
  {
    id: 6,
    domain: 'Assessment Methodologies',
    question: 'Al enumerar recursos compartidos SMB en 192.168.100.60 mediante sesión nula, ¿qué recurso compartido (Sharename) se encuentra expuesto?',
    options: [
      'IPC$',
      'public',
      'admin$',
      'backups'
    ],
    correctAnswer: 1,
    hint: 'Ejecuta `smbclient -L //192.168.100.60 -N` o `enum4linux -S 192.168.100.60`.',
    explanation: 'El recurso "public" tiene permisos de lectura anónima y contiene scripts de mantenimiento con credenciales.'
  },
  {
    id: 7,
    domain: 'Assessment Methodologies',
    question: '¿Qué herramienta de enumeración web revela directorios ocultos como /admin y /blog en 192.168.100.50?',
    options: [
      'gobuster o dirb con diccionario common.txt',
      'wireshark',
      'aircrack-ng',
      'dnsenum'
    ],
    correctAnswer: 0,
    hint: 'Ejecuta `gobuster dir -u http://192.168.100.50 -w /usr/share/wordlists/dirb/common.txt`.',
    explanation: 'Gobuster o dirb realizan fuerza bruta de directorios HTTP revelando códigos de respuesta 200/301.'
  },
  {
    id: 8,
    domain: 'Assessment Methodologies',
    question: '¿Qué valor de TTL (Time to Live) devuelve el comando ping hacia 192.168.100.50, indicando que el sistema operativo es GNU/Linux?',
    options: [
      'TTL = 32',
      'TTL = 64',
      'TTL = 128',
      'TTL = 255'
    ],
    correctAnswer: 1,
    hint: 'Ejecuta `ping -c 1 192.168.100.50`. Recuerda que Linux típicamente usa TTL=64 y Windows TTL=128.',
    explanation: 'Linux por defecto envía paquetes ICMP con TTL 64, mientras que Windows utiliza TTL 128.'
  },
  {
    id: 9,
    domain: 'Assessment Methodologies',
    question: 'Al escanear un objetivo a través de un proxy SOCKS (pivoting) con proxychains y nmap, ¿cuál es la técnica de escaneo TCP recomendada?',
    options: [
      'SYN Stealth Scan (-sS)',
      'TCP Connect Scan (-sT -Pn)',
      'UDP Scan (-sU)',
      'FIN Scan (-sF)'
    ],
    correctAnswer: 1,
    hint: 'Los proxies SOCKS no admiten el envío de paquetes raw (crudos) como SYN sin establecer la conexión completa.',
    explanation: 'Al rutear a través de un proxy SOCKS4/5, se debe usar TCP Connect scan (-sT) y desactivar ping (-Pn) porque los proxies de capa de aplicación completan el handshake 3-way TCP.'
  },
  {
    id: 10,
    domain: 'Assessment Methodologies',
    question: '¿Qué puerto TCP se encuentra filtrado o bloqueado al público en el host 192.168.100.50?',
    options: [
      'Puerto 22',
      'Puerto 80',
      'Puerto 3306 (MySQL)',
      'Puerto 8080'
    ],
    correctAnswer: 2,
    hint: 'Revisa la salida de `nmap -p- 192.168.100.50`. El servicio de base de datos no está accesible directamente desde la DMZ.',
    explanation: 'El puerto 3306/tcp aparece como "filtered" o solo accesible desde localhost en 192.168.100.50.'
  },

  // --- DOMAIN 2: Host & Network Penetration Testing (System, Privesc & Pivoting) - 13 Preguntas ---
  {
    id: 11,
    domain: 'Host & Network Pentesting',
    question: 'Al comprometer u obtener acceso al host 192.168.100.60, ¿cuál es la dirección IP de la segunda interfaz de red (eth1 / ens4) que conecta a la red interna?',
    options: [
      '10.10.10.1',
      '172.16.0.1',
      '192.168.200.1',
      '10.0.2.15'
    ],
    correctAnswer: 0,
    hint: 'Inicia sesión como `pivotuser` en 192.168.100.60 y ejecuta `ip a` o `ip route`.',
    explanation: 'La interfaz eth1 de 192.168.100.60 está configurada con la IP 10.10.10.1/24, actuando como pasarela (gateway) a la subred interna.'
  },
  {
    id: 12,
    domain: 'Host & Network Pentesting',
    question: '¿Cuál es el bloque de red (CIDR) de la subred interna oculta accesible únicamente a través del pivot?',
    options: [
      '192.168.1.0/24',
      '10.10.10.0/24',
      '172.20.10.0/24',
      '10.0.0.0/8'
    ],
    correctAnswer: 1,
    hint: 'Verifica la tabla de enrutamiento con `ip route` en la máquina gateway.',
    explanation: 'El enrutamiento local muestra la red 10.10.10.0/24 vinculada a la interfaz interna eth1.'
  },
  {
    id: 13,
    domain: 'Host & Network Pentesting',
    question: '¿Qué comando de SSH permite crear un proxy dinámico SOCKS5 en el puerto 1080 apuntando al host pivot?',
    options: [
      'ssh -R 1080:localhost:80 pivotuser@192.168.100.60',
      'ssh -L 1080:10.10.10.1:80 pivotuser@192.168.100.60',
      'ssh -D 1080 -N -f pivotuser@192.168.100.60',
      'ssh -p 1080 pivotuser@192.168.100.60'
    ],
    correctAnswer: 2,
    hint: 'La opción `-D <puerto>` establece Dynamic Port Forwarding (proxy SOCKS), `-N` no ejecuta comandos remotos y `-f` lo pasa a segundo plano.',
    explanation: '`ssh -D 1080` levanta un listener SOCKS en la máquina local que puede ser consumido por /etc/proxychains.conf.'
  },
  {
    id: 14,
    domain: 'Host & Network Pentesting',
    question: 'En Metasploit Framework, ¿qué comando o módulo de post-explotación añade una ruta a la tabla de enrutamiento interna de MSF?',
    options: [
      'run autoroute -s 10.10.10.0/24',
      'route add default 10.10.10.1',
      'use post/windows/gather/enum_routes',
      'pivot-enable 10.10.10.0'
    ],
    correctAnswer: 0,
    hint: 'Dentro de una sesión de Meterpreter activa en el pivot, usa `run autoroute -s ...`.',
    explanation: 'El módulo `autoroute` (o post/multi/manage/autoroute) redirige todo el tráfico de módulos de Metasploit hacia la subred 10.10.10.0/24 a través de la sesión de meterpreter.'
  },
  {
    id: 15,
    domain: 'Host & Network Pentesting',
    question: '¿Qué archivo de configuración en Kali Linux debe modificarse o verificarse para especificar el puerto 1080 del túnel SOCKS?',
    options: [
      '/etc/network/interfaces',
      '/etc/proxychains4.conf',
      '/etc/ssh/sshd_config',
      '/etc/hosts'
    ],
    correctAnswer: 1,
    hint: 'Es el archivo que lee la utilidad proxychains al anteponerla a cualquier herramienta (ej: proxychains nmap).',
    explanation: 'En `/etc/proxychains4.conf`, la última línea debe indicar `socks5 127.0.0.1 1080` (o socks4).'
  },
  {
    id: 16,
    domain: 'Host & Network Pentesting',
    question: 'Una vez establecido el pivoting hacia 10.10.10.0/24, ¿cuántos hosts activos se detectan en dicha red interna?',
    options: [
      '1 host',
      '3 hosts (10.10.10.20, 10.10.10.25, 10.10.10.30)',
      '6 hosts',
      '10 hosts'
    ],
    correctAnswer: 1,
    hint: 'Usa `proxychains nmap -sT -Pn -F 10.10.10.20,25,30` para verificar la existencia de los hosts.',
    explanation: 'La red interna contiene 3 hosts objetivos: el servidor de bases de datos .20, el servidor Windows .25 y la bóveda .30.'
  },
  {
    id: 17,
    domain: 'Host & Network Pentesting',
    question: '¿Qué sistema operativo está instalado en el host interno 10.10.10.25 según los puertos MSRPC (135) y SMB (445)?',
    options: [
      'Ubuntu Linux 22.04',
      'Windows Server 2019 Standard',
      'CentOS Linux 7',
      'FreeBSD 13'
    ],
    correctAnswer: 1,
    hint: 'Usa `proxychains nmap -sT -sV -p 135,445 10.10.10.25` o `proxychains smbclient -L //10.10.10.25 -N`.',
    explanation: 'El escaneo de SMB y MSRPC revela Windows Server 2019 (Build 17763).'
  },
  {
    id: 18,
    domain: 'Host & Network Pentesting',
    question: '¿Cuál es la contraseña válida recuperada para el usuario `mike` en el host 192.168.100.55?',
    options: [
      'admin123',
      'password123',
      'hunter2',
      'mike2024'
    ],
    correctAnswer: 1,
    hint: 'Usa `hydra -l mike -P /usr/share/wordlists/rockyou.txt ssh://192.168.100.55` o revisa las notas de FTP.',
    explanation: 'El ataque de fuerza bruta o la nota encontrada en FTP confirma las credenciales mike:password123.'
  },
  {
    id: 19,
    domain: 'Host & Network Pentesting',
    question: 'En el host 192.168.100.50, ¿qué binario con bit SUID o permiso sudo permite escalar privilegios a root?',
    options: [
      '/usr/bin/find',
      '/usr/bin/vim',
      '/bin/bash',
      '/usr/bin/python3'
    ],
    correctAnswer: 0,
    hint: 'Ejecuta `find / -perm -u=s -type f 2>/dev/null` o `sudo -l` una vez conectado como sysadmin.',
    explanation: 'El binario `/usr/bin/find` con permisos sudo o SUID permite ejecutar comandos como root mediante `find . -exec /bin/sh -p \\; -quit` (técnica GTFOBins).'
  },
  {
    id: 20,
    domain: 'Host & Network Pentesting',
    question: '¿Cuál es el valor exacto de la bandera encontrada en la máquina gateway (FLAG_PIVOT_GATEWAY)?',
    options: [
      'FLAG_PIVOT_GATEWAY{dual_h0med_r0ute_unl0cked}',
      'FLAG_GATEWAY{route_pivot_fail}',
      'FLAG_INTERNAL{pivot_10_10_10}',
      'FLAG_ROOT{not_the_pivot_flag}'
    ],
    correctAnswer: 0,
    isFlagQuestion: true,
    flagKey: 'flag-dmz-gateway',
    hint: 'Busca en `/home/pivotuser/flag.txt` en el host 192.168.100.60 tras iniciar sesión con pivotuser.',
    explanation: 'La flag en /home/pivotuser/flag.txt es `FLAG_PIVOT_GATEWAY{dual_h0med_r0ute_unl0cked}`.'
  },
  {
    id: 21,
    domain: 'Host & Network Pentesting',
    question: '¿Qué módulo de Metasploit permite obtener una sesión interactiva como SYSTEM en Windows (10.10.10.25) utilizando credenciales válidas de administrador sobre SMB?',
    options: [
      'exploit/windows/smb/psexec',
      'exploit/multi/handler',
      'auxiliary/scanner/portscan/tcp',
      'exploit/unix/ftp/vsftpd_234_backdoor'
    ],
    correctAnswer: 0,
    hint: 'El clásico psexec de Metasploit carga un servicio remoto autenticado en Windows a través del puerto 445.',
    explanation: '`exploit/windows/smb/psexec` se autentica en SMB y despliega un payload meterpreter con privilegios NT AUTHORITY\\SYSTEM.'
  },
  {
    id: 22,
    domain: 'Host & Network Pentesting',
    question: '¿Qué nivel de privilegios devuelve el comando `getuid` en Meterpreter al explotar con éxito el host Windows 10.10.10.25?',
    options: [
      'NT AUTHORITY\\SYSTEM',
      'target-win-05\\Guest',
      'target-win-05\\itadmin',
      'NT AUTHORITY\\LOCAL SERVICE'
    ],
    correctAnswer: 0,
    hint: 'Psexec crea un servicio del sistema en Windows que ejecuta el payload como la máxima autoridad.',
    explanation: 'Al ejecutarse como servicio de Windows, psexec eleva la sesión directamente a NT AUTHORITY\\SYSTEM.'
  },
  {
    id: 23,
    domain: 'Host & Network Pentesting',
    question: '¿Cuál es la bandera ubicada en el escritorio del Administrador de 10.10.10.25 (C:\\Users\\Administrator\\Desktop\\flag.txt)?',
    options: [
      'FLAG_WIN_SYSTEM{w1nd0ws_psexec_system_cr4cked}',
      'FLAG_WIN_SYSTEM{admin_not_found}',
      'FLAG_DOMAIN{eternalblue_win2019}',
      'FLAG_METERPRETER{system_token_stolen}'
    ],
    correctAnswer: 0,
    isFlagQuestion: true,
    flagKey: 'flag-internal-win',
    hint: 'Usa `type C:\\Users\\Administrator\\Desktop\\flag.txt` o `cat /root/flag.txt` a través de meterpreter/psexec.',
    explanation: 'La flag en el escritorio del Administrador de Windows es `FLAG_WIN_SYSTEM{w1nd0ws_psexec_system_cr4cked}`.'
  },

  // --- DOMAIN 3: Web Application Penetration Testing (LFI, SQLi, Auth, BadBlue) - 12 Preguntas ---
  {
    id: 24,
    domain: 'Web App Pentesting',
    question: 'En el sitio web de 192.168.100.50, ¿qué tipo de vulnerabilidad crítica existe en el parámetro `page` de `/blog/view.php?page=...`?',
    options: [
      'Cross-Site Scripting (XSS) reflejado',
      'Local File Inclusion (LFI) / Directory Traversal',
      'Inyección de comandos ciega (Blind OS Command Injection)',
      'Cross-Site Request Forgery (CSRF)'
    ],
    correctAnswer: 1,
    hint: 'Prueba pasar secuencias `../../../../etc/passwd` al parámetro page.',
    explanation: 'El script PHP concatena el parámetro `page` sin sanitizar a una llamada `include()`, permitiendo Local File Inclusion (LFI).'
  },
  {
    id: 25,
    domain: 'Web App Pentesting',
    question: 'Al explotar el LFI en 192.168.100.50, ¿qué archivo del sistema permite descubrir qué usuarios tienen una shell interactiva (/bin/bash)?',
    options: [
      '/etc/passwd',
      '/etc/shadow',
      '/etc/fstab',
      '/var/log/apache2/access.log'
    ],
    correctAnswer: 0,
    hint: 'Es el archivo legible por todo usuario en Unix que contiene usuarios y shells por defecto.',
    explanation: '`/etc/passwd` es legible por www-data y muestra al usuario `sysadmin` con shell `/bin/bash`.'
  },
  {
    id: 26,
    domain: 'Web App Pentesting',
    question: 'A través de LFI o backup en `/var/backups/db_config.php.bak`, ¿qué contraseña fue descubierta para el usuario `sysadmin`?',
    options: [
      'admin123',
      'P@ssw0rd2024!',
      'roottoor',
      'welcome123'
    ],
    correctAnswer: 1,
    hint: 'Usa `curl http://192.168.100.50/blog/view.php?page=../../../../var/backups/db_config.php.bak`.',
    explanation: 'El archivo de respaldo PHP contenía las credenciales comentadas: `user=sysadmin, pass=P@ssw0rd2024!`, reutilizadas también en SSH.'
  },
  {
    id: 27,
    domain: 'Web App Pentesting',
    question: '¿Cuál es la bandera obtenida al escalar privilegios en el servidor web (FLAG_DMZ_WEB)?',
    options: [
      'FLAG_DMZ_WEB{lfi_2_pr1v_esc_success}',
      'FLAG_WEB{apache_compromised}',
      'FLAG_DMZ{php_reverse_shell_ok}',
      'FLAG_ROOT{not_this_one}'
    ],
    correctAnswer: 0,
    isFlagQuestion: true,
    flagKey: 'flag-dmz-web',
    hint: 'Encuentra el archivo `/root/flag.txt` en 192.168.100.50 tras escalar privilegios con find.',
    explanation: 'La flag en `/root/flag.txt` de 192.168.100.50 es `FLAG_DMZ_WEB{lfi_2_pr1v_esc_success}`.'
  },
  {
    id: 28,
    domain: 'Web App Pentesting',
    question: 'En la red interna, el servidor 10.10.10.20 tiene una API en `/api/employees?id=1`. ¿Qué técnica de explotación permite extraer los registros de la base de datos?',
    options: [
      'SQL Injection basada en UNION o booleana',
      'Inyección LDAP',
      'Subida de archivos maliciosos',
      'Server-Side Template Injection (SSTI)'
    ],
    correctAnswer: 0,
    hint: 'Prueba inyectar una comilla simple (`\'`) o usar `proxychains sqlmap -u "http://10.10.10.20/api/employees?id=1"`.',
    explanation: 'El parámetro `id` es vulnerable a SQL Injection clásico basado en error y UNION SELECT.'
  },
  {
    id: 29,
    domain: 'Web App Pentesting',
    question: '¿Qué motor y versión de Base de Datos está detrás de la API en 10.10.10.20 según la respuesta de SQL injection o escaneo?',
    options: [
      'PostgreSQL 14.1',
      'MySQL 5.7.35',
      'Microsoft SQL Server 2016',
      'SQLite 3'
    ],
    correctAnswer: 1,
    hint: 'Usa `sqlmap` o la función `SELECT @@version;` en la inyección.',
    explanation: 'El motor responde: `5.7.35-log MySQL Community Server`.'
  },
  {
    id: 30,
    domain: 'Web App Pentesting',
    question: '¿Cuál es el nombre de la base de datos corporativa interna encontrada en 10.10.10.20 que contiene las credenciales administrativas?',
    options: [
      'corp_internal',
      'wordpress_db',
      'production_sales',
      'ejpt_testing'
    ],
    correctAnswer: 0,
    hint: 'Usa `proxychains sqlmap -u "http://10.10.10.20/api/employees?id=1" --dbs`.',
    explanation: 'El volcado de bases de datos revela `information_schema` y la base de datos de producción `corp_internal`.'
  },
  {
    id: 31,
    domain: 'Web App Pentesting',
    question: '¿Cuál es el valor de la bandera almacenada en la tabla `system_secrets` de la base de datos `corp_internal`?',
    options: [
      'FLAG_INTERNAL_SQL{sql_injecti0n_pivot_d0ne}',
      'FLAG_SQL{dump_all_databases}',
      'FLAG_DB{mysql_priv_leak}',
      'FLAG_SECRET{internal_api_compromised}'
    ],
    correctAnswer: 0,
    isFlagQuestion: true,
    flagKey: 'flag-internal-sql',
    hint: 'Vuelca la tabla system_secrets con sqlmap: `--dump -D corp_internal -T system_secrets`.',
    explanation: 'El contenido del registro es `FLAG_INTERNAL_SQL{sql_injecti0n_pivot_d0ne}`.'
  },
  {
    id: 32,
    domain: 'Web App Pentesting',
    question: 'La tabla `corp_internal.users` almacena las contraseñas en formato hash. ¿Qué algoritmo de cifrado o hash se utilizó?',
    options: [
      'MD5 (32 caracteres hexadecimales)',
      'bcrypt ($2a$)',
      'Argon2id',
      'SHA-512 crypt ($6$)'
    ],
    correctAnswer: 0,
    hint: 'Observa la longitud del hash (ej: `5f4dcc3b5aa765d61d8327deb882cf99`). 32 caracteres hexadecimales = 128 bits.',
    explanation: 'El hash almacenado tiene 32 caracteres hexadecimales correspondientes al algoritmo MD5 sin salt.'
  },
  {
    id: 33,
    domain: 'Web App Pentesting',
    question: 'Al crackear el hash del usuario `itadmin` obtenido de la base de datos interna mediante john o hashcat, ¿qué contraseña en texto plano se obtiene?',
    options: [
      'P@ssw0rd2024!',
      'qwerty12345',
      'administrator',
      'ilovepizza'
    ],
    correctAnswer: 0,
    hint: 'Usa `john --format=raw-md5 --wordlist=/usr/share/wordlists/rockyou.txt hash.txt` o `hashcat -m 0`.',
    explanation: 'El hash MD5 corresponde a la contraseña `P@ssw0rd2024!`, reutilizada en los sistemas Windows de la red interna.'
  },
  {
    id: 34,
    domain: 'Web App Pentesting',
    question: 'En el host 10.10.10.30, ¿qué software vulnerable a desbordamiento de búfer está alojado en el puerto 80?',
    options: [
      'BadBlue 2.7',
      'Easy File Sharing Web Server 7.2',
      'Apache Tomcat 8.5',
      'IIS 10.0'
    ],
    correctAnswer: 0,
    hint: 'Ejecuta `proxychains curl -I http://10.10.10.30` o `proxychains nmap -sV -p 80 10.10.10.30`.',
    explanation: 'El servidor HTTP responde con la cabecera Server: BadBlue/2.7, conocido servicio vulnerable al exploit `windows/http/badblue_ext_overflow`.'
  },
  {
    id: 35,
    domain: 'Web App Pentesting',
    question: '¿Cuál es la bandera final de la bóveda (Master Flag) encontrada en 10.10.10.30 (C:\\Vault\\master_flag.txt)?',
    options: [
      'FLAG_VAULT_FINAL{ejptv2_master_penetration_tester}',
      'FLAG_VAULT{the_end_of_exam}',
      'FLAG_FINAL{congratulations_ejpt}',
      'FLAG_CERT{certified_junior_penetration_tester}'
    ],
    correctAnswer: 0,
    isFlagQuestion: true,
    flagKey: 'flag-internal-vault',
    hint: 'Accede a la máquina 10.10.10.30 y lee el archivo `C:\\Vault\\master_flag.txt`.',
    explanation: 'La flag definitiva de la bóveda es `FLAG_VAULT_FINAL{ejptv2_master_penetration_tester}`.'
  }
];
