# CLOUD AI WORKSTATION TOOLS PACK — DEBIAN 12 / RAILWAY
=========================================================

**Target:**
Debian 12 Cloud Workstation & VPS untuk AI coding agents,
full-stack development, server runtimes, networking, media, monitoring, dan system utility.

**Prinsip Desain:**
- **Zero GUI Overhead:** Tidak membebani container dengan XRDP / XFCE4 sehingga RAM hemat (~80 MB) dan CPU 100% dialokasikan untuk AI agent & compilers.
- **Dual Remote Access:** OpenSSH (Port 22 via TCP Proxy) + Web Dashboard & API (Port 8080 via HTTPS Domain).
- **Persistent AI Auth:** Sesi login Google Antigravity & Claude Code tersimpan secara otomatis dan persisten.

---

## 1. CORE SYSTEM
* `bash`, `coreutils`, `util-linux`, `procps`, `psmisc`, `findutils`
* `grep`, `sed`, `gawk`, `mawk`, `diffutils`, `file`, `which`
* `sudo`, `passwd`, `login`, `adduser`
* `locales`, `tzdata`, `ca-certificates`, `openssl`
* `curl`, `wget`, `rsync`, `cron`, `logrotate`

## 2. SYSTEM INFO & METRICS
* `fastfetch`, `neofetch`, `screenfetch`, `inxi`, `lshw`, `hwinfo`
* `lscpu`, `lsmem`, `lsblk`, `blkid`, `findmnt`
* `uname`, `hostname`, `uptime`, `free`, `df`, `du`, `ncdu`, `dmesg`, `lsusb`, `lspci`

## 3. PROCESS / PERFORMANCE
* `top`, `htop`, `btop`, `atop`, `glances`
* `iotop`, `iotop-c`, `iftop`, `nethogs`, `nload`, `bmon`, `vnstat`, `dstat`
* `sysstat`, `vmstat`, `iostat`, `mpstat`, `pidstat`, `pstree`
* `lsof`, `strace`, `ltrace`, `perf`, `stress-ng`, `sysbench`, `fio`, `iperf3`

## 4. STORAGE / FILE MANAGEMENT
* `tree`, `mc` (Midnight Commander), `ranger`, `nnn`, `yazi`
* `find`, `locate`, `plocate`, `file`, `stat`, `du`, `ncdu`
* `mount`, `umount`, `lsblk`, `smartmontools`, `parted`, `fdisk`, `cfdisk`, `e2fsprogs`

## 5. ARCHIVE / COMPRESSION
* `tar`, `gzip`, `bzip2`, `xz`, `zstd`, `lz4`, `lzop`
* `zip`, `unzip`, `7zip` / `p7zip`, `unrar`, `rar`, `cpio`, `cabextract`

## 6. SSH / TERMINAL PERSISTENCE
* `openssh-client`, `openssh-server`, `ssh`, `ssh-keygen`, `ssh-agent`, `ssh-add`, `ssh-copy-id`
* `autossh`, `mosh`
* `tmux`, `screen`, `byobu`

## 7. AI CODING AGENTS
* **Anthropic Claude Code CLI:** `claude` / `cl` (tmux wrapper).
* **Google Antigravity CLI:** `agy` / `ag` (tmux wrapper).
* **OpenCode AI:** `opencode` / `oc` (tmux wrapper).
* **Freebuff AI:** `freebuff` / `fb` (tmux wrapper).
* **Nous Research Hermes Agent:** `hermes` terminal TUI.
* **Aider AI:** `aider` / `ai` pair programming assistant.

## 8. TERMINAL / SHELL
* `bash`, `zsh`, `fish`, `dash`
* `fzf`, `ripgrep` (`rg`), `fd` (`fdfind`), `bat` (`batcat`), `eza`, `zoxide`, `jq`, `yq`
* `micro`, `nano`, `vim`, `neovim`, `emacs`, `helix`

## 9. GIT / SOURCE CONTROL
* `git`, `git-lfs`, `git-filter-repo`
* `gh` (GitHub CLI), `lazygit`, `tig`, `git-crypt`

## 10. BUILD TOOLS & COMPILERS
* `build-essential`, `gcc`, `g++`, `clang`, `llvm`
* `make`, `cmake`, `ninja-build`, `meson`, `pkg-config`, `autoconf`, `automake`, `libtool`

## 11. PYTHON & UV
* `python3`, `python3-pip`, `python3-venv`, `python3-dev`
* `uv`, `uvx`, `pipx`, `poetry`
* `ipython`, `rich`, `typer`, `click`, `fastapi`, `httpx`, `requests`

## 12. NODE.JS & TYPESCRIPT
* `nodejs` (v20+), `npm`, `pnpm`, `yarn`, `bun`
* `typescript`, `ts-node`, `pm2`

## 13. GOLANG
* `golang` (Go 1.23 Stable), `gofmt`, `gopls`

## 14. WEB SERVER & REVERSE PROXY
* `nginx`, `caddy`, `traefik`

## 15. DATABASE CLIENTS
* `sqlite3`, `postgresql-client`, `redis-tools`, `mysql-client`

## 16. DEVOPS & CLOUD CLI
* `railway`, `gh`, `docker` (CLI client), `rclone`, `rsync`

## 17. MEDIA & CONVERSION
* `ffmpeg`, `ffprobe`, `mediainfo`, `yt-dlp`

---

## 18. RAILWAY NETWORKING & ACCESS ARCHITECTURE

| Service | Internal Port | External Access Type | URL / Host |
|---|---|---|---|
| **Web Dashboard** | `8080` | Railway HTTPS Edge Domain | `https://r-server-production-3b83.up.railway.app` |
| **OpenSSH Terminal** | `22` | Railway TCP Proxy | `altaria.proxy.rlwy.net:22000` |

---

## 19. AI WORKSTATION STACK DIAGRAM

```text
Client (Terminal / Cursor / VS Code / Aider / Browser)
                │
                ├── HTTPS Domain (:8080) ──► Web Dashboard & REST API
                └── TCP Proxy (:22000)   ──► Root OpenSSH Terminal
                                                │
                                                ▼
                                    Debian 12 Cloud Container
                                                │
                                 ┌──────────────┴──────────────┐
                                 ▼                             ▼
                         CLI AI Agents                 System Services
                    (Claude, AGY, OpenCode,        (SSH, Cron, Web Monitor)
                     Freebuff, Hermes, Aider)
```
