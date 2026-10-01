const http = require('http');
const fs = require('fs');
const os = require('os');
const { exec, execSync, spawn } = require('child_process');
const crypto = require('crypto');
const path = require('path');
const EventEmitter = require('events');

const PORT = parseInt(process.env.PORT || '8080', 10);
const HOST = '0.0.0.0';
const ROOT_PASSWORD = process.env.ROOT_PASSWORD || process.env.SSH_PASSWORD || 'RamaGans76_';
const activeSessions = new Set();
const failedAttempts = new Map();
const installEmitter = new EventEmitter();
let currentInstall = null;

const LOGIN_HTML = fs.readFileSync(path.join(__dirname, 'views/login.html'), 'utf8');
const DASHBOARD_HTML = fs.readFileSync(path.join(__dirname, 'views/index.html'), 'utf8');

// CPU Sampling
let lastCpuSample = getCpuTimes();
function getCpuTimes() {
  const cpus = os.cpus();
  let idle = 0;
  let total = 0;
  for (const cpu of cpus) {
    for (const type in cpu.times) {
      total += cpu.times[type];
    }
    idle += cpu.times.idle;
  }
  return { idle, total };
}

function getCpuUsagePercent() {
  const current = getCpuTimes();
  const idleDelta = current.idle - lastCpuSample.idle;
  const totalDelta = current.total - lastCpuSample.total;
  lastCpuSample = current;
  if (totalDelta <= 0) return 0;
  const usage = 100 * (1 - idleDelta / totalDelta);
  return Math.max(0, Math.min(100, Math.round(usage * 10) / 10));
}

// Memory from /proc/meminfo
function getMemoryMetrics() {
  try {
    const data = fs.readFileSync('/proc/meminfo', 'utf8');
    const lines = data.split('\n');
    const mem = {};
    for (const line of lines) {
      const parts = line.split(':');
      if (parts.length === 2) {
        const key = parts[0].trim();
        const val = parseInt(parts[1].trim().split(' ')[0], 10);
        mem[key] = val; // in kB
      }
    }
    const totalBytes = (mem.MemTotal || 0) * 1024;
    const freeBytes = (mem.MemFree || 0) * 1024;
    const availBytes = (mem.MemAvailable || (mem.MemFree + (mem.Buffers || 0) + (mem.Cached || 0))) * 1024;
    const usedBytes = totalBytes - availBytes;
    const cachedBytes = ((mem.Cached || 0) + (mem.Buffers || 0)) * 1024;
    const percent = totalBytes > 0 ? Math.round((usedBytes / totalBytes) * 1000) / 10 : 0;
    
    return {
      totalBytes,
      usedBytes,
      freeBytes,
      availBytes,
      cachedBytes,
      percent,
      totalFormatted: formatBytes(totalBytes),
      usedFormatted: formatBytes(usedBytes),
      availFormatted: formatBytes(availBytes),
      cachedFormatted: formatBytes(cachedBytes),
    };
  } catch (e) {
    const totalBytes = os.totalmem();
    const freeBytes = os.freemem();
    const usedBytes = totalBytes - freeBytes;
    const percent = Math.round((usedBytes / totalBytes) * 1000) / 10;
    return {
      totalBytes,
      usedBytes,
      freeBytes,
      availBytes: freeBytes,
      cachedBytes: 0,
      percent,
      totalFormatted: formatBytes(totalBytes),
      usedFormatted: formatBytes(usedBytes),
      availFormatted: formatBytes(freeBytes),
      cachedFormatted: '0 B',
    };
  }
}

// Disk metrics from df
function getDiskMetrics() {
  try {
    const output = execSync("df -B1 / | tail -n 1", { encoding: 'utf8' }).trim();
    const parts = output.split(/\s+/);
    if (parts.length >= 6) {
      const total = parseInt(parts[1], 10);
      const used = parseInt(parts[2], 10);
      const avail = parseInt(parts[3], 10);
      const percent = total > 0 ? Math.round((used / total) * 1000) / 10 : 0;
      return {
        filesystem: parts[0],
        totalBytes: total,
        usedBytes: used,
        availBytes: avail,
        percent,
        mounted: parts[5],
        totalFormatted: formatBytes(total),
        usedFormatted: formatBytes(used),
        availFormatted: formatBytes(avail),
      };
    }
  } catch (e) {}
  return {
    filesystem: '/',
    totalBytes: 0,
    usedBytes: 0,
    availBytes: 0,
    percent: 0,
    mounted: '/',
    totalFormatted: 'N/A',
    usedFormatted: 'N/A',
    availFormatted: 'N/A',
  };
}

