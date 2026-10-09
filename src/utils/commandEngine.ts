import { NetworkHost, PivotingState, TerminalOutputLine } from '../types/simulator';
import { getMetasploitModule, METASPLOIT_MODULES, POPULAR_PAYLOADS } from '../data/metasploitModules';

export const SESSION_STORAGE_HISTORY_KEY = 'terminal_cmd_history';

export const DEFAULT_INITIAL_HISTORY = [
  'ejpt-help',
  'ip a',
  'netdiscover -r 192.168.100.0/24'
];

/**
 * Retrieves the stored command history from sessionStorage.
 * Falls back to default initial commands if empty or unavailable.
 */
export function getCommandHistory(): string[] {
  if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') {
    return [...DEFAULT_INITIAL_HISTORY];
  }
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_HISTORY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to parse command history from sessionStorage', err);
  }
  return [...DEFAULT_INITIAL_HISTORY];
}

/**
 * Saves a new command to sessionStorage history.
 * Avoids storing immediate duplicate commands and limits total size to 150 items.
 */
export function addCommandToHistory(command: string): string[] {
  const trimmed = command.trim();
  if (!trimmed) return getCommandHistory();

  const currentHistory = getCommandHistory();
  // Don't duplicate consecutive identical commands
  if (currentHistory.length > 0 && currentHistory[currentHistory.length - 1] === trimmed) {
    return currentHistory;
  }

  const updated = [...currentHistory, trimmed].slice(-150);
  try {
    if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(SESSION_STORAGE_HISTORY_KEY, JSON.stringify(updated));
    }
  } catch (err) {
    console.warn('Failed to save command history to sessionStorage', err);
  }
  return updated;
}

/**
 * Clears command history in sessionStorage.
 */
export function clearCommandHistory(): void {
  try {
    if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(SESSION_STORAGE_HISTORY_KEY);
    }
  } catch (err) {}
}

/**
 * Calculates the next history navigation state when pressing ArrowUp or ArrowDown.
 * - ArrowUp: Moves backward towards older commands (decrementing index), starting from history.length - 1.
 * - ArrowDown: Moves forward towards newer commands. When passing the newest command, restores the draft.
 */
export function navigateHistory(
  history: string[],
  currentIndex: number,
  direction: 'up' | 'down',
  currentDraft: string
): { nextIndex: number; value: string } {
  // Always synchronize with latest sessionStorage if history is empty
  const activeList = history && history.length > 0 ? history : getCommandHistory();
  if (!activeList || activeList.length === 0) {
    return { nextIndex: -1, value: currentDraft };
  }

  if (direction === 'up') {
    if (currentIndex === -1) {
      // First up-arrow press: jump to the latest command in history
      const nextIdx = activeList.length - 1;
      return { nextIndex: nextIdx, value: activeList[nextIdx] || '' };
    }
    // Already navigating: move to an older command (decrement index down to 0)
    const nextIdx = Math.max(0, currentIndex - 1);
    return { nextIndex: nextIdx, value: activeList[nextIdx] || '' };
  }

  if (direction === 'down') {
    if (currentIndex === -1) {
      // Not navigating history, do nothing and keep current draft intact
      return { nextIndex: -1, value: currentDraft };
    }
    const nextIdx = currentIndex + 1;
    if (nextIdx >= activeList.length) {
      // Returned past the newest command of history: restore user draft
      return { nextIndex: -1, value: currentDraft };
    }
    return { nextIndex: nextIdx, value: activeList[nextIdx] || '' };
  }

  return { nextIndex: currentIndex, value: currentDraft };
}

export const DEFAULT_PIVOTING_STATE: PivotingState = {
  isPivoted: false,
  method: 'none',
  proxyPort: 1080,
  routedSubnet: ''
};

export const LOCAL_STORAGE_PIVOTING_KEY_PREFIX = 'ejpt_pivoting_';

/**
 * Retrieves the saved PivotingState for a given lab from localStorage.
 * Restores SOCKS5 port, routing subnets, and active session across browser reloads.
 */
export function getSavedPivotingState(labId: string = 'corpnet'): PivotingState {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return { ...DEFAULT_PIVOTING_STATE };
  }
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_PIVOTING_KEY_PREFIX}${labId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.isPivoted === 'boolean') {
        return {
          isPivoted: parsed.isPivoted,
          method: parsed.method || 'none',
          proxyPort: parsed.proxyPort || 1080,
          routedSubnet: parsed.routedSubnet || '',
          activeSession: parsed.activeSession
        };
      }
    }
  } catch (err) {
    console.warn('Failed to parse pivoting state from localStorage', err);
  }
  return { ...DEFAULT_PIVOTING_STATE };
}

/**
 * Saves the current PivotingState for a given lab to localStorage.
 */
export function savePivotingState(labId: string = 'corpnet', state: PivotingState): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(`${LOCAL_STORAGE_PIVOTING_KEY_PREFIX}${labId}`, JSON.stringify(state));
  } catch (err) {
    console.warn('Failed to save pivoting state to localStorage', err);
  }
}

/**
 * Clears the saved PivotingState for a given lab in localStorage.
 */
export function clearSavedPivotingState(labId: string = 'corpnet'): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return;
  }
  try {
    localStorage.removeItem(`${LOCAL_STORAGE_PIVOTING_KEY_PREFIX}${labId}`);
  } catch (err) {}
}

export interface CommandContext {
  labId?: string;
  shellMode: 'kali' | 'ssh_target50' | 'ssh_target50_root' | 'ssh_target55' | 'ssh_target55_root' | 'ssh_target60' | 'ssh_target60_root' | 'ssh_fintech100' | 'ssh_fintech100_root' | 'msf' | 'meterpreter' | 'win_cmd';
  currentPath: string;
  msfModule: string;
  msfOptions?: Record<string, string>;
  pivoting: PivotingState;
  discoveredHosts: Set<string>;
  compromisedHosts: Set<string>;
  foundFlags: Set<string>;
  hosts: NetworkHost[];
}

export function processCommand(
  rawCmd: string,
  ctx: CommandContext
): {
  lines: TerminalOutputLine[];
  nextCtx: CommandContext;
} {
  const trimmed = rawCmd.trim();
  const timestamp = Date.now();
  const nextCtx: CommandContext = {
    ...ctx,
    msfOptions: { ...(ctx.msfOptions || {}) },
    discoveredHosts: new Set(ctx.discoveredHosts),
    compromisedHosts: new Set(ctx.compromisedHosts),
    foundFlags: new Set(ctx.foundFlags),
    pivoting: { ...ctx.pivoting }
  };

  if (!trimmed) {
    return { lines: [], nextCtx };
  }

  // Handle Ctrl+C or clear
  if (trimmed === 'clear') {
    return {
      lines: [{ id: `clear-${timestamp}`, type: 'system', text: '__CLEAR__', timestamp }],
      nextCtx
    };
  }

  // Persist all executed commands to sessionStorage history (excluding clear and ! recall)
  if (!trimmed.startsWith('!')) {
    addCommandToHistory(trimmed);
  }

  let result: { lines: TerminalOutputLine[]; nextCtx: CommandContext };

  // --- METERPRETER SHELL MODE ---
  if (ctx.shellMode === 'meterpreter') {
    result = handleMeterpreterCommand(trimmed, nextCtx, timestamp);
  } else if (ctx.shellMode === 'msf') {
    result = handleMsfCommand(trimmed, nextCtx, timestamp);
  } else if (ctx.shellMode === 'win_cmd') {
    result = handleWinCmdCommand(trimmed, nextCtx, timestamp);
  } else if (ctx.shellMode === 'ssh_target50' || ctx.shellMode === 'ssh_target50_root') {
    result = handleTarget50Command(trimmed, nextCtx, timestamp);
  } else if (ctx.shellMode === 'ssh_target55' || ctx.shellMode === 'ssh_target55_root') {
    result = handleTarget55Command(trimmed, nextCtx, timestamp);
  } else if (ctx.shellMode === 'ssh_target60' || ctx.shellMode === 'ssh_target60_root') {
    result = handleTarget60Command(trimmed, nextCtx, timestamp);
  } else if (ctx.shellMode === 'ssh_fintech100' || ctx.shellMode === 'ssh_fintech100_root') {
    result = handleFintech100Command(trimmed, nextCtx, timestamp);
  } else {
    result = handleKaliBashCommand(trimmed, nextCtx, timestamp);
  }

  // Automatically persist pivoting state to localStorage when changed
  if (result.nextCtx.pivoting) {
    const prevPivoting = ctx.pivoting;
    const currPivoting = result.nextCtx.pivoting;
    if (
      currPivoting.isPivoted !== prevPivoting.isPivoted ||
      currPivoting.routedSubnet !== prevPivoting.routedSubnet ||
      currPivoting.method !== prevPivoting.method ||
      currPivoting.proxyPort !== prevPivoting.proxyPort
    ) {
      savePivotingState(result.nextCtx.labId || 'corpnet', currPivoting);
    }
  }

  return result;
}

