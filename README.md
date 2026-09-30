# 🚀 R-SERVER — Debian 12 Cloud Workstation & Web Dashboard

<p align="center">
  <b>High-Performance Cloud Workstation on Railway</b><br>
  Full <b>root</b> SSH access, <b>Claude Code</b> & <b>Google Antigravity CLI</b> pre-installed, accompanied by an interactive <b>Web Monitoring & Control Dashboard</b>.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/OS-Debian_12_(Bookworm)-D70A53?logo=debian&logoColor=white" alt="Debian 12">
  <img src="https://img.shields.io/badge/Platform-Railway-0B0D0E?logo=railway&logoColor=white" alt="Railway">
  <img src="https://img.shields.io/badge/Access-Root_SSH-4E5D6C?logo=gnubash&logoColor=white" alt="SSH">
  <img src="https://img.shields.io/badge/AI-Claude_Code-D97706?logo=anthropic&logoColor=white" alt="Claude Code">
  <img src="https://img.shields.io/badge/AI-Antigravity_CLI-4285F4?logo=google&logoColor=white" alt="Antigravity">
  <img src="https://img.shields.io/badge/Web_Dashboard-Included-10B981" alt="Web Dashboard">
  <img src="https://img.shields.io/badge/License-MIT-blue" alt="License">
</p>

---

## ✨ Features

- 🖥️ **Remote Desktop GUI (XRDP + XFCE4)** (Reference: [danchitnis/container-xrdp](https://github.com/danchitnis/container-xrdp)):
  - Lightweight **XFCE4** desktop environment running via XRDP on port `3389`.
  - Connect with **Microsoft Remote Desktop** (Windows/Mac/iOS/Android) or **Remmina** (Linux).
- 🌐 **Interactive Web Monitoring & Control Dashboard**:
  - Live RAM (Used, Free, Buffers/Cache) with dynamic progress bars.
  - Live CPU Load, Cores, and Disk Storage gauges.
  - **Resource & Credit Usage Monitor** (Real-time credit balance, hourly burn rate, estimated days left, and active allocation).
  - **Server Controls**: One-click **Restart Server (Reboot)**, **Flush RAM Cache**, and **Restart SSHD**.
  - **Process Manager**: Live process table with memory/CPU sorting and PID termination (`Kill`).
  - **Web Terminal**: Run bash commands directly in the browser.
- 🤖 **Pre-Installed AI Coding Agents**:
  - **Anthropic Claude Code CLI** (`claude` / `cl` helper).
  - **Google Antigravity CLI** (`agy` / `ag` helper).
- 🔑 **Full Root Access**:
  - Connect directly as `root` with custom shell prompt (`root@server:~#`).
  - Clean SSH MOTD banner with zero default system spam.
- 🛠️ **Pre-Installed Developer & System Toolkit**:
  - **Monitoring:** `fastfetch`, `neofetch`, `htop`, `btop`, `ncdu`, `usage`.
  - **Dev & Runtimes:** Python 3, Node.js + npm, `git`, `build-essential`, `cmake`, `gcc`, `g++`, `ffmpeg`, `yt-dlp`.
  - **Terminal & Shell:** `tmux`, `screen`, `zsh`, `ripgrep`, `fd-find`, `bat`, `tree`, `jq`, `micro`, `vim`, `nano`.
- 🔄 **Optional Work Persistence (`src-sync`)**:
  - Automatically syncs `/root/src` with a private GitHub repository on every container start.

---

## 🔌 Connection & Access

### 1. SSH Terminal Access
Connect as `root` using your Railway TCP proxy host/IP and port:

```bash
# Via Hostname:
ssh -p 22000 root@altaria.proxy.rlwy.net

# Or via Direct IP:
ssh -p 22000 root@66.33.22.220
```

### 2. Remote Desktop GUI Access (XRDP / XFCE4)
Connect using any RDP client (Microsoft Remote Desktop, Remmina, etc.):

* **Host / Address:** `<TCP_PROXY_HOST>:<TCP_PROXY_PORT>` (Port 3389 TCP proxy on Railway)
* **Username:** `root` (or `debian`)
* **Password:** Enter your `ROOT_PASSWORD` (`RamaGans76_`)
* **Session:** `Xorg` (Default XFCE4 desktop session)

### 3. Web Dashboard Access
Open your Railway public HTTP URL in any browser:

* **URL:** `https://r-server-production-3b83.up.railway.app`
* **Password:** Enter your `ROOT_PASSWORD` (`RamaGans76_`)

---

## ⚙️ Environment Variables

Configure these in Railway (**Project → Service → Variables**):

| Variable | Required | Default | Description |
|---|:---:|:---:|---|
| `ROOT_PASSWORD` | ✅ **Yes** | `RamaGans76_` | Password for `root` SSH and Web Dashboard login. |
| `PORT` | ⬜ No | `8080` | Port for the Web Dashboard HTTP server. |
| `SSH_USERNAME` | ⬜ No | `debian` | Optional secondary non-root sudo user. |
| `SSH_PASSWORD` | ⬜ No | `RamaGans76_` | Password for the secondary sudo user. |
| `ANTHROPIC_AUTH_TOKEN` | ⬜ No | — | Auth token for Claude Code CLI. |
| `GITHUB_TOKEN` | ⬜ No | — | GitHub Personal Access Token (`repo` scope) for automatic `/root/src` sync. |
| `AUTHORIZED_KEYS` | ⬜ No | — | Public SSH key(s) for key-based authentication. |

---

## 💻 Handy Terminal Commands

| Command | Action |
|---|---|
| `claude` (or `cl`) | Launches Claude Code in a persistent tmux session. |
| `agy` (or `ag`) | Launches Google Antigravity CLI in a persistent tmux session. |
| `usage` | Checks Railway trial credit usage, burn rate, and uptime remaining. |
| `neofetch` / `fastfetch` | Displays system hardware and OS specs banner. |
| `src-sync --status` | Checks status of the private GitHub backup repository. |
| `htop` / `btop` | Interactive live system process viewer. |

---

## 📄 License

Distributed under the [MIT License](LICENSE).