// Format bytes
function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Format Uptime
function formatUptime(seconds) {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

// Top processes
function getTopProcesses() {
  try {
    const output = execSync("ps aux --sort=-%mem | head -n 16", { encoding: 'utf8' });
    const lines = output.trim().split('\n');
    const result = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].trim().split(/\s+/);
      if (parts.length >= 11) {
        result.push({
          user: parts[0],
          pid: parts[1],
          cpu: parts[2] + '%',
          mem: parts[3] + '%',
          rss: formatBytes(parseInt(parts[5], 10) * 1024),
          stat: parts[7],
          time: parts[9],
          command: parts.slice(10).join(' ').substring(0, 100),
        });
      }
    }
    return result;
  } catch (e) {
    return [];
  }
}

// -------------------------------------------------------------
// Comprehensive Tools Catalog (Browsers, AI, Remote Desktop, Dev)
// -------------------------------------------------------------
const TOOLS_CATALOG = [
  // 1. Browsers for XRDP / GUI
  {
    id: 'chrome',
    name: 'Google Chrome',
    icon: '🌐',
    category: 'browsers',
    categoryName: 'Web Browsers (XRDP)',
    description: 'Browser resmi Google Chrome 64-bit lengkap dengan auto-wrapper --no-sandbox untuk root XRDP.',
    checkCmd: 'google-chrome --version || google-chrome-stable --version',
    installScript: `
      export DEBIAN_FRONTEND=noninteractive
      apt-get update -y
      apt-get install -y wget curl ca-certificates libxss1 libappindicator1 libindicator7 libasound2 libgbm1 fonts-liberation xdg-utils
      wget -q -O /tmp/chrome.deb https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
      dpkg -i /tmp/chrome.deb || apt-get install -fy
      rm -f /tmp/chrome.deb
      mkdir -p /root/Desktop /etc/skel/Desktop
      cat << 'EOF' > /usr/local/bin/google-chrome-stable
#!/bin/bash
exec /usr/bin/google-chrome-stable --no-sandbox --disable-dev-shm-usage --disable-gpu "$@"
EOF
      chmod +x /usr/local/bin/google-chrome-stable
      cp /usr/local/bin/google-chrome-stable /usr/local/bin/chrome 2>/dev/null || true
      cp /usr/local/bin/google-chrome-stable /usr/local/bin/google-chrome 2>/dev/null || true
      if [ -f /usr/share/applications/google-chrome.desktop ]; then
        cp /usr/share/applications/google-chrome.desktop /root/Desktop/
        chmod +x /root/Desktop/google-chrome.desktop
      fi
    `
  },
  {
    id: 'chromium',
    name: 'Chromium Browser',
    icon: '🧭',
    category: 'browsers',
    categoryName: 'Web Browsers (XRDP)',
    description: 'Browser open-source cepat & ringan berbasis engine Chromium dengan konfigurasi sandbox.',
    checkCmd: 'chromium --version || chromium-browser --version',
    installScript: `
      export DEBIAN_FRONTEND=noninteractive
      apt-get update -y
      apt-get install -y chromium chromium-common || apt-get install -y chromium-browser
      cat << 'EOF' > /usr/local/bin/chromium-browser
#!/bin/bash
exec /usr/bin/chromium --no-sandbox --disable-dev-shm-usage "$@"
EOF
      chmod +x /usr/local/bin/chromium-browser
      cp /usr/local/bin/chromium-browser /usr/local/bin/chromium 2>/dev/null || true
      mkdir -p /root/Desktop
      if [ -f /usr/share/applications/chromium.desktop ]; then
        cp /usr/share/applications/chromium.desktop /root/Desktop/
        chmod +x /root/Desktop/chromium.desktop
      elif [ -f /usr/share/applications/chromium-browser.desktop ]; then
        cp /usr/share/applications/chromium-browser.desktop /root/Desktop/
        chmod +x /root/Desktop/chromium-browser.desktop
      fi
    `
  },
  {
    id: 'firefox',
    name: 'Mozilla Firefox',
    icon: '🦊',
    category: 'browsers',
    categoryName: 'Web Browsers (XRDP)',
    description: 'Browser modern Mozilla Firefox ESR yang aman, stabil, dan ramah memory di remote desktop.',
    checkCmd: 'firefox --version || firefox-esr --version',
    installScript: `
      export DEBIAN_FRONTEND=noninteractive
      apt-get update -y
      apt-get install -y firefox-esr || apt-get install -y firefox
      mkdir -p /root/Desktop
      if [ -f /usr/share/applications/firefox-esr.desktop ]; then
        cp /usr/share/applications/firefox-esr.desktop /root/Desktop/
        chmod +x /root/Desktop/firefox-esr.desktop
      elif [ -f /usr/share/applications/firefox.desktop ]; then
        cp /usr/share/applications/firefox.desktop /root/Desktop/
        chmod +x /root/Desktop/firefox.desktop
      fi
    `
  },
  {
    id: 'brave',
    name: 'Brave Browser',
    icon: '🦁',
    category: 'browsers',
    categoryName: 'Web Browsers (XRDP)',
    description: 'Browser privasi dengan built-in ad blocker dan perlindungan tracking.',
    checkCmd: 'brave-browser --version || brave --version',
    installScript: `
      export DEBIAN_FRONTEND=noninteractive
      apt-get update -y
      apt-get install -y curl ca-certificates
      curl -fsSLo /usr/share/keyrings/brave-browser-archive-keyring.gpg https://brave-browser-apt-release.s3.brave.com/brave-browser-archive-keyring.gpg
      echo "deb [signed-by=/usr/share/keyrings/brave-browser-archive-keyring.gpg] https://brave-browser-apt-release.s3.brave.com/ stable main" > /etc/apt/sources.list.d/brave-browser-release.list
      apt-get update -y
      apt-get install -y brave-browser
      cat << 'EOF' > /usr/local/bin/brave-browser-stable
#!/bin/bash
exec /usr/bin/brave-browser-stable --no-sandbox --disable-dev-shm-usage "$@"
EOF
      chmod +x /usr/local/bin/brave-browser-stable
      mkdir -p /root/Desktop
      if [ -f /usr/share/applications/brave-browser.desktop ]; then
        cp /usr/share/applications/brave-browser.desktop /root/Desktop/
        chmod +x /root/Desktop/brave-browser.desktop
      fi
    `
  },

  // 2. AI Coding Agents
  {
    id: 'claude',
    name: 'Claude Code CLI',
    icon: '🤖',
    category: 'ai',
    categoryName: 'AI Coding Agents',
    description: 'Official terminal coding agent by Anthropic (perintah: claude / cl).',
    checkCmd: 'claude --version',
    installScript: `
      npm install -g @anthropic-ai/claude-code
    `
  },
  {
    id: 'agy',
    name: 'Google Antigravity CLI',
    icon: '⚡',
    category: 'ai',
    categoryName: 'AI Coding Agents',
    description: 'Google Antigravity autonomous developer & pair programming assistant (perintah: agy / ag).',
    checkCmd: 'agy --version',
    installScript: `
      curl -fsSL https://antigravity.google/cli/install.sh | bash -s -- --dir /usr/local/bin
      ln -sf /usr/local/bin/agy /usr/local/bin/antigravity 2>/dev/null || true
    `
  },
  {
    id: 'aider',
    name: 'Aider AI Pair Programming',
    icon: '🤝',
    category: 'ai',
    categoryName: 'AI Coding Agents',
    description: 'AI pair programmer langsung di git repo terminal (perintah: aider).',
    checkCmd: 'aider --version',
    installScript: `
      pip3 install --break-system-packages aider-chat || pip3 install aider-chat
    `
  },

  // 3. Remote Desktop & Workstation
  {
    id: 'xrdp',
    name: 'XRDP + XFCE4 GUI',
    icon: '🖥️',
    category: 'desktop',
    categoryName: 'Desktop & GUI',
    description: 'Remote Desktop Protocol server & lightweight XFCE4 GUI environment (Port 3389).',
    checkCmd: 'which xrdp && which xfce4-session',
    installScript: `
      export DEBIAN_FRONTEND=noninteractive
      apt-get update -y
      apt-get install -y xrdp xorgxrdp xfce4 xfce4-goodies dbus dbus-x11 x11-xserver-utils
      mkdir -p /var/run/dbus /var/run/xrdp /var/log/xrdp /root/Desktop /etc/skel/Desktop
      echo "startxfce4" > /root/.xsession
      echo "startxfce4" > /etc/skel/.xsession
      chmod 644 /root/.xsession /etc/skel/.xsession
      adduser xrdp ssl-cert 2>/dev/null || true
      service dbus start 2>/dev/null || true
      /usr/sbin/xrdp-sesman 2>/dev/null || true
      /usr/sbin/xrdp 2>/dev/null || true
    `
  },
  {
    id: 'vscode',
    name: 'VS Code Server',
    icon: '💻',
    category: 'desktop',
    categoryName: 'Desktop & GUI',
    description: 'Visual Studio Code versi Web Server (code-server) dapat diakses langsung via browser.',
    checkCmd: 'code-server --version || code --version',
    installScript: `
      curl -fsSL https://code-server.dev/install.sh | sh
    `
  },

  // 4. Developer & Media Tools
  {
    id: 'ffmpeg',
    name: 'FFmpeg Suite',
    icon: '🎬',
    category: 'dev',
    categoryName: 'Dev & Media Tools',
    description: 'Media processing engine audio/video encoding, streaming, remuxing & subtitle handling.',
    checkCmd: 'ffmpeg -version',
    installScript: `
      export DEBIAN_FRONTEND=noninteractive
      apt-get update -y && apt-get install -y ffmpeg
    `
  },
  {
    id: 'ytdlp',
    name: 'YT-DLP Downloader',
    icon: '📥',
    category: 'dev',
    categoryName: 'Dev & Media Tools',
    description: 'Downloader video/audio serbaguna berkecepatan tinggi dari YouTube & 1000+ website.',
    checkCmd: 'yt-dlp --version',
    installScript: `
      curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
      chmod a+rx /usr/local/bin/yt-dlp
    `
  },
  {
    id: 'python_dev',
    name: 'Python 3 Dev & PIP',
    icon: '🐍',
    category: 'dev',
    categoryName: 'Dev & Media Tools',
    description: 'Python 3, PIP3, virtualenv, python-dev header & compiler build-essential.',
    checkCmd: 'python3 --version && pip3 --version',
    installScript: `
      export DEBIAN_FRONTEND=noninteractive
      apt-get update -y && apt-get install -y python3 python3-pip python3-venv python3-dev build-essential
    `
  },
  {
    id: 'nodejs',
    name: 'Node.js LTS & NPM',
    icon: '🟢',
    category: 'dev',
    categoryName: 'Dev & Media Tools',
    description: 'Node.js JavaScript runtime environment & package manager NPM / n version manager.',
    checkCmd: 'node -v && npm -v',
    installScript: `
      export DEBIAN_FRONTEND=noninteractive
      apt-get update -y && apt-get install -y nodejs npm
      npm install -g n
      n lts
    `
  },
  {
    id: 'docker',
    name: 'Docker CLI & Tools',
    icon: '🐳',
    category: 'dev',
    categoryName: 'Dev & Media Tools',
    description: 'Docker container CLI & Docker Compose untuk menjalankan multi-container app.',
    checkCmd: 'docker --version || which docker',
    installScript: `
      export DEBIAN_FRONTEND=noninteractive
      apt-get update -y && apt-get install -y docker.io docker-compose || (curl -fsSL https://get.docker.com | sh)
    `
  },
  {
    id: 'nginx',
    name: 'Nginx Web Server',
    icon: '🌐',
    category: 'dev',
    categoryName: 'Dev & Media Tools',
    description: 'High performance HTTP/Reverse Proxy server untuk host website & API.',
    checkCmd: 'nginx -v',
    installScript: `
      export DEBIAN_FRONTEND=noninteractive
      apt-get update -y && apt-get install -y nginx
      service nginx start 2>/dev/null || true
    `
  },
  {
    id: 'redis',
    name: 'Redis Database',
    icon: '🗄️',
    category: 'dev',
    categoryName: 'Dev & Media Tools',
    description: 'In-memory data structure store & fast key-value caching server.',
    checkCmd: 'redis-cli --version',
    installScript: `
      export DEBIAN_FRONTEND=noninteractive
      apt-get update -y && apt-get install -y redis-server redis-tools
      service redis-server start 2>/dev/null || true
    `
  },
  {
    id: 'fastfetch',
    name: 'Fastfetch & Neofetch',
    icon: '📊',
    category: 'dev',
    categoryName: 'Dev & Media Tools',
    description: 'System info tool untuk menampilkan ringkasan OS, hardware, logo, dan spec di terminal.',
    checkCmd: 'fastfetch --version || neofetch --version',
    installScript: `
      export DEBIAN_FRONTEND=noninteractive
      apt-get update -y
      apt-get install -y neofetch 2>/dev/null || true
      curl -fsSL https://raw.githubusercontent.com/dylanaraps/neofetch/master/neofetch -o /usr/local/bin/neofetch
      chmod +x /usr/local/bin/neofetch
      (curl -fsSL https://github.com/fastfetch-cli/fastfetch/releases/latest/download/fastfetch-linux-amd64.deb -o /tmp/fastfetch.deb && dpkg -i /tmp/fastfetch.deb && rm -f /tmp/fastfetch.deb) 2>/dev/null || true
    `
  },
  {
    id: 'dev_essentials',
    name: 'Terminal Super Tools',
    icon: '🛠️',
    category: 'dev',
    categoryName: 'Dev & Media Tools',
    description: 'Kumpulan tool esensial: htop, btop, tmux, zsh, git, curl, wget, zip, unzip, nano, micro, vim, tree.',
    checkCmd: 'which htop && which tmux && which zsh && which git',
    installScript: `
      export DEBIAN_FRONTEND=noninteractive
      apt-get update -y
      apt-get install -y htop btop tmux screen zsh git curl wget zip unzip tar gzip bzip2 xz-utils p7zip-full nano vim micro tree jq bat ripgrep fd-find
    `
  }
];