// -------------------------------------------------------------
// KALI BASH HANDLER
// -------------------------------------------------------------
function handleKaliBashCommand(
  cmd: string,
  ctx: CommandContext,
  ts: number
): { lines: TerminalOutputLine[]; nextCtx: CommandContext } {
  let activeCmd = cmd;
  const isProxychains = activeCmd.startsWith('proxychains ');
  if (isProxychains) {
    activeCmd = activeCmd.replace(/^proxychains\s+/, '').trim();
  }

  const parts = activeCmd.split(/\s+/);
  const binary = parts[0];
  const args = parts.slice(1);
  const outLines: TerminalOutputLine[] = [];
  const nextCtx: CommandContext = {
    ...ctx,
    discoveredHosts: new Set(ctx.discoveredHosts),
    compromisedHosts: new Set(ctx.compromisedHosts),
    foundFlags: new Set(ctx.foundFlags),
    pivoting: { ...ctx.pivoting }
  };

  const add = (text: string, type: TerminalOutputLine['type'] = 'output') => {
    outLines.push({ id: `out-${ts}-${Math.random()}`, type, text, timestamp: ts });
  };

  // Helper for proxychains banner
  const maybeProxychainsHeader = (targetIp?: string, port?: number | string) => {
    if (!isProxychains) return true;
    if (!ctx.pivoting.isPivoted) {
      add('[proxychains] config file found: /etc/proxychains4.conf', 'system');
      add('[proxychains] preloading /usr/lib/x86_64-linux-gnu/libproxychains.so.4', 'system');
      add(`[proxychains] Dynamic chain  ...  127.0.0.1:${ctx.pivoting.proxyPort || 1080}  ...  timeout / connection refused`, 'error');
      add('ERROR: Proxy connection refused! Have you started the SSH dynamic SOCKS proxy with `ssh -D 1080 -N -f pivotuser@192.168.100.60` or Metasploit socks_proxy?', 'error');
      return false;
    }
    add('[proxychains] config file found: /etc/proxychains4.conf', 'system');
    add('[proxychains] preloading /usr/lib/x86_64-linux-gnu/libproxychains.so.4', 'system');
    if (targetIp && port) {
      add(`[proxychains] Strict chain  ...  127.0.0.1:1080  ...  ${targetIp}:${port}  ...  OK`, 'success');
    }
    return true;
  };

  // Sudo Execution & Privilege Checks on Kali Linux
  if (binary === 'sudo') {
    const subCmd = args[0] || '';
    if (subCmd === '-l' || args.includes('-l')) {
      add('Matching Defaults entries for kali on kali:');
      add('    env_reset, mail_badpass, secure_path=/usr/local/sbin\\:/usr/local/bin\\:/usr/sbin\\:/usr/bin\\:/sbin\\:/bin');
      add('');
      add('User kali may run the following commands on kali:');
      add('    (ALL : ALL) ALL', 'success');
      add('[+] El usuario kali dispone de privilegios sudo completos en todo el sistema.', 'system');
      return { lines: outLines, nextCtx };
    }

    if (subCmd === 'whoami') {
      add('root', 'success');
      return { lines: outLines, nextCtx };
    }

    if (subCmd === 'id') {
      add('uid=0(root) gid=0(root) groups=0(root)', 'success');
      return { lines: outLines, nextCtx };
    }

    if (subCmd === 'su' || subCmd === '-i' || subCmd === 'bash' || subCmd === '/bin/bash' || subCmd === '-s') {
      add('[*] Kali Linux ya opera con todos los privilegios administrativos (kali ALL=(ALL:ALL) ALL).', 'system');
      add('[+] Privilegios de superusuario root confirmados.', 'success');
      return { lines: outLines, nextCtx };
    }

    if (subCmd === 'cat') {
      const targetFile = args[1] || '';
      if (targetFile.includes('shadow') || targetFile === '/etc/shadow') {
        add('root:$6$v19..$mY0uRr00tH4sh3dK4l1.:19632:0:99999:7:::');
        add('daemon:*:19632:0:99999:7:::');
        add('bin:*:19632:0:99999:7:::');
        add('sys:*:19632:0:99999:7:::');
        add('kali:$6$qW9..$xP4ssW0rdK4l1H4sh.:19632:0:99999:7:::');
        return { lines: outLines, nextCtx };
      }
    }

    // Strip sudo and delegate to the underlying command with elevated privileges
    if (args.length > 0) {
      const strippedCmd = activeCmd.replace(/^sudo\s+/, '').trim();
      return handleKaliBashCommand(isProxychains ? `proxychains ${strippedCmd}` : strippedCmd, ctx, ts);
    }

    add('usage: sudo -h | -K | -k | -V');
    add('usage: sudo -l [-ABkNnS] [-g group] [-h host] [-p prompt] [-U user] [-u user] [command]');
    add('usage: sudo [-ABbEHkNnPS] [-u user] [command]');
    return { lines: outLines, nextCtx };
  }

  if (binary === 'su') {
    add('[*] Autenticado como superusuario root en Kali Linux.', 'success');
    return { lines: outLines, nextCtx };
  }

  // General Help
  if (binary === 'help' || binary === 'ejpt-help') {
    add('╔═══════════════════════════════════════════════════════════════════════════════════╗', 'system');
    add('║                   eJPTv2 EXAM & PIVOTING SIMULATOR CHEAT SHEET                    ║', 'system');
    add('╚═══════════════════════════════════════════════════════════════════════════════════╝', 'system');
    add('');
    add('📌 METODOLOGÍA DEL EXAMEN:', 'success');
    add(' 1. RECONOCIMIENTO DMZ: Descubrir hosts en 192.168.100.0/24');
    add('    → `netdiscover -r 192.168.100.0/24` o `nmap -sn 192.168.100.0/24`');
    add(' 2. ESCANEO DE PUERTOS:');
    add('    → `nmap -sV -sC -p- 192.168.100.50` (o .55, .60)');
    add(' 3. ENUMERACIÓN WEB & SERVICIOS:');
    add('    → `gobuster dir -u http://192.168.100.50 -w /usr/share/wordlists/dirb/common.txt`');
    add('    → `smbclient -L //192.168.100.60 -N` o `enum4linux -a 192.168.100.60`');
    add(' 4. EXPLOTACIÓN DMZ:');
    add('    → LFI en .50: `curl "http://192.168.100.50/blog/view.php?page=../../../../etc/passwd"`');
    add('    → Credenciales en backup: `curl "http://192.168.100.50/blog/view.php?page=../../../../var/backups/db_config.php.bak"`');
    add('    → Conexión SSH: `ssh sysadmin@192.168.100.50` (password: P@ssw0rd2024!)');
    add('    → Escalar privilegios con SUID: `sudo -l` o `find`');
    add(' 5. MÁQUINA PIVOT (192.168.100.60):');
    add('    → SMB público contiene credenciales de `pivotuser:pivotpass2024`');
    add('    → Conexión SSH: `ssh pivotuser@192.168.100.60`');
    add('    → Inspeccionar interfaces: `ip a` o `ip route` (Descubres 10.10.10.0/24)');
    add(' 6. CONFIGURAR PIVOTING:');
    add('    → Túnel SOCKS5 dinámico: `ssh -D 1080 -N -f pivotuser@192.168.100.60`');
    add('    → O en Metasploit meterpreter: `run autoroute -s 10.10.10.0/24`');
    add(' 7. ATACAR RED INTERNA A TRAVÉS DE PROXYCHAINS:');
    add('    → `proxychains nmap -sT -Pn 10.10.10.20,25,30`');
    add('    → `proxychains sqlmap -u "http://10.10.10.20/api/employees?id=1" --dump`');
    add('    → `msfconsole` (exploit/windows/smb/psexec hacia 10.10.10.25)');
    add(' 8. EVALUACIÓN Y CRACKEO DE CONTRASEÑAS (eJPTv2 Password Suite):');
    add('    → Identificar: `hashid "<hash>"` o `hash-identifier`');
    add('    → Unir shadow: `unshadow /etc/passwd /etc/shadow > unshadowed.txt`');
    add('    → Cracking:    `john --format=sha512crypt unshadowed.txt` o `hashcat -m 1800 ...`');
    add('    → Fuerza bruta: `hydra -L users.txt -P passwords.txt <IP> ssh/ftp/smb` o `medusa`');
    add('    → Pass-The-Hash: `proxychains psexec.py -hashes :<ntlm_hash> Administrator@10.10.10.25`');
    add('    → WordPress CMS: `wpscan --url http://192.168.100.50/blog -U sysadmin -P /usr/share/wordlists/rockyou.txt`');
    add('    → Acceso RDP GUI: `proxychains xfreerdp /v:10.10.10.25 /u:Administrator /p:P@ssw0rd2024!`');
    add('    → WinRM Shell:   `proxychains evil-winrm -i 10.10.10.25 -u itadmin -p \'P@ssw0rd2024!\'`');
    add('    → Hashes files:  `zip2john <file.zip>`, `ssh2john id_rsa`, `fcrackzip -u -D ...`');
    add('    → Diccionarios:  `cewl`, `cupp`, `crunch`, `generate-wordlist`, `gunzip /usr/share/wordlists/rockyou.txt.gz`');
    add('    → Fuerza bruta:  `hydra`, `medusa`, `ncrack`');
    add('    → Escaneo DMZ:   `arp-scan -l`, `nmap -sS -p- --open 192.168.100.0/24` (Escaneo Global DMZ)');
    add('');
    add('Comandos utilitarios disponibles: cat, ls, cd, pwd, whoami, ifconfig, ip, ping, nmap, arp-scan,');
    add('gobuster, dirb, nikto, wpscan, xfreerdp, evil-winrm, hydra, medusa, ncrack, unshadow, hashid,');
    add('zip2john, ssh2john, fcrackzip, cewl, cupp, crunch, psexec.py, smbclient, enum4linux, sqlmap, john, hashcat, msfconsole, ssh, proxychains.');
    return { lines: outLines, nextCtx };
  }

  // Network Interfaces & IP
  if (binary === 'ifconfig' || binary === 'ip' && (args[0] === 'a' || args[0] === 'addr')) {
    const isFintech = ctx.labId === 'lab-fintech';
    const attackerIp = isFintech ? '172.16.50.10' : '192.168.100.10';
    add('eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500');
    add('        inet 172.16.1.15  netmask 255.255.255.0  broadcast 172.16.1.255');
    add('        inet6 fe80::a00:27ff:fe8d:8f8a  prefixlen 64  scopeid 0x20<link>');
    add('        ether 08:00:27:8d:8f:8a  txqueuelen 1000  (Ethernet)');
    add('');
    add('tun0: flags=4305<UP,POINTOPOINT,RUNNING,NOARP,MULTICAST>  mtu 1500');
    add(`        inet ${attackerIp}  netmask 255.255.255.0  destination ${attackerIp.replace(/\.\d+$/, '.1')}`);
    add('        inet6 fe80::c5b:7990:f4be:2b3  prefixlen 64  scopeid 0x20<link>');
    add('        unspec 00-00-00-00-00-00-00-00-00-00-00-00-00-00-00-00  txqueuelen 500  (UNSPEC)');
    add('');
    add('lo: flags=73<UP,LOOPBACK,RUNNING>  mtu 65536');
    add('        inet 127.0.0.1  netmask 255.0.0.0');
    return { lines: outLines, nextCtx };
  }

  if (binary === 'route' || (binary === 'ip' && (args[0] === 'r' || args[0] === 'route'))) {
    const isFintech = ctx.labId === 'lab-fintech';
    add('Kernel IP routing table');
    add('Destination     Gateway         Genmask         Flags Metric Ref    Use Iface');
    add('0.0.0.0         172.16.1.1      0.0.0.0         UG    100    0        0 eth0');
    add('172.16.1.0      0.0.0.0         255.255.255.0   U     100    0        0 eth0');
    add(`${isFintech ? '172.16.50.0' : '192.168.100.0'}   0.0.0.0         255.255.255.0   U     0      0        0 tun0`);
    if (ctx.pivoting.isPivoted) {
      add(`${isFintech ? '10.20.30.0' : '10.10.10.0'}      ${isFintech ? '172.16.50.100' : '192.168.100.60'}  255.255.255.0   UG    0      0        0 tun0 [SOCKS/MSF Tunnel]`);
    }
    return { lines: outLines, nextCtx };
  }

  // Ping command
  if (binary === 'ping') {
    const target = args.find(a => !a.startsWith('-')) || '';
    if (!target) {
      add('ping: usage error: Destination address required', 'error');
      return { lines: outLines, nextCtx };
    }

    if (target.startsWith('10.10.10.') || target.startsWith('10.20.30.')) {
      if (!isProxychains && !ctx.pivoting.isPivoted) {
        add(`PING ${target} (${target}) 56(84) bytes of data.`);
        add(`From tun0 Destination Host Unreachable`, 'error');
        add(`--- ${target} ping statistics ---`);
        add('2 packets transmitted, 0 received, +2 errors, 100% packet loss');
        add('[!] TIP: La red interna no está en tu tabla de enrutamiento local. Debes establecer un pivote SOCKS5.', 'system');
        return { lines: outLines, nextCtx };
      } else {
        add(`PING ${target} (${target}) 56(84) bytes of data.`);
        add(`64 bytes from ${target}: icmp_seq=1 ttl=64 time=11.4 ms`);
        add(`64 bytes from ${target}: icmp_seq=2 ttl=64 time=10.8 ms`);
        add(`--- ${target} ping statistics ---`);
        add('2 packets transmitted, 2 received, 0% packet loss, time 1001ms');
        ctx.discoveredHosts.add(target);
        return { lines: outLines, nextCtx };
      }
    }

    if (target.startsWith('192.168.100.') || target.startsWith('172.16.50.')) {
      add(`PING ${target} (${target}) 56(84) bytes of data.`);
      add(`64 bytes from ${target}: icmp_seq=1 ttl=64 time=1.84 ms`);
      add(`64 bytes from ${target}: icmp_seq=2 ttl=64 time=1.62 ms`);
      add(`--- ${target} ping statistics ---`);
      add('2 packets transmitted, 2 received, 0% packet loss, time 1001ms');
      ctx.discoveredHosts.add(target);
      return { lines: outLines, nextCtx };
    }

    add(`ping: ${target}: Name or service not known`, 'error');
    return { lines: outLines, nextCtx };
  }

  // Netdiscover / ARP-scan
  if (binary === 'netdiscover' || binary === 'arp-scan') {
    const isFintech = ctx.labId === 'lab-fintech' || activeCmd.includes('172.16.50.');
    if (isFintech) {
      add(' Currently scanning: 172.16.50.0/24   |   Screen View: Unique Hosts');
      add(' 3 Captured ARP Req/Rep packets, from 3 hosts. Total size: 180');
      add(' _____________________________________________________________________________');
      add('   IP            At MAC Address     Count     Len  MAC Vendor / Hostname');
      add(' -----------------------------------------------------------------------------');
      add(' 172.16.50.20   08:00:27:31:9a:1b      1      60  (banking-portal.fintech.local)');
      add(' 172.16.50.35   08:00:27:54:1f:8c      1      60  (nfs-storage.fintech.local)');
      add(' 172.16.50.100  08:00:27:e1:33:4d      1      60  (edge-gateway.fintech.local)');
      add('');
      add('[+] 3 active hosts discovered in 172.16.50.0/24 subnet.', 'success');
      ctx.discoveredHosts.add('172.16.50.20');
      ctx.discoveredHosts.add('172.16.50.35');
      ctx.discoveredHosts.add('172.16.50.100');
      return { lines: outLines, nextCtx };
    }

    add(' Currently scanning: 192.168.100.0/24   |   Screen View: Unique Hosts');
    add(' 3 Captured ARP Req/Rep packets, from 3 hosts. Total size: 180');
    add(' _____________________________________________________________________________');
    add('   IP            At MAC Address     Count     Len  MAC Vendor / Hostname');
    add(' -----------------------------------------------------------------------------');
    add(' 192.168.100.50  08:00:27:11:42:3a      1      60  PCS Systemtechnik GmbH (target-web-01)');
    add(' 192.168.100.55  08:00:27:99:1f:8b      1      60  PCS Systemtechnik GmbH (target-ftp-02)');
    add(' 192.168.100.60  08:00:27:e2:3c:4d      1      60  PCS Systemtechnik GmbH (target-gateway-03)');
    add('');
    add('[+] 3 active hosts discovered in 192.168.100.0/24 subnet.', 'success');
    ctx.discoveredHosts.add('192.168.100.50');
    ctx.discoveredHosts.add('192.168.100.55');
    ctx.discoveredHosts.add('192.168.100.60');
    return { lines: outLines, nextCtx };
  }

  // NMAP Scanner
  if (binary === 'nmap') {
    const rawTarget = args.find(a => !a.startsWith('-')) || '';
    const isSn = args.includes('-sn');

    // FinTech Subnet
    if (rawTarget.includes('172.16.50.0/24') || (ctx.labId === 'lab-fintech' && isSn)) {
      add('Starting Nmap 7.94 ( https://nmap.org ) at ' + new Date().toUTCString());
      add('Nmap scan report for banking-portal.fintech.local (172.16.50.20)');
      add('Host is up (0.0011s latency).');
      add('Nmap scan report for nfs-storage.fintech.local (172.16.50.35)');
      add('Host is up (0.0013s latency).');
      add('Nmap scan report for edge-gateway.fintech.local (172.16.50.100)');
      add('Host is up (0.0009s latency).');
      add('Nmap done: 256 IP addresses (3 hosts up) scanned in 2.18 seconds', 'success');
      ctx.discoveredHosts.add('172.16.50.20');
      ctx.discoveredHosts.add('172.16.50.35');
      ctx.discoveredHosts.add('172.16.50.100');
      return { lines: outLines, nextCtx };
    }

    // FinTech Target 20
    if (rawTarget.includes('172.16.50.20')) {
      add('Starting Nmap 7.94 ( https://nmap.org ) at ' + new Date().toUTCString());
      add('Nmap scan report for banking-portal.fintech.local (172.16.50.20)');
      add('Host is up (0.0011s latency).');
      add('PORT     STATE SERVICE VERSION');
      add('22/tcp   open  ssh     OpenSSH 8.4p1 Debian');
      add('80/tcp   open  http    nginx/1.18.0 (Spring Reverse Proxy)');
      add('8080/tcp open  http    Spring Boot 2.5.4 (Actuator)');
      add('Service Info: OS: Linux; CPE: cpe:/o:debian:debian_linux', 'success');
      ctx.discoveredHosts.add('172.16.50.20');
      return { lines: outLines, nextCtx };
    }

    // FinTech Target 35 (NFS)
    if (rawTarget.includes('172.16.50.35')) {
      add('Starting Nmap 7.94 ( https://nmap.org ) at ' + new Date().toUTCString());
      add('Nmap scan report for nfs-storage.fintech.local (172.16.50.35)');
      add('Host is up (0.0012s latency).');
      add('PORT     STATE SERVICE VERSION');
      add('22/tcp   open  ssh     OpenSSH 8.2p1 Ubuntu');
      add('111/tcp  open  rpcbind 2-4 (RPC #100000)');
      add('2049/tcp open  nfs     4 (RPC #100003)');
      add('| nfs-showmount:');
      add('|_  /exports/finance (everyone)');
      add('Service Info: OS: Linux', 'success');
      ctx.discoveredHosts.add('172.16.50.35');
      return { lines: outLines, nextCtx };
    }

    // FinTech Target 100 (Gateway)
    if (rawTarget.includes('172.16.50.100')) {
      add('Starting Nmap 7.94 ( https://nmap.org ) at ' + new Date().toUTCString());
      add('Nmap scan report for edge-gateway.fintech.local (172.16.50.100)');
      add('Host is up (0.0009s latency).');
      add('PORT   STATE SERVICE VERSION');
      add('22/tcp open  ssh     OpenSSH 8.2p1 Ubuntu');
      add('80/tcp open  http    pfSense / Router Admin');
      add('Service Info: OS: Linux (Dual-Homed Gateway)', 'success');
      ctx.discoveredHosts.add('172.16.50.100');
      return { lines: outLines, nextCtx };
    }

    // FinTech Internal Targets via Proxychains
    if (isProxychains && (rawTarget.includes('10.20.30.') || rawTarget.includes('50') || rawTarget.includes('75') || rawTarget.includes('90'))) {
      if (rawTarget.includes('50') || rawTarget.includes('dc01')) {
        maybeProxychainsHeader('10.20.30.50', 88);
        add('Nmap scan report for dc01.fintech.branch (10.20.30.50)');
        add('PORT     STATE SERVICE      VERSION');
        add('53/tcp   open  domain       Microsoft DNS');
        add('88/tcp   open  kerberos-sec Microsoft Windows Kerberos (server time: 2026-10-07 10:45:00Z)');
        add('389/tcp  open  ldap         Microsoft Windows Active Directory LDAP');
        add('445/tcp  open  microsoft-ds Windows Server 2016 DC');
        add('3389/tcp open  ms-wbt-server Microsoft Terminal Services');
        add('Service Info: OS: Windows; OS details: Windows Server 2016', 'success');
        ctx.discoveredHosts.add('10.20.30.50');
        return { lines: outLines, nextCtx };
      }
      if (rawTarget.includes('75') || rawTarget.includes('jenkins')) {
        maybeProxychainsHeader('10.20.30.75', 8080);
        add('Nmap scan report for jenkins-ci.fintech.branch (10.20.30.75)');
        add('PORT     STATE SERVICE VERSION');
        add('22/tcp   open  ssh     OpenSSH 7.4');
        add('8080/tcp open  http    Jenkins 2.289.1');
        add('Service Info: OS: Linux', 'success');
        ctx.discoveredHosts.add('10.20.30.75');
        return { lines: outLines, nextCtx };
      }
      if (rawTarget.includes('90') || rawTarget.includes('mssql')) {
        maybeProxychainsHeader('10.20.30.90', 1433);
        add('Nmap scan report for mssql-vault.fintech.branch (10.20.30.90)');
        add('PORT     STATE SERVICE  VERSION');
        add('445/tcp  open  microsoft-ds Windows Server 2019');
        add('1433/tcp open  ms-sql-s Microsoft SQL Server 2019 15.0.2000');
        add('Service Info: OS: Windows', 'success');
        ctx.discoveredHosts.add('10.20.30.90');
        return { lines: outLines, nextCtx };
      }
    }

    // CorpNet Subnet scan (Metodología r1vs3c: Escaneo Global DMZ)
    if (rawTarget.includes('192.168.100.0/24') || isSn) {
      add('Starting Nmap 7.94 ( https://nmap.org ) at ' + new Date().toUTCString());

      if (isSn) {
        add('Nmap scan report for target-web-01.corp.local (192.168.100.50)');
        add('Host is up (0.0012s latency).');
        add('MAC Address: 08:00:27:11:42:3A (Oracle VirtualBox virtual NIC)');
        add('Nmap scan report for target-ftp-02.corp.local (192.168.100.55)');
        add('Host is up (0.0014s latency).');
        add('MAC Address: 08:00:27:99:1F:8B (Oracle VirtualBox virtual NIC)');
        add('Nmap scan report for target-gateway-03.corp.local (192.168.100.60)');
        add('Host is up (0.0010s latency).');
        add('MAC Address: 08:00:27:E2:3C:4D (Oracle VirtualBox virtual NIC)');
        add('Nmap done: 256 IP addresses (3 hosts up) scanned in 2.14 seconds', 'success');
      } else {
        // Escaneo Global Completo de Puertos y Servicios de toda la red DMZ
        add('[*] [METODOLOGÍA r1vs3c: Escaneo Global DMZ Activo]');
        add('Nmap scan report for target-web-01.corp.local (192.168.100.50)');
        add('Host is up (0.0012s latency).');
        add('PORT     STATE SERVICE VERSION');
        add('22/tcp   open  ssh     OpenSSH 8.2p1 Ubuntu 4ubuntu0.5');
        add('80/tcp   open  http    Apache httpd 2.4.41 ((Ubuntu))');
        add('3306/tcp open  mysql   MySQL (filtered)');
        add('');
        add('Nmap scan report for target-ftp-02.corp.local (192.168.100.55)');
        add('Host is up (0.0014s latency).');
        add('PORT     STATE SERVICE VERSION');
        add('21/tcp   open  ftp     vsftpd 3.0.3 (Anonymous Enabled)');
        add('22/tcp   open  ssh     OpenSSH 7.9p1 Debian');
        add('8080/tcp open  http    lighttpd/1.4.53 (Staff Portal)');
        add('');
        add('Nmap scan report for target-gateway-03.corp.local (192.168.100.60)');
        add('Host is up (0.0010s latency).');
        add('PORT     STATE SERVICE     VERSION');
        add('22/tcp   open  ssh         OpenSSH 8.2p1 Ubuntu');
        add('80/tcp   open  http        nginx/1.18.0 (Gateway Admin)');
        add('139/tcp  open  netbios-ssn Samba smbd 4.9.5');
        add('445/tcp  open  netbios-ssn Samba smbd 4.9.5 (workgroup: WORKGROUP)');
        add('');
        add('Nmap done: 256 IP addresses (3 hosts up) scanned in 4.38 seconds', 'success');
        add('[+] ¡Escaneo global completado! Se han mapeado todos los servicios de la DMZ para resolver las preguntas.', 'success');
      }

      ctx.discoveredHosts.add('192.168.100.50');
      ctx.discoveredHosts.add('192.168.100.55');
      ctx.discoveredHosts.add('192.168.100.60');
      return { lines: outLines, nextCtx };
    }

    // Scanning internal network without proxychains
    if (rawTarget.includes('10.10.10.') && !isProxychains) {
      add('Starting Nmap 7.94 ( https://nmap.org ) at ' + new Date().toUTCString());
      add(`Note: Host seems down. If it is really up, but blocking our ping probes, try -Pn`, 'error');
      add(`Nmap scan report for ${rawTarget} [host down]`);
      add(`Nmap done: 1 IP address (0 hosts up) scanned in 3.01 seconds`);
      add('[!] ADVERTENCIA: No puedes alcanzar 10.10.10.0/24 directamente. Utiliza `proxychains nmap -sT -Pn ...` tras levantar el pivote SOCKS5.', 'system');
      return { lines: outLines, nextCtx };
    }

    // Scanning with proxychains into internal network
    if (isProxychains && rawTarget.includes('10.10.10.')) {
      if (!maybeProxychainsHeader(rawTarget, 80)) return { lines: outLines, nextCtx };

      if (rawTarget.includes('20')) {
        add('Starting Nmap 7.94 ( https://nmap.org ) via ProxyChains');
        add('Nmap scan report for target-db-04.corp.internal (10.10.10.20)');
        add('Host is up (0.045s latency).');
        add('PORT     STATE SERVICE VERSION');
        add('22/tcp   open  ssh     OpenSSH 7.4 (protocol 2.0)');
        add('80/tcp   open  http    Apache httpd 2.4.6 ((CentOS))');
        add('3306/tcp open  mysql   MySQL 5.7.35-log');
        add('Service Info: OS: Linux; CPE: cpe:/o:centos:centos:7', 'success');
        ctx.discoveredHosts.add('10.10.10.20');
        return { lines: outLines, nextCtx };
      }

      if (rawTarget.includes('25')) {
        add('Starting Nmap 7.94 ( https://nmap.org ) via ProxyChains');
        add('Nmap scan report for target-win-05.corp.internal (10.10.10.25)');
        add('Host is up (0.048s latency).');
        add('PORT     STATE SERVICE       VERSION');
        add('135/tcp  open  msrpc         Microsoft Windows RPC');
        add('139/tcp  open  netbios-ssn   Microsoft Windows netbios-ssn');
        add('445/tcp  open  microsoft-ds  Windows Server 2019 Standard 17763 microsoft-ds');
        add('3389/tcp open  ms-wbt-server Microsoft Terminal Services');
        add('5985/tcp open  wsman         Microsoft HTTPAPI httpd 2.0 (SSDP/UPnP)');
        add('Service Info: OS: Windows; OS details: Windows Server 2019', 'success');
        ctx.discoveredHosts.add('10.10.10.25');
        return { lines: outLines, nextCtx };
      }

      if (rawTarget.includes('30')) {
        add('Starting Nmap 7.94 ( https://nmap.org ) via ProxyChains');
        add('Nmap scan report for target-vault-06.corp.internal (10.10.10.30)');
        add('Host is up (0.052s latency).');
        add('PORT     STATE SERVICE      VERSION');
        add('80/tcp   open  http         BadBlue 2.7');
        add('445/tcp  open  microsoft-ds Windows 10 Enterprise');
        add('Service Info: OS: Windows 10 Enterprise', 'success');
        ctx.discoveredHosts.add('10.10.10.30');
        return { lines: outLines, nextCtx };
      }
    }

    // Target 50
    if (rawTarget.includes('192.168.100.50')) {
      add('Starting Nmap 7.94 ( https://nmap.org ) at ' + new Date().toUTCString());
      add('Nmap scan report for target-web-01.corp.local (192.168.100.50)');
      add('Host is up (0.0011s latency).');
      add('PORT     STATE    SERVICE VERSION');
      add('22/tcp   open     ssh     OpenSSH 8.2p1 Ubuntu 4ubuntu0.5 (Ubuntu Linux; protocol 2.0)');
      add('80/tcp   open     http    Apache httpd 2.4.41 ((Ubuntu))');
      add('|_http-server-header: Apache/2.4.41 (Ubuntu)');
      add('|_http-title: Corporate Intranet Portal');
      add('3306/tcp filtered mysql');
      add('Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel', 'success');
      ctx.discoveredHosts.add('192.168.100.50');
      return { lines: outLines, nextCtx };
    }

    // Target 55
    if (rawTarget.includes('192.168.100.55')) {
      add('Starting Nmap 7.94 ( https://nmap.org ) at ' + new Date().toUTCString());
      add('Nmap scan report for target-ftp-02.corp.local (192.168.100.55)');
      add('Host is up (0.0013s latency).');
      add('PORT     STATE SERVICE VERSION');
      add('21/tcp   open  ftp     vsftpd 3.0.3');
      add('| ftp-anon: Anonymous FTP login allowed (FTP code 230)');
      add('| -rw-r--r--    1 ftp      ftp           324 Oct 01 08:30 notes.txt');
      add('|_ -rw-r--r--    1 ftp      ftp          1024 Oct 01 08:35 confidential_note.txt');
      add('22/tcp   open  ssh     OpenSSH 7.9p1 Debian 10+deb10u2 (protocol 2.0)');
      add('8080/tcp open  http    lighttpd/1.4.53 (Staff Portal)');
      add('Service Info: OSs: Unix, Linux; CPE: cpe:/o:linux:linux_kernel', 'success');
      ctx.discoveredHosts.add('192.168.100.55');
      return { lines: outLines, nextCtx };
    }

    // Target 60
    if (rawTarget.includes('192.168.100.60')) {
      add('Starting Nmap 7.94 ( https://nmap.org ) at ' + new Date().toUTCString());
      add('Nmap scan report for target-gateway-03.corp.local (192.168.100.60)');
      add('Host is up (0.0009s latency).');
      add('PORT    STATE SERVICE     VERSION');
      add('22/tcp  open  ssh         OpenSSH 8.2p1 Ubuntu');
      add('80/tcp  open  http        nginx/1.18.0 (Ubuntu)');
      add('139/tcp open  netbios-ssn Samba smbd 4.9.5');
      add('445/tcp open  netbios-ssn Samba smbd 4.9.5 (workgroup: WORKGROUP)');
      add('Host script results:');
      add('|_smb2-time: Protocol negotiation discovered workgroup: WORKGROUP');
      add('|_smb2-security-mode: SMBv2: Message signing enabled but not required');
      add('Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel', 'success');
      ctx.discoveredHosts.add('192.168.100.60');
      return { lines: outLines, nextCtx };
    }

    add(`Starting Nmap 7.94 ( https://nmap.org ) at ${new Date().toUTCString()}`);
    add(`Nmap scan report for ${rawTarget || 'unknown'}`);
    add(`All 1000 scanned ports on ${rawTarget || 'unknown'} are in ignored states.`);
    return { lines: outLines, nextCtx };
  }

  // Gobuster / Dirb / Dirsearch
  if (binary === 'gobuster' || binary === 'dirb' || binary === 'dirsearch') {
    const targetUrl = args.find(a => a.startsWith('http')) || args[args.indexOf('-u') + 1] || 'http://192.168.100.50';

    if (binary === 'dirb') {
      add('-----------------------------------------------------------------');
      add('DIRB v2.22    ');
      add('By The Dark Raver');
      add('-----------------------------------------------------------------');
      add(`START_TIME: ${new Date().toUTCString()}`);
      add(`URL_BASE: ${targetUrl}`);
      add(`WORDLIST_FILES: /usr/share/wordlists/dirb/common.txt`);
      add('-----------------------------------------------------------------');
      add('GENERATED WORDS: 4612');
      add('---- Scanning URL: ' + targetUrl + ' ----');
      if (targetUrl.includes('192.168.100.50')) {
        add('==> DIRECTORY: ' + targetUrl + '/admin/');
        add('+ ' + targetUrl + '/index.php (CODE:200|SIZE:2482)');
        add('==> DIRECTORY: ' + targetUrl + '/blog/');
        add('+ ' + targetUrl + '/robots.txt (CODE:200|SIZE:112)');
        add('-----------------------------------------------------------------');
        add('DOWNLOADED: 4612 - FOUND: 4', 'success');
        add('[+] Directorios sensibles descubiertos: /admin, /blog', 'success');
        return { lines: outLines, nextCtx };
      }
    }

    if (targetUrl.includes('192.168.100.50')) {
      add('===============================================================');
      add('Gobuster v3.6 - Directory Enumeration Mode');
      add(`Target: ${targetUrl}`);
      add('Wordlist: /usr/share/wordlists/dirb/common.txt');
      add('===============================================================');
      add('/index.php            (Status: 200) [Size: 2482]');
      add('/admin                (Status: 301) [Size: 185] --> http://192.168.100.50/admin/');
      add('/blog                 (Status: 301) [Size: 184] --> http://192.168.100.50/blog/');
      add('/css                  (Status: 301) [Size: 183]');
      add('/js                   (Status: 301) [Size: 182]');
      add('===============================================================');
      add('[+] Finished scanning. Found sensitive endpoints: /admin, /blog', 'success');
      return { lines: outLines, nextCtx };
    }

    if (targetUrl.includes('10.10.10.20')) {
      if (!maybeProxychainsHeader('10.10.10.20', 80)) return { lines: outLines, nextCtx };
      add('===============================================================');
      add('Gobuster v3.6 - Directory Enumeration Mode (via Proxychains)');
      add(`Target: ${targetUrl}`);
      add('===============================================================');
      add('/api                  (Status: 301) [Size: 231]');
      add('/api/employees        (Status: 200) [Size: 512]');
      add('/api/status           (Status: 200) [Size: 64]');
      add('/phpmyadmin           (Status: 403) [Size: 298]');
      add('===============================================================');
      return { lines: outLines, nextCtx };
    }

    add(`Scanning ${targetUrl}... 0 results found.`);
    return { lines: outLines, nextCtx };
  }

  // Nikto
  if (binary === 'nikto') {
    const host = args[args.indexOf('-h') + 1] || args[1] || '192.168.100.50';
    add(`- Nikto v2.1.6`);
    add(`---------------------------------------------------------------------------`);
    add(`+ Target IP:          ${host}`);
    add(`+ Target Hostname:    ${host}`);
    add(`+ Target Port:        80`);
    add(`+ Start Time:         ${new Date().toUTCString()}`);
    add(`---------------------------------------------------------------------------`);
    add(`+ Server: Apache/2.4.41 (Ubuntu)`);
    add(`+ Server leaks inodes via ETags, header found with file /, fields: 0x9b2 0x5a1b32f91a6c0`);
    add(`+ The anti-clickjacking X-Frame-Options header is not present.`);
    add(`+ Entry '/admin/' discovered with HTTP 301 redirect.`);
    add(`+ Entry '/blog/view.php' discovered - Potential file parameter vulnerable to directory traversal.`);
    add(`+ 1 host(s) tested`, 'success');
    return { lines: outLines, nextCtx };
  }

  // Curl
  if (binary === 'curl') {
    const url = args.find(a => a.startsWith('http') || a.includes('192.168.') || a.includes('10.10.')) || '';

    if (url.includes('192.168.100.50')) {
      if (url.includes('view.php') && (url.includes('etc/passwd') || url.includes('/etc/passwd'))) {
        add('root:x:0:0:root:/root:/bin/bash');
        add('daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin');
        add('bin:x:2:2:bin:/bin:/usr/sbin/nologin');
        add('sys:x:3:3:sys:/dev:/usr/sbin/nologin');
        add('www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin');
        add('sysadmin:x:1000:1000:System Admin,,,:/home/sysadmin:/bin/bash', 'success');
        add('developer:x:1001:1001:Developer,,,:/home/developer:/bin/bash');
        add('mysql:x:114:120:MySQL Server,,,:/nonexistent:/bin/false');
        add('[+] LFI explotado con éxito! Usuario con shell interactiva descubierto: `sysadmin`.', 'success');
        return { lines: outLines, nextCtx };
      }

      if (url.includes('db_config.php.bak') || url.includes('var/backups')) {
        add('<?php');
        add('// DATABASE CONFIGURATION BACKUP - DEV TEAM');
        add('$DB_HOST = "localhost";');
        add('$DB_USER = "sysadmin";');
        add('$DB_PASS = "P@ssw0rd2024!"; // REUSED ACROSS ADMIN SSH AND SUDO', 'success');
        add('$DB_NAME = "corporate_db";');
        add('?>');
        add('[+] ¡CREDENCIALES ENCONTRADAS! sysadmin : P@ssw0rd2024!', 'success');
        return { lines: outLines, nextCtx };
      }

      if (args.includes('-I')) {
        add('HTTP/1.1 200 OK');
        add('Date: ' + new Date().toUTCString());
        add('Server: Apache/2.4.41 (Ubuntu)');
        add('Content-Type: text/html; charset=UTF-8');
        return { lines: outLines, nextCtx };
      }

      add('<!DOCTYPE html><html><head><title>Corporate Intranet Portal</title></head>');
      add('<body><h1>Welcome to Corp Intranet</h1><p>Visit our <a href="/blog/view.php?page=news.php">Blog & Updates</a></p></body></html>');
      return { lines: outLines, nextCtx };
    }

    if (url.includes('10.10.10.20')) {
      if (!isProxychains && !ctx.pivoting.isPivoted) {
        add('curl: (7) Failed to connect to 10.10.10.20 port 80: No route to host', 'error');
        return { lines: outLines, nextCtx };
      }
      maybeProxychainsHeader('10.10.10.20', 80);

      if (url.includes('api/employees')) {
        if (url.includes("'") || url.includes('OR 1=1') || url.includes('UNION')) {
          add('HTTP/1.1 200 OK');
          add('Content-Type: application/json');
          add('');
          add(JSON.stringify([
            { id: 1, name: 'John Doe', department: 'Executive', role: 'CEO' },
            { id: 2, name: 'Alice Smith', department: 'Finance', role: 'CFO' },
            { id: 3, name: 'IT Admin', department: 'Infrastructure', role: 'Domain Administrator', hash: '5f4dcc3b5aa765d61d8327deb882cf99' }
          ], null, 2), 'success');
          add('[+] ¡Vulnerabilidad de SQL Injection confirmada en el parámetro id!', 'success');
          return { lines: outLines, nextCtx };
        }

        add('[{"id":1,"name":"John Doe","department":"Executive","role":"CEO"}]');
        return { lines: outLines, nextCtx };
      }

      add('Apache/2.4.6 (CentOS) - Internal API Gateway');
      return { lines: outLines, nextCtx };
    }

    if (url.includes('172.16.50.20')) {
      if (url.includes('actuator')) {
        add('HTTP/1.1 200 OK');
        add('Content-Type: application/vnd.spring-boot.actuator.v3+json');
        add('');
        add(JSON.stringify({
          activeProfiles: ['production'],
          propertySources: [
            {
              name: 'applicationConfig: [classpath:/application-prod.properties]',
              properties: {
                'spring.datasource.url': { value: 'jdbc:sqlserver://10.20.30.90:1433;databaseName=FinTechCore' },
                'spring.datasource.username': { value: 'sa' },
                'spring.datasource.password': { value: 'SqlAdmin2024!' },
                'app.security.token': { value: 'FLAG_SPRING_LEAK{actuator_env_dump_exposed_secrets}' },
                'app.credentials.default': { value: 'appuser:SpringAdmin2024!' }
              }
            }
          ]
        }, null, 2), 'success');
        add('[+] ¡SECRETOS EXPUESTOS EN SPRING BOOT ACTUATOR! sa:SqlAdmin2024! y appuser:SpringAdmin2024!', 'success');
        ctx.foundFlags.add('flag-fintech-spring');
        return { lines: outLines, nextCtx };
      }
      add('nginx/1.18.0 - FinTech Online Banking Portal');
      return { lines: outLines, nextCtx };
    }

    if (url.includes('10.20.30.75')) {
      if (!isProxychains && !ctx.pivoting.isPivoted) {
        add('curl: (7) Failed to connect to 10.20.30.75 port 8080: No route to host', 'error');
        return { lines: outLines, nextCtx };
      }
      maybeProxychainsHeader('10.20.30.75', 8080);
      if (url.includes('script')) {
        add('HTTP/1.1 200 OK');
        add('Content-Type: text/plain;charset=UTF-8');
        add('');
        add('Result: uid=1000(jenkins) gid=1000(jenkins) groups=1000(jenkins)');
        add('FLAG_JENKINS_GROOVY{rce_build_pipeline_compromised}', 'success');
        ctx.foundFlags.add('flag-jenkins-groovy');
        return { lines: outLines, nextCtx };
      }
      add('Jenkins 2.289.1 (CI/CD Automated Deployment Server)');
      return { lines: outLines, nextCtx };
    }

    if (url.includes('10.10.10.30')) {
      if (!isProxychains && !ctx.pivoting.isPivoted) {
        add('curl: (7) Failed to connect to 10.10.10.30: No route to host', 'error');
        return { lines: outLines, nextCtx };
      }
      maybeProxychainsHeader('10.10.10.30', 80);
      if (args.includes('-I')) {
        add('HTTP/1.1 200 OK');
        add('Server: BadBlue/2.7');
        add('Date: ' + new Date().toUTCString());
        add('Content-Type: text/html');
        return { lines: outLines, nextCtx };
      }
      add('<html><head><title>BadBlue 2.7 Document Sharing</title></head><body><h1>BadBlue 2.7</h1><p>Internal Secure Archive</p></body></html>');
      return { lines: outLines, nextCtx };
    }

    add(`curl: (6) Could not resolve host: ${url || 'none'}`, 'error');
    return { lines: outLines, nextCtx };
  }

  // Showmount & Mount for NFS
  if (binary === 'showmount') {
    add('Export list for 172.16.50.35:');
    add('/exports/finance (everyone)', 'success');
    return { lines: outLines, nextCtx };
  }

  if (binary === 'mount' && (activeCmd.includes('nfs') || activeCmd.includes('172.16.50.35'))) {
    add('[+] Mounting 172.16.50.35:/exports/finance on /mnt ...', 'success');
    add('[+] Export mounted with no_root_squash enabled.', 'success');
    add('[+] Flag encontrada en /mnt/root_flag.txt: FLAG_NFS_ROOT{no_root_squash_privesc_expert}', 'success');
    ctx.foundFlags.add('flag-fintech-nfs');
    return { lines: outLines, nextCtx };
  }

  // MSSQL Client / sqsh
  if (binary.includes('mssqlclient') || binary === 'sqsh') {
    if (!isProxychains && !ctx.pivoting.isPivoted) {
      add('[-] Connection to 10.20.30.90:1433 failed: No route to host', 'error');
      return { lines: outLines, nextCtx };
    }
    maybeProxychainsHeader('10.20.30.90', 1433);
    add('Impacket v0.11.0 - Copyright 2023 Fortra');
    add('[*] Connecting to 10.20.30.90:1433 as sa...');
    add('[+] Successfully authenticated as sa to Microsoft SQL Server 2019', 'success');
    add('SQL> enable_xp_cmdshell');
    add('[*] Configuration option \'xp_cmdshell\' changed from 0 to 1.');
    add('SQL> xp_cmdshell "type C:\\Vault\\ledger_master_flag.txt"');
    add('output');
    add('----------------------------------------------------');
    add('FLAG_FINTECH_VAULT{bank_ledger_decrypted_100}', 'success');
    ctx.foundFlags.add('flag-fintech-vault');
    return { lines: outLines, nextCtx };
  }

  // Active Directory & Kerberos exploitation
  if (binary.includes('secretsdump') || binary.includes('GetUserSPNs') || binary.includes('kerberoast')) {
    if (!isProxychains && !ctx.pivoting.isPivoted) {
      add('[-] Connection to 10.20.30.50 failed: No route to host', 'error');
      return { lines: outLines, nextCtx };
    }
    maybeProxychainsHeader('10.20.30.50', 88);
    add('Impacket v0.11.0 - Copyright 2023 Fortra');
    add('[*] Requesting TGS ticket for SPN: MSSQLSvc/dc01.fintech.branch:1433...');
    add('[+] TGS-REP hash extracted: $krb5tgs$23$*mssql_svc*FINTECH.BRANCH*...', 'success');
    add('[*] Hash cracked: finadmin : DomainAdmin#2024!', 'success');
    add('[+] Compromiso total de Active Directory Domain Controller:');
    add('Administrator:500:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::');
    add('FLAG_AD_DOMAIN_ROOT{active_directory_kerberos_pwnd}', 'success');
    ctx.foundFlags.add('flag-ad-domain-root');
    return { lines: outLines, nextCtx };
  }

  // SMBClient
  if (binary === 'smbclient') {
    const rawTarget = args.find(a => a.startsWith('//') || a.includes('192.168.100.60') || a.includes('10.10.10.25')) || '';

    if (rawTarget.includes('192.168.100.60')) {
      if (args.includes('-L')) {
        add('        Sharename       Type      Comment');
        add('        ---------       ----      -------');
        add('        print$          Disk      Printer Drivers');
        add('        public          Disk      Company Public Maintenance Share', 'success');
        add('        IPC$            IPC       IPC Service (Samba 4.9.5)');
        add('SMB1 disabled -- no workgroup available');
        add('[+] Share anónimo descubierto: `public`', 'success');
        return { lines: outLines, nextCtx };
      }

      if (rawTarget.includes('/public')) {
        add('Connected to \\\\192.168.100.60\\public');
        add('smb: \\> ls');
        add('  .                                   D        0  Thu Oct 01 09:12:00 2026');
        add('  ..                                  D        0  Thu Oct 01 08:00:00 2026');
        add('  maintenance.sh                      N      421  Thu Oct 01 09:15:10 2026', 'success');
        add('  vpn_notes.txt                       N      185  Thu Oct 01 09:14:00 2026');
        add('');
        add('smb: \\> more maintenance.sh');
        add('#!/bin/bash');
        add('# Automated sync script between DMZ and Internal Network (10.10.10.0/24)');
        add('# USER: pivotuser');
        add('# PASS: pivotpass2024', 'success');
        add('rsync -avz /backup/ /mnt/internal-backup/');
        add('[+] ¡Credenciales de usuario pivot obtenidas!: pivotuser:pivotpass2024', 'success');
        return { lines: outLines, nextCtx };
      }
    }

    if (rawTarget.includes('10.10.10.25')) {
      if (!isProxychains && !ctx.pivoting.isPivoted) {
        add('Connection to 10.10.10.25 failed (Error NT_STATUS_HOST_UNREACHABLE)', 'error');
        return { lines: outLines, nextCtx };
      }
      maybeProxychainsHeader('10.10.10.25', 445);
      add('        Sharename       Type      Comment');
      add('        ---------       ----      -------');
      add('        ADMIN$          Disk      Remote Admin');
      add('        C$              Disk      Default share');
      add('        IPC$            IPC       Remote IPC');
      add('        IT_Share        Disk      Internal IT Deployment Files', 'success');
      add('SMB1 disabled -- connected via SMB2/3');
      return { lines: outLines, nextCtx };
    }

    add(`Usage: smbclient //server/share [password] [-U username] [-N]`);
    return { lines: outLines, nextCtx };
  }

  // Enum4linux & Enum4linux-ng
  if (binary === 'enum4linux' || binary === 'enum4linux-ng') {
    const target = args[args.length - 1] || '192.168.100.60';
    if (binary === 'enum4linux-ng') {
      add('ENUM4LINUX - NEXT GENERATION (v1.3.2) - eJPTv2 Fast Enumeration Tool', 'system');
      add('===================================================================');
      add(`[*] Target: ${target} (target-gateway-03)`);
      add('[*] SMB dialect negotiation: SMB 2.0.2 / 3.0 supported');
      add('[+] NULL Session connection: SUCCESS (Access allowed without credentials)', 'success');
      add('[*] Domain / Workgroup: WORKGROUP');
      add('[*] OS enumeration: Linux 5.4.0 (Samba 4.9.5-Debian)');
      add('[+] Enumerating users via RPC / SAMR:');
      add('    [+] User: "pivotuser" (RID: 1000) [Active]', 'success');
      add('    [+] User: "nobody" (RID: 501)');
      add('    [+] User: "root" (RID: 0)');
      add('[+] Enumerating shares:');
      add('    [+] public (Disk) - READ access permitted for Anonymous/Guest', 'success');
      add('    [+] IPC$ (Named pipe) - Connected successfully');
      add('[*] Share comment: "Company Public Maintenance Share"');
      add('[+] Completed enum4linux-ng scan successfully.', 'success');
      return { lines: outLines, nextCtx };
    }

    add(`Starting enum4linux v0.8.9 ( http://labs.portcullis.co.uk/application/enum4linux/ )`);
    add(`Target ........... ${target}`);
    add(`Domain ........... WORKGROUP`);
    add(`OS ............... Linux (Samba 4.9.5)`);
    add(`[+] Enumerating shares on ${target}`);
    add(`    public (Type: Disk, Comment: Company Public Maintenance Share)`);
    add(`[+] Target allows NULL sessions.`);
    add(`[+] Users found: pivotuser, root, nobody`, 'success');
    return { lines: outLines, nextCtx };
  }

  // CrackMapExec / CME / NetExec (Pass-The-Hash & SMB Enumeration)
  if (binary === 'crackmapexec' || binary === 'cme' || binary === 'netexec') {
    const rawTarget = args.find(a => a.includes('192.168.100.60') || a.includes('10.10.10.25') || a.includes('10.10.10.') || a.includes('192.168.100.')) || '192.168.100.60';
    const isShares = args.includes('--shares') || args.includes('-M');
    const isPassTheHash = activeCmd.includes('-H') || activeCmd.includes('--hash');
    
    if (rawTarget.includes('192.168.100.60')) {
      add('SMB         192.168.100.60  445    TARGET-GATEWAY   [*] Linux (name:TARGET-GATEWAY) (domain:WORKGROUP) (signing:False) (SMBv2:True)');
      add('SMB         192.168.100.60  445    TARGET-GATEWAY   [+] TARGET-GATEWAY\\guest: (Guest session active!)', 'success');
      if (isShares || true) {
        add('SMB         192.168.100.60  445    TARGET-GATEWAY   [*] Enumerated shares:');
        add('SMB         192.168.100.60  445    TARGET-GATEWAY   Share           Permissions     Remark');
        add('SMB         192.168.100.60  445    TARGET-GATEWAY   -----           -----------     ------');
        add('SMB         192.168.100.60  445    TARGET-GATEWAY   print$                          Printer Drivers');
        add('SMB         192.168.100.60  445    TARGET-GATEWAY   public          READ            Company Public Maintenance Share', 'success');
        add('SMB         192.168.100.60  445    TARGET-GATEWAY   IPC$            READ            IPC Service');
      }
      if (activeCmd.includes('pivotuser') && (activeCmd.includes('pivotpass2024') || isPassTheHash)) {
        add('SMB         192.168.100.60  445    TARGET-GATEWAY   [+] WORKGROUP\\pivotuser:pivotpass2024 (Pwn3d!)', 'success');
      }
      return { lines: outLines, nextCtx };
    }

    if (rawTarget.includes('10.10.10.25') || rawTarget.includes('10.10.10.0')) {
      if (!isProxychains && !ctx.pivoting.isPivoted) {
        add('[-] Connection to 10.10.10.25:445 failed: Host Unreachable. (Usa `proxychains crackmapexec ...`)', 'error');
        return { lines: outLines, nextCtx };
      }
      maybeProxychainsHeader('10.10.10.25', 445);
      add('SMB         10.10.10.25     445    WIN-CORP-FILE    [*] Windows Server 2016 Standard (name:WIN-CORP-FILE) (domain:corp.internal)');
      if (isPassTheHash) {
        add('SMB         10.10.10.25     445    WIN-CORP-FILE    [+] corp.internal\\Administrator:9a8a7c1b4e5f0d2a8b3c4d5e6f7a8b9c (Pwn3d!)', 'success');
        add('[+] ¡AUTENTICACIÓN PASS-THE-HASH (PtH) EXITOSA!', 'success');
        add('[*] Has autenticado directamente en Windows SMB sin necesidad de crackear el hash a texto plano.', 'system');
        add('[*] Para obtener consola interactiva de SYSTEM ejecuta: `proxychains psexec.py -hashes :9a8a7c1b4e5f0d2a8b3c4d5e6f7a8b9c Administrator@10.10.10.25`', 'system');
        ctx.compromisedHosts.add('10.10.10.25');
        return { lines: outLines, nextCtx };
      }
      if (activeCmd.includes('itadmin') || activeCmd.includes('P@ssw0rd2024!') || activeCmd.includes('DomainAdmin#2024!') || activeCmd.includes('Administrator')) {
        add('SMB         10.10.10.25     445    WIN-CORP-FILE    [+] corp.internal\\itadmin:P@ssw0rd2024! (Pwn3d!)', 'success');
        add('SMB         10.10.10.25     445    WIN-CORP-FILE    [*] Host vulnerable to PsExec execution! (Metasploit exploit/windows/smb/psexec o psexec.py)', 'success');
        ctx.compromisedHosts.add('10.10.10.25');
      } else {
        add('SMB         10.10.10.25     445    WIN-CORP-FILE    [-] corp.internal\\guest: STATUS_LOGON_FAILURE');
      }
      return { lines: outLines, nextCtx };
    }

    add(`crackmapexec: scanned ${rawTarget}`);
    return { lines: outLines, nextCtx };
  }

  // Impacket Pass-The-Hash tools: psexec.py, wmiexec.py, smbexec.py
  if (binary === 'psexec.py' || binary === 'wmiexec.py' || binary === 'smbexec.py') {
    const isTarget25 = activeCmd.includes('10.10.10.25');
    if (isTarget25) {
      if (!isProxychains && !ctx.pivoting.isPivoted) {
        add('[-] [Errno 113] No route to host. Utiliza `proxychains psexec.py ...`', 'error');
        return { lines: outLines, nextCtx };
      }
      maybeProxychainsHeader('10.10.10.25', 445);
      add('Impacket v0.11.0 - Copyright 2023 Fortra');
      add('[*] Requesting shares on 10.10.10.25.....');
      add('[*] Found writable share ADMIN$');
      add('[*] Uploading payload file to ADMIN$\\...');
      add('[*] Opening SVCManager on 10.10.10.25.....');
      add('[*] Creating service BTOB.....');
      add('[*] Starting service BTOB.....');
      add('[+] ¡Autenticación Pass-The-Hash exitosa! Acceso concedido como NT AUTHORITY\\SYSTEM.', 'success');
      add('Microsoft Windows [Version 10.0.14393]');
      add('(c) 2016 Microsoft Corporation. All rights reserved.');
      add('');
      nextCtx.shellMode = 'win_cmd';
      nextCtx.currentPath = 'C:\\Windows\\system32';
      ctx.compromisedHosts.add('10.10.10.25');
      add('C:\\Windows\\system32> (Sesión interactiva Windows SYSTEM establecida. Escribe \'exit\' para volver a Kali).', 'system');
      return { lines: outLines, nextCtx };
    }
    add('usage: psexec.py [-h] [-hashes LMHASH:NTHASH] [[domain/]username[:password]@]<targetName or address>');
    return { lines: outLines, nextCtx };
  }

  // unshadow (John the Ripper suite - Combina /etc/passwd y /etc/shadow)
  if (binary === 'unshadow') {
    add('[*] unshadow (John the Ripper Suite) - Unificando usuarios y hashes de contraseñas salteadas...');
    add('root:$6$rounds=5000$salt50$4f6b8c9d0e1f2a3b4c5d6e7f8a9b0c1d:0:0:root:/root:/bin/bash');
    add('sysadmin:$6$rounds=5000$salt50$P@ssw0rd2024!hashhere...:1000:1000:sysadmin:/home/sysadmin:/bin/bash');
    add('mike:$6$rounds=5000$salt55$password123hashhere...:1001:1001:mike:/home/mike:/bin/bash');
    add('pivotuser:$6$rounds=5000$salt60$pivotpass2024hash..:1002:1002:pivotuser:/home/pivotuser:/bin/bash');
    add('itadmin:$6$rounds=5000$salt20$P@ssw0rd2024!hashhere...:1003:1003:itadmin:/home/itadmin:/bin/bash');
    if (activeCmd.includes('>') || activeCmd.includes('unshadowed')) {
      add('');
      add('[+] Archivo unshadowed.txt generado con éxito en /home/kali/unshadowed.txt', 'success');
      add('💡 Paso siguiente recomendado en eJPTv2:');
      add('   `john --wordlist=/usr/share/wordlists/rockyou.txt unshadowed.txt`', 'system');
    }
    return { lines: outLines, nextCtx };
  }

  // hashid / hash-identifier
  if (binary === 'hashid' || binary === 'hash-identifier' || binary === 'hash_identifier') {
    const rawParam = args.find(a => !a.startsWith('-')) || '9a8a7c1b4e5f0d2a8b3c4d5e6f7a8b9c';
    add('╔════════════════════════════════════════════════════════════════════════════════╗', 'system');
    add('║           HASH IDENTIFIER / HASHID - eJPTv2 PASSWORD ANALYSIS SUITE            ║', 'system');
    add('╚════════════════════════════════════════════════════════════════════════════════╝', 'system');
    add(`Analizando cadena de hash: "${rawParam}"`);
    add('');

    if (rawParam.startsWith('$6$') || activeCmd.includes('sha512')) {
      add('[+] Algoritmo Identificado: SHA-512 Crypt (Linux /etc/shadow)', 'success');
      add('    • Hashcat Mode: 1800  (`hashcat -m 1800 ...`)', 'success');
      add('    • John Format:  sha512crypt (`john --format=sha512crypt ...`)', 'success');
      add('    [*] Hash característico de sistemas Unix modernos con salt rounds=5000');
    } else if (rawParam.startsWith('$1$') || activeCmd.includes('md5crypt')) {
      add('[+] Algoritmo Identificado: MD5-Crypt (Linux /etc/shadow)', 'success');
      add('    • Hashcat Mode: 500   (`hashcat -m 500 ...`)', 'success');
      add('    • John Format:  md5crypt (`john --format=md5crypt ...`)', 'success');
    } else if (rawParam.startsWith('$2a$') || rawParam.startsWith('$2b$') || activeCmd.includes('bcrypt')) {
      add('[+] Algoritmo Identificado: bcrypt (Blowfish)', 'success');
      add('    • Hashcat Mode: 3200  (`hashcat -m 3200 ...`)', 'success');
      add('    • John Format:  bcrypt (`john --format=bcrypt ...`)', 'success');
    } else if (rawParam.length === 32) {
      add('[+] Longitud: 32 caracteres hexadecimales (128 bits). Posibles algoritmos:', 'success');
      add('    1. NTLM (Windows SAM / Active Directory) -> Hashcat Mode: 1000 | JtR: nt', 'success');
      add('    2. Raw-MD5 (Web & CMS Database dump)     -> Hashcat Mode: 0    | JtR: raw-md5', 'success');
      add('    3. Domain Cached Credentials (DCC / MS-Cache) -> Hashcat Mode: 1100', 'system');
      add('');
      add('💡 Cómo crackear según el origen:', 'system');
      add('   • Si proviene de Windows SAM: `hashcat -m 1000 -a 0 hash.txt /usr/share/wordlists/rockyou.txt`');
      add('   • Si proviene de MySQL/Web:   `john --format=raw-md5 --wordlist=/usr/share/wordlists/rockyou.txt hash.txt`');
    } else {
      add('[+] Posibles algoritmos detectados:', 'success');
      add('    • SHA-256 (Raw)           [Hashcat Mode: 1400 | JtR: raw-sha256]', 'success');
      add('    • SHA-1 (Raw)             [Hashcat Mode: 100  | JtR: raw-sha1]', 'success');
      add('    • NTLMv2 SSP (NetNTLMv2)  [Hashcat Mode: 5600 | JtR: netntlmv2]', 'success');
    }
    return { lines: outLines, nextCtx };
  }

  // Medusa (Parallel Network Logon Cracker)
  if (binary === 'medusa') {
    const target = args.find(a => a.includes('192.168.100.55') || a.includes('192.168.100.50') || a.includes('192.168.100.60') || a.includes('10.10.10.20') || a.includes('10.10.10.25')) || '192.168.100.55';
    const isFtp = activeCmd.includes('-M ftp') || activeCmd.includes('ftp');
    const isSmb = activeCmd.includes('-M smb') || activeCmd.includes('smb');

    add('Medusa v2.2 [http://www.foofus.net] (c) JoMo-Kun / Foofus Networks <jmk@foofus.net>');
    add(`[*] Invocando módulo de autenticación para ${target}...`);
    add('');

    if (target.includes('192.168.100.55')) {
      if (isFtp) {
        add('ACCOUNT FOUND: [ftp] Host: 192.168.100.55 User: mike Password: password123 [SUCCESS]', 'success');
        add('[+] Conexión FTP validada en target-ftp-02.', 'success');
      } else {
        add('ACCOUNT FOUND: [ssh] Host: 192.168.100.55 User: mike Password: password123 [SUCCESS]', 'success');
        add('[+] Conexión SSH validada en target-ftp-02.', 'success');
      }
      ctx.compromisedHosts.add('192.168.100.55');
      return { lines: outLines, nextCtx };
    }

    if (target.includes('192.168.100.50')) {
      add('ACCOUNT FOUND: [ssh] Host: 192.168.100.50 User: sysadmin Password: P@ssw0rd2024! [SUCCESS]', 'success');
      ctx.compromisedHosts.add('192.168.100.50');
      return { lines: outLines, nextCtx };
    }

    if (target.includes('192.168.100.60')) {
      if (isSmb) {
        add('ACCOUNT FOUND: [smb] Host: 192.168.100.60 User: pivotuser Password: pivotpass2024 [SUCCESS]', 'success');
      } else {
        add('ACCOUNT FOUND: [ssh] Host: 192.168.100.60 User: pivotuser Password: pivotpass2024 [SUCCESS]', 'success');
      }
      ctx.compromisedHosts.add('192.168.100.60');
      return { lines: outLines, nextCtx };
    }

    if (target.includes('10.10.10.20')) {
      if (!isProxychains && !ctx.pivoting.isPivoted) {
        add('[-] [ERROR] Connection to 10.10.10.20 failed: Host unreachable. Usa `proxychains medusa ...`', 'error');
        return { lines: outLines, nextCtx };
      }
      maybeProxychainsHeader('10.10.10.20', 22);
      add('ACCOUNT FOUND: [ssh] Host: 10.10.10.20 User: itadmin Password: P@ssw0rd2024! [SUCCESS]', 'success');
      ctx.compromisedHosts.add('10.10.10.20');
      return { lines: outLines, nextCtx };
    }

    add('Medusa: No valid credentials discovered with specified user/password combination.');
    return { lines: outLines, nextCtx };
  }

  // CeWL (Custom Word List generator by spidering web applications)
  if (binary === 'cewl') {
    const targetUrl = args.find(a => a.startsWith('http')) || 'http://192.168.100.50';
    add('CeWL 5.4.8 (Custom Word List generator) Robin Wood (robin@digi.ninja)');
    add(`[+] Spidering web application: ${targetUrl}`);
    add('[+] Crawling internal links and parsing HTML body, titles, meta tags and form inputs...');
    add('[*] Extrayendo palabras clave corporativas (longitud mínima: 5)...');
    add('    → Palabras encontradas: Enterprise, Portal, Financial, Gateway, Security,');
    add('      Administrator, Corporate, Production, Database, Sysadmin, Internal, Compliance');
    add('[+] Diccionario personalizado creado: /root/loot/cewl_wordlist.txt (52 palabras únicas)', 'success');
    add('💡 Úsalo para ataque de fuerza bruta dirigido:');
    add('   `hydra -L /root/loot/users.txt -P /root/loot/cewl_wordlist.txt 192.168.100.50 ssh`', 'system');
    return { lines: outLines, nextCtx };
  }

  // Crunch (Wordlist generator based on charset & lengths)
  if (binary === 'crunch') {
    const minLen = args[0] || '6';
    const maxLen = args[1] || '8';
    add('Crunch version 3.6');
    add(`Crunch will now generate character permutations from length ${minLen} to ${maxLen}.`);
    add('Crunch will now generate the following amount of data: 4194304 bytes (4 MB)');
    add('0 MB');
    add('[+] Generando permutaciones de caracteres solicitadas...');
    add('    → 000000, 000001, 000002 ... 99999999');
    add('[+] Diccionario guardado con éxito en: /root/loot/crunch_wordlist.txt', 'success');
    return { lines: outLines, nextCtx };
  }

  // CUPP (Common User Passwords Profiler)
  if (binary === 'cupp' || binary === 'cupp.py') {
    add(' ___________');
    add('   cupp.py!                 # Common User Passwords Profiler');
    add('      \\                     # Generador de Diccionarios Personalizados eJPTv2');
    add('       \\   /\\   /\\');
    add('        \\ ( o.o )');
    add('           > ^ <');
    add('');
    add('[+] Perfilando información del objetivo...');
    add(' > First Name: Mike');
    add(' > Surname: Sanders');
    add(' > Nickname: mike');
    add(' > Target company / lab: CorpNet');
    add(' > Year / Special digits: 2024, 123');
    add('[+] Generando permutaciones y combinaciones con leetspeak...');
    add('[+] Diccionario generado y guardado en: /root/loot/cupp_passwords.txt (312 palabras)', 'success');
    add('💡 Úsalo contra los servicios de la máquina objetivo con Hydra:');
    add('   `hydra -l mike -P /root/loot/cupp_passwords.txt 192.168.100.55 ftp`', 'system');
    return { lines: outLines, nextCtx };
  }

  // zip2john (John the Ripper Suite - ZIP Password Hash Extractor)
  if (binary === 'zip2john') {
    const zipTarget = args.find(a => !a.startsWith('-')) || '/srv/ftp/confidential_backup.zip';
    add(`ver 2.0 efh 5455 efh 7875 ${zipTarget}->confidential_note.txt PKZIP Encr: cmplen=182, decmplen=312, crc=8F2B6A3D`);
    add(`${zipTarget}:$pkzip$1*1*2*0*b6*138*8f2b6a3d*0*2a*0*b6*e42a*f390d45a9018be27cb84918f6731ec26a422eb727e025da38c645b...$/pkzip$:confidential_note.txt:${zipTarget}::${zipTarget}`, 'success');
    if (activeCmd.includes('>') || activeCmd.includes('zip.hash') || activeCmd.includes('hash')) {
      add('');
      add('[+] Hash PKZIP extraído y guardado en archivo zip.hash', 'success');
      add('💡 Paso siguiente: Crackear con John the Ripper: `john --wordlist=/usr/share/wordlists/rockyou.txt zip.hash`', 'system');
    }
    return { lines: outLines, nextCtx };
  }

  // ssh2john (John the Ripper Suite - SSH Private Key Hash Extractor)
  if (binary === 'ssh2john' || binary === 'ssh2john.py') {
    const keyTarget = args.find(a => !a.startsWith('-')) || 'id_rsa';
    add(`${keyTarget}:$sshng$1$16$a3b5c7d9e1f2a4b6c8d0e2f4a6b8c0d2$1024$1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b...`, 'success');
    add('[+] Hash de clave privada SSH (RSA) extraído con éxito.', 'success');
    add('💡 Paso siguiente: `john --wordlist=/usr/share/wordlists/rockyou.txt id_rsa.hash`', 'system');
    return { lines: outLines, nextCtx };
  }

  // fcrackzip (Fast ZIP Password Cracker)
  if (binary === 'fcrackzip') {
    const zipTarget = args.find(a => a.endsWith('.zip')) || 'confidential_backup.zip';
    add(`fcrackzip Version 0.3, a fast password cracker by Marc Lehmann <pcg@goof.com>`);
    add(`checking file ${zipTarget}, file size: 1420 bytes`);
    add(`discovering password using dictionary /usr/share/wordlists/rockyou.txt...`);
    add(`PASSWORD FOUND!!!!: pw == password123`, 'success');
    add(`[+] Contraseña del archivo ZIP recuperada: "password123"`, 'success');
    return { lines: outLines, nextCtx };
  }

  // WPScan (WordPress Security Scanner) - Herramienta Imprescindible eJPTv2 (r1vs3c)
  if (binary === 'wpscan') {
    const targetUrl = args.find(a => a.startsWith('http')) || 'http://192.168.100.50/blog';
    const isBrute = activeCmd.includes('-U') || activeCmd.includes('--usernames') || activeCmd.includes('-P') || activeCmd.includes('--passwords') || activeCmd.includes('rockyou');
    const isEnumerate = activeCmd.includes('--enumerate') || activeCmd.includes('-e');

    add('_______________________________________________________________');
    add('        __          _______   _____');
    add('        \\ \\        / /  __ \\ / ____|');
    add('         \\ \\  /\\  / /| |__) | (___   ___  __ _ _ __');
    add('          \\ \\/  \\/ / |  ___/ \\___ \\ / __|/ _` | \'_ \\');
    add('           \\  /\\  /  | |     ____) | (__| (_| | | | |');
    add('            \\/  \\/   |_|    |_____/ \\___|\\__,_|_| |_|');
    add('');
    add('        WordPress Security Scanner by the WPScan Team');
    add('        Version 3.8.25 | Sponsored by Automattic');
    add('_______________________________________________________________', 'system');
    add(`[+] URL: ${targetUrl}`);
    add(`[+] Effective URL: ${targetUrl}/`);
    add('[+] Started: ' + new Date().toUTCString());
    add('[+] Finding WordPress version: 5.7.2 (Vulnerable to XXE / CVE-2021-29447)');
    add('[+] XML-RPC Interface: http://192.168.100.50/blog/xmlrpc.php (Enabled)');
    add('[+] robots.txt found: http://192.168.100.50/blog/robots.txt (Disallowed: /wp-admin/, /backups/)');
    add('');

    if (isEnumerate || !isBrute) {
      add('[i] User(s) Identified:');
      add('    [+] sysadmin (ID: 1, URL: http://192.168.100.50/blog/author/sysadmin/)', 'success');
      add('    [+] admin (ID: 2)');
      add('    [+] webmaster (ID: 3)');
      add('');
      add('[i] Plugin(s) Identified:');
      add('    [+] simple-file-list (v4.2.2) - Arbitrary File Upload (CVE-2020-14902)', 'error');
      add('    [+] contact-form-7 (v5.3.2) - Unrestricted File Upload vulnerability');
      add('    [+] akismet (v4.1.8)');
    }

    if (isBrute) {
      add('');
      add('[+] Performing password attack against wp-login.php using /usr/share/wordlists/rockyou.txt...');
      add('[SUCCESS] Valid combination found:');
      add('    Username: sysadmin', 'success');
      add('    Password: P@ssw0rd2024!', 'success');
      add('[+] Credenciales de Administrador de WordPress confirmadas: sysadmin : P@ssw0rd2024!', 'success');
      ctx.discoveredHosts.add('192.168.100.50');
      ctx.compromisedHosts.add('192.168.100.50');
    } else {
      add('');
      add('💡 Consejo eJPTv2: Realiza fuerza bruta sobre el usuario identificado sysadmin con:');
      add('   `wpscan --url http://192.168.100.50/blog -U sysadmin -P /usr/share/wordlists/rockyou.txt`', 'system');
    }

    return { lines: outLines, nextCtx };
  }

  // xfreerdp & rdesktop (Remote Desktop Protocol - RDP GUI Access) - Imprescindible eJPTv2 (r1vs3c)
  if (binary === 'xfreerdp' || binary === 'rdesktop') {
    const targetArg = args.find(a => a.startsWith('/v:') || a.includes('10.10.10.25') || a.includes('192.168.100.') || a.includes('10.20.30.')) || '';
    const targetHost = targetArg.replace('/v:', '').split(':')[0] || '10.10.10.25';
    const isInternal = targetHost.startsWith('10.10.10.') || targetHost.startsWith('10.20.30.');

    if (isInternal && !isProxychains && !ctx.pivoting.isPivoted) {
      add(`[ERROR][com.freerdp.core] - freerdp_tcp_connect: failed to connect to ${targetHost}:3389 (Connection refused: No route to host)`, 'error');
      add(`[-] Error: El host ${targetHost} pertenece a la subred interna y no es accesible de forma directa.`, 'error');
      add(`💡 Metodología eJPTv2: Levanta el túnel pivote SOCKS y conéctate anteponiendo proxychains:`, 'system');
      add(`   \`proxychains xfreerdp /v:${targetHost} /u:Administrator /p:P@ssw0rd2024! /cert:ignore\``, 'system');
      return { lines: outLines, nextCtx };
    }

    maybeProxychainsHeader(targetHost, 3389);
    add('[INFO][com.freerdp.core] - freerdp_connect: connecting to ' + targetHost + ':3389');
    add('[INFO][com.freerdp.core.nego] - Enabling TLS security layer');
    add('[INFO][com.freerdp.core.nego] - Server certificate accepted: TLS-SHA256 (Self-signed)');
    add('[INFO][com.freerdp.core.connection] - Connection established to Windows Server 2019 (target-win-05.corp.internal)', 'success');
    add('[INFO][com.freerdp.client.x11] - Authentication successful. Initializing desktop graphical session...', 'success');
    add('╔════════════════════════════════════════════════════════════════════════════════╗', 'system');
    add('║           WINDOWS REMOTE DESKTOP (RDP) GUI SESSION - 10.10.10.25               ║', 'system');
    add('║       Logged in as: Administrator | OS: Windows Server 2019 Datacenter         ║', 'system');
    add('╚════════════════════════════════════════════════════════════════════════════════╝', 'system');
    add(' Desktop Explorer initialized. Reading desktop shortcuts and files:');
    add('   [File] C:\\Users\\Administrator\\Desktop\\Server_Maintenance.bat');
    add('   [File] C:\\Users\\Administrator\\Desktop\\flag.txt', 'success');
    add('');
    add(' --- Contenido de C:\\Users\\Administrator\\Desktop\\flag.txt ---', 'system');
    add(' FLAG_WIN_SYSTEM{w1nd0ws_psexec_system_cr4cked}', 'success');
    add(' -------------------------------------------------------------', 'system');
    add('[+] ¡Host 10.10.10.25 comprometido con acceso GUI Administrativo completo!', 'success');
    ctx.compromisedHosts.add('10.10.10.25');
    ctx.foundFlags.add('flag-internal-win');
    return { lines: outLines, nextCtx };
  }

  // evil-winrm (Windows Remote Management Shell) - Imprescindible eJPTv2 (r1vs3c)
  if (binary === 'evil-winrm') {
    const targetHost = args.find(a => a.startsWith('-i') ? false : (a.includes('10.10.10.') || a.includes('10.20.30.'))) || args[args.indexOf('-i') + 1] || '10.10.10.25';
    const isInternal = targetHost.startsWith('10.10.10.') || targetHost.startsWith('10.20.30.');

    if (isInternal && !isProxychains && !ctx.pivoting.isPivoted) {
      add(`[ERROR] Connection failed to ${targetHost}:5985 (Connection timed out / No route to host)`, 'error');
      add(`[-] Usa \`proxychains evil-winrm -i 10.10.10.25 -u itadmin -p 'P@ssw0rd2024!'\` a través del pivote.`, 'system');
      return { lines: outLines, nextCtx };
    }

    maybeProxychainsHeader(targetHost, 5985);
    add('');
    add('Evil-WinRM shell v3.5 (eJPTv2 Windows Post-Exploitation Suite)', 'system');
    add('Info: Establishing WinRM connection to ' + targetHost + ':5985...');
    add('[*] Protocol: HTTP/WinRM (wsman) on port 5985');
    add('[+] Basic Authentication valid for itadmin!');
    add('[+] Session open! Entering Windows interactive PowerShell / CMD prompt.', 'success');
    add('');
    add('💡 Escribe `whoami`, `dir`, `type C:\\Users\\Administrator\\Desktop\\flag.txt` o `exit` para volver.');
    nextCtx.shellMode = 'win_cmd';
    ctx.compromisedHosts.add('10.10.10.25');
    return { lines: outLines, nextCtx };
  }

  // ncrack (High-speed Network Authentication Cracker)
  if (binary === 'ncrack') {
    add('Starting Ncrack 0.7 ( http://ncrack.org ) at ' + new Date().toUTCString());
    add('[*] Reading credentials permutations and establishing concurrent threads...');
    const target = activeCmd.includes('192.168.100.55') ? '192.168.100.55' : activeCmd.includes('192.168.100.60') ? '192.168.100.60' : '192.168.100.50';
    if (activeCmd.includes('ftp') || target === '192.168.100.55') {
      add('Discovered credentials on 192.168.100.55:21/tcp:');
      add('192.168.100.55 21/tcp ftp: \'mike\' \'password123\'', 'success');
      add('Ncrack done: 1 service scanned in 3.12 seconds. 1 credentials found.', 'success');
      ctx.compromisedHosts.add('192.168.100.55');
    } else if (activeCmd.includes('ssh') && target === '192.168.100.60') {
      add('Discovered credentials on 192.168.100.60:22/tcp:');
      add('192.168.100.60 22/tcp ssh: \'pivotuser\' \'pivotpass2024\'', 'success');
      add('Ncrack done: 1 service scanned in 2.80 seconds. 1 credentials found.', 'success');
      ctx.compromisedHosts.add('192.168.100.60');
    } else {
      add('Discovered credentials on 192.168.100.50:22/tcp:');
      add('192.168.100.50 22/tcp ssh: \'sysadmin\' \'P@ssw0rd2024!\'', 'success');
      add('Ncrack done: 1 service scanned in 3.45 seconds. 1 credentials found.', 'success');
      ctx.compromisedHosts.add('192.168.100.50');
    }
    return { lines: outLines, nextCtx };
  }

  // Hydra (Multiprotocol Network Logon Cracker)
  if (binary === 'hydra') {
    const target = args.find(a => a.includes('192.168.100.55') || a.includes('192.168.100.50') || a.includes('192.168.100.60') || a.includes('10.10.10.20') || a.includes('10.10.10.25') || a.includes('172.16.50.')) || '';
    const isFtp = activeCmd.includes('ftp') || activeCmd.includes('21');
    const isSmb = activeCmd.includes('smb') || activeCmd.includes('445');
    const isHttp = activeCmd.includes('http-get') || activeCmd.includes('http-post-form') || activeCmd.includes('http');
    const hasNsr = activeCmd.includes('-e nsr') || activeCmd.includes('-e ns') || activeCmd.includes('-e s');
    const isPasswordSpray = activeCmd.includes('-L') && activeCmd.includes('-p');

    add('Hydra v9.5 (c) 2023 by van Hauser / THC - Network Logon Cracker');
    add('[DATA] max 16 tasks per 1 server, overall 16 tasks, testing credential permutations...');
    if (hasNsr) {
      add('[DATA] Flag -e nsr activo: Probando contraseñas nulas, login-as-password y login inverso.', 'system');
    }
    if (isPasswordSpray) {
      add('[DATA] Modo Password Spraying activo: Probando contraseña única contra lista de usuarios...', 'system');
    }

    if (target.includes('192.168.100.55')) {
      if (isFtp) {
        add('[ATTEMPT] target 192.168.100.55:21 - login "mike" - pass "password123"');
        add('[21][ftp] host: 192.168.100.55   login: mike   password: password123', 'success');
        add('[+] 1 of 1 target successfully completed, 1 valid password found (FTP)!', 'success');
      } else {
        add('[ATTEMPT] target 192.168.100.55:22 - login "mike" - pass "password123"');
        add('[22][ssh] host: 192.168.100.55   login: mike   password: password123', 'success');
        add('[+] 1 of 1 target successfully completed, 1 valid password found (SSH)!', 'success');
      }
      ctx.compromisedHosts.add('192.168.100.55');
      return { lines: outLines, nextCtx };
    }

    if (target.includes('192.168.100.60')) {
      if (isSmb) {
        add('[445][smb] host: 192.168.100.60   login: pivotuser   password: pivotpass2024', 'success');
      } else {
        add('[ATTEMPT] target 192.168.100.60:22 - login "pivotuser" - pass "pivotpass2024"');
        add('[22][ssh] host: 192.168.100.60   login: pivotuser   password: pivotpass2024', 'success');
        add('[+] ¡CREDENCIAL DE GATEWAY CONFIRMADA! pivotuser : pivotpass2024', 'success');
        add('[*] Ahora puedes establecer el túnel SOCKS con: `ssh -D 1080 -N -f pivotuser@192.168.100.60`', 'system');
      }
      ctx.compromisedHosts.add('192.168.100.60');
      return { lines: outLines, nextCtx };
    }

    if (target.includes('192.168.100.50')) {
      if (isHttp) {
        add('[80][http-post-form] host: 192.168.100.50   login: admin   password: P@ssw0rd2024!', 'success');
        add('[+] Formulario web autenticado con éxito.', 'success');
      } else {
        add('[ATTEMPT] target 192.168.100.50:22 - login "sysadmin" - pass "P@ssw0rd2024!"');
        add('[22][ssh] host: 192.168.100.50   login: sysadmin   password: P@ssw0rd2024!', 'success');
        add('[+] 1 of 1 target successfully completed, 1 valid password found!', 'success');
      }
      ctx.compromisedHosts.add('192.168.100.50');
      return { lines: outLines, nextCtx };
    }

    if (target.includes('10.10.10.20')) {
      if (!isProxychains && !ctx.pivoting.isPivoted) {
        add('[-] [ERROR] Connection to 10.10.10.20 failed: No route to host. Utiliza `proxychains hydra ...`', 'error');
        return { lines: outLines, nextCtx };
      }
      maybeProxychainsHeader('10.10.10.20', 22);
      add('[ATTEMPT] target 10.10.10.20:22 - login "itadmin" - pass "P@ssw0rd2024!"');
      add('[22][ssh] host: 10.10.10.20   login: itadmin   password: P@ssw0rd2024!', 'success');
      add('[+] ¡ÉXITO POR REUTILIZACIÓN DE CREDENCIALES (eJPTv2 Exam Technique)!', 'success');
      add('[+] La clave del administrador interno itadmin reutiliza la contraseña "P@ssw0rd2024!" obtenida en la DMZ.', 'success');
      ctx.compromisedHosts.add('10.10.10.20');
      return { lines: outLines, nextCtx };
    }

    if (target.includes('10.10.10.25')) {
      if (!isProxychains && !ctx.pivoting.isPivoted) {
        add('[-] [ERROR] Connection to 10.10.10.25:445 failed: No route to host. Utiliza `proxychains hydra ...`', 'error');
        return { lines: outLines, nextCtx };
      }
      maybeProxychainsHeader('10.10.10.25', 445);
      add('[445][smb] host: 10.10.10.25   login: Administrator   password: DomainAdmin#2024!', 'success');
      add('[+] Credencial de Administrador de Dominio Windows confirmada.', 'success');
      ctx.compromisedHosts.add('10.10.10.25');
      return { lines: outLines, nextCtx };
    }

    add('[+] Realizando ataque de fuerza bruta cruzado con lista personalizada...');
    add('[22][ssh] host: 192.168.100.55   login: mike   password: password123', 'success');
    add('[+] 1 password found via custom harvested wordlist.', 'success');
    ctx.compromisedHosts.add('192.168.100.55');
    return { lines: outLines, nextCtx };
  }

  // Wordlist generator utility: generate-wordlist
  if (binary === 'generate-wordlist') {
    add('[+] =========================================================================', 'system');
    add('[+] eJPTv2 CUSTOM WORDLIST GENERATOR (Harvested Users & Password Spray)', 'system');
    add('[+] =========================================================================', 'system');
    add('[*] Cosechando usuarios de /etc/passwd, enum4linux y volcados SQL...');
    add('    → Encontrados: sysadmin, mike, pivotuser, developer, itadmin, sysuser, administrator');
    add('[*] Generando permutaciones cruzadas (Username-as-Password, años, mayúsculas)...');
    add('[+] Diccionario guardado en: /root/loot/passwords.txt (38 palabras)', 'success');
    add('[+] Lista de usuarios guardada en: /root/loot/users.txt (7 usuarios)', 'success');
    add('[*] Para ejecutar el ataque de fuerza bruta contra SSH:');
    add('    `hydra -L /root/loot/users.txt -P /root/loot/passwords.txt 192.168.100.55 ssh`', 'success');
    return { lines: outLines, nextCtx };
  }

  // SQLMap
  if (binary === 'sqlmap') {
    const isTarget20 = activeCmd.includes('10.10.10.20');
    if (isTarget20) {
      if (!isProxychains && !ctx.pivoting.isPivoted) {
        add('[CRITICAL] connection to 10.10.10.20:80 failed: No route to host', 'error');
        return { lines: outLines, nextCtx };
      }
      maybeProxychainsHeader('10.10.10.20', 80);
      add('        ___');
      add('       __H__');
      add(' ___ ___[,]_____ ___ ___  {1.7.11#stable}');
      add('|_ -| . [)]     | .\'| . |');
      add('|___|_  ["]_|_|_|__,|  _|  http://sqlmap.org');
      add('      |_|           |_|');
      add('');
      add('[+] Testing connection to the target URL');
      add('[+] Parameter: id (GET)');
      add('    Type: boolean-based blind / error-based / UNION query');
      add('    Title: MySQL >= 5.0 AND error-based - WHERE, HAVING, ORDER BY or GROUP BY clause');
      add('    Payload: id=1 AND (SELECT 2*(IF((SELECT * FROM (SELECT CONCAT(0x7171787a71,(SELECT @@version),0x7170707a71,0x20))s), 8446744073709551610, 8446744073709551610))');
      add('[INFO] the back-end DBMS is MySQL 5.7.35', 'success');

      if (args.includes('--dbs')) {
        add('[+] available databases [2]:');
        add('    [*] corp_internal', 'success');
        add('    [*] information_schema');
      } else if (args.includes('--dump') || args.includes('-D')) {
        add('Database: corp_internal');
        add('Table: users');
        add('[2 entries]');
        add('+----+----------+----------------------------------+-----------------------+');
        add('| id | username | password_hash (MD5)              | email                 |');
        add('+----+----------+----------------------------------+-----------------------+');
        add('| 1  | sysuser  | e10adc3949ba59abbe56e057f20f883e | sysuser@corp.internal |');
        add('| 2  | itadmin  | 9a8a7... (MD5: P@ssw0rd2024!)    | itadmin@corp.internal |');
        add('+----+----------+----------------------------------+-----------------------+', 'success');
        add('');
        add('Table: system_secrets');
        add('[1 entry]');
        add('+----+---------------------------------------------+');
        add('| id | secret_flag                                 |');
        add('+----+---------------------------------------------+');
        add('| 1  | FLAG_INTERNAL_SQL{sql_injecti0n_pivot_d0ne} |', 'success');
        add('+----+---------------------------------------------+');
        ctx.foundFlags.add('flag-internal-sql');
      } else {
        add('[+] Parameter `id` is vulnerable. Try using `--dbs` or `--dump -D corp_internal`.');
      }
      return { lines: outLines, nextCtx };
    }
    add('sqlmap: specify a target with -u "http://..."');
    return { lines: outLines, nextCtx };
  }

  // John the Ripper (Password Cracker with multiple formats)
  if (binary === 'john') {
    const isShow = args.includes('--show');
    const isFormatSha512 = activeCmd.includes('sha512crypt') || activeCmd.includes('sha512');
    const isFormatNT = activeCmd.includes('NT') || activeCmd.includes('ntlm') || activeCmd.includes('format=nt');
    const isFormatBcrypt = activeCmd.includes('bcrypt');
    const isFormatMD5Crypt = activeCmd.includes('md5crypt');
    const isUnshadowed = activeCmd.includes('unshadowed') || activeCmd.includes('shadow');

    if (isShow) {
      add('sysuser:123456:1:sysuser@corp.internal');
      add('itadmin:P@ssw0rd2024!:2:itadmin@corp.internal', 'success');
      add('sysadmin:P@ssw0rd2024!:1000:sysadmin@target-web-01', 'success');
      add('mike:password123:1001:mike@target-ftp-02', 'success');
      add('pivotuser:pivotpass2024:1002:pivotuser@target-gateway-03', 'success');
      add('Administrator:DomainAdmin#2024!:500:Administrator@WIN-CORP-FILE', 'success');
      add('6 password hashes cracked, 0 left');
      return { lines: outLines, nextCtx };
    }

    add('Created directory: /root/.john');

    if (isFormatSha512 || isUnshadowed) {
      add('Loaded 4 password hashes with 4 different salts (sha512crypt, crypt(3) $6$ [SHA512 128/128 AVX 4x3])');
      add('Cost 1 (iteration count) is 5000 for all loaded hashes');
      add('Will run 16 OpenMP threads');
      add('Press \'q\' or Ctrl-C to abort, almost any other key for status');
      add('password123      (mike)', 'success');
      add('pivotpass2024    (pivotuser)', 'success');
      add('P@ssw0rd2024!    (sysadmin)', 'success');
      add('P@ssw0rd2024!    (itadmin)', 'success');
      add('4g 0:00:00:03 DONE 100% (2026-10-08) 1.250g/s 42100p/s 42100c/s 42100C/s P@ssw0rd2024!..password123');
      add('Use the "--show" option to display all of the cracked passwords reliably', 'system');
      add('[+] ¡Hashes de /etc/shadow y unshadowed.txt crackeados con éxito!', 'success');
      add('    • mike      : password123');
      add('    • sysadmin  : P@ssw0rd2024!');
      add('    • pivotuser : pivotpass2024');
      add('    • itadmin   : P@ssw0rd2024!');
      return { lines: outLines, nextCtx };
    }

    if (isFormatNT) {
      add('Loaded 3 password hashes (NT [MD4 128/128 AVX 4x3])');
      add('Will run 16 OpenMP threads');
      add('123456           (sysuser)');
      add('DomainAdmin#2024! (Administrator)', 'success');
      add('P@ssw0rd2024!    (itadmin)', 'success');
      add('3g 0:00:00:01 DONE (2026-10-08) 300.0g/s 520000p/s 520000c/s 520000C/s DomainAdmin#2024!..123456');
      add('[+] Hashes NTLM de Windows Active Directory crackeados con éxito.', 'success');
      return { lines: outLines, nextCtx };
    }

    add('Loaded 2 password hashes (Raw-MD5 [MD5 128/128 AVX 4x3])');
    add('Cost 1 (iteration count) is 1 for all loaded hashes');
    add('Will run 16 OpenMP threads');
    add('123456           (sysuser)');
    add('P@ssw0rd2024!    (itadmin)', 'success');
    add('2g 0:00:00:00 DONE (2026-10-08 09:00) 100.0g/s 45200p/s 45200c/s 45200C/s P@ssw0rd2024!..123456');
    add('Use the "--show" option to display all of the cracked passwords reliably', 'system');
    add('[+] ¡Hash crackeado con éxito! itadmin : P@ssw0rd2024!', 'success');
    return { lines: outLines, nextCtx };
  }

  // Hashcat (GPU/CPU High Performance Password Cracker)
  if (binary === 'hashcat') {
    const isShow = args.includes('--show');
    const isNTLM = activeCmd.includes('-m 1000') || activeCmd.includes('1000');
    const isSha512 = activeCmd.includes('-m 1800') || activeCmd.includes('1800');
    const isMD5Crypt = activeCmd.includes('-m 500') || activeCmd.includes('500');
    const isBcrypt = activeCmd.includes('-m 3200') || activeCmd.includes('3200');
    
    if (isShow) {
      add('e10adc3949ba59abbe56e057f20f883e:123456');
      add('9a8a7c1b4e5f0d2a8b3c4d5e6f7a8b9c:P@ssw0rd2024!', 'success');
      add('$6$rounds=5000$salt55$pass123:password123', 'success');
      add('$6$rounds=5000$salt50$pass50:P@ssw0rd2024!', 'success');
      return { lines: outLines, nextCtx };
    }

    add('hashcat (v6.2.6) starting in autodetect/dictionary mode...');
    add('OpenCL API (OpenCL 3.0 PoCL 3.0+git) - Platform #1 [The pocl project]');

    if (isSha512) {
      add('* Hash-Mode: 1800 (sha512crypt $6$, SHA512 (Unix))');
      add('* Dictionary: /usr/share/wordlists/rockyou.txt (14,344,392 words)');
      add('Speed.#1.........:   482.1 kH/s (8.12ms) @ Accel:512 Loops:64 Thr:16 Vec:1');
      add('Recovered........: 3/3 (100.00%) Digests, 3/3 (100.00%) Salts');
      add('');
      add('$6$rounds=5000$salt55$password123...:password123', 'success');
      add('$6$rounds=5000$salt50$P@ssw0rd2024...:P@ssw0rd2024!', 'success');
      add('$6$rounds=5000$salt20$P@ssw0rd2024...:P@ssw0rd2024!', 'success');
      add('');
      add('Status...........: Cracked', 'success');
      add('[+] Hashcat completado: Hashes de Linux /etc/shadow recuperados con éxito.', 'success');
      return { lines: outLines, nextCtx };
    }

    if (isNTLM) {
      add('* Hash-Mode: 1000 (NTLM)');
      add('* Dictionary: /usr/share/wordlists/rockyou.txt');
      add('Speed.#1.........:   1842.4 MH/s (0.02ms) @ Accel:1024 Loops:1 Thr:64 Vec:1');
      add('Recovered........: 2/2 (100.00%) Digests');
      add('');
      add('e10adc3949ba59abbe56e057f20f883e:123456');
      add('9a8a7c1b4e5f0d2a8b3c4d5e6f7a8b9c:P@ssw0rd2024!', 'success');
      add('');
      add('Status...........: Cracked', 'success');
      add('[+] Hashcat NTLM completado: Contraseña recuperada para itadmin = P@ssw0rd2024!', 'success');
      return { lines: outLines, nextCtx };
    }

    add(`* Hash-Mode: ${isMD5Crypt ? '500 (md5crypt)' : isBcrypt ? '3200 (bcrypt)' : '0 (MD5)'}`);
    add('* Dictionary: /usr/share/wordlists/rockyou.txt');
    add('Speed.#1.........:   128.4 MH/s (0.12ms) @ Accel:1024 Loops:1 Thr:64 Vec:1');
    add('Recovered........: 2/2 (100.00%) Digests');
    add('');
    add('e10adc3949ba59abbe56e057f20f883e:123456');
    add('9a8a7c1b4e5f0d2a8b3c4d5e6f7a8b9c:P@ssw0rd2024!', 'success');
    add('');
    add('Status...........: Cracked', 'success');
    add('[+] Hashcat completado: Contraseña recuperada para itadmin = P@ssw0rd2024!', 'success');
    return { lines: outLines, nextCtx };
  }

  // LinPEAS (Linux Privilege Escalation Awesome Script)
  if (binary === 'linpeas.sh' || binary === './linpeas.sh' || binary === 'linpeas') {
    add('                            ', 'system');
    add('               ▄▄▄▄▄▄▄      LinPEAS - Linux Privilege Escalation Awesome Script', 'system');
    add('            ▄███████████▄   Version: 2026-v3.1 (eJPTv2 Exam Suite Edition)', 'system');
    add('          ▄███████████████▄ By carlospolop', 'system');
    add('          █████████████████ ', 'system');
    add('═══════════════════════════════════════════════════════════════════════════════', 'system');
    add('Legenda:');
    add('  RED/YELLOW: 99% Privilege Escalation Vector', 'error');
    add('  RED: High probability of privilege escalation', 'error');
    add('');
    add('╔══════════╣ Basic System Information');
    add('OS: Linux version 5.4.0-131-generic (buildd@lcy02-amd64-073) (gcc version 9.4.0)');
    add('Host: target-web-01 (192.168.100.50) | tun0: 192.168.100.10');
    add('');
    add('╔══════════╣ Sudo version and permissions (Check `sudo -l`)');
    add('[-] User sysadmin may run the following commands on target-web-01:');
    add('    (root) NOPASSWD: /usr/bin/find', 'error');
    add('    [!] VULNERABLE: Binary /usr/bin/find can be abused to spawn a root shell via GTFOBins!', 'error');
    add('    [!] Exploit command: `sudo find . -exec /bin/bash \\; -quit`', 'success');
    add('');
    add('╔══════════╣ Interesting files and backups');
    add('[-] Found readable backup in webroot:');
    add('    /var/backups/db_config.php.bak (Contains hardcoded MySQL & Admin credentials!)', 'success');
    add('');
    add('╔══════════╣ Active Network Listeners');
    add('    127.0.0.1:3306 (MySQL Database)');
    add('    0.0.0.0:80 (Apache HTTP)');
    add('    0.0.0.0:22 (OpenSSH)');
    add('═══════════════════════════════════════════════════════════════════════════════', 'system');
    add('[+] LinPEAS audit finished. 1 critical escalation path found: Sudo find.', 'success');
    return { lines: outLines, nextCtx };
  }

  // WinPEAS (Windows Privilege Escalation Awesome Script)
  if (binary === 'winpeas.bat' || binary === 'winpeas.exe' || binary === 'winpeas' || binary === './winpeas.exe') {
    add('               ', 'system');
    add('               ((((((((((((   WinPEAS - Windows Privilege Escalation Awesome Script', 'system');
    add('               ((((((((((((   Version: 2026-v2.8 (eJPTv2 Exam Suite Edition)', 'system');
    add('               ((((((((((((   By carlospolop', 'system');
    add('═══════════════════════════════════════════════════════════════════════════════', 'system');
    add('╔══════════╣ System Info');
    add('OS Name: Microsoft Windows Server 2016 Datacenter / 2019 Standard');
    add('OS Version: 10.0.14393 N/A Build 14393');
    add('HotFix(es): 4 HotFixes Installed.');
    add('');
    add('╔══════════╣ Windows Privesc Vectors');
    add('[-] Checking AlwaysInstallElevated registry keys:');
    add('    AlwaysInstallElevated: 0 (Not vulnerable)');
    add('');
    add('[-] Checking Services & Unquoted Service Paths:');
    add('    [+] Service: "CorpBackupAgent"');
    add('        Path: C:\\Program Files\\BackupAgent\\agent.exe (Folder permissions: Users (F) Full Control)', 'error');
    add('');
    add('[-] Checking LSA Secrets & Credential Manager:');
    add('    [+] Cached Administrator Domain Credentials found in LSASS', 'success');
    add('');
    add('[-] Interesting Files in Desktop:');
    add('    C:\\Users\\Administrator\\Desktop\\flag.txt (Read access allowed for SYSTEM)', 'success');
    add('═══════════════════════════════════════════════════════════════════════════════', 'system');
    add('[+] WinPEAS audit finished.', 'success');
    return { lines: outLines, nextCtx };
  }

  // Searchsploit
  if (binary === 'searchsploit') {
    const query = args.join(' ');
    if (query.includes('badblue') || query.includes('BadBlue')) {
      add('------------------------------------------------------------------ ---------------------------------');
      add(' Exploit Title                                                   |  Path');
      add('------------------------------------------------------------------ ---------------------------------');
      add(' BadBlue 2.72b - Pass-Thru Buffer Overflow (Metasploit)          | windows/remote/16817.rb', 'success');
      add(' BadBlue 2.7 - Ext.dll Buffer Overflow                           | windows/remote/3001.c');
      add('------------------------------------------------------------------ ---------------------------------');
      add('Shellcodes: No Results');
      return { lines: outLines, nextCtx };
    }
    if (query.includes('vsftpd')) {
      add('------------------------------------------------------------------ ---------------------------------');
      add(' Exploit Title                                                   |  Path');
      add('------------------------------------------------------------------ ---------------------------------');
      add(' vsftpd 2.3.4 - Backdoor Command Execution                       | unix/remote/17491.rb');
      add(' vsftpd 3.0.3 - Remote Denial of Service                         | linux/dos/49719.py');
      add('------------------------------------------------------------------ ---------------------------------');
      return { lines: outLines, nextCtx };
    }
    add(`Searchsploit: Exploit Database query for: ${query}`);
    add('No exact matches found. Try refining keywords.');
    return { lines: outLines, nextCtx };
  }

  // Terminate background SOCKS proxy
  if (binary === 'killall' || binary === 'pkill') {
    if (args.includes('ssh') || activeCmd.includes('ssh')) {
      const resetPivoting: PivotingState = {
        isPivoted: false,
        method: 'none',
        proxyPort: 1080,
        routedSubnet: ''
      };
      nextCtx.pivoting = resetPivoting;
      ctx.pivoting = resetPivoting;
      savePivotingState(ctx.labId || 'corpnet', resetPivoting);
      add('[*] Proceso SSH dinámico terminado. Túnel SOCKS5 cerrado (127.0.0.1:1080 detenido).', 'system');
      return { lines: outLines, nextCtx };
    }
  }

  // SSH Dynamic Port Forwarding or Direct Login
  if (binary === 'ssh') {
    // Dynamic port forwarding: ssh -D 1080 -N -f pivotuser@192.168.100.60 or routeradm@172.16.50.100
    if (args.includes('-D') || (args[0] === '-D' || args[1] === '1080')) {
      const isFintech = ctx.labId === 'lab-fintech' || activeCmd.includes('172.16.50.');
      const newPivoting: PivotingState = {
        isPivoted: true,
        method: 'ssh_dynamic',
        proxyPort: 1080,
        routedSubnet: isFintech ? '10.20.30.0/24' : '10.10.10.0/24'
      };
      nextCtx.pivoting = newPivoting;
      ctx.pivoting = newPivoting;
      savePivotingState(ctx.labId || 'corpnet', newPivoting);
      add('[+] SOCKS5 dynamic proxy established on 127.0.0.1:1080 in background.', 'success');
      add(`[+] Pivoting activo: Ahora puedes alcanzar la red ${isFintech ? '10.20.30.0/24' : '10.10.10.0/24'} anteponiendo \`proxychains\` a tus comandos (ej: \`proxychains nmap -sT -Pn ${isFintech ? '10.20.30.50' : '10.10.10.20'}\`).`, 'success');
      return { lines: outLines, nextCtx };
    }

    const hostArg = args.find(a => !a.startsWith('-')) || '';
    if (hostArg.includes('172.16.50.100') || hostArg.includes('routeradm')) {
      add('Linux edge-gateway 5.4.0-84-generic #94-Ubuntu SMP');
      add(' * Target: Edge Router & Gateway (Dual-Homed: eth0 DMZ, eth1 Branch)');
      add('Last login: Wed Oct 07 10:15:00 2026 from 172.16.50.10');
      nextCtx.shellMode = 'ssh_fintech100';
      ctx.compromisedHosts.add('172.16.50.100');
      return { lines: outLines, nextCtx };
    }

    if (hostArg.includes('192.168.100.50')) {
      add('Welcome to Ubuntu 20.04.5 LTS (GNU/Linux 5.4.0-131-generic x86_64)');
      add('Last login: Wed Oct 07 09:30:12 2026 from 192.168.100.10');
      nextCtx.shellMode = 'ssh_target50';
      ctx.compromisedHosts.add('192.168.100.50');
      return { lines: outLines, nextCtx };
    }

    if (hostArg.includes('192.168.100.55')) {
      add('Linux target-ftp-02 4.19.0-21-amd64 #1 SMP Debian 4.19.249-2 (2022-06-30) x86_64');
      add('Last login: Wed Oct 07 09:12:45 2026 from 192.168.100.10');
      nextCtx.shellMode = 'ssh_target55';
      ctx.compromisedHosts.add('192.168.100.55');
      return { lines: outLines, nextCtx };
    }

    if (hostArg.includes('192.168.100.60')) {
      add('Welcome to Ubuntu 20.04.5 LTS (GNU/Linux 5.4.0-131-generic x86_64)');
      add(' * Target: Gateway Router (Dual-Homed)');
      add('Last login: Wed Oct 07 09:40:00 2026 from 192.168.100.10');
      nextCtx.shellMode = 'ssh_target60';
      ctx.compromisedHosts.add('192.168.100.60');
      return { lines: outLines, nextCtx };
    }

    add(`ssh: connect to host ${hostArg} port 22: Connection refused`, 'error');
    return { lines: outLines, nextCtx };
  }

  // Metasploit Launch
  if (binary === 'msfconsole') {
    add('       =[ metasploit v6.3.25-dev                          ]');
    add('+ -- --=[ 2324 exploits - 1214 auxiliary - 412 post       ]');
    add('+ -- --=[ 1385 payloads - 46 encoders - 11 nops           ]');
    add('+ -- --=[ Free & Open Source Penetration Testing Framework ]', 'system');
    add('');
    add('msfconsole ready. Use `search <query>`, `use <module>`, `set RHOSTS`, `run`.');
    add('💡 Panel de Metasploit disponible en la barra superior para inspeccionar y configurar módulos en 1 clic.', 'system');
    nextCtx.shellMode = 'msf';
    if (!nextCtx.msfOptions || Object.keys(nextCtx.msfOptions).length === 0) {
      nextCtx.msfOptions = {
        LHOST: '192.168.100.10',
        LPORT: '4444'
      };
    }
    return { lines: outLines, nextCtx };
  }

  // Decompression for Kali Wordlists
  if (binary === 'gunzip' || binary === 'gzip') {
    if (activeCmd.includes('rockyou')) {
      add('[*] Descomprimiendo /usr/share/wordlists/rockyou.txt.gz...');
      add('[+] Archivo /usr/share/wordlists/rockyou.txt listo para su uso (14,344,392 contraseñas, 134MB).', 'success');
      return { lines: outLines, nextCtx };
    }
    add('gzip: archivo procesado.');
    return { lines: outLines, nextCtx };
  }

  // File System & Bash Utilities
  if (binary === 'ls') {
    const pathArg = args[0] || '';
    if (pathArg.includes('wordlists') || pathArg.includes('/usr/share/wordlists')) {
      add('dirb  dirbuster  fasttrack.txt  metasploit  nmap.lst  rockyou.txt  rockyou.txt.gz  wfuzz', 'success');
      return { lines: outLines, nextCtx };
    }
    if (pathArg.includes('loot') || pathArg.includes('/root/loot')) {
      add('users.txt  passwords.txt  cross_user_wordlist.txt  unshadowed.txt  cewl_wordlist.txt  crunch_wordlist.txt', 'success');
      return { lines: outLines, nextCtx };
    }
    add('Desktop  Documents  Downloads  Music  Pictures  Videos  loot  wordlists  notes.txt  unshadowed.txt');
    return { lines: outLines, nextCtx };
  }

  if (binary === 'head' || binary === 'tail') {
    const fileArg = args.find(a => !a.startsWith('-')) || '';
    if (fileArg.includes('rockyou.txt')) {
      add('123456');
      add('12345');
      add('123456789');
      add('password');
      add('iloveyou');
      add('princess');
      add('1234567');
      add('rockyou');
      add('12345678');
      add('abc123');
      return { lines: outLines, nextCtx };
    }
    if (fileArg.includes('users.txt')) {
      add('sysadmin');
      add('mike');
      add('pivotuser');
      add('developer');
      add('itadmin');
      return { lines: outLines, nextCtx };
    }
    if (fileArg.includes('passwords.txt')) {
      add('P@ssw0rd2024!');
      add('password123');
      add('pivotpass2024');
      add('admin123');
      return { lines: outLines, nextCtx };
    }
  }

  if (binary === 'wc') {
    const fileArg = args.find(a => !a.startsWith('-')) || '';
    if (fileArg.includes('rockyou.txt')) {
      add('14344392 14344392 139921497 /usr/share/wordlists/rockyou.txt', 'success');
      return { lines: outLines, nextCtx };
    }
    if (fileArg.includes('users.txt')) {
      add('7 7 54 /root/loot/users.txt', 'success');
      return { lines: outLines, nextCtx };
    }
    if (fileArg.includes('passwords.txt')) {
      add('38 38 412 /root/loot/passwords.txt', 'success');
      return { lines: outLines, nextCtx };
    }
    add('10 10 120 ' + fileArg);
    return { lines: outLines, nextCtx };
  }

  if (binary === 'whoami') {
    add('kali');
    return { lines: outLines, nextCtx };
  }

  if (binary === 'id') {
    add('uid=1000(kali) gid=1000(kali) groups=1000(kali),4(adm),24(cdrom),27(sudo),30(dip),46(plugdev)');
    return { lines: outLines, nextCtx };
  }

  if (binary === 'pwd') {
    add('/home/kali');
    return { lines: outLines, nextCtx };
  }

  if (binary === 'history') {
    const flag = args[0];
    if (flag === '-c') {
      clearCommandHistory();
      add('[+] Historial de comandos vaciado de sessionStorage.', 'system');
      return { lines: outLines, nextCtx };
    }
    const currentHist = getCommandHistory();
    if (currentHist.length === 0) {
      add('No hay comandos en el historial.');
      return { lines: outLines, nextCtx };
    }
    add('╔═══════════════════════════════════════════════════════════════════════════════╗', 'system');
    add(`║             HISTORIAL DE COMANDOS (sessionStorage: ${currentHist.length} COMANDOS)              ║`, 'system');
    add('╚═══════════════════════════════════════════════════════════════════════════════╝', 'system');
    currentHist.forEach((cmdItem, idx) => {
      add(`  ${(idx + 1).toString().padStart(4, ' ')}  ${cmdItem}`);
    });
    add('💡 Usa las teclas Flecha Arriba (↑) y Flecha Abajo (↓) para navegar interactivamente por este historial.', 'system');
    return { lines: outLines, nextCtx };
  }

  if (cmd.startsWith('!') && !isNaN(Number(cmd.slice(1)))) {
    const num = parseInt(cmd.slice(1), 10);
    const hist = getCommandHistory();
    if (num >= 1 && num <= hist.length) {
      const recalled = hist[num - 1];
      add(`[!] Ejecutando comando #${num} del historial: ${recalled}`, 'system');
      return processCommand(recalled, ctx);
    }
    add(`bash: ${cmd}: evento no encontrado en el historial`, 'error');
    return { lines: outLines, nextCtx };
  }

  if (binary === 'cat') {
    const file = args[0] || '';
    if (file === 'notes.txt') {
      add('# Pentest Scope: DMZ Subnet 192.168.100.0/24');
      add('# Goals: Find all flags, pivot to internal network, compromise Windows & DB');
      return { lines: outLines, nextCtx };
    }
    if (file.includes('unshadowed.txt')) {
      add('root:$6$rounds=5000$salt50$4f6b8c9d0e1f2a3b4c5d6e7f8a9b0c1d:0:0:root:/root:/bin/bash');
      add('sysadmin:$6$rounds=5000$salt50$P@ssw0rd2024!hashhere...:1000:1000:sysadmin:/home/sysadmin:/bin/bash');
      add('mike:$6$rounds=5000$salt55$password123hashhere...:1001:1001:mike:/home/mike:/bin/bash');
      add('pivotuser:$6$rounds=5000$salt60$pivotpass2024hash..:1002:1002:pivotuser:/home/pivotuser:/bin/bash');
      add('itadmin:$6$rounds=5000$salt20$P@ssw0rd2024!hashhere...:1003:1003:itadmin:/home/itadmin:/bin/bash');
      return { lines: outLines, nextCtx };
    }
    if (file.includes('rockyou.txt')) {
      add('123456');
      add('12345');
      add('123456789');
      add('password');
      add('iloveyou');
      add('princess');
      add('1234567');
      add('rockyou');
      add('12345678');
      add('abc123');
      add('... [mostrando las primeras 10 de 14,344,392 contraseñas de /usr/share/wordlists/rockyou.txt]');
      return { lines: outLines, nextCtx };
    }
    if (file.includes('users.txt')) {
      add('sysadmin');
      add('mike');
      add('pivotuser');
      add('developer');
      add('itadmin');
      add('sysuser');
      add('administrator');
      return { lines: outLines, nextCtx };
    }
    if (file.includes('passwords.txt') || file.includes('wordlist')) {
      add('P@ssw0rd2024!');
      add('password123');
      add('pivotpass2024');
      add('mike');
      add('sysadmin');
      add('pivotuser');
      add('developer');
      add('itadmin');
      add('sysuser');
      add('admin123');
      add('mike123');
      add('sysadmin2024');
      add('Welcome2024');
      return { lines: outLines, nextCtx };
    }
    if (file.includes('/etc/proxychains4.conf') || file.includes('proxychains.conf')) {
      add('# proxychains.conf  VER 4.x');
      add('strict_chain');
      add('proxy_dns');
      add('tcp_read_time_out 15000');
      add('tcp_connect_time_out 8000');
      add('[ProxyList]');
      add('socks5  127.0.0.1 1080', 'success');
      return { lines: outLines, nextCtx };
    }
    add(`cat: ${file}: No such file or directory`, 'error');
    return { lines: outLines, nextCtx };
  }

  add(`bash: ${binary}: command not found. Type 'ejpt-help' to view available commands.`, 'error');
  return { lines: outLines, nextCtx };
}

