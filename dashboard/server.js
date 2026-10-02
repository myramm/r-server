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
// CLOUD WORKSTATION - 40 CATEGORIES SOFTWARE CATALOG
// -------------------------------------------------------------
const TOOLS_CATALOG = [
  // Standalone Core Services
  {
    id: 'nine_router',
    name: '9Router AI Gateway',
    icon: '🔀',
    category: 'ai_llm',
    categoryName: 'AI & LLM Tools',
    description: 'AI router & gateway proxy cerdas (Port 20128) untuk Claude, OpenAI, Gemini, Qwen, DeepSeek & Ollama.',
    checkCmd: 'which 9router',
    installScript: `
      export DEBIAN_FRONTEND=noninteractive
      npm install -g 9router pnpm pm2
      node -e 'try { require("/usr/local/lib/node_modules/9router/hooks/sqliteRuntime").ensureSqliteRuntime(); } catch(e) {}' 2>/dev/null || true
      PORT=20128 HOST=0.0.0.0 HOSTNAME=0.0.0.0 pm2 start /usr/local/lib/node_modules/9router/app/server.js --name 9router 2>/dev/null || (PORT=20128 HOST=0.0.0.0 HOSTNAME=0.0.0.0 nohup node /usr/local/lib/node_modules/9router/app/server.js >/var/log/9router.log 2>&1 &)
    `,
    uninstallScript: `
      pm2 delete 9router 2>/dev/null || true
      pkill -f "9router" 2>/dev/null || true
      npm uninstall -g 9router
    `
  },
  {
    id: 'git',
    name: 'Git Version Control & LFS',
    icon: '🐙',
    category: 'programming',
    categoryName: 'Languages & Compilers',
    description: 'Sistem kontrol versi Git, Git Large File Storage (git-lfs), dan GitHub CLI (gh).',
    checkCmd: 'git --version',
    installScript: `
      export DEBIAN_FRONTEND=noninteractive
      apt-get update -y && apt-get install -y git git-lfs gh
    `,
    uninstallScript: `
      apt-get remove --purge -y git git-lfs gh
      apt-get autoremove -y
    `
  },

  // ==========================================
  // SUPER BUNDLES (1-Click Multiple Tools)
  // ==========================================
  {
    id: 'bundle_quick_stack',
    name: '⚡ Quick Stack (Recommended)',
    icon: '⚡',
    category: 'bundles',
    categoryName: 'Super Bundles',
    description: 'Stack Cepat Siap Pakai: Git/GH + Python/Node + FFmpeg + Fastfetch/Btop + Claude/Antigravity/Hermes/9Router + Nginx + DB Clients.',
    checkCmd: 'which git && which node && which python3 && which ffmpeg',
    installScript: `
      export DEBIAN_FRONTEND=noninteractive
      apt-get update -y
      apt-get install -y wget curl ca-certificates git gh python3 python3-pip python3-venv python3-dev nodejs npm ffmpeg fastfetch htop btop tmux jq zsh nginx sqlite3 postgresql-client redis-tools
      npm install -g n pnpm pm2 @anthropic-ai/claude-code 9router
      curl -fsSL https://antigravity.google/cli/install.sh | bash -s -- --dir /usr/local/bin || true
      ln -sf /usr/local/bin/agy /usr/local/bin/antigravity 2>/dev/null || true
      pip3 install --break-system-packages uv aider-chat hermes-agent
    `
  },
  {
    id: 'bundle_recommended_vps',
    name: '💎 Recommended General VPS Pack',
    icon: '💎',
    category: 'bundles',
    categoryName: 'Super Bundles',
    description: 'Paket Lengkap Workstation & Cloud Developer: GUI + Browsers + Full Compilers (GCC/Rust/Go/Java) + Media + AI Agents + Cloud CLI.',
    checkCmd: 'which google-chrome && which rustc && which go && which claude',
    installScript: `
      export DEBIAN_FRONTEND=noninteractive
      apt-get update -y
      apt-get install -y wget curl ca-certificates git git-lfs gh build-essential gcc g++ clang cmake ninja-build python3 python3-pip python3-venv nodejs npm golang-go openjdk-17-jdk ffmpeg imagemagick mediainfo fastfetch htop btop ncdu tmux zsh fzf ripgrep bat eza sqlite3 postgresql-client redis-tools nginx certbot rsync rclone aria2
      wget -q -O /tmp/chrome.deb https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb && (dpkg -i /tmp/chrome.deb || apt-get install -fy) && rm -f /tmp/chrome.deb
      npm install -g n pnpm pm2 @anthropic-ai/claude-code @google/gemini-cli
      curl -fsSL https://antigravity.google/cli/install.sh | bash -s -- --dir /usr/local/bin || true
      ln -sf /usr/local/bin/agy /usr/local/bin/antigravity 2>/dev/null || true
      curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
      ln -sf /root/.cargo/bin/rustc /usr/local/bin/rustc 2>/dev/null || true
      ln -sf /root/.cargo/bin/cargo /usr/local/bin/cargo 2>/dev/null || true
      pip3 install --break-system-packages uv aider-chat jupyterlab
      mkdir -p /root/Desktop
      cp /usr/share/applications/google-chrome.desktop /usr/share/applications/xfce4-terminal.desktop /root/Desktop/ 2>/dev/null || true
      chmod +x /root/Desktop/*.desktop 2>/dev/null || true
    `
  },
  {
    id: 'bundle_desktop_super',
    name: 'Full Desktop Super Pack',
    icon: '📦',
    category: 'bundles',
    categoryName: 'Super Bundles',
    description: 'Instal paket lengkap: Chrome + Firefox + VS Code + LibreOffice + VLC + GIMP + Thunar + Desktop shortcuts.',
    checkCmd: 'which google-chrome && which firefox-esr && which code-server && which libreoffice',
    installScript: `
      export DEBIAN_FRONTEND=noninteractive
      apt-get update -y
      apt-get install -y wget curl ca-certificates libxss1 libappindicator1 libindicator7 libasound2 libgbm1 fonts-liberation xdg-utils firefox-esr libreoffice vlc gimp thunar dbus-x11
      wget -q -O /tmp/chrome.deb https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb && (dpkg -i /tmp/chrome.deb || apt-get install -fy) && rm -f /tmp/chrome.deb
      curl -fsSL https://code-server.dev/install.sh | sh
      cat << 'EOF' > /usr/local/bin/google-chrome-stable
#!/bin/bash
exec /usr/bin/google-chrome-stable --no-sandbox --disable-dev-shm-usage --disable-gpu "$@"
EOF
      chmod +x /usr/local/bin/google-chrome-stable
      cp /usr/local/bin/google-chrome-stable /usr/local/bin/chrome 2>/dev/null || true
      mkdir -p /root/Desktop
      cp /usr/share/applications/google-chrome.desktop /usr/share/applications/firefox-esr.desktop /usr/share/applications/libreoffice-startcenter.desktop /usr/share/applications/vlc.desktop /usr/share/applications/gimp.desktop /usr/share/applications/xfce4-terminal.desktop /root/Desktop/ 2>/dev/null || true
      chmod +x /root/Desktop/*.desktop 2>/dev/null || true
    `
  },
  {
    id: 'bundle_ai_ml',
    name: 'AI & Data Science Super Pack',
    icon: '🤖',
    category: 'bundles',
    categoryName: 'Super Bundles',
    description: 'Claude Code + Google Antigravity + Aider + JupyterLab + PyTorch + Pandas + NumPy + OpenCV + HuggingFace.',
    checkCmd: 'which claude && which agy && which jupyter',
    installScript: `
      export DEBIAN_FRONTEND=noninteractive
      apt-get update -y && apt-get install -y python3 python3-pip python3-venv python3-dev build-essential
      npm install -g @anthropic-ai/claude-code
      curl -fsSL https://antigravity.google/cli/install.sh | bash -s -- --dir /usr/local/bin
      ln -sf /usr/local/bin/agy /usr/local/bin/antigravity 2>/dev/null || true
      pip3 install --break-system-packages aider-chat jupyterlab ipython numpy pandas torch torchvision torchaudio transformers huggingface_hub opencv-python pillow rich
    `
  },
  {
    id: 'bundle_web_dev',
    name: 'Full Stack Dev Super Pack',
    icon: '⚡',
    category: 'bundles',
    categoryName: 'Super Bundles',
    description: 'Node.js LTS + Bun + Deno + Python 3 Dev + Go + Rust + Docker CLI + Nginx + Redis + Git LFS + GitHub CLI.',
    checkCmd: 'which node && which bun && which go && which rustc',
    installScript: `
      export DEBIAN_FRONTEND=noninteractive
      apt-get update -y && apt-get install -y nodejs npm git-lfs gh golang-go redis-tools nginx build-essential curl wget
      npm install -g n pnpm yarn pm2 typescript ts-node nodemon
      n lts
      curl -fsSL https://bun.sh/install | bash
      ln -sf /root/.bun/bin/bun /usr/local/bin/bun 2>/dev/null || true
      curl -fsSL https://deno.land/install.sh | sh
      ln -sf /root/.deno/bin/deno /usr/local/bin/deno 2>/dev/null || true
      curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
      ln -sf /root/.cargo/bin/rustc /usr/local/bin/rustc 2>/dev/null || true
      ln -sf /root/.cargo/bin/cargo /usr/local/bin/cargo 2>/dev/null || true
    `
  },

  // ==========================================
  // 1. WEB BROWSERS
  // ==========================================
  {
    id: 'chrome',
    name: 'Google Chrome',
    icon: '🌐',
    category: 'browsers',
    categoryName: 'Web Browsers',
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
    categoryName: 'Web Browsers',
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
      cp /usr/share/applications/chromium*.desktop /root/Desktop/ 2>/dev/null || true
      chmod +x /root/Desktop/*.desktop 2>/dev/null || true
    `
  },
  {
    id: 'firefox',
    name: 'Mozilla Firefox ESR',
    icon: '🦊',
    category: 'browsers',
    categoryName: 'Web Browsers',
    description: 'Browser modern Mozilla Firefox ESR yang aman, stabil, dan ramah memory di remote desktop.',
    checkCmd: 'firefox --version || firefox-esr --version',
    installScript: `
      export DEBIAN_FRONTEND=noninteractive
      apt-get update -y && apt-get install -y firefox-esr || apt-get install -y firefox
      mkdir -p /root/Desktop
      cp /usr/share/applications/firefox*.desktop /root/Desktop/ 2>/dev/null || true
      chmod +x /root/Desktop/*.desktop 2>/dev/null || true
    `
  },
  {
    id: 'brave',
    name: 'Brave Browser',
    icon: '🦁',
    category: 'browsers',
    categoryName: 'Web Browsers',
    description: 'Browser privasi dengan built-in ad blocker dan perlindungan tracking.',
    checkCmd: 'brave-browser --version || brave --version',
    installScript: `
      export DEBIAN_FRONTEND=noninteractive
      apt-get update -y && apt-get install -y curl ca-certificates
      curl -fsSLo /usr/share/keyrings/brave-browser-archive-keyring.gpg https://brave-browser-apt-release.s3.brave.com/brave-browser-archive-keyring.gpg
      echo "deb [signed-by=/usr/share/keyrings/brave-browser-archive-keyring.gpg] https://brave-browser-apt-release.s3.brave.com/ stable main" > /etc/apt/sources.list.d/brave-browser-release.list
      apt-get update -y && apt-get install -y brave-browser
      cat << 'EOF' > /usr/local/bin/brave-browser-stable
#!/bin/bash
exec /usr/bin/brave-browser-stable --no-sandbox --disable-dev-shm-usage "$@"
EOF
      chmod +x /usr/local/bin/brave-browser-stable
      mkdir -p /root/Desktop
      cp /usr/share/applications/brave-browser.desktop /root/Desktop/ 2>/dev/null || true
      chmod +x /root/Desktop/*.desktop 2>/dev/null || true
    `
  },
  {
    id: 'edge',
    name: 'Microsoft Edge',
    icon: '🌊',
    category: 'browsers',
    categoryName: 'Web Browsers',
    description: 'Microsoft Edge for Linux dengan integrasi Microsoft services & Chromium engine.',
    checkCmd: 'microsoft-edge --version || microsoft-edge-stable --version',
    installScript: `
      export DEBIAN_FRONTEND=noninteractive
      apt-get update -y && apt-get install -y curl ca-certificates gnupg
      curl -fsSL https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > /etc/apt/trusted.gpg.d/microsoft.gpg
      echo "deb [arch=amd64] https://packages.microsoft.com/repos/edge stable main" > /etc/apt/sources.list.d/microsoft-edge.list
      apt-get update -y && apt-get install -y microsoft-edge-stable
      cat << 'EOF' > /usr/local/bin/microsoft-edge-stable
#!/bin/bash
exec /usr/bin/microsoft-edge-stable --no-sandbox --disable-dev-shm-usage "$@"
EOF
      chmod +x /usr/local/bin/microsoft-edge-stable
      cp /usr/share/applications/microsoft-edge.desktop /root/Desktop/ 2>/dev/null || true
      chmod +x /root/Desktop/*.desktop 2>/dev/null || true
    `
  },
  {
    id: 'midori',
    name: 'Midori / Falkon Browser',
    icon: '🕊️',
    category: 'browsers',
    categoryName: 'Web Browsers',
    description: 'Browser ultra-ringan berbasis QtWebEngine cocok untuk server dengan RAM minimal.',
    checkCmd: 'falkon --version || midori --version',
    installScript: `
      export DEBIAN_FRONTEND=noninteractive
      apt-get update -y && apt-get install -y falkon || apt-get install -y midori
      cp /usr/share/applications/org.kde.falkon.desktop /root/Desktop/ 2>/dev/null || true
      chmod +x /root/Desktop/*.desktop 2>/dev/null || true
    `
  },

  // ==========================================
  // 2. DESKTOP GUI APPS & OFFICE
  // ==========================================
  {
    id: 'libreoffice',
    name: 'LibreOffice Suite',
    icon: '📊',
    category: 'desktop_apps',
    categoryName: 'Desktop & Office',
    description: 'Full Office Suite: Writer (Word), Calc (Excel), Impress (PowerPoint) & Draw.',
    checkCmd: 'libreoffice --version',
    installScript: `
      export DEBIAN_FRONTEND=noninteractive
      apt-get update -y && apt-get install -y libreoffice libreoffice-gtk3
      mkdir -p /root/Desktop
      cp /usr/share/applications/libreoffice*.desktop /root/Desktop/ 2>/dev/null || true
      chmod +x /root/Desktop/*.desktop 2>/dev/null || true
    `
  },
  {
    id: 'vlc',
    name: 'VLC Media Player',
    icon: '🔶',
    category: 'desktop_apps',
    categoryName: 'Desktop & Office',
    description: 'Player video & audio nomor satu di dunia yang mendukung semua format codec multimedia.',
    checkCmd: 'vlc --version',
    installScript: `
      export DEBIAN_FRONTEND=noninteractive
      apt-get update -y && apt-get install -y vlc
      sed -i 's/geteuid/getppid/' /usr/bin/vlc 2>/dev/null || true
      cp /usr/share/applications/vlc.desktop /root/Desktop/ 2>/dev/null || true
      chmod +x /root/Desktop/*.desktop 2>/dev/null || true
    `
  },
  {
    id: 'gimp',
    name: 'GIMP Image Editor',
    icon: '🎨',
    category: 'desktop_apps',
    categoryName: 'Desktop & Office',
    description: 'Editor gambar & foto profesional open-source (alternatif Adobe Photoshop).',
    checkCmd: 'gimp --version',
    installScript: `
      export DEBIAN_FRONTEND=noninteractive
      apt-get update -y && apt-get install -y gimp
      cp /usr/share/applications/gimp.desktop /root/Desktop/ 2>/dev/null || true
      chmod +x /root/Desktop/*.desktop 2>/dev/null || true
    `
  },
  {
    id: 'inkscape',
    name: 'Inkscape Vector Graphics',
    icon: '✒️',
    category: 'desktop_apps',
    categoryName: 'Desktop & Office',
    description: 'Aplikasi desain grafis vektor SVG berkualitas profesional (alternatif Adobe Illustrator).',
    checkCmd: 'inkscape --version',
    installScript: `
      export DEBIAN_FRONTEND=noninteractive
      apt-get update -y && apt-get install -y inkscape
      cp /usr/share/applications/org.inkscape.Inkscape.desktop /root/Desktop/ 2>/dev/null || true
      chmod +x /root/Desktop/*.desktop 2>/dev/null || true
    `
  },
  {
    id: 'vscode',
    name: 'VS Code Server',
    icon: '💻',
    category: 'desktop_apps',
    categoryName: 'Desktop & Office',
    description: 'Visual Studio Code versi Web Server (code-server) dapat diakses via browser atau RDP.',
    checkCmd: 'code-server --version || code --version',
    installScript: `
      curl -fsSL https://code-server.dev/install.sh | sh
    `
  },
  {
    id: 'geany',
    name: 'Geany IDE & Editor',
    icon: '💡',
    category: 'desktop_apps',
    categoryName: 'Desktop & Office',
    description: 'IDE & text editor super ringan & cepat untuk C, C++, Python, HTML, PHP, Java.',
    checkCmd: 'geany --version',
    installScript: `
      export DEBIAN_FRONTEND=noninteractive
      apt-get update -y && apt-get install -y geany geany-plugins
      cp /usr/share/applications/geany.desktop /root/Desktop/ 2>/dev/null || true
      chmod +x /root/Desktop/*.desktop 2>/dev/null || true
    `
  },
  {
    id: 'file_managers',
    name: 'Thunar & Midnight Commander',
    icon: '📁',
    category: 'desktop_apps',
    categoryName: 'Desktop & Office',
    description: 'File Manager GUI Thunar + File Manager Terminal Midnight Commander (mc) & Double Commander.',
    checkCmd: 'which thunar && which mc',
    installScript: `
      export DEBIAN_FRONTEND=noninteractive
      apt-get update -y && apt-get install -y thunar thunar-archive-plugin mc doublecmd-gtk ranger
      cp /usr/share/applications/thunar.desktop /root/Desktop/ 2>/dev/null || true
      chmod +x /root/Desktop/*.desktop 2>/dev/null || true
    `
  },
  {
    id: 'pdf_tools',
    name: 'Evince PDF & Document Tools',
    icon: '📄',
    category: 'desktop_apps',
    categoryName: 'Desktop & Office',
    description: 'Evince PDF viewer + Poppler utilities (pdftotext, pdftoppm, pdfunite) + Pandoc.',
    checkCmd: 'which evince && which pandoc',
    installScript: `
      export DEBIAN_FRONTEND=noninteractive
      apt-get update -y && apt-get install -y evince poppler-utils pandoc qpdf
      cp /usr/share/applications/org.gnome.Evince.desktop /root/Desktop/ 2>/dev/null || true
      chmod +x /root/Desktop/*.desktop 2>/dev/null || true
    `
  },
  {
    id: 'wine',
    name: 'Wine & Windows Compatibility',
    icon: '🍷',
    category: 'desktop_apps',
    categoryName: 'Desktop & Office',
    description: 'Wine64 & Winetricks untuk menjalankan aplikasi Windows (.exe) di Linux.',
    checkCmd: 'wine --version || which wine64',
    installScript: `
      export DEBIAN_FRONTEND=noninteractive
      dpkg --add-architecture i386 2>/dev/null || true
      apt-get update -y && apt-get install -y wine wine64 winetricks
    `
  },

  // ==========================================
  // 3. AI & MACHINE LEARNING / AI CODING AGENTS
  // ==========================================
  // ==========================================
  // 3. AI & MACHINE LEARNING / AI CODING AGENTS (MASTER LIST V3)
  // ==========================================
  {
    id: 'claude',
    name: 'Claude Code CLI',
    icon: '🤖',
    category: 'ai_ml',
    categoryName: 'AI & Coding Agents',
    description: 'Official terminal coding agent by Anthropic (perintah: claude / cl). Otomatis refactor, bug fixing, test, dan git workflow.',
    checkCmd: 'claude --version',
    installScript: `
      npm install -g @anthropic-ai/claude-code
      cat << 'EOF' > /root/Desktop/claude-code.desktop
[Desktop Entry]
Version=1.0
Type=Application
Name=Claude Code
Comment=Anthropic AI Coding Agent
Exec=xfce4-terminal -T "Claude Code" -e "claude"
Icon=utilities-terminal
Terminal=false
Categories=Development;
EOF
      chmod +x /root/Desktop/claude-code.desktop 2>/dev/null || true
    `,
    uninstallScript: `
      npm uninstall -g @anthropic-ai/claude-code
      rm -f /root/Desktop/claude-code.desktop /usr/local/bin/claude /usr/local/bin/cl
    `
  },
  {
    id: 'agy',
    name: 'Google Antigravity CLI',
    icon: '⚡',
    category: 'ai_ml',
    categoryName: 'AI & Coding Agents',
    description: 'Google Antigravity autonomous developer & pair programming assistant (perintah: agy / ag).',
    checkCmd: 'agy --version',
    installScript: `
      curl -fsSL https://antigravity.google/cli/install.sh | bash -s -- --dir /usr/local/bin
      ln -sf /usr/local/bin/agy /usr/local/bin/antigravity 2>/dev/null || true
      cat << 'EOF' > /root/Desktop/antigravity.desktop
[Desktop Entry]
Version=1.0
Type=Application
Name=Google Antigravity
Comment=Google AI Coding Agent
Exec=xfce4-terminal -T "Google Antigravity" -e "agy"
Icon=utilities-terminal
Terminal=false
Categories=Development;
EOF
      chmod +x /root/Desktop/antigravity.desktop 2>/dev/null || true
    `,
    uninstallScript: `
      rm -f /usr/local/bin/agy /usr/local/bin/antigravity /root/.local/bin/agy /root/Desktop/antigravity.desktop
    `
  },
  {
    id: 'hermes',
    name: 'Hermes Agent (Nous Research)',
    icon: '🧠',
    category: 'ai_ml',
    categoryName: 'AI & Coding Agents',
    description: 'Autonomous AI agent & terminal TUI by Nous Research. File operations, Git workflows, MCP integrations, persistent sessions, skills, tool delegation.',
    checkCmd: 'which hermes || hermes --version 2>/dev/null || python3 -c "import hermes" 2>/dev/null',
    installScript: `
      export DEBIAN_FRONTEND=noninteractive
      echo "==> [Hermes Agent] Memulai instalasi Hermes Agent via PyPI..."
      pip3 install --break-system-packages hermes-agent || pip3 install --break-system-packages git+https://github.com/NousResearch/hermes-agent.git
      cat << 'EOF' > /root/Desktop/hermes.desktop
[Desktop Entry]
Version=1.0
Type=Application
Name=Hermes Agent
Comment=Nous Research AI Terminal Agent
Exec=xfce4-terminal -T "Hermes Agent" -e "hermes"
Icon=utilities-terminal
Terminal=false
Categories=Development;
EOF
      chmod +x /root/Desktop/hermes.desktop 2>/dev/null || true
      echo "==> [Hermes Agent] Verifikasi instalasi..."
      which hermes && hermes --version 2>/dev/null || true
      echo "==> [Hermes Agent] Berhasil terpasang! Ketik: hermes"
    `,
    uninstallScript: `
      pip3 uninstall -y hermes-agent 2>/dev/null || true
      rm -f /usr/local/bin/hermes /root/.local/bin/hermes /root/Desktop/hermes.desktop
    `
  },
  {
    id: '9router',
    name: '9Router AI Gateway & Proxy',
    icon: '🔀',
    category: 'ai_ml',
    categoryName: 'AI & Coding Agents',
    description: 'AI Router/Proxy lokal (Port 20128) perantara Claude Code, Antigravity, Cursor, Aider, Codex, Gemini ke multiple providers (Claude, OpenAI, DeepSeek, Qwen, OpenRouter) dengan fallback & token saving.',
    checkCmd: '9router --version || which 9router',
    installScript: `
      export DEBIAN_FRONTEND=noninteractive
      echo "==> [9Router] Mengunduh dan menginstal 9router dari npm global..."
      npm install -g 9router --foreground-scripts || npm install -g 9router
      echo "==> [9Router] Verifikasi instalasi..."
      which 9router && 9router --version || true
      echo "==> [9Router] Berhasil terpasang! Ketik: 9router (Port 20128)"
    `,
    uninstallScript: `
      pkill -f 9router 2>/dev/null || true
      npm uninstall -g 9router
    `
  },
  {
    id: 'opencode',
    name: 'OpenCode AI Terminal',
    icon: '⚡',
    category: 'ai_ml',
    categoryName: 'AI & Coding Agents',
    description: 'Autonomous open-source AI terminal agent (OpenCode AI) untuk refactoring, code editing, command execution & multi-file agents (perintah: opencode / oc).',
    checkCmd: 'opencode --version || which opencode',
    installScript: `
      export DEBIAN_FRONTEND=noninteractive
      echo "==> [OpenCode] Menginstal OpenCode AI..."
      npm install -g opencode-ai || curl -fsSL https://opencode.ai/install | bash -s -- --dir /usr/local/bin
      echo "==> [OpenCode] Verifikasi instalasi..."
      which opencode && opencode --version || true
      echo "==> [OpenCode] Berhasil terpasang! Ketik: opencode atau oc"
    `,
    uninstallScript: `
      npm uninstall -g opencode-ai 2>/dev/null || true
      rm -f /usr/local/bin/opencode /root/.local/bin/opencode
    `
  },
  {
    id: 'freebuff',
    name: 'Freebuff AI Assistant',
    icon: '🛡️',
    category: 'ai_ml',
    categoryName: 'AI & Coding Agents',
    description: 'Ad-supported multi-agent coding assistant CLI dengan berbagai model AI gratis dan akses tools otomatis (perintah: freebuff / fb).',
    checkCmd: 'freebuff --version || which freebuff',
    installScript: `
      export DEBIAN_FRONTEND=noninteractive
      echo "==> [Freebuff] Menginstal Freebuff CLI..."
      npm install -g freebuff
      echo "==> [Freebuff] Verifikasi instalasi..."
      which freebuff && freebuff --version || true
      echo "==> [Freebuff] Berhasil terpasang! Ketik: freebuff atau fb"
    `,
    uninstallScript: `
      npm uninstall -g freebuff 2>/dev/null || true
      rm -f /usr/local/bin/freebuff /root/.local/bin/freebuff
    `
  },
  {
    id: 'aider',
    name: 'Aider AI Pair Programming',
    icon: '🤝',
    category: 'ai_ml',
    categoryName: 'AI & Coding Agents',
    description: 'AI pair programmer langsung di git repo terminal dengan multi-model support (perintah: aider / ai).',
    checkCmd: 'aider --version',
    installScript: `
      pip3 install --break-system-packages aider-chat || pip3 install aider-chat
      cat << 'EOF' > /root/Desktop/aider.desktop
[Desktop Entry]
Version=1.0
Type=Application
Name=Aider AI
Comment=AI Pair Programming in Terminal
Exec=xfce4-terminal -T "Aider AI" -e "aider"
Icon=utilities-terminal
Terminal=false
Categories=Development;
EOF
      chmod +x /root/Desktop/aider.desktop 2>/dev/null || true
    `,
    uninstallScript: `
      pip3 uninstall -y aider-chat 2>/dev/null || true
      rm -f /usr/local/bin/aider /root/.local/bin/aider /root/Desktop/aider.desktop
    `
  },
  {
    id: 'gemini_cli',
    name: 'Google Gemini CLI',
    icon: '✨',
    category: 'ai_ml',
    categoryName: 'AI & Coding Agents',
    description: 'Official Google Gemini developer CLI untuk prompt, multi-modal reasoning & coding di terminal.',
    checkCmd: 'gemini --version || which gemini',
    installScript: `
      npm install -g @google/gemini-cli || true
    `,
    uninstallScript: `
      npm uninstall -g @google/gemini-cli 2>/dev/null || true
      rm -f /usr/local/bin/gemini /root/.local/bin/gemini
    `
  },
  {
    id: 'goose',
    name: 'Goose AI Autonomous Agent',
    icon: '🪿',
    category: 'ai_ml',
    categoryName: 'AI & Coding Agents',
    description: 'Open-source, extensible AI agent by Block/Square that automates engineering tasks, bash execution, and MCP tools.',
    checkCmd: 'which goose || goose --version 2>/dev/null',
    installScript: `
      curl -fsSL https://github.com/block/goose/releases/download/stable/download_cli.sh | bash 2>/dev/null || pip3 install --break-system-packages goose-ai 2>/dev/null || true
    `,
    uninstallScript: `
      rm -f /root/.local/bin/goose /usr/local/bin/goose
      pip3 uninstall -y goose-ai 2>/dev/null || true
    `
  },
  {
    id: 'open_interpreter',
    name: 'Open Interpreter (Computer-Use)',
    icon: '💻',
    category: 'ai_ml',
    categoryName: 'AI & Coding Agents',
    description: 'Natural language terminal interface executing Python, JS, Bash, and OS/Browser control locally.',
    checkCmd: 'which interpreter || interpreter --version 2>/dev/null',
    installScript: `
      pip3 install --break-system-packages open-interpreter
    `,
    uninstallScript: `
      pip3 uninstall -y open-interpreter 2>/dev/null || true
      rm -f /usr/local/bin/interpreter /root/.local/bin/interpreter
    `
  },
  {
    id: 'shellgpt',
    name: 'ShellGPT (sgpt)',
    icon: '🐚',
    category: 'ai_ml',
    categoryName: 'AI & Coding Agents',
    description: 'Command-line AI productivity tool untuk generate bash commands, shell scripts, code refactors, dan penjelasan.',
    checkCmd: 'which sgpt || sgpt --version 2>/dev/null',
    installScript: `
      pip3 install --break-system-packages shell-gpt
    `,
    uninstallScript: `
      pip3 uninstall -y shell-gpt 2>/dev/null || true
      rm -f /usr/local/bin/sgpt /root/.local/bin/sgpt
    `
  },
  {
    id: 'plandex',
    name: 'Plandex AI Coding Engine',
    icon: '🏗️',
    category: 'ai_ml',
    categoryName: 'AI & Coding Agents',
    description: 'Terminal-based AI coding engine for complex, multi-file software engineering tasks with version control sandboxing.',
    checkCmd: 'which plandex || plandex --version 2>/dev/null',
    installScript: `
      curl -sL https://plandex.ai/install.sh | bash 2>/dev/null || true
      ln -sf /root/.plandex/bin/plandex /usr/local/bin/plandex 2>/dev/null || true
    `,
    uninstallScript: `
      rm -rf /root/.plandex /usr/local/bin/plandex
    `
  },
  {
    id: 'swe_agent',
    name: 'SWE-agent (Software Engineering)',
    icon: '🛠️',
    category: 'ai_ml',
    categoryName: 'AI & Coding Agents',
    description: 'Autonomous SWE agent by Princeton University for solving real-world GitHub issues and autonomous bug fixing.',
    checkCmd: 'which sweagent || python3 -c "import sweagent" 2>/dev/null',
    installScript: `
      pip3 install --break-system-packages swe-agent 2>/dev/null || pip3 install --break-system-packages git+https://github.com/princeton-nlp/SWE-agent.git 2>/dev/null || true
    `,
    uninstallScript: `
      pip3 uninstall -y swe-agent sweagent 2>/dev/null || true
      rm -f /usr/local/bin/sweagent /root/.local/bin/sweagent
    `
  },
  {
    id: 'browser_use',
    name: 'browser-use AI Web Agent',
    icon: '🌐',
    category: 'ai_ml',
    categoryName: 'AI & Coding Agents',
    description: 'AI agent for autonomous browser automation and web interactions powered by Playwright and LLMs.',
    checkCmd: 'python3 -c "import browser_use; print(\"browser-use ready\")" 2>/dev/null',
    installScript: `
      pip3 install --break-system-packages browser-use playwright langchain-openai 2>/dev/null || true
    `,
    uninstallScript: `
      pip3 uninstall -y browser-use 2>/dev/null || true
    `
  },
  {
    id: 'amazon_q',
    name: 'Amazon Q Developer CLI',
    icon: '☁️',
    category: 'ai_ml',
    categoryName: 'AI & Coding Agents',
    description: 'Generative AI coding assistant by AWS for command line completions, git integrations, and cloud development.',
    checkCmd: 'which q || q --version 2>/dev/null',
    installScript: `
      npm install -g @aws/q 2>/dev/null || true
    `,
    uninstallScript: `
      npm uninstall -g @aws/q 2>/dev/null || true
      rm -f /usr/local/bin/q /root/.local/bin/q
    `
  },
  {
    id: 'openhands',
    name: 'OpenHands AI Framework',
    icon: '👐',
    category: 'ai_ml',
    categoryName: 'AI & Coding Agents',
    description: 'Open-source platform for autonomous software development agents with multi-runtime tools and sandbox support.',
    checkCmd: 'python3 -c "import openhands" 2>/dev/null || which openhands',
    installScript: `
      pip3 install --break-system-packages openhands-ai 2>/dev/null || true
    `,
    uninstallScript: `
      pip3 uninstall -y openhands-ai 2>/dev/null || true
    `
  },
  {
    id: 'opencode',
    name: 'OpenCode AI Agent',
    icon: '💻',
    category: 'ai_ml',
    categoryName: 'AI & Coding Agents',
    description: 'Open-source autonomous AI coding agent untuk terminal & repository workflow.',
    checkCmd: 'opencode --version || which opencode',
    installScript: `
      npm install -g opencode-ai 2>/dev/null || npm install -g opencode 2>/dev/null || pip3 install --break-system-packages opencode 2>/dev/null || true
    `,
    uninstallScript: `
      npm uninstall -g opencode-ai opencode 2>/dev/null || true
      pip3 uninstall -y opencode 2>/dev/null || true
    `
  },
  {
    id: 'qwen_code',
    name: 'Qwen Code Assistant',
    icon: '🔮',
    category: 'ai_ml',
    categoryName: 'AI & Coding Agents',
    description: 'Qwen AI coding & developer agent toolkit by Alibaba Cloud.',
    checkCmd: 'python3 -c "import qwen_agent; print(\"Qwen Ready\")" 2>/dev/null || which qwen-agent',
    installScript: `
      pip3 install --break-system-packages qwen-agent 2>/dev/null || true
    `,
    uninstallScript: `
      pip3 uninstall -y qwen-agent 2>/dev/null || true
    `
  },
  {
    id: 'copilot_cli',
    name: 'GitHub Copilot CLI',
    icon: '🐙',
    category: 'ai_ml',
    categoryName: 'AI & Coding Agents',
    description: 'GitHub Copilot in the CLI (`gh copilot`) untuk saran perintah bash dan coding query.',
    checkCmd: 'gh copilot --version 2>/dev/null || npm list -g @githubnext/github-copilot-cli 2>/dev/null',
    installScript: `
      gh extension install github/gh-copilot 2>/dev/null || npm install -g @githubnext/github-copilot-cli 2>/dev/null || true
    `,
    uninstallScript: `
      gh extension remove github/gh-copilot 2>/dev/null || true
      npm uninstall -g @githubnext/github-copilot-cli 2>/dev/null || true
    `
  },
  {
    id: 'agent_frameworks',
    name: 'AI Multi-Agent Frameworks Pack',
    icon: '🧩',
    category: 'ai_ml',
    categoryName: 'AI & Coding Agents',
    description: 'Paket Multi-Agent Frameworks: CrewAI, LangGraph, AutoGen, Agno (Phidata), DSPy, LlamaIndex, PydanticAI.',
    checkCmd: 'python3 -c "import crewai, langgraph; print(\"Frameworks ready\")" 2>/dev/null',
    installScript: `
      pip3 install --break-system-packages crewai langgraph autogen-agentchat agno dspy-ai llama-index pydantic-ai 2>/dev/null || true
    `,
    uninstallScript: `
      pip3 uninstall -y crewai langgraph autogen-agentchat agno dspy-ai llama-index pydantic-ai 2>/dev/null || true
    `
  },
  {
    id: 'ollama',
    name: 'Ollama Local LLM Engine',
    icon: '🦙',
    category: 'ai_ml',
    categoryName: 'AI & Coding Agents',
    description: 'Jalankan model LLM lokal seperti Llama 3, DeepSeek-Coder, Mistral, Qwen, Phi-3 langsung di VPS.',
    checkCmd: 'ollama --version',
    installScript: `
      export DEBIAN_FRONTEND=noninteractive
      apt-get update -y && apt-get install -y zstd curl
      curl -fsSL https://ollama.com/install.sh | sh
    `,
    uninstallScript: `
      pkill -f ollama 2>/dev/null || true
      rm -f /usr/local/bin/ollama
      rm -rf /root/.ollama /usr/share/ollama
    `
  },
  {
    id: 'huggingface',
    name: 'Hugging Face Hub CLI',
    icon: '🤗',
    category: 'ai_ml',
    categoryName: 'AI & Coding Agents',
    description: 'Download, upload, dan kelola ribuan open-weight AI models & datasets via CLI.',
    checkCmd: 'huggingface-cli --version',
    installScript: `
      pip3 install --break-system-packages huggingface_hub
    `,
    uninstallScript: `
      pip3 uninstall -y huggingface_hub 2>/dev/null || true
      rm -f /usr/local/bin/huggingface-cli /root/.local/bin/huggingface-cli
    `
  },
  {
    id: 'uv_astral',
    name: 'Astral UV & UVX',
    icon: '⚡',
    category: 'ai_ml',
    categoryName: 'AI & Coding Agents',
    description: 'Package manager Python 10-100x lebih cepat dari pip, built-in virtualenv dan script runner.',
    checkCmd: 'uv --version',
    installScript: `
      curl -LsSf https://astral.sh/uv/install.sh | sh
      ln -sf /root/.local/bin/uv /usr/local/bin/uv 2>/dev/null || true
      ln -sf /root/.local/bin/uvx /usr/local/bin/uvx 2>/dev/null || true
    `,
    uninstallScript: `
      rm -f /usr/local/bin/uv /usr/local/bin/uvx /root/.local/bin/uv /root/.local/bin/uvx /root/.cargo/bin/uv
    `
  },
  {
    id: 'jupyter',
    name: 'JupyterLab & IPython',
    icon: '🪐',
    category: 'ai_ml',
    categoryName: 'AI & Coding Agents',
    description: 'Interactive web-based notebook development environment untuk Python data & ML.',
    checkCmd: 'jupyter --version || jupyter-lab --version',
    installScript: `
      pip3 install --break-system-packages jupyterlab ipython ipywidgets
    `,
    uninstallScript: `
      pip3 uninstall -y jupyterlab ipython ipywidgets 2>/dev/null || true
      rm -f /usr/local/bin/jupyter* /root/.local/bin/jupyter*
    `
  },
  {
    id: 'pytorch',
    name: 'PyTorch & ML Core Libraries',
    icon: '🔥',
    category: 'ai_ml',
    categoryName: 'AI & Coding Agents',
    description: 'PyTorch, TorchVision, TorchAudio, Transformers, NumPy, Pandas, Scikit-learn.',
    checkCmd: 'python3 -c "import torch; print(torch.__version__)"',
    installScript: `
      pip3 install --break-system-packages torch torchvision torchaudio transformers numpy pandas scikit-learn scipy matplotlib
    `,
    uninstallScript: `
      pip3 uninstall -y torch torchvision torchaudio transformers numpy pandas scikit-learn scipy matplotlib 2>/dev/null || true
    `
  },

  // ==========================================
  // 4. PROGRAMMING LANGUAGES & RUNTIMES
  // ==========================================
  {
    id: 'nodejs',
    name: 'Node.js LTS & Package Managers',
    icon: '🟢',
    category: 'programming',
    categoryName: 'Languages & Runtimes',
    description: 'Node.js LTS, npm, pnpm, yarn, pm2, ts-node, typescript, nodemon.',
    checkCmd: 'node -v && npm -v',
    installScript: `
      export DEBIAN_FRONTEND=noninteractive
      apt-get update -y && apt-get install -y nodejs npm
      npm install -g n pnpm yarn pm2 typescript ts-node nodemon
      n lts
    `
  },
  {
    id: 'bun_deno',
    name: 'Bun & Deno Modern Runtimes',
    icon: '🥟',
    category: 'programming',
    categoryName: 'Languages & Runtimes',
    description: 'All-in-one JavaScript/TypeScript runtime berkecepatan tinggi Bun & Deno.',
    checkCmd: 'which bun || which deno',
    installScript: `
      curl -fsSL https://bun.sh/install | bash
      ln -sf /root/.bun/bin/bun /usr/local/bin/bun 2>/dev/null || true
      curl -fsSL https://deno.land/install.sh | sh
      ln -sf /root/.deno/bin/deno /usr/local/bin/deno 2>/dev/null || true
    `
  },
  {
    id: 'python_dev',
    name: 'Python 3 Full Dev & PIP',
    icon: '🐍',
    category: 'programming',
    categoryName: 'Languages & Runtimes',
    description: 'Python 3, pip, venv, poetry, uv, pipx, requests, fastapi, uvicorn, build-essential.',
    checkCmd: 'python3 --version && pip3 --version',
    installScript: `
      export DEBIAN_FRONTEND=noninteractive
      apt-get update -y && apt-get install -y python3 python3-pip python3-venv python3-dev build-essential
      pip3 install --break-system-packages poetry pipx uv requests fastapi uvicorn flask
    `
  },
  {
    id: 'rust_cargo',
    name: 'Rust & Cargo Ecosystem',
    icon: '🦀',
    category: 'programming',
    categoryName: 'Languages & Runtimes',
    description: 'Rust compiler (rustc), Cargo package manager, dan toolchain rustup.',
    checkCmd: 'rustc --version || which cargo',
    installScript: `
      curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
      ln -sf /root/.cargo/bin/rustc /usr/local/bin/rustc 2>/dev/null || true
      ln -sf /root/.cargo/bin/cargo /usr/local/bin/cargo 2>/dev/null || true
      ln -sf /root/.cargo/bin/rustup /usr/local/bin/rustup 2>/dev/null || true
    `
  },
  {
    id: 'golang',
    name: 'Go (Golang)',
    icon: '🐹',
    category: 'programming',
    categoryName: 'Languages & Runtimes',
    description: 'Bahasa pemrograman Go resmi dari Google untuk cloud microservices & backend.',
    checkCmd: 'go version',
    installScript: `
      export DEBIAN_FRONTEND=noninteractive
      apt-get update -y && apt-get install -y golang-go
    `
  },
  {
    id: 'java_jdk',
    name: 'Java OpenJDK & Build Tools',
    icon: '☕',
    category: 'programming',
    categoryName: 'Languages & Runtimes',
    description: 'OpenJDK 17/21 LTS, Maven (mvn), Gradle, dan Ant runtime.',
    checkCmd: 'java -version && javac -version',
    installScript: `
      export DEBIAN_FRONTEND=noninteractive
      apt-get update -y && apt-get install -y default-jdk maven gradle ant
    `
  },
  {
    id: 'php_composer',
    name: 'PHP & Composer',
    icon: '🐘',
    category: 'programming',
    categoryName: 'Languages & Runtimes',
    description: 'PHP CLI, PHP FPM, Composer package manager, curl, gd, mbstring, xml, mysql extensions.',
    checkCmd: 'php -v && composer -V',
    installScript: `
      export DEBIAN_FRONTEND=noninteractive
      apt-get update -y && apt-get install -y php php-cli php-fpm php-curl php-gd php-mbstring php-xml php-mysql composer
    `
  },
  {
    id: 'c_cpp_compilers',
    name: 'C/C++ Clang & LLVM Tools',
    icon: '⚙️',
    category: 'programming',
    categoryName: 'Languages & Runtimes',
    description: 'GCC, G++, Clang, LLVM, CMake, Ninja, Make, GDB debugger, Valgrind.',
    checkCmd: 'gcc --version && clang --version',
    installScript: `
      export DEBIAN_FRONTEND=noninteractive
      apt-get update -y && apt-get install -y gcc g++ clang llvm cmake ninja-build make gdb valgrind strace
    `
  },

  // ==========================================
  // 5. MEDIA, AUDIO & VIDEO
  // ==========================================
  {
    id: 'ffmpeg',
    name: 'FFmpeg & Multimedia Suite',
    icon: '🎬',
    category: 'media',
    categoryName: 'Media & Video',
    description: 'FFmpeg, ffprobe, HandBrake CLI, MediaInfo, Sox, Opus, FLAC, LAME audio tools.',
    checkCmd: 'ffmpeg -version',
    installScript: `
      export DEBIAN_FRONTEND=noninteractive
      apt-get update -y && apt-get install -y ffmpeg mediainfo handbrake-cli sox lame flac opus-tools
    `
  },
  {
    id: 'ytdlp',
    name: 'YT-DLP & Gallery-DL',
    icon: '📥',
    category: 'media',
    categoryName: 'Media & Video',
    description: 'High-speed media downloader dari YouTube, TikTok, Twitter, Instagram & 1000+ sites.',
    checkCmd: 'yt-dlp --version',
    installScript: `
      curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
      chmod a+rx /usr/local/bin/yt-dlp
      pip3 install --break-system-packages gallery-dl 2>/dev/null || true
    `
  },
  {
    id: 'mpv',
    name: 'MPV Lightweight Player',
    icon: '▶️',
    category: 'media',
    categoryName: 'Media & Video',
    description: 'Media player open-source berbasis command-line & GUI yang sangat ringan.',
    checkCmd: 'mpv --version',
    installScript: `
      export DEBIAN_FRONTEND=noninteractive
      apt-get update -y && apt-get install -y mpv
    `
  },
  {
    id: 'imagemagick',
    name: 'ImageMagick & Optimization',
    icon: '🖼️',
    category: 'media',
    categoryName: 'Media & Video',
    description: 'ImageMagick CLI, GraphicsMagick, WebP tools (cwebp/dwebp), optipng, jpegoptim, gifsicle, exiftool.',
    checkCmd: 'which convert && which cwebp',
    installScript: `
      export DEBIAN_FRONTEND=noninteractive
      apt-get update -y && apt-get install -y imagemagick graphicsmagick webp optipng jpegoptim gifsicle libimage-exiftool-perl
    `
  },

  // ==========================================
  // 6. DATABASES & WEB SERVERS
  // ==========================================
  {
    id: 'sqlite_gui',
    name: 'SQLite & SQLiteBrowser GUI',
    icon: '🗄️',
    category: 'database_server',
    categoryName: 'Databases & Servers',
    description: 'Database SQLite3 engine + SQLite Database Browser GUI desktop application.',
    checkCmd: 'sqlite3 --version',
    installScript: `
      export DEBIAN_FRONTEND=noninteractive
      apt-get update -y && apt-get install -y sqlite3 sqlitebrowser
      cp /usr/share/applications/sqlitebrowser.desktop /root/Desktop/ 2>/dev/null || true
      chmod +x /root/Desktop/*.desktop 2>/dev/null || true
    `
  },
  {
    id: 'redis',
    name: 'Redis Database & CLI',
    icon: '⚡',
    category: 'database_server',
    categoryName: 'Databases & Servers',
    description: 'In-memory fast key-value data store & Redis CLI.',
    checkCmd: 'redis-cli --version',
    installScript: `
      export DEBIAN_FRONTEND=noninteractive
      apt-get update -y && apt-get install -y redis-server redis-tools
      service redis-server start 2>/dev/null || true
    `
  },
  {
    id: 'postgresql_client',
    name: 'PostgreSQL Client & Tools',
    icon: '🐘',
    category: 'database_server',
    categoryName: 'Databases & Servers',
    description: 'PostgreSQL CLI (`psql`), pg_dump, pg_restore, dan client tools.',
    checkCmd: 'psql --version',
    installScript: `
      export DEBIAN_FRONTEND=noninteractive
      apt-get update -y && apt-get install -y postgresql-client
    `
  },
  {
    id: 'mariadb_client',
    name: 'MariaDB / MySQL Client',
    icon: '🐬',
    category: 'database_server',
    categoryName: 'Databases & Servers',
    description: 'MariaDB & MySQL client terminal tools (`mysql`, `mysqldump`, `mysqladmin`).',
    checkCmd: 'mysql --version || mariadb --version',
    installScript: `
      export DEBIAN_FRONTEND=noninteractive
      apt-get update -y && apt-get install -y mariadb-client || apt-get install -y mysql-client
    `
  },
  {
    id: 'nginx',
    name: 'Nginx Web Server',
    icon: '🌐',
    category: 'database_server',
    categoryName: 'Databases & Servers',
    description: 'High performance HTTP Web Server & Reverse Proxy.',
    checkCmd: 'nginx -v',
    installScript: `
      export DEBIAN_FRONTEND=noninteractive
      apt-get update -y && apt-get install -y nginx
      service nginx start 2>/dev/null || true
    `
  },
  {
    id: 'docker',
    name: 'Docker CLI & Compose',
    icon: '🐳',
    category: 'database_server',
    categoryName: 'Databases & Servers',
    description: 'Docker container client CLI & Docker Compose management.',
    checkCmd: 'docker --version || which docker',
    installScript: `
      export DEBIAN_FRONTEND=noninteractive
      apt-get update -y && apt-get install -y docker.io docker-compose || (curl -fsSL https://get.docker.com | sh)
    `
  },

  // ==========================================
  // 7. DEVOPS, NETWORK & UTILITIES
  // ==========================================
  {
    id: 'github_cli',
    name: 'GitHub CLI (gh) & Git LFS',
    icon: '🐙',
    category: 'devops_tools',
    categoryName: 'DevOps & Utilities',
    description: 'Official GitHub command line tool (`gh`) & Git Large File Storage (`git-lfs`).',
    checkCmd: 'gh --version && git-lfs --version',
    installScript: `
      export DEBIAN_FRONTEND=noninteractive
      apt-get update -y && apt-get install -y gh git-lfs
      git lfs install 2>/dev/null || true
    `
  },
  {
    id: 'railway_cli',
    name: 'Railway CLI',
    icon: '🚂',
    category: 'devops_tools',
    categoryName: 'DevOps & Utilities',
    description: 'Official Railway command line interface untuk manage deployments & variables.',
    checkCmd: 'railway --version',
    installScript: `
      npm install -g @railway/cli || (curl -fsSL https://railway.com/install.sh | sh)
    `
  },
  {
    id: 'terraform_ansible',
    name: 'Terraform & Ansible',
    icon: '🏗️',
    category: 'devops_tools',
    categoryName: 'DevOps & Utilities',
    description: 'Infrastructure as Code (IaC) Terraform & automation engine Ansible.',
    checkCmd: 'which terraform || which ansible',
    installScript: `
      export DEBIAN_FRONTEND=noninteractive
      apt-get update -y && apt-get install -y ansible curl gnupg software-properties-common
      curl -fsSL https://apt.releases.hashicorp.com/gpg | gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
      echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" > /etc/apt/sources.list.d/hashicorp.list
      apt-get update -y && apt-get install -y terraform 2>/dev/null || true
    `
  },
  {
    id: 'network_pentest',
    name: 'Network & Security Tools',
    icon: '🔍',
    category: 'devops_tools',
    categoryName: 'DevOps & Utilities',
    description: 'Nmap port scanner, Wireshark/tshark, tcpdump, iperf3, aria2, rsync, rclone, mtr, socat.',
    checkCmd: 'which nmap && which rclone',
    installScript: `
      export DEBIAN_FRONTEND=noninteractive
      apt-get update -y && apt-get install -y nmap tshark tcpdump iperf3 aria2 rsync rclone mtr-tiny socat dnsutils netcat-openbsd whois iftop nethogs
    `
  },
  {
    id: 'fastfetch',
    name: 'Fastfetch & Neofetch',
    icon: '📊',
    category: 'devops_tools',
    categoryName: 'DevOps & Utilities',
    description: 'System info tool untuk menampilkan ringkasan OS, hardware, logo, dan spec di terminal.',
    checkCmd: 'fastfetch --version || neofetch --version',
    installScript: `
      export DEBIAN_FRONTEND=noninteractive
      apt-get update -y && apt-get install -y neofetch 2>/dev/null || true
      curl -fsSL https://raw.githubusercontent.com/dylanaraps/neofetch/master/neofetch -o /usr/local/bin/neofetch && chmod +x /usr/local/bin/neofetch
      (curl -fsSL https://github.com/fastfetch-cli/fastfetch/releases/latest/download/fastfetch-linux-amd64.deb -o /tmp/fastfetch.deb && dpkg -i /tmp/fastfetch.deb && rm -f /tmp/fastfetch.deb) 2>/dev/null || true
    `
  },
  {
    id: 'terminal_super',
    name: 'Terminal Productivity Pack',
    icon: '💻',
    category: 'devops_tools',
    categoryName: 'DevOps & Utilities',
    description: 'Htop, Btop, Glances, Ncdu, Tmux, Zsh, Fish, Starship prompt, FZF, Bat, Eza, Ripgrep, Zoxide.',
    checkCmd: 'which htop && which btop && which fzf',
    installScript: `
      export DEBIAN_FRONTEND=noninteractive
      apt-get update -y && apt-get install -y htop btop glances ncdu tmux zsh fish fzf bat ripgrep fd-find eza zoxide tree jq 2>/dev/null || apt-get install -y htop btop ncdu tmux zsh fzf tree jq
      curl -sS https://starship.rs/install.sh | sh -s -- -y 2>/dev/null || true
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

function startToolUninstall(toolId, customCmd = null) {
  if (currentInstall && currentInstall.status === 'running') {
    throw new Error(`Operasi lain sedang berjalan: ${currentInstall.toolName}`);
  }

  let commandToRun = '';
  let toolName = 'Custom Package';

  if (toolId) {
    const tool = TOOLS_CATALOG.find(t => t.id === toolId);
    if (!tool) throw new Error(`Tool ID '${toolId}' tidak ditemukan.`);
    commandToRun = tool.uninstallScript || `
      echo "Mencoba menghapus ${tool.name}..."
      apt-get remove --purge -y ${tool.id} 2>/dev/null || true
      npm uninstall -g ${tool.id} 2>/dev/null || true
      pip3 uninstall -y ${tool.id} 2>/dev/null || true
      apt-get autoremove -y
    `;
    toolName = `Hapus ${tool.name}`;
  } else if (customCmd) {
    commandToRun = customCmd;
    toolName = `Custom Uninstall: ${customCmd.substring(0, 30)}`;
  } else {
    throw new Error('Tidak ada tool atau command yang ditentukan.');
  }

  currentInstall = {
    id: toolId || 'custom',
    toolName,
    status: 'running',
    logs: `[${new Date().toLocaleTimeString()}] Memulai proses hapus / uninstall ${toolName}...\n----------------------------------------\n`,
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
    const endMsg = `\n----------------------------------------\n[${new Date().toLocaleTimeString()}] Selesai! Status: ${code === 0 ? 'BERHASIL DIHAPUS (Success ✅)' : 'SELESAI DENGAN CATATAN (Exit Code ' + code + ')'}\n`;
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

function startToolInstall(toolId, customCmd = null, version = null) {
  if (currentInstall && currentInstall.status === 'running') {
    throw new Error(`Instalasi lain sedang berjalan: ${currentInstall.toolName}`);
  }

  let commandToRun = '';
  let toolName = 'Custom Package';

  if (toolId) {
    const tool = TOOLS_CATALOG.find(t => t.id === toolId);
    if (!tool) throw new Error(`Tool ID '${toolId}' tidak ditemukan.`);

    if (toolId === 'nodejs' && version) {
      toolName = `Node.js v${version}`;
      commandToRun = `
        export DEBIAN_FRONTEND=noninteractive
        apt-get update -y && apt-get install -y nodejs npm curl wget
        npm install -g n pnpm yarn pm2 typescript ts-node nodemon
        n ${version}
        node -v
      `;
    } else if (toolId === 'golang' && version) {
      toolName = `Go (Golang) v${version}`;
      let goTar = `go${version}.linux-amd64.tar.gz`;
      if (version === '1.23') goTar = 'go1.23.1.linux-amd64.tar.gz';
      else if (version === '1.22') goTar = 'go1.22.7.linux-amd64.tar.gz';
      else if (version === '1.21') goTar = 'go1.21.13.linux-amd64.tar.gz';
      else if (!version.includes('.')) goTar = `go${version}.0.linux-amd64.tar.gz`;

      commandToRun = `
        export DEBIAN_FRONTEND=noninteractive
        apt-get update -y && apt-get install -y wget curl tar
        rm -rf /usr/local/go
        wget -qO- https://go.dev/dl/${goTar} | tar -C /usr/local -xzf -
        ln -sf /usr/local/go/bin/go /usr/local/bin/go
        ln -sf /usr/local/go/bin/gofmt /usr/local/bin/gofmt
        go version
      `;
    } else if (toolId === 'python_dev' && version) {
      toolName = `Python v${version}`;
      commandToRun = `
        export DEBIAN_FRONTEND=noninteractive
        apt-get update -y && apt-get install -y build-essential curl wget python3-pip
        curl -LsSf https://astral.sh/uv/install.sh | sh
        /root/.local/bin/uv python install ${version}
        ln -sf /root/.local/bin/uv /usr/local/bin/uv 2>/dev/null || true
        pip3 install --break-system-packages poetry pipx uv requests fastapi uvicorn flask 2>/dev/null || true
      `;
    } else if (toolId === 'java_jdk' && version) {
      toolName = `Java OpenJDK ${version}`;
      commandToRun = `
        export DEBIAN_FRONTEND=noninteractive
        apt-get update -y && apt-get install -y openjdk-${version}-jdk maven gradle ant
        java -version
      `;
    } else if (toolId === 'php_composer' && version) {
      toolName = `PHP ${version} & Composer`;
      commandToRun = `
        export DEBIAN_FRONTEND=noninteractive
        apt-get update -y && apt-get install -y software-properties-common
        add-apt-repository -y ppa:ondrej/php 2>/dev/null || true
        apt-get update -y
        apt-get install -y php${version} php${version}-cli php${version}-fpm php${version}-curl php${version}-gd php${version}-mbstring php${version}-xml php${version}-mysql composer || apt-get install -y php php-cli composer
        php -v
      `;
    } else {
      commandToRun = tool.installScript;
      toolName = tool.name;
    }
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
  let hermes = false;
  let nineRouter = false;
  let opencode = false;
  let freebuff = false;
  try { execSync('which claude'); claude = true; } catch (e) {}
  try { execSync('which agy || which antigravity'); agy = true; } catch (e) {}
  try { execSync('which hermes'); hermes = true; } catch (e) {}
  try { execSync('which 9router'); nineRouter = true; } catch (e) {}
  try { execSync('which opencode'); opencode = true; } catch (e) {}
  try { execSync('which freebuff'); freebuff = true; } catch (e) {}
  return { claude, agy, hermes, nineRouter, opencode, freebuff };
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

// -------------------------------------------------------------
// 9Router AI Gateway Reverse Proxy
// -------------------------------------------------------------
// Helper to generate 9Router internal CLI auth token
// -------------------------------------------------------------
let cachedCliToken = null;
function get9RouterCliToken() {
  if (cachedCliToken) return cachedCliToken;
  try {
    const dataDir = path.join(os.homedir(), '.9router');
    const machineIdFile = path.join(dataDir, 'machine-id');
    const authDir = path.join(dataDir, 'auth');
    const cliSecretFile = path.join(authDir, 'cli-secret');

    let raw = '';
    try { raw = fs.readFileSync(machineIdFile, 'utf8').trim(); } catch {}
    if (!raw) {
      try {
        const { machineIdSync } = require('/usr/local/lib/node_modules/9router/node_modules/node-machine-id');
        raw = machineIdSync();
      } catch {}
      if (!raw) raw = crypto.randomUUID();
      try {
        fs.mkdirSync(dataDir, { recursive: true });
        fs.writeFileSync(machineIdFile, raw, { mode: 0o600 });
      } catch {}
    }

    let secret = '';
    try { secret = fs.readFileSync(cliSecretFile, 'utf8').trim(); } catch {}
    if (!secret) {
      secret = crypto.randomBytes(32).toString('hex');
      try {
        fs.mkdirSync(authDir, { recursive: true });
        fs.writeFileSync(cliSecretFile, secret, { mode: 0o600 });
      } catch {}
    }

    if (raw && secret) {
      cachedCliToken = crypto.createHash('sha256').update(raw + '9r-cli-auth' + secret).digest('hex').substring(0, 16);
      return cachedCliToken;
    }
  } catch (e) {}
  return '';
}

// -------------------------------------------------------------
// 9ROUTER REVERSE PROXY FORWARDER
// -------------------------------------------------------------
function proxyTo9Router(req, res, targetPath) {
  const destPath = targetPath || (req.url.startsWith('/') ? req.url : '/' + req.url);

  // Setup CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Accept, X-Requested-With, baggage, sentry-trace, x-api-key, x-9r-cli-token');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const clientHeaders = { ...req.headers };
  clientHeaders.host = '127.0.0.1:20128';
  clientHeaders['x-forwarded-host'] = req.headers.host || 'localhost';
  clientHeaders['x-forwarded-proto'] = req.headers['x-forwarded-proto'] || 'https';
  clientHeaders['x-forwarded-for'] = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  clientHeaders['x-9r-real-ip'] = '127.0.0.1';

  // Always inject 9Router CLI token for internal API operations (CLI tools, MITM, Antigravity, etc.)
  const cliToken = get9RouterCliToken();
  if (cliToken) {
    clientHeaders['x-9r-cli-token'] = cliToken;
  }

  // Inject default master key if no client authorization provided for API routes
  if (destPath.startsWith('/v1') && !clientHeaders['authorization'] && !clientHeaders['x-api-key']) {
    clientHeaders['authorization'] = 'Bearer sk-9router-master';
  }

  const options = {
    hostname: '127.0.0.1',
    port: 20128,
    path: destPath,
    method: req.method,
    headers: clientHeaders,
    timeout: 180000 // 3 min timeout for long reasoning models
  };

  const proxyReq = http.request(options, (proxyRes) => {
    const resHeaders = { ...proxyRes.headers };
    resHeaders['access-control-allow-origin'] = '*';
    res.writeHead(proxyRes.statusCode, resHeaders);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({
        error: {
          message: `9Router AI Gateway is offline or starting up on port 20128 (${err.message})`,
          type: 'gateway_error',
          code: 502
        }
      }));
    }
  });

  proxyReq.on('timeout', () => {
    proxyReq.destroy();
    if (!res.headersSent) {
      res.writeHead(504, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({
        error: {
          message: '9Router gateway timeout waiting for upstream model response.',
          type: 'gateway_timeout',
          code: 504
        }
      }));
    }
  });

  req.pipe(proxyReq);
}

// HTTP Server
const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

  // -------------------------------------------------------------
  // OAuth Providers Fallback (e.g. Antigravity is a Client / MITM tool, not an OAuth provider)
  // -------------------------------------------------------------
  if (url.pathname.startsWith('/api/oauth/antigravity') || url.pathname.startsWith('/api/oauth/gemini-cli')) {
    res.writeHead(400, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    return res.end(JSON.stringify({
      error: 'Google Antigravity bukan OAuth Provider. Antigravity adalah Client/Coding Agent & MITM Tool. Cara pakai: 1) Gunakan menu MITM di /dashboard/mitm untuk DNS routing IDE, 2) Jalankan "agy" atau "ag" di terminal SSH, atau 3) Tambahkan Google Gemini API Key di menu Providers.',
      success: false
    }));
  }

  // -------------------------------------------------------------
  // 1. 9Router AI Gateway Public Endpoints (/v1/*)
  // -------------------------------------------------------------
  if (url.pathname.startsWith('/v1')) {
    return proxyTo9Router(req, res, url.pathname + url.search);
  }

  // -------------------------------------------------------------
  // 2. 9Router Web UI & Dashboard (/9router, /dashboard, /_next, etc.)
  // -------------------------------------------------------------
  if (url.pathname === '/9router' || url.pathname === '/9router/') {
    res.writeHead(302, { 'Location': '/dashboard' });
    return res.end();
  }

  if (url.pathname.startsWith('/dashboard') ||
      url.pathname.startsWith('/_next') ||
      url.pathname.startsWith('/landing') ||
      url.pathname.startsWith('/callback') ||
      url.pathname === '/manifest.webmanifest' ||
      url.pathname === '/favicon.svg' ||
      url.pathname === '/favicon.ico') {
    return proxyTo9Router(req, res, url.pathname + url.search);
  }

  // -------------------------------------------------------------
  // 3. R-SERVER Web Management Dashboard & Login Page
  // -------------------------------------------------------------
  if (url.pathname === '/' || url.pathname === '/index.html' || url.pathname === '/login') {
    if (!isAuthenticated(req)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(LOGIN_HTML);
    }
    if (url.pathname === '/login') {
      res.writeHead(302, { 'Location': '/' });
      return res.end();
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
  if (url.pathname === '/api/stats' || url.pathname === '/api/status') {
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

  // POST /api/tools/uninstall: Trigger uninstallation of a tool
  if (url.pathname === '/api/tools/uninstall' && req.method === 'POST') {
    if (!isAuthenticated(req)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Unauthorized' }));
    }
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { toolId, customCmd } = JSON.parse(body);
        const uninstallJob = startToolUninstall(toolId, customCmd);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          success: true,
          message: `Penghapusan ${uninstallJob.toolName} dimulai.`,
          install: {
            id: uninstallJob.id,
            toolName: uninstallJob.toolName,
            status: uninstallJob.status
          }
        }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
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
        const { toolId, customCmd, version } = JSON.parse(body);
        const installJob = startToolInstall(toolId, customCmd, version);
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
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': '*'
    });
    res.write(`: ping\n\n`);

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

  // -------------------------------------------------------------
  // Antigravity Persistent Token & Session API
  // -------------------------------------------------------------
  if (url.pathname === '/api/antigravity/token' && req.method === 'GET') {
    if (!isAuthenticated(req)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Unauthorized' }));
    }
    const tokenFile = '/root/.gemini/antigravity-cli/antigravity-oauth-token';
    try {
      if (fs.existsSync(tokenFile)) {
        const raw = fs.readFileSync(tokenFile, 'utf8').trim();
        let email = 'Google Account';
        let expiry = null;
        try {
          const parsed = JSON.parse(raw);
          if (parsed.id_token) {
            const parts = parsed.id_token.split('.');
            if (parts.length === 3) {
              const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
              if (payload.email) email = payload.email;
            }
          }
          if (parsed.token?.expiry) expiry = parsed.token.expiry;
        } catch {}
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          loggedIn: true,
          email,
          expiry,
          token: raw
        }));
      }
    } catch (e) {}
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ loggedIn: false, token: '' }));
  }

  if (url.pathname === '/api/antigravity/token' && req.method === 'POST') {
    if (!isAuthenticated(req)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Unauthorized' }));
    }
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { token } = JSON.parse(body);
        if (!token || typeof token !== 'string') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Token string is required' }));
        }
        const dir = '/root/.gemini/antigravity-cli';
        fs.mkdirSync(dir, { recursive: true });
        const tokenFile = path.join(dir, 'antigravity-oauth-token');
        fs.writeFileSync(tokenFile, token.trim(), { mode: 0o600 });
        
        // Also save to src state backup for git sync
        try {
          const srcState = '/root/src/.gemini_state';
          fs.mkdirSync(srcState, { recursive: true });
          fs.writeFileSync(path.join(srcState, 'antigravity-oauth-token'), token.trim(), { mode: 0o600 });
        } catch {}

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: true, message: 'Token Antigravity berhasil disimpan dan otomatis aktif!' }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Format token tidak valid / Bad request' }));
      }
    });
    return;
  }

  // -------------------------------------------------------------
  // 9Router Management & Playground APIs
  // -------------------------------------------------------------
  if (url.pathname === '/api/9router/status' && req.method === 'GET') {
    if (!isAuthenticated(req)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Unauthorized' }));
    }
    const publicUrl = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host || 'r-server-production-3b83.up.railway.app'}/v1`;
    const checkReq = http.get('http://127.0.0.1:20128/v1/models', {
      headers: { 'Authorization': 'Bearer sk-9router-master' },
      timeout: 3000
    }, (checkRes) => {
      let data = '';
      checkRes.on('data', chunk => data += chunk);
      checkRes.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            online: true,
            port: 20128,
            publicUrl,
            modelsCount: (parsed.data || []).length,
            models: parsed.data || []
          }));
        } catch (e) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ online: true, port: 20128, publicUrl, modelsCount: 0, models: [] }));
        }
      });
    });
    checkReq.on('error', () => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ online: false, port: 20128, publicUrl, modelsCount: 0, models: [] }));
    });
    checkReq.on('timeout', () => {
      checkReq.destroy();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ online: false, port: 20128, publicUrl, modelsCount: 0, models: [] }));
    });
    return;
  }

  if (url.pathname === '/api/9router/restart' && req.method === 'POST') {
    if (!isAuthenticated(req)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Unauthorized' }));
    }
    const restartCmd = 'PORT=20128 HOST=0.0.0.0 HOSTNAME=0.0.0.0 pm2 restart 9router 2>/dev/null || (PORT=20128 HOST=0.0.0.0 HOSTNAME=0.0.0.0 pm2 start /usr/local/lib/node_modules/9router/app/server.js --name 9router 2>/dev/null || nohup 9router --tray --skip-update -p 20128 >/var/log/9router.log 2>&1 &)';
    exec(restartCmd, (err) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: true, message: '9Router daemon restarted on port 20128 via PM2' }));
    });
    return;
  }

  if (url.pathname === '/api/9router/test' && req.method === 'POST') {
    if (!isAuthenticated(req)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Unauthorized' }));
    }
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { model = 'tokenharbor/claude-sonnet-5', prompt = 'Halo! Ceritakan dalam 1 kalimat tentang dirimu.' } = JSON.parse(body || '{}');
        const postData = JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          stream: false,
          max_tokens: 300
        });

        const testReq = http.request({
          hostname: '127.0.0.1',
          port: 20128,
          path: '/v1/chat/completions',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
          },
          timeout: 45000
        }, (testRes) => {
          let resData = '';
          testRes.on('data', chunk => resData += chunk);
          testRes.on('end', () => {
            try {
              const jsonRes = JSON.parse(resData);
              res.writeHead(testRes.statusCode, { 'Content-Type': 'application/json' });
              return res.end(JSON.stringify({
                statusCode: testRes.statusCode,
                response: jsonRes
              }));
            } catch (e) {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              return res.end(JSON.stringify({ statusCode: testRes.statusCode, raw: resData }));
            }
          });
        });

        testReq.on('error', (err) => {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: `9Router connection error: ${err.message}` }));
        });

        testReq.on('timeout', () => {
          testReq.destroy();
          res.writeHead(504, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: '9Router test request timed out.' }));
        });

        testReq.write(postData);
        testReq.end();
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Bad request' }));
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

  // Fallback for any other 9Router API or static assets
  if (url.pathname.startsWith('/api/') || url.pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|css|js|woff|woff2|ttf|eot|webmanifest|json|map)$/i)) {
    return proxyTo9Router(req, res, url.pathname + url.search);
  }

  // Fallback 404
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found: ' + url.pathname);
});

server.listen(PORT, HOST, () => {
  console.log(`[R-SERVER Dashboard] Running on http://${HOST}:${PORT}`);
});