function getToolsList() {
  return TOOLS_CATALOG.map(tool => {
    let installed = false;
    let version = null;
    try {
      const out = execSync(tool.checkCmd, { encoding: 'utf8', timeout: 3000, stdio: ['pipe', 'pipe', 'ignore'] });
      installed = true;
      const firstLine = out.trim().split('\n')[0].substring(0, 60);
      version = firstLine || 'Installed';
    } catch (e) {
      installed = false;
      version = null;
    }
    const isInstalling = currentInstall && currentInstall.id === tool.id && currentInstall.status === 'running';
    return {
      id: tool.id,
      name: tool.name,
      icon: tool.icon,
      category: tool.category,
      categoryName: tool.categoryName,
      description: tool.description,
      installed,
      version,
      isInstalling,
    };
  });
}

function startToolInstall(toolId, customCmd = null) {
  if (currentInstall && currentInstall.status === 'running') {
    throw new Error(`Instalasi lain sedang berjalan: ${currentInstall.toolName}`);
  }

  let commandToRun = '';
  let toolName = 'Custom Package';

  if (toolId) {
    const tool = TOOLS_CATALOG.find(t => t.id === toolId);
    if (!tool) throw new Error(`Tool ID '${toolId}' tidak ditemukan.`);
    commandToRun = tool.installScript;
    toolName = tool.name;
  } else if (customCmd) {
    commandToRun = customCmd;
    toolName = `Custom: ${customCmd.substring(0, 30)}`;
  } else {
    throw new Error('Tidak ada tool atau command yang ditentukan.');
  }

  currentInstall = {
    id: toolId || 'custom',
    toolName,
    status: 'running',
    logs: `[${new Date().toLocaleTimeString()}] Memulai instalasi ${toolName}...\n----------------------------------------\n`,
    startTime: Date.now(),
    exitCode: null,
  };

  installEmitter.emit('log', { type: 'start', install: currentInstall });

  const child = spawn('bash', ['-c', commandToRun], {
    env: {
      ...process.env,
      DEBIAN_FRONTEND: 'noninteractive',
      TERM: 'xterm-256color',
    }
  });

  child.stdout.on('data', (data) => {
    const text = data.toString();
    currentInstall.logs += text;
    installEmitter.emit('log', { type: 'data', text });
  });

  child.stderr.on('data', (data) => {
    const text = data.toString();
    currentInstall.logs += text;
    installEmitter.emit('log', { type: 'data', text });
  });

  child.on('close', (code) => {
    currentInstall.exitCode = code;
    currentInstall.status = code === 0 ? 'success' : 'failed';
    const endMsg = `\n----------------------------------------\n[${new Date().toLocaleTimeString()}] Selesai! Status: ${code === 0 ? 'BERHASIL (Success ✅)' : 'GAGAL (Exit Code ' + code + ' ❌)'}\n`;
    currentInstall.logs += endMsg;
    installEmitter.emit('log', { type: 'end', install: currentInstall });
  });

  child.on('error', (err) => {
    currentInstall.exitCode = 1;
    currentInstall.status = 'failed';
    const errMsg = `\n[ERROR]: ${err.message}\n`;
    currentInstall.logs += errMsg;
    installEmitter.emit('log', { type: 'error', error: err.message });
  });

  return currentInstall;
}