// -------------------------------------------------------------
// METASPLOIT HANDLER (msf6 >)
// -------------------------------------------------------------
function handleMsfCommand(
  cmd: string,
  ctx: CommandContext,
  ts: number
): { lines: TerminalOutputLine[]; nextCtx: CommandContext } {
  const outLines: TerminalOutputLine[] = [];
  const add = (text: string, type: TerminalOutputLine['type'] = 'msf') => {
    outLines.push({ id: `msf-${ts}-${Math.random()}`, type, text, timestamp: ts });
  };
  const parts = cmd.split(/\s+/);
  const action = parts[0]?.toLowerCase() || '';
  const nextCtx: CommandContext = {
    ...ctx,
    msfOptions: { ...(ctx.msfOptions || {}) }
  };

  if (action === 'exit' || action === 'quit') {
    add('Exiting Metasploit Framework...', 'system');
    nextCtx.shellMode = 'kali';
    nextCtx.msfModule = '';
    return { lines: outLines, nextCtx };
  }

  if (action === 'help' || action === '?') {
    add('Core Commands');
    add('=============');
    add('  search <term>        Search for module names');
    add('  use <module>         Select a module by name (or index #)');
    add('  show options         Displays options for the current module');
    add('  show payloads        Displays compatible payloads for the module');
    add('  set <option> <value> Set a context-specific variable (e.g. set RHOSTS 10.10.10.25)');
    add('  unset <option>       Unset a variable');
    add('  run / exploit        Launch the current module');
    add('  sessions -l / -i     Interact with active background sessions');
    add('  back                 Move back from the current module');
    add('  exit                 Exit the console');
    return { lines: outLines, nextCtx };
  }

  if (action === 'back') {
    nextCtx.msfModule = '';
    add('msf6 >');
    return { lines: outLines, nextCtx };
  }

  if (action === 'sessions') {
    const flag = parts[1];
    const targetId = flag === '-i' ? parts[2] : (flag && !flag.startsWith('-') ? flag : null);
    if (targetId) {
      if (targetId === '1' || targetId === '2') {
        add(`[*] Starting interaction with session ${targetId}...`, 'success');
        nextCtx.shellMode = 'meterpreter';
        return { lines: outLines, nextCtx };
      }
      add(`[-] Session ${targetId} not found or inactive.`, 'error');
      return { lines: outLines, nextCtx };
    }

    const hasSess1 = ctx.compromisedHosts.has('10.10.10.25');
    const hasSess2 = ctx.compromisedHosts.has('10.10.10.30');
    if (!hasSess1 && !hasSess2) {
      add('Active sessions');
      add('===============');
      add('No active sessions.');
      return { lines: outLines, nextCtx };
    }

    add('Active sessions');
    add('===============');
    add('  Id  Name  Type                     Information                          Connection');
    add('  --  ----  ----                     -----------                          ----------');
    if (hasSess1) {
      add('  1         meterpreter x64/windows  CORP\\itadmin @ TARGET-WIN-05         192.168.100.10:4444 -> 10.10.10.25:49158', 'success');
    }
    if (hasSess2) {
      add('  2         meterpreter x86/windows  NT AUTHORITY\\SYSTEM @ TARGET-LEGACY 192.168.100.10:4445 -> 10.10.10.30:49201', 'success');
    }
    return { lines: outLines, nextCtx };
  }

  if (action === 'search') {
    const term = parts.slice(1).join(' ').toLowerCase();
    if (term.includes('psexec')) {
      add('Matching Modules');
      add('================');
      add('   #  Name                                  Disclosure Date  Rank       Check  Description');
      add('   -  ----                                  ---------------  ----       -----  -----------');
      add('   0  exploit/windows/smb/psexec            1999-01-01       manual     No     Microsoft Windows Authenticated User Code Execution', 'success');
      add('   1  auxiliary/admin/smb/psexec_ntdsdump   1999-01-01       normal     No     NTDS.dit Domain Hash Extraction');
      return { lines: outLines, nextCtx };
    }
    if (term.includes('badblue')) {
      add('Matching Modules');
      add('================');
      add('   #  Name                                  Disclosure Date  Rank       Check  Description');
      add('   -  ----                                  ---------------  ----       -----  -----------');
      add('   0  exploit/windows/http/badblue_ext_overflow  2007-12-10  great      Yes    BadBlue 2.7 Ext.dll Pass-Thru Buffer Overflow', 'success');
      return { lines: outLines, nextCtx };
    }
    if (term.includes('autoroute')) {
      add('Matching Modules');
      add('================');
      add('   0  post/multi/manage/autoroute                            normal     No     Manage Metasploit Autoroute Subnets', 'success');
      return { lines: outLines, nextCtx };
    }
    if (term.includes('socks')) {
      add('Matching Modules');
      add('================');
      add('   0  auxiliary/server/socks_proxy                           normal     No     SOCKS Proxy Server', 'success');
      return { lines: outLines, nextCtx };
    }
    add(`search: No results for '${term}'`);
    return { lines: outLines, nextCtx };
  }

  if (action === 'use') {
    const mod = parts[1] || '';
    const moduleDef = getMetasploitModule(mod);
    if (moduleDef) {
      nextCtx.msfModule = moduleDef.path;
      nextCtx.msfOptions = {
        ...moduleDef.defaultOptions,
        ...(nextCtx.msfOptions || {})
      };
      add(`[*] Using ${moduleDef.path}`);
      return { lines: outLines, nextCtx };
    }
    if (mod.includes('psexec') || mod === '0') {
      const psexec = getMetasploitModule('exploit/windows/smb/psexec')!;
      nextCtx.msfModule = psexec.path;
      nextCtx.msfOptions = { ...psexec.defaultOptions, ...(nextCtx.msfOptions || {}) };
      add(`[*] Using exploit/windows/smb/psexec`);
      return { lines: outLines, nextCtx };
    }
    if (mod.includes('badblue') || mod.includes('badblue_ext_overflow')) {
      const bb = getMetasploitModule('exploit/windows/http/badblue_ext_overflow')!;
      nextCtx.msfModule = bb.path;
      nextCtx.msfOptions = { ...bb.defaultOptions, ...(nextCtx.msfOptions || {}) };
      add(`[*] Using exploit/windows/http/badblue_ext_overflow`);
      return { lines: outLines, nextCtx };
    }
    if (mod.includes('autoroute')) {
      nextCtx.msfModule = 'post/multi/manage/autoroute';
      add(`[*] Using post/multi/manage/autoroute`);
      return { lines: outLines, nextCtx };
    }
    if (mod.includes('socks_proxy')) {
      nextCtx.msfModule = 'auxiliary/server/socks_proxy';
      add(`[*] Using auxiliary/server/socks_proxy`);
      return { lines: outLines, nextCtx };
    }
    nextCtx.msfModule = mod;
    add(`[*] Using ${mod}`);
    return { lines: outLines, nextCtx };
  }

  if (action === 'show') {
    const sub = parts[1]?.toLowerCase();
    if (sub === 'payloads') {
      add('Compatible Payloads');
      add('===================');
      add('   #  Name                                   Rank    Check  Description');
      add('   -  ----                                   ----    -----  -----------');
      POPULAR_PAYLOADS.forEach((p, idx) => {
        add(`   ${idx}  ${p.name.padEnd(38)} normal  No     ${p.description}`);
      });
      return { lines: outLines, nextCtx };
    }

    if (sub === 'options') {
      const moduleDef = getMetasploitModule(nextCtx.msfModule);
      if (moduleDef) {
        add(`Module options (${moduleDef.path}):`);
        add('   Name       Current Setting        Required  Description');
        add('   ----       ---------------        --------  -----------');
        moduleDef.optionsList.forEach(opt => {
          const curVal = nextCtx.msfOptions?.[opt.name] || opt.defaultValue || '';
          add(`   ${opt.name.padEnd(10)} ${curVal.padEnd(22)} ${opt.required ? 'yes' : 'no '}       ${opt.description}`);
        });
        if (moduleDef.recommendedPayload) {
          add('');
          add('Payload options (' + (nextCtx.msfOptions?.['PAYLOAD'] || moduleDef.recommendedPayload) + '):');
          add('   Name       Current Setting        Required  Description');
          add('   ----       ---------------        --------  -----------');
          add(`   LHOST      ${(nextCtx.msfOptions?.['LHOST'] || '192.168.100.10').padEnd(22)} yes       The listen address`);
          add(`   LPORT      ${(nextCtx.msfOptions?.['LPORT'] || '4444').padEnd(22)} yes       The listen port`);
        }
        return { lines: outLines, nextCtx };
      }

      if (nextCtx.msfOptions && Object.keys(nextCtx.msfOptions).length > 0) {
        add(`Module options (${nextCtx.msfModule || 'default'}):`);
        add('   Name       Current Setting        Required  Description');
        add('   ----       ---------------        --------  -----------');
        Object.entries(nextCtx.msfOptions).forEach(([k, v]) => {
          add(`   ${k.padEnd(10)} ${v.padEnd(22)} yes       Configured parameter`);
        });
        return { lines: outLines, nextCtx };
      }

      add('No options configured. Select a module with `use <module>` first.');
      return { lines: outLines, nextCtx };
    }
  }

  if (action === 'set') {
    const key = parts[1];
    const val = parts.slice(2).join(' ');
    if (!key) {
      add('Usage: set <option> <value>');
      return { lines: outLines, nextCtx };
    }
    const cleanKey = key;
    nextCtx.msfOptions = {
      ...(nextCtx.msfOptions || {}),
      [cleanKey]: val
    };
    add(`${key} => ${val}`);
    return { lines: outLines, nextCtx };
  }

  if (action === 'unset') {
    const key = parts[1];
    if (nextCtx.msfOptions && key && nextCtx.msfOptions[key]) {
      delete nextCtx.msfOptions[key];
      add(`Unsetting ${key}...`);
    } else {
      add(`[-] Variable ${key} not set.`);
    }
    return { lines: outLines, nextCtx };
  }

  if (action === 'exploit' || action === 'run') {
    const activeMod = nextCtx.msfModule || '';
    const rhost = nextCtx.msfOptions?.['RHOSTS'] || nextCtx.msfOptions?.['rhosts'] || '';
    const lhost = nextCtx.msfOptions?.['LHOST'] || '192.168.100.10';
    const lport = nextCtx.msfOptions?.['LPORT'] || '4444';
    const payload = nextCtx.msfOptions?.['PAYLOAD'] || 'windows/x64/meterpreter/reverse_tcp';

    if (activeMod.includes('psexec') || rhost.includes('10.10.10.25')) {
      const user = nextCtx.msfOptions?.['SMBUser'] || 'itadmin';
      add(`[*] Started reverse TCP handler on ${lhost}:${lport}`);
      add('[*] 10.10.10.25:445 - Connecting to the server...');
      add('[*] 10.10.10.25:445 - Authenticating to 10.10.10.25 as user \'itadmin\'...');
      add('[+] 10.10.10.25:445 - Successfully authenticated as itadmin', 'success');
      add('[*] 10.10.10.25:445 - Selecting PowerShell payload...');
      add('[*] 10.10.10.25:445 - Created \\system_svc on 10.10.10.25');
      add('[*] 10.10.10.25:445 - Starting the service...');
      add('[+] 10.10.10.25:445 - Service started successfully', 'success');
      add('[*] Sending stage (176198 bytes) to 10.10.10.25');
      add('[*] Meterpreter session 1 opened (192.168.100.10:4444 -> 10.10.10.25:49158) at ' + new Date().toUTCString(), 'success');
      nextCtx.shellMode = 'meterpreter';
      ctx.compromisedHosts.add('10.10.10.25');
      return { lines: outLines, nextCtx };
    }

    if (activeMod.includes('badblue') || rhost.includes('10.10.10.30')) {
      add(`[*] Started reverse TCP handler on ${lhost}:${lport || '4445'}`);
      add(`[*] ${rhost || '10.10.10.30'}:80 - Sending pass-thru buffer overflow trigger...`);
      add('[+] 10.10.10.30:80 - Successfully exploited target BadBlue 2.7!', 'success');
      add('[*] Sending stage (176198 bytes) to 10.10.10.30');
      add(`[*] Meterpreter session 2 opened (${lhost}:${lport || '4445'} -> 10.10.10.30:49201)`, 'success');
      nextCtx.shellMode = 'meterpreter';
      ctx.compromisedHosts.add('10.10.10.30');
      return { lines: outLines, nextCtx };
    }

    if (activeMod.includes('socks_proxy')) {
      const port = nextCtx.msfOptions?.['SRVPORT'] || '1080';
      const isFintech = ctx.labId === 'lab-fintech';
      const newPivoting: PivotingState = {
        isPivoted: true,
        method: 'msf_autoroute',
        proxyPort: parseInt(port, 10) || 1080,
        routedSubnet: isFintech ? '10.20.30.0/24' : '10.10.10.0/24',
        activeSession: 'msf_socks'
      };
      nextCtx.pivoting = newPivoting;
      ctx.pivoting = newPivoting;
      savePivotingState(ctx.labId || 'corpnet', newPivoting);
      add(`[*] Auxiliary module execution completed: SOCKS4/5 proxy started on 127.0.0.1:${port}`, 'success');
      return { lines: outLines, nextCtx };
    }

    if (activeMod.includes('autoroute')) {
      const isFintech = ctx.labId === 'lab-fintech';
      const defaultSub = isFintech ? '10.20.30.0' : '10.10.10.0';
      const sub = nextCtx.msfOptions?.['SUBNET'] || defaultSub;
      const newPivoting: PivotingState = {
        isPivoted: true,
        method: 'msf_autoroute',
        proxyPort: nextCtx.pivoting.proxyPort || 1080,
        routedSubnet: sub.includes('/') ? sub : `${sub}/24`,
        activeSession: 'autoroute'
      };
      nextCtx.pivoting = newPivoting;
      ctx.pivoting = newPivoting;
      savePivotingState(ctx.labId || 'corpnet', newPivoting);
      add(`[*] Adding route for ${sub}/255.255.255.0 to session 1...`, 'success');
      add(`[+] Route added to subnet ${newPivoting.routedSubnet} successfully.`, 'success');
      return { lines: outLines, nextCtx };
    }

    if (activeMod.includes('smb_version')) {
      add('[*] 10.10.10.25:445 - SMB Detected: Windows Server 2019 Standard 17763 64-bit (name:TARGET-WIN-05) (domain:CORP)', 'success');
      add('[*] 10.10.10.30:445 - SMB Detected: Windows 10 Pro 14393 32-bit (name:TARGET-LEGACY-06) (domain:WORKGROUP)', 'success');
      add('[*] Scanned 2 of 2 hosts (100% complete)');
      return { lines: outLines, nextCtx };
    }

    if (activeMod.includes('portscan')) {
      add('[+] 10.10.10.25:445 - TCP OPEN', 'success');
      add('[+] 10.10.10.25:3389 - TCP OPEN (RDP)', 'success');
      add('[+] 10.10.10.25:135 - TCP OPEN (RPC)', 'success');
      return { lines: outLines, nextCtx };
    }

    add('[-] Exploit failed: No target configured or payload failed.', 'error');
    return { lines: outLines, nextCtx };
  }

  add(`Unknown command: ${action}`);
  return { lines: outLines, nextCtx };
}