// Check AI tools (compact)
function getToolsStatus() {
  let claude = false;
  let agy = false;
  let chrome = false;
  let xrdp = false;
  try { execSync('which claude'); claude = true; } catch (e) {}
  try { execSync('which agy'); agy = true; } catch (e) {}
  try { execSync('which google-chrome || which chromium'); chrome = true; } catch (e) {}
  try { execSync('which xrdp'); xrdp = true; } catch (e) {}
  return { claude, agy, chrome, xrdp };
}

// Usage & Credit metrics calculation
function getUsageMetrics() {
  const trial = parseFloat(process.env.RAILWAY_TRIAL_CREDIT || '5.00');
  const vcpuRate = parseFloat(process.env.RAILWAY_VCPU_RATE || '0.02778');
  const memRate = parseFloat(process.env.RAILWAY_MEM_RATE || '0.01386');
  const egressRate = parseFloat(process.env.RAILWAY_EGRESS_RATE || '0.05');

  let cpu = os.cpus().length;
  try {
    if (fs.existsSync('/sys/fs/cgroup/cpu.max')) {
      const parts = fs.readFileSync('/sys/fs/cgroup/cpu.max', 'utf8').trim().split(' ');
      if (parts[0] !== 'max' && parts[1]) {
        cpu = parseFloat(parts[0]) / parseFloat(parts[1]);
      }
    }
  } catch (e) {}
  if (process.env.USAGE_CPU) cpu = parseFloat(process.env.USAGE_CPU);

  let memGb = os.totalmem() / (1024 * 1024 * 1024);
  try {
    if (fs.existsSync('/sys/fs/cgroup/memory.max')) {
      const val = fs.readFileSync('/sys/fs/cgroup/memory.max', 'utf8').trim();
      if (val !== 'max') {
        memGb = parseFloat(val) / (1024 * 1024 * 1024);
      }
    }
  } catch (e) {}
  if (process.env.USAGE_MEM_GB) memGb = parseFloat(process.env.USAGE_MEM_GB);

  let egressGb = 0;
  try {
    const netDev = fs.readFileSync('/proc/net/dev', 'utf8').split('\n');
    let txBytes = 0;
    for (let i = 2; i < netDev.length; i++) {
      const line = netDev[i].trim();
      if (!line || line.startsWith('lo:')) continue;
      const parts = line.split(/\s+/);
      if (parts.length >= 10) {
        txBytes += parseInt(parts[9], 10) || 0;
      }
    }
    egressGb = txBytes / (1024 * 1024 * 1024);
  } catch (e) {}
  if (process.env.USAGE_EGRESS_GB) egressGb = parseFloat(process.env.USAGE_EGRESS_GB);

  let ageSec = os.uptime();
  try {
    const deployMark = '/var/lib/ara/deploy-start';
    if (fs.existsSync(deployMark)) {
      const ts = parseInt(fs.readFileSync(deployMark, 'utf8').trim(), 10);
      if (ts > 0) {
        ageSec = Math.floor(Date.now() / 1000) - ts;
      }
    }
  } catch (e) {}
  if (process.env.USAGE_ELAPSED_SEC) ageSec = parseInt(process.env.USAGE_ELAPSED_SEC, 10);

  const burnRateHourly = cpu * vcpuRate + memGb * memRate;
  const usedCost = burnRateHourly * (ageSec / 3600) + egressGb * egressRate;
  const remainingCost = Math.max(0, trial - usedCost);
  const percentUsed = trial > 0 ? Math.min(100, Math.round((usedCost / trial) * 1000) / 10) : 0;
  const uptimeRemainingHours = burnRateHourly > 0 ? remainingCost / burnRateHourly : 0;
  const trialDaysLeft = burnRateHourly > 0 ? (trial / (burnRateHourly * 24)) : 0;

  return {
    trial: trial.toFixed(2),
    used: usedCost.toFixed(2),
    remaining: remainingCost.toFixed(2),
    percentUsed,
    burnRateHourly: burnRateHourly.toFixed(5),
    runtimeFormatted: formatUptime(ageSec),
    uptimeRemainingFormatted: formatUptime(Math.round(uptimeRemainingHours * 3600)),
    trialDaysLeft: trialDaysLeft.toFixed(1),
    cpuAlloc: cpu.toFixed(2),
    memAllocGb: memGb.toFixed(2),
    egressGb: egressGb.toFixed(3),
  };
}

// Collect all metrics
function getAllMetrics() {
  return {
    timestamp: Date.now(),
    server: {
      name: 'R-SERVER',
      hostname: 'server',
      os: 'Debian GNU/Linux 12 (bookworm)',
      kernel: os.release(),
      arch: os.arch(),
      uptimeSeconds: os.uptime(),
      uptimeFormatted: formatUptime(os.uptime()),
      nodeVersion: process.version,
    },
    cpu: {
      percent: getCpuUsagePercent(),
      cores: os.cpus().length,
      model: os.cpus()[0] ? os.cpus()[0].model : 'CPU',
      loadAvg: os.loadavg().map(v => Math.round(v * 100) / 100),
    },
    memory: getMemoryMetrics(),
    disk: getDiskMetrics(),
    tools: getToolsStatus(),
    usage: getUsageMetrics(),
    processes: getTopProcesses(),
  };
}

// Auth helpers
function parseCookies(req) {
  const list = {};
  const rc = req.headers.cookie;
  if (!rc) return list;
  rc.split(';').forEach(cookie => {
    const parts = cookie.split('=');
    list[parts.shift().trim()] = decodeURI(parts.join('='));
  });
  return list;
}

function isAuthenticated(req) {
  const cookies = parseCookies(req);
  const token = cookies['r_token'];
  if (!token) return false;
  return activeSessions.has(token);
}