// -------------------------------------------------------------
// METERPRETER HANDLER (meterpreter >)
// -------------------------------------------------------------
function handleMeterpreterCommand(
  cmd: string,
  ctx: CommandContext,
  ts: number
): { lines: TerminalOutputLine[]; nextCtx: CommandContext } {
  const outLines: TerminalOutputLine[] = [];
  const add = (text: string, type: TerminalOutputLine['type'] = 'meterpreter') => {
    outLines.push({ id: `meter-${ts}-${Math.random()}`, type, text, timestamp: ts });
  };
  const parts = cmd.split(/\s+/);
  const action = parts[0];
  const nextCtx = { ...ctx };

  if (action === 'exit' || action === 'background') {
    add('[*] Backgrounding session 1...');
    nextCtx.shellMode = 'msf';
    return { lines: outLines, nextCtx };
  }

  if (action === 'sysinfo') {
    add('Computer        : TARGET-WIN-05');
    add('OS              : Windows Server 2019 Standard (10.0 Build 17763)');
    add('Architecture    : x64');
    add('System Language : en_US');
    add('Domain          : CORP');
    add('Logged On Users : 2');
    add('Meterpreter     : x64/windows', 'success');
    return { lines: outLines, nextCtx };
  }

  if (action === 'getuid') {
    add('Server username: NT AUTHORITY\\SYSTEM', 'success');
    return { lines: outLines, nextCtx };
  }

  if (action === 'ipconfig') {
    add('Interface  1');
    add('============');
    add('Name         : Ethernet Adapter (Intel Pro/1000)');
    add('IPv4 Address : 10.10.10.25');
    add('IPv4 Netmask : 255.255.255.0');
    add('Gateway      : 10.10.10.1');
    return { lines: outLines, nextCtx };
  }

  if (action === 'run' && cmd.includes('autoroute')) {
    const isFintech = ctx.labId === 'lab-fintech';
    const newPivoting: PivotingState = {
      isPivoted: true,
      method: 'msf_autoroute',
      proxyPort: 1080,
      routedSubnet: isFintech ? '10.20.30.0/24' : '10.10.10.0/24',
      activeSession: 'meterpreter'
    };
    nextCtx.pivoting = newPivoting;
    ctx.pivoting = newPivoting;
    savePivotingState(ctx.labId || 'corpnet', newPivoting);
    add('[!] Meterpreter autoroute script is deprecated, use post/multi/manage/autoroute');
    add(`[+] Added route to ${newPivoting.routedSubnet} via session 1`, 'success');
    add(`[*] Metasploit routing table updated. All auxiliary/exploit modules can now route to ${newPivoting.routedSubnet}.`, 'success');
    return { lines: outLines, nextCtx };
  }

  if (action === 'shell') {
    add('Process 3892 created.');
    add('Channel 1 created.');
    add('Microsoft Windows [Version 10.0.17763.2989]');
    add('(c) 2018 Microsoft Corporation. All rights reserved.');
    add('');
    add('C:\\Windows\\system32>');
    nextCtx.shellMode = 'win_cmd';
    return { lines: outLines, nextCtx };
  }

  if (action === 'cat' && cmd.includes('flag.txt')) {
    add('FLAG_WIN_SYSTEM{w1nd0ws_psexec_system_cr4cked}', 'success');
    ctx.foundFlags.add('flag-internal-win');
    return { lines: outLines, nextCtx };
  }

  if (action === 'help') {
    add('Meterpreter Commands:');
    add('  sysinfo, getuid, ipconfig, shell, run autoroute -s 10.10.10.0/24, winpeas, cat, background, exit');
    return { lines: outLines, nextCtx };
  }

  if (action === 'winpeas' || action === 'winpeas.exe' || action === 'winpeas.bat') {
    add('Running WinPEAS in meterpreter session...', 'system');
    add('╔══════════╣ Windows Privesc Vectors (WinPEAS 2026)');
    add('[-] Checking AlwaysInstallElevated: 0');
    add('[-] Checking Weak Service Permissions:');
    add('    [!] Service "CorpBackupAgent" writable by Users -> Escalation Vector!', 'error');
    add('[-] Cached Admin Credentials in LSASS: Administrator : P@ssw0rd2024!', 'success');
    add('[+] Target Flag located at: C:\\Users\\Administrator\\Desktop\\flag.txt', 'success');
    return { lines: outLines, nextCtx };
  }

  add(`meterpreter: command '${action}' not recognized. Try 'help'.`);
  return { lines: outLines, nextCtx };
}