function createSession() {
  const token = crypto.randomBytes(32).toString('hex');
  activeSessions.add(token);
  return token;
}

// HTTP Server
const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

  // Static Assets / HTML
  if (url.pathname === '/' || url.pathname === '/index.html') {
    if (!isAuthenticated(req)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(LOGIN_HTML);
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(DASHBOARD_HTML);
  }

  // Login API
  if (url.pathname === '/api/login' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const attempts = failedAttempts.get(clientIp) || 0;
        if (attempts >= 10) {
          res.writeHead(429, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Too many failed login attempts. Try again later.' }));
        }

        if (data.password === ROOT_PASSWORD) {
          failedAttempts.delete(clientIp);
          const token = createSession();
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Set-Cookie': `r_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`
          });
          return res.end(JSON.stringify({ success: true }));
        } else {
          failedAttempts.set(clientIp, attempts + 1);
          res.writeHead(401, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Password salah / Invalid password' }));
        }
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Bad request' }));
      }
    });
    return;
  }

  // Logout API
  if (url.pathname === '/api/logout' && req.method === 'POST') {
    const cookies = parseCookies(req);
    if (cookies['r_token']) activeSessions.delete(cookies['r_token']);
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Set-Cookie': 'r_token=; Path=/; HttpOnly; Max-Age=0'
    });
    return res.end(JSON.stringify({ success: true }));
  }

  // Metrics API (Requires Auth)
  if (url.pathname === '/api/stats') {
    if (!isAuthenticated(req)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Unauthorized' }));
    }
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    });
    return res.end(JSON.stringify(getAllMetrics()));
  }

  // SSE Stream API for Real-time metrics
  if (url.pathname === '/api/stream') {
    if (!isAuthenticated(req)) {
      res.writeHead(401, { 'Content-Type': 'text/plain' });
      return res.end('Unauthorized');
    }
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    const sendData = () => {
      try {
        const metrics = getAllMetrics();
        res.write(`data: ${JSON.stringify(metrics)}\n\n`);
      } catch (err) {}
    };

    sendData();
    const interval = setInterval(sendData, 2000);
    req.on('close', () => clearInterval(interval));
    return;
  }

  // -------------------------------------------------------------
  // Tool Installer APIs
  // -------------------------------------------------------------

  // GET /api/tools: Get list of tools with installation status
  if (url.pathname === '/api/tools' && req.method === 'GET') {
    if (!isAuthenticated(req)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Unauthorized' }));
    }
    try {
      const tools = getToolsList();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        tools,
        currentInstall: currentInstall ? {
          id: currentInstall.id,
          toolName: currentInstall.toolName,
          status: currentInstall.status,
          exitCode: currentInstall.exitCode,
          startTime: currentInstall.startTime,
        } : null
      }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: err.message }));
    }
  }

  // POST /api/tools/install: Trigger installation of a tool
  if (url.pathname === '/api/tools/install' && req.method === 'POST') {
    if (!isAuthenticated(req)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Unauthorized' }));
    }
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { toolId, customCmd } = JSON.parse(body);
        const installJob = startToolInstall(toolId, customCmd);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          success: true,
          message: `Instalasi ${installJob.toolName} dimulai.`,
          install: {
            id: installJob.id,
            toolName: installJob.toolName,
            status: installJob.status
          }
        }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // GET /api/tools/install-status: Get live status & logs of installation
  if (url.pathname === '/api/tools/install-status') {
    if (!isAuthenticated(req)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Unauthorized' }));
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      install: currentInstall ? {
        id: currentInstall.id,
        toolName: currentInstall.toolName,
        status: currentInstall.status,
        logs: currentInstall.logs,
        exitCode: currentInstall.exitCode,
        startTime: currentInstall.startTime,
      } : null
    }));
  }

  // GET /api/tools/stream: SSE for live real-time installation logs
  if (url.pathname === '/api/tools/stream') {
    if (!isAuthenticated(req)) {
      res.writeHead(401, { 'Content-Type': 'text/plain' });
      return res.end('Unauthorized');
    }
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    if (currentInstall) {
      res.write(`data: ${JSON.stringify({ type: 'init', logs: currentInstall.logs, status: currentInstall.status })}\n\n`);
    }

    const logListener = (event) => {
      try {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      } catch (e) {}
    };

    installEmitter.on('log', logListener);
    req.on('close', () => installEmitter.removeListener('log', logListener));
    return;
  }

  // Server Action: Restart Container / VPS
  if (url.pathname === '/api/action/restart' && req.method === 'POST') {
    if (!isAuthenticated(req)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Unauthorized' }));
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: 'Server is restarting in 2 seconds...' }));
    setTimeout(() => {
      exec('sync; kill -TERM 1 || kill -9 1');
    }, 1500);
    return;
  }

  // Server Action: Drop / Clean RAM Caches
  if (url.pathname === '/api/action/drop-caches' && req.method === 'POST') {
    if (!isAuthenticated(req)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Unauthorized' }));
    }
    exec('sync && (echo 3 > /proc/sys/vm/drop_caches 2>/dev/null || true)', (err) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'RAM cache dropped & buffers synchronized!' }));
    });
    return;
  }

  // Server Action: Restart SSH Service
  if (url.pathname === '/api/action/restart-sshd' && req.method === 'POST') {
    if (!isAuthenticated(req)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Unauthorized' }));
    }
    exec('/usr/sbin/sshd -t && (service ssh restart || killall -HUP sshd 2>/dev/null || true)', (err) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'SSHD service reloaded/restarted.' }));
    });
    return;
  }

  // Server Action: Kill Process
  if (url.pathname === '/api/action/kill-process' && req.method === 'POST') {
    if (!isAuthenticated(req)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Unauthorized' }));
    }
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { pid } = JSON.parse(body);
        const numPid = parseInt(pid, 10);
        if (!numPid || numPid <= 1) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Invalid PID' }));
        }
        exec(`kill -9 ${numPid}`, (err) => {
          if (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: err.message }));
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: `Process ${numPid} terminated.` }));
        });
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Bad request' }));
      }
    });
    return;
  }

  // Terminal Command Executor
  if (url.pathname === '/api/exec' && req.method === 'POST') {
    if (!isAuthenticated(req)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Unauthorized' }));
    }
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { cmd } = JSON.parse(body);
        if (!cmd || typeof cmd !== 'string') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Empty command' }));
        }
        exec(cmd, { timeout: 15000, maxBuffer: 1024 * 512 }, (err, stdout, stderr) => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            output: stdout || stderr || (err ? err.message : '(Command executed with no output)'),
            exitCode: err ? (err.code || 1) : 0
          }));
        });
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Bad request' }));
      }
    });
    return;
  }

  // Fallback 404
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

server.listen(PORT, HOST, () => {
  console.log(`[R-SERVER Dashboard] Running on http://${HOST}:${PORT}`);
});