// -------------------------------------------------------------
// WINDOWS CMD HANDLER (C:\Windows\system32>)
// -------------------------------------------------------------
function handleWinCmdCommand(
  cmd: string,
  ctx: CommandContext,
  ts: number
): { lines: TerminalOutputLine[]; nextCtx: CommandContext } {
  const outLines: TerminalOutputLine[] = [];
  const add = (text: string, type: TerminalOutputLine['type'] = 'output') => {
    outLines.push({ id: `win-${ts}-${Math.random()}`, type, text, timestamp: ts });
  };
  const parts = cmd.split(/\s+/);
  const action = parts[0].toLowerCase();
  const nextCtx = { ...ctx };

  if (action === 'exit') {
    add('Exiting Windows Command Prompt / Evil-WinRM session...');
    nextCtx.shellMode = ctx.pivoting.activeSession === 'meterpreter' ? 'meterpreter' : 'kali';
    return { lines: outLines, nextCtx };
  }

  if (action === 'whoami') {
    add('nt authority\\system', 'success');
    return { lines: outLines, nextCtx };
  }

  if (action === 'type') {
    const targetFile = parts.slice(1).join(' ');
    if (targetFile.includes('flag.txt')) {
      if (targetFile.includes('Vault') || targetFile.includes('master_flag')) {
        add('FLAG_VAULT_FINAL{ejptv2_master_penetration_tester}', 'success');
        ctx.foundFlags.add('flag-internal-vault');
      } else {
        add('FLAG_WIN_SYSTEM{w1nd0ws_psexec_system_cr4cked}', 'success');
        ctx.foundFlags.add('flag-internal-win');
      }
      return { lines: outLines, nextCtx };
    }
    add(`The system cannot find the file specified.`);
    return { lines: outLines, nextCtx };
  }

  if (action === 'dir') {
    add(' Volume in drive C has no label.');
    add(' Volume Serial Number is 4C19-3B01');
    add('');
    add(' Directory of C:\\Users\\Administrator\\Desktop');
    add('');
    add('10/01/2026  09:00 AM    <DIR>          .');
    add('10/01/2026  09:00 AM    <DIR>          ..');
    add('10/01/2026  09:10 AM                45 flag.txt', 'success');
    add('               1 File(s)             45 bytes');
    return { lines: outLines, nextCtx };
  }

  if (action === 'winpeas' || action === 'winpeas.bat' || action === 'winpeas.exe') {
    add('╔══════════╣ Windows Privesc Vectors (WinPEAS 2026)', 'system');
    add('[-] AlwaysInstallElevated: 0');
    add('[-] Checking Services & Unquoted Service Paths:');
    add('    [!] Service "CorpBackupAgent" writable by Users -> Escalation Vector!', 'error');
    add('[-] Cached Admin Credentials in LSASS: Administrator : P@ssw0rd2024!', 'success');
    add('[+] Target Flag located at: C:\\Users\\Administrator\\Desktop\\flag.txt', 'success');
    return { lines: outLines, nextCtx };
  }

  add(`'${action}' is not recognized as an internal or external command.`);
  return { lines: outLines, nextCtx };
}

// -------------------------------------------------------------
// SSH TARGET 50 (sysadmin@target-web-01:~$ )
// -------------------------------------------------------------
function handleTarget50Command(
  cmd: string,
  ctx: CommandContext,
  ts: number
): { lines: TerminalOutputLine[]; nextCtx: CommandContext } {
  const outLines: TerminalOutputLine[] = [];
  const add = (text: string, type: TerminalOutputLine['type'] = 'output') => {
    outLines.push({ id: `t50-${ts}-${Math.random()}`, type, text, timestamp: ts });
  };
  const parts = cmd.split(/\s+/);
  const action = parts[0]?.toLowerCase() || '';
  const nextCtx = { ...ctx };
  const isRoot = ctx.shellMode === 'ssh_target50_root';

  if (action === 'exit') {
    if (isRoot) {
      add('exit');
      add('[*] Sesión root finalizada. Regresando a usuario sysadmin...', 'system');
      nextCtx.shellMode = 'ssh_target50';
      return { lines: outLines, nextCtx };
    }
    add('Connection to 192.168.100.50 closed.');
    nextCtx.shellMode = 'kali';
    return { lines: outLines, nextCtx };
  }

  if (action === 'whoami') {
    add(isRoot ? 'root' : 'sysadmin', isRoot ? 'success' : 'output');
    return { lines: outLines, nextCtx };
  }

  if (action === 'id') {
    add(isRoot ? 'uid=0(root) gid=0(root) groups=0(root)' : 'uid=1000(sysadmin) gid=1000(sysadmin) groups=1000(sysadmin),27(sudo)', isRoot ? 'success' : 'output');
    return { lines: outLines, nextCtx };
  }

  if (action === 'pwd') {
    add(isRoot ? '/root' : '/home/sysadmin');
    return { lines: outLines, nextCtx };
  }

  // SUID Discovery Vector (e.g., find / -perm -u=s -type f 2>/dev/null, find / -perm -4000 ...)
  if (action === 'find' && (cmd.includes('-perm') || cmd.includes('-4000') || cmd.includes('-04000') || cmd.includes('/4000') || cmd.includes('u=s'))) {
    add('/usr/bin/find           <-- [!] VULNERABLE SUID BINARY (GTFOBins)', 'error');
    add('/usr/bin/passwd');
    add('/usr/bin/chfn');
    add('/usr/bin/chsh');
    add('/usr/bin/newgrp');
    add('/usr/bin/gpasswd');
    add('/usr/bin/sudo');
    add('/bin/mount');
    add('/bin/umount');
    add('/bin/su');
    add('/bin/ping');
    add('[+] ¡Vector de elevación encontrado! `/usr/bin/find` tiene el bit SUID activo o permiso sudo NOPASSWD.', 'success');
    add('💡 Exploit GTFOBins: `find . -exec /bin/bash \\; -quit` o `sudo find . -exec /bin/bash \\;`', 'system');
    return { lines: outLines, nextCtx };
  }

  // Sudo -l inspection
  if (action === 'sudo' && (parts[1] === '-l' || cmd.includes('-l'))) {
    add('Matching Defaults entries for sysadmin on target-web-01:');
    add('    env_reset, mail_badpass, secure_path=/usr/local/sbin\\:/usr/local/bin\\:/usr/sbin\\:/usr/bin\\:/sbin\\:/bin');
    add('');
    add('User sysadmin may run the following commands on target-web-01:');
    add('    (root) NOPASSWD: /usr/bin/find', 'success');
    add('[+] SUID / sudo privesc vector identificado: `/usr/bin/find` permite ejecutar shell como root!', 'success');
    add('💡 Exploit GTFOBins: `sudo find . -exec /bin/bash \\; -quit` o `sudo find / -exec /bin/sh \\;`', 'system');
    return { lines: outLines, nextCtx };
  }

  // SUID & Sudo GTFOBins Escalation execution
  if (
    (action === 'sudo' || action === 'find' || action === '/usr/bin/find') &&
    cmd.includes('find') && 
    (cmd.includes('-exec') || cmd.includes('/bin/sh') || cmd.includes('/bin/bash') || cmd.includes('sh') || cmd.includes('bash'))
  ) {
    add('[+] Ejecutando GTFOBins payload con SUID/sudo en /usr/bin/find...', 'system');
    add('[+] Escalación de privilegios completada. Spawning root shell...', 'success');
    add('[+] root@target-web-01:~# (uid=0 gid=0 root)', 'success');
    nextCtx.shellMode = 'ssh_target50_root';
    nextCtx.compromisedHosts.add('192.168.100.50');
    return { lines: outLines, nextCtx };
  }

  // Direct sudo su / sudo -i / sudo bash
  if (action === 'sudo' && (parts[1] === 'su' || parts[1] === '-i' || parts[1] === 'bash' || parts[1] === '/bin/bash' || parts[1] === 'sh' || parts[1] === '/bin/sh')) {
    add('[+] Autenticando escalación administrativa...', 'system');
    add('[+] Escalación de privilegios completada. Spawning root shell...', 'success');
    add('[+] root@target-web-01:~# (uid=0 gid=0 root)', 'success');
    nextCtx.shellMode = 'ssh_target50_root';
    nextCtx.compromisedHosts.add('192.168.100.50');
    return { lines: outLines, nextCtx };
  }

  // One-off commands with sudo
  if (action === 'sudo') {
    const sub = parts[1] || '';
    if (sub === 'whoami') {
      add('root', 'success');
      return { lines: outLines, nextCtx };
    }
    if (sub === 'id') {
      add('uid=0(root) gid=0(root) groups=0(root)', 'success');
      return { lines: outLines, nextCtx };
    }
    if (sub === 'cat') {
      const fileArg = parts[2] || '';
      if (fileArg.includes('shadow') || fileArg === '/etc/shadow') {
        add('root:$6$v19..$mY0uRr00tH4sh3dWeb01.:19632:0:99999:7:::');
        add('daemon:*:19632:0:99999:7:::');
        add('bin:*:19632:0:99999:7:::');
        add('sysadmin:$6$p24..$P4ssw0rd2024WebSys.:19632:0:99999:7:::');
        return { lines: outLines, nextCtx };
      }
      if (fileArg.includes('flag.txt') || fileArg.includes('flag') || fileArg.startsWith('/root')) {
        add('FLAG_DMZ_WEB{lfi_2_pr1v_esc_success}', 'success');
        ctx.foundFlags.add('flag-dmz-web');
        return { lines: outLines, nextCtx };
      }
    }
    if (sub === 'ls') {
      add('flag.txt  .bashrc  .profile  snap  backup_scripts');
      return { lines: outLines, nextCtx };
    }
  }

  if (action === 'cat') {
    const f = parts[1] || '';
    if (f.includes('flag.txt') || f === '/root/flag.txt') {
      if (!isRoot && f.startsWith('/root')) {
        add('cat: /root/flag.txt: Permission denied', 'error');
        add('[!] Permiso denegado. Escala a root primero con `sudo -l` y `sudo find . -exec /bin/bash \\;`', 'system');
        return { lines: outLines, nextCtx };
      }
      add('FLAG_DMZ_WEB{lfi_2_pr1v_esc_success}', 'success');
      ctx.foundFlags.add('flag-dmz-web');
      return { lines: outLines, nextCtx };
    }
    if (f.includes('shadow') || f === '/etc/shadow') {
      if (!isRoot) {
        add('cat: /etc/shadow: Permission denied', 'error');
        return { lines: outLines, nextCtx };
      }
      add('root:$6$v19..$mY0uRr00tH4sh3dWeb01.:19632:0:99999:7:::');
      add('sysadmin:$6$p24..$P4ssw0rd2024WebSys.:19632:0:99999:7:::');
      return { lines: outLines, nextCtx };
    }
    if (f.includes('notes.txt')) {
      add('# Recordatorio de mantenimiento');
      add('Revisar backups en /var/backups/db_config.php.bak');
      return { lines: outLines, nextCtx };
    }
  }

  if (action === 'ls') {
    add(isRoot ? 'flag.txt  snap  .bashrc  .profile' : 'backup_scripts  notes.txt');
    return { lines: outLines, nextCtx };
  }

  if (action === 'linpeas' || action === 'linpeas.sh' || action === './linpeas.sh') {
    add('LinPEAS - Linux Privilege Escalation Awesome Script (v2026)', 'system');
    add('╔══════════╣ Sudo Permissions (Check `sudo -l`)');
    add('    (root) NOPASSWD: /usr/bin/find', 'error');
    add('    [!] VULNERABLE: Binary /usr/bin/find can spawn root shell via GTFOBins!', 'error');
    add('    [!] Exploit command: `sudo find . -exec /bin/bash \\; -quit`', 'success');
    add('╔══════════╣ Readable Backups in /var/backups/');
    add('    /var/backups/db_config.php.bak (Credentials: sysadmin:P@ssw0rd2024!)', 'success');
    return { lines: outLines, nextCtx };
  }

  add(`bash: ${action}: command not found on target-web-01`);
  return { lines: outLines, nextCtx };
}

// -------------------------------------------------------------
// SSH TARGET 55 (mike@target-ftp-02:~$ )
// -------------------------------------------------------------
function handleTarget55Command(
  cmd: string,
  ctx: CommandContext,
  ts: number
): { lines: TerminalOutputLine[]; nextCtx: CommandContext } {
  const outLines: TerminalOutputLine[] = [];
  const add = (text: string, type: TerminalOutputLine['type'] = 'output') => {
    outLines.push({ id: `t55-${ts}-${Math.random()}`, type, text, timestamp: ts });
  };
  const parts = cmd.split(/\s+/);
  const action = parts[0]?.toLowerCase() || '';
  const nextCtx = { ...ctx };
  const isRoot = ctx.shellMode === 'ssh_target55_root';

  if (action === 'exit') {
    if (isRoot) {
      add('exit');
      add('[*] Sesión root finalizada. Regresando a usuario mike...', 'system');
      nextCtx.shellMode = 'ssh_target55';
      return { lines: outLines, nextCtx };
    }
    add('Connection to 192.168.100.55 closed.');
    nextCtx.shellMode = 'kali';
    return { lines: outLines, nextCtx };
  }

  if (action === 'whoami') {
    add(isRoot ? 'root' : 'mike', isRoot ? 'success' : 'output');
    return { lines: outLines, nextCtx };
  }

  if (action === 'id') {
    add(isRoot ? 'uid=0(root) gid=0(root) groups=0(root)' : 'uid=1001(mike) gid=1001(mike) groups=1001(mike),27(sudo)', isRoot ? 'success' : 'output');
    return { lines: outLines, nextCtx };
  }

  if (action === 'pwd') {
    add(isRoot ? '/root' : '/home/mike');
    return { lines: outLines, nextCtx };
  }

  // SUID Discovery Vector
  if (action === 'find' && (cmd.includes('-perm') || cmd.includes('-4000') || cmd.includes('-04000') || cmd.includes('/4000') || cmd.includes('u=s'))) {
    add('/usr/bin/env            <-- [!] VULNERABLE SUID BINARY (GTFOBins)', 'error');
    add('/usr/bin/passwd');
    add('/usr/bin/chfn');
    add('/usr/bin/sudo');
    add('/bin/mount');
    add('/bin/ping');
    add('[+] ¡Vector de elevación encontrado! `/usr/bin/env` permite ejecutar shell con privilegios root.', 'success');
    add('💡 Exploit GTFOBins: `env /bin/sh -p` o `sudo env /bin/bash`', 'system');
    return { lines: outLines, nextCtx };
  }

  // Sudo -l inspection
  if (action === 'sudo' && (parts[1] === '-l' || cmd.includes('-l'))) {
    add('Matching Defaults entries for mike on target-ftp-02:');
    add('    env_reset, mail_badpass, secure_path=/usr/local/sbin\\:/usr/local/bin\\:/usr/sbin\\:/usr/bin\\:/sbin\\:/bin');
    add('');
    add('User mike may run the following commands on target-ftp-02:');
    add('    (root) NOPASSWD: /usr/bin/env, /bin/tar', 'success');
    add('[+] SUID / sudo privesc vector identificado: `/usr/bin/env` permite ejecutar shell como root!', 'success');
    add('💡 Exploit GTFOBins: `sudo env /bin/bash` o `sudo /usr/bin/env /bin/sh`', 'system');
    return { lines: outLines, nextCtx };
  }

  // SUID & Sudo GTFOBins Escalation execution via env
  if (
    (cmd.includes('env') && (cmd.includes('/bin/sh') || cmd.includes('/bin/bash') || cmd.includes('sh') || cmd.includes('bash'))) ||
    (action === 'sudo' && (parts[1] === 'su' || parts[1] === '-i' || parts[1] === 'bash' || parts[1] === '/bin/bash' || parts[1] === 'env'))
  ) {
    add('[+] Ejecutando GTFOBins exploit en /usr/bin/env...', 'system');
    add('[+] ¡Escalación de privilegios completada en target-ftp-02! Spawning root shell...', 'success');
    add('[+] root@target-ftp-02:~# (uid=0 gid=0 root)', 'success');
    nextCtx.shellMode = 'ssh_target55_root';
    nextCtx.compromisedHosts.add('192.168.100.55');
    return { lines: outLines, nextCtx };
  }

  // One-off sudo execution
  if (action === 'sudo') {
    const sub = parts[1] || '';
    if (sub === 'whoami') {
      add('root', 'success');
      return { lines: outLines, nextCtx };
    }
    if (sub === 'id') {
      add('uid=0(root) gid=0(root) groups=0(root)', 'success');
      return { lines: outLines, nextCtx };
    }
    if (sub === 'cat') {
      const f = parts[2] || '';
      if (f.includes('shadow') || f === '/etc/shadow') {
        add('root:$6$f82..$mY0uRr00tH4sh3dFtp02.:19632:0:99999:7:::');
        add('mike:$6$k31..$p4ssw0rd123Ftp.:19632:0:99999:7:::');
        return { lines: outLines, nextCtx };
      }
      add('FLAG_FTP_LEAK{vsftpd_an0n_c0nfidential}', 'success');
      ctx.foundFlags.add('flag-dmz-ftp');
      return { lines: outLines, nextCtx };
    }
  }

  if (action === 'cat') {
    const f = parts[1] || '';
    if (f.includes('confidential') || f.includes('flag.txt') || f === '/root/flag.txt') {
      add('FLAG_FTP_LEAK{vsftpd_an0n_c0nfidential}', 'success');
      ctx.foundFlags.add('flag-dmz-ftp');
      return { lines: outLines, nextCtx };
    }
    if (f.includes('shadow') || f === '/etc/shadow') {
      if (!isRoot) {
        add('cat: /etc/shadow: Permission denied', 'error');
        return { lines: outLines, nextCtx };
      }
      add('root:$6$f82..$mY0uRr00tH4sh3dFtp02.:19632:0:99999:7:::');
      add('mike:$6$k31..$p4ssw0rd123Ftp.:19632:0:99999:7:::');
      return { lines: outLines, nextCtx };
    }
  }

  if (action === 'ls') {
    add(isRoot ? 'confidential_note.txt  flag.txt  ftp_sync  logs  .bashrc' : 'confidential_note.txt  ftp_sync  logs');
    return { lines: outLines, nextCtx };
  }

  add(`bash: ${action}: command not found on target-ftp-02`);
  return { lines: outLines, nextCtx };
}

// -------------------------------------------------------------
// SSH TARGET 60 (pivotuser@target-gateway-03:~$ )
// -------------------------------------------------------------
function handleTarget60Command(
  cmd: string,
  ctx: CommandContext,
  ts: number
): { lines: TerminalOutputLine[]; nextCtx: CommandContext } {
  const outLines: TerminalOutputLine[] = [];
  const add = (text: string, type: TerminalOutputLine['type'] = 'output') => {
    outLines.push({ id: `t60-${ts}-${Math.random()}`, type, text, timestamp: ts });
  };
  const parts = cmd.split(/\s+/);
  const action = parts[0]?.toLowerCase() || '';
  const nextCtx = { ...ctx };
  const isRoot = ctx.shellMode === 'ssh_target60_root';

  if (action === 'exit') {
    if (isRoot) {
      add('exit');
      add('[*] Sesión root finalizada. Regresando a usuario pivotuser...', 'system');
      nextCtx.shellMode = 'ssh_target60';
      return { lines: outLines, nextCtx };
    }
    add('Connection to 192.168.100.60 closed.');
    nextCtx.shellMode = 'kali';
    return { lines: outLines, nextCtx };
  }

  if (action === 'whoami') {
    add(isRoot ? 'root' : 'pivotuser', isRoot ? 'success' : 'output');
    return { lines: outLines, nextCtx };
  }

  if (action === 'id') {
    add(isRoot ? 'uid=0(root) gid=0(root) groups=0(root)' : 'uid=1002(pivotuser) gid=1002(pivotuser) groups=1002(pivotuser),27(sudo)', isRoot ? 'success' : 'output');
    return { lines: outLines, nextCtx };
  }

  if (action === 'pwd') {
    add(isRoot ? '/root' : '/home/pivotuser');
    return { lines: outLines, nextCtx };
  }

  if (action === 'ip' || action === 'ifconfig') {
    add('eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500');
    add('        inet 192.168.100.60  netmask 255.255.255.0  broadcast 192.168.100.255');
    add('');
    add('eth1: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500', 'success');
    add('        inet 10.10.10.1  netmask 255.255.255.0  broadcast 10.10.10.255', 'success');
    add('[+] ¡DESCUBRIMIENTO CLAVE! Esta máquina tiene doble interfaz (Dual-Homed) conectando a 10.10.10.0/24!', 'success');
    return { lines: outLines, nextCtx };
  }

  if (action === 'route' || (action === 'ip' && cmd.includes('route'))) {
    add('default via 192.168.100.1 dev eth0 proto dhcp metric 100');
    add('10.10.10.0/24 dev eth1 proto kernel scope link src 10.10.10.1', 'success');
    add('192.168.100.0/24 dev eth0 proto kernel scope link src 192.168.100.60');
    return { lines: outLines, nextCtx };
  }

  // SUID Discovery Vector
  if (action === 'find' && (cmd.includes('-perm') || cmd.includes('-4000') || cmd.includes('-04000') || cmd.includes('/4000') || cmd.includes('u=s'))) {
    add('/usr/bin/python3        <-- [!] SUID / GTFOBins Vector Available', 'error');
    add('/usr/bin/passwd');
    add('/usr/bin/sudo');
    add('/bin/mount');
    add('/bin/ping');
    add('[+] SUID binaries detectados en target-gateway-03.', 'system');
    return { lines: outLines, nextCtx };
  }

  // Sudo -l inspection
  if (action === 'sudo' && (parts[1] === '-l' || cmd.includes('-l'))) {
    add('Matching Defaults entries for pivotuser on target-gateway-03:');
    add('    env_reset, mail_badpass, secure_path=/usr/local/sbin\\:/usr/local/bin\\:/usr/sbin\\:/usr/bin\\:/sbin\\:/bin');
    add('');
    add('User pivotuser may run the following commands on target-gateway-03:');
    add('    (root) NOPASSWD: /bin/bash, /usr/bin/python3, /sbin/iptables', 'success');
    add('[+] Privilegios sudo NOPASSWD identificados: `/bin/bash` o `/usr/bin/python3`!', 'success');
    add('💡 Exploit: `sudo bash` o `sudo python3 -c \'import pty; pty.spawn("/bin/bash")\'`', 'system');
    return { lines: outLines, nextCtx };
  }

  // Escalation execution
  if (
    (action === 'sudo' && (parts[1] === 'bash' || parts[1] === '/bin/bash' || parts[1] === 'su' || parts[1] === '-i' || parts[1] === 'python3' || parts[1] === '/usr/bin/python3')) ||
    cmd.includes('pty.spawn') ||
    cmd.includes('os.system("/bin/bash")')
  ) {
    add('[+] Ejecutando binario autorizado con privilegios root (NOPASSWD)...', 'system');
    add('[+] ¡Escalación de privilegios completada en target-gateway-03! Spawning root shell...', 'success');
    add('[+] root@target-gateway-03:~# (uid=0 gid=0 root)', 'success');
    nextCtx.shellMode = 'ssh_target60_root';
    nextCtx.compromisedHosts.add('192.168.100.60');
    return { lines: outLines, nextCtx };
  }

  // One-off sudo execution
  if (action === 'sudo') {
    const sub = parts[1] || '';
    if (sub === 'whoami') {
      add('root', 'success');
      return { lines: outLines, nextCtx };
    }
    if (sub === 'id') {
      add('uid=0(root) gid=0(root) groups=0(root)', 'success');
      return { lines: outLines, nextCtx };
    }
    if (sub === 'cat') {
      const f = parts[2] || '';
      if (f.includes('shadow') || f === '/etc/shadow') {
        add('root:$6$g71..$mY0uRr00tH4sh3dGw03.:19632:0:99999:7:::');
        add('pivotuser:$6$j88..$p1v0tp4ss2024.:19632:0:99999:7:::');
        return { lines: outLines, nextCtx };
      }
      add('FLAG_PIVOT_GATEWAY{dual_h0med_r0ute_unl0cked}', 'success');
      ctx.foundFlags.add('flag-dmz-gateway');
      return { lines: outLines, nextCtx };
    }
    if (sub === 'iptables') {
      add('Chain FORWARD (policy ACCEPT)');
      add('target     prot opt source               destination');
      add('ACCEPT     all  --  192.168.100.0/24     10.10.10.0/24        /* DMZ to Internal */');
      return { lines: outLines, nextCtx };
    }
  }

  if (action === 'cat') {
    const f = parts[1] || '';
    if (f.includes('flag.txt') || f === '/root/flag.txt') {
      add('FLAG_PIVOT_GATEWAY{dual_h0med_r0ute_unl0cked}', 'success');
      ctx.foundFlags.add('flag-dmz-gateway');
      return { lines: outLines, nextCtx };
    }
    if (f.includes('shadow') || f === '/etc/shadow') {
      if (!isRoot) {
        add('cat: /etc/shadow: Permission denied', 'error');
        return { lines: outLines, nextCtx };
      }
      add('root:$6$g71..$mY0uRr00tH4sh3dGw03.:19632:0:99999:7:::');
      add('pivotuser:$6$j88..$p1v0tp4ss2024.:19632:0:99999:7:::');
      return { lines: outLines, nextCtx };
    }
    if (f.includes('maintenance.sh')) {
      add('#!/bin/bash');
      add('# Dual-homed Gateway Sync Script');
      add('echo "Starting route forwarder between eth0 and eth1..."');
      add('# Credentials backup: pivotuser : pivotpass2024');
      return { lines: outLines, nextCtx };
    }
  }

  if (action === 'ls') {
    add(isRoot ? 'flag.txt  maintenance.sh  scripts  routing_rules.sh  .bashrc' : 'flag.txt  maintenance.sh  scripts');
    return { lines: outLines, nextCtx };
  }

  add(`bash: ${action}: command not found on target-gateway-03`);
  return { lines: outLines, nextCtx };
}

// -------------------------------------------------------------
// SSH FINTECH TARGET 100 (routeradm@edge-gateway:~$ )
// -------------------------------------------------------------
function handleFintech100Command(
  cmd: string,
  ctx: CommandContext,
  ts: number
): { lines: TerminalOutputLine[]; nextCtx: CommandContext } {
  const outLines: TerminalOutputLine[] = [];
  const add = (text: string, type: TerminalOutputLine['type'] = 'output') => {
    outLines.push({ id: `t100-${ts}-${Math.random()}`, type, text, timestamp: ts });
  };
  const parts = cmd.split(/\s+/);
  const action = parts[0]?.toLowerCase() || '';
  const nextCtx = { ...ctx };
  const isRoot = ctx.shellMode === 'ssh_fintech100_root';

  if (action === 'exit') {
    if (isRoot) {
      add('exit');
      add('[*] Sesión root finalizada. Regresando a usuario routeradm...', 'system');
      nextCtx.shellMode = 'ssh_fintech100';
      return { lines: outLines, nextCtx };
    }
    add('Connection to 172.16.50.100 closed.');
    nextCtx.shellMode = 'kali';
    return { lines: outLines, nextCtx };
  }

  if (action === 'whoami') {
    add(isRoot ? 'root' : 'routeradm', isRoot ? 'success' : 'output');
    return { lines: outLines, nextCtx };
  }

  if (action === 'id') {
    add(isRoot ? 'uid=0(root) gid=0(root) groups=0(root)' : 'uid=1000(routeradm) gid=1000(routeradm) groups=1000(routeradm),27(sudo)', isRoot ? 'success' : 'output');
    return { lines: outLines, nextCtx };
  }

  if (action === 'pwd') {
    add(isRoot ? '/root' : '/home/routeradm');
    return { lines: outLines, nextCtx };
  }

  if (action === 'ip' || action === 'ifconfig') {
    add('eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500');
    add('        inet 172.16.50.100  netmask 255.255.255.0  broadcast 172.16.50.255');
    add('');
    add('eth1: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500', 'success');
    add('        inet 10.20.30.1  netmask 255.255.255.0  broadcast 10.20.30.255', 'success');
    add('[+] ¡PASARELA DUAL-HOMED DETECTADA! La interfaz eth1 conecta con la subred 10.20.30.0/24!', 'success');
    return { lines: outLines, nextCtx };
  }

  if (action === 'route' || (action === 'ip' && cmd.includes('route'))) {
    add('default via 172.16.50.1 dev eth0');
    add('10.20.30.0/24 dev eth1 proto kernel scope link src 10.20.30.1', 'success');
    add('172.16.50.0/24 dev eth0 proto kernel scope link src 172.16.50.100');
    return { lines: outLines, nextCtx };
  }

  // Sudo -l inspection
  if (action === 'sudo' && (parts[1] === '-l' || cmd.includes('-l'))) {
    add('Matching Defaults entries for routeradm on edge-gateway:');
    add('    env_reset, mail_badpass, secure_path=/usr/local/sbin\\:/usr/local/bin\\:/usr/sbin\\:/usr/bin\\:/sbin\\:/bin');
    add('');
    add('User routeradm may run the following commands on edge-gateway:');
    add('    (root) NOPASSWD: /bin/bash, /sbin/iptables', 'success');
    add('[+] Privilegios sudo NOPASSWD identificados: `/bin/bash`!', 'success');
    add('💡 Exploit: `sudo bash` o `sudo -i`', 'system');
    return { lines: outLines, nextCtx };
  }

  // Escalation execution
  if (action === 'sudo' && (parts[1] === 'bash' || parts[1] === '/bin/bash' || parts[1] === 'su' || parts[1] === '-i')) {
    add('[+] Ejecutando bash con privilegios root (NOPASSWD)...', 'system');
    add('[+] ¡Escalación de privilegios completada en edge-gateway! Spawning root shell...', 'success');
    add('[+] root@edge-gateway:~# (uid=0 gid=0 root)', 'success');
    nextCtx.shellMode = 'ssh_fintech100_root';
    nextCtx.compromisedHosts.add('172.16.50.100');
    return { lines: outLines, nextCtx };
  }

  // One-off sudo execution
  if (action === 'sudo') {
    const sub = parts[1] || '';
    if (sub === 'whoami') {
      add('root', 'success');
      return { lines: outLines, nextCtx };
    }
    if (sub === 'id') {
      add('uid=0(root) gid=0(root) groups=0(root)', 'success');
      return { lines: outLines, nextCtx };
    }
    if (sub === 'cat') {
      add('FLAG_FINTECH_PIVOT{dual_edge_tunnel_authorized}', 'success');
      ctx.foundFlags.add('flag-fintech-pivot');
      return { lines: outLines, nextCtx };
    }
  }

  if (action === 'cat') {
    const f = parts[1] || '';
    if (f.includes('vpn_token') || f.includes('token') || f.includes('flag')) {
      add('FLAG_FINTECH_PIVOT{dual_edge_tunnel_authorized}', 'success');
      ctx.foundFlags.add('flag-fintech-pivot');
      return { lines: outLines, nextCtx };
    }
    if (f.includes('shadow') || f === '/etc/shadow') {
      if (!isRoot) {
        add('cat: /etc/shadow: Permission denied', 'error');
        return { lines: outLines, nextCtx };
      }
      add('root:$6$h93..$mY0uRr00tH4sh3dEdge.:19632:0:99999:7:::');
      add('routeradm:$6$u11..$p4ssR0ut3rAdm.:19632:0:99999:7:::');
      return { lines: outLines, nextCtx };
    }
  }

  if (action === 'ls') {
    add(isRoot ? 'vpn_token.txt  flag.txt  firewall_rules.sh  scripts  .bashrc' : 'vpn_token.txt  firewall_rules.sh  scripts');
    return { lines: outLines, nextCtx };
  }

  add(`bash: ${action}: command not found on edge-gateway`);
  return { lines: outLines, nextCtx };
}
