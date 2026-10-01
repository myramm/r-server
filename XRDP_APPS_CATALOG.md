# VPS TOOLS PACK — LINUX / RAILWAY / XFCE / XRDP
===================================================

**Target:**
Linux VPS/container dengan GUI optional, SSH/RDP, development,
AI coding agents, server, networking, media, monitoring, dan utility.

**Catatan:**
- Nama paket berbeda antar distro (Debian 12 / Ubuntu 24.04).
- Tidak semua tool cocok untuk Railway/container (Docker daemon/KVM/systemd membutuhkan environment khusus).
- XRDP = remote desktop Linux (XFCE), bukan Windows VM.
- Gunakan hanya tools dan layanan yang memang diperlukan untuk efisiensi RAM/CPU.

---

## 1. CORE VPS
* `bash`, `coreutils`, `util-linux`, `procps`, `psmisc`, `findutils`
* `grep`, `sed`, `gawk`, `mawk`, `diffutils`, `file`, `which`
* `sudo`, `passwd`, `login`, `adduser`
* `locales`, `tzdata`, `ca-certificates`, `openssl`
* `curl`, `wget`, `rsync`, `cron`, `logrotate`
* `dbus`, `dbus-x11`, `acl`, `attr`

## 2. SYSTEM INFO
* `fastfetch`, `neofetch`, `screenfetch`, `inxi`, `lshw`, `hwinfo`
* `lscpu`, `lsmem`, `lsblk`, `blkid`, `findmnt`
* `uname`, `hostname`, `uptime`, `free`, `df`, `du`, `ncdu`, `dmesg`, `lsusb`, `lspci`

## 3. PROCESS / PERFORMANCE
* `top`, `htop`, `btop`, `atop`, `glances`
* `iotop`, `iotop-c`, `iftop`, `nethogs`, `nload`, `bmon`, `vnstat`, `dstat`
* `sysstat`, `vmstat`, `iostat`, `mpstat`, `pidstat`, `pstree`
* `lsof`, `strace`, `ltrace`, `perf`, `stress-ng`, `sysbench`, `fio`, `iperf3`

## 4. STORAGE / FILE
* `tree`, `mc` (Midnight Commander), `ranger`, `nnn`, `yazi`
* `find`, `locate`, `plocate`, `file`, `stat`, `du`, `ncdu`
* `mount`, `umount`, `lsblk`, `smartmontools`, `parted`, `fdisk`, `cfdisk`, `e2fsprogs`

## 5. ARCHIVE / COMPRESSION
* `tar`, `gzip`, `bzip2`, `xz`, `zstd`, `lz4`, `lzop`
* `zip`, `unzip`, `7zip` / `p7zip`, `unrar`, `rar`, `cpio`, `cabextract`

## 6. SSH / REMOTE
* `openssh-client`, `openssh-server`, `ssh`, `ssh-keygen`, `ssh-agent`, `ssh-add`, `ssh-copy-id`
* `autossh`, `mosh`
* `tmux`, `screen`, `byobu`

## 7. XRDP / GUI REMOTE
* `xrdp`, `xorgxrdp`, `xfce4`, `xfce4-goodies`, `xfce4-terminal`, `thunar`, `mousepad`, `xfce4-taskmanager`
* `x11vnc`, `tigervnc`, `tightvnc`, `KasmVNC`, `noVNC`, `websockify`

## 8. GUI APPLICATIONS
* **Web Browsers:** Firefox, Chromium, Google Chrome, Microsoft Edge, Brave, Vivaldi
* **Code Editors:** VS Code (`code`), VSCodium, `code-server`, Geany, Mousepad, Gedit, Kate
* **Office & Productivity:** LibreOffice, OnlyOffice
* **Graphics & 3D:** GIMP, Krita, Inkscape, Blender, FreeCAD
* **Media & Video:** OBS Studio, VLC, MPV, Audacity, Kdenlive, Shotcut, OpenShot
* **Clients:** FileZilla, Thunderbird

## 9. TERMINAL / SHELL
* `bash`, `zsh`, `fish`, `dash`, `ksh`
* `tmux`, `screen`
* `fzf`, `ripgrep` (`rg`), `fd` (`fdfind`), `bat` (`batcat`), `eza`, `zoxide`, `starship`, `direnv`, `entr`, `parallel`, `watch`, `jq`, `yq`
* `micro`, `nano`, `vim`, `neovim`, `emacs`, `helix`

## 10. GIT / SOURCE CONTROL
* `git`, `git-lfs`, `git-filter-repo`, `git-svn`, `git-annex`
* `gh` (GitHub CLI), `glab` (GitLab CLI), `lazygit`, `tig`, `git-crypt`

## 11. BUILD TOOLS
* `build-essential`, `gcc`, `g++`, `clang`, `llvm`, `lld`, `lldb`
* `make`, `cmake`, `ninja-build`, `meson`, `pkg-config`, `autoconf`, `automake`, `libtool`
* `ccache`, `mold`, `binutils`, `flex`, `bison`, `gettext`, `fakeroot`, `dpkg-dev`, `devscripts`

## 12. PYTHON
* **Core & Envs:** `python3`, `python3-pip`, `python3-venv`, `python3-dev`, `python3-full`, `pipx`, `virtualenv`, `uv`, `poetry`, `pipenv`, `pypy3`
* **Interactive:** `ipython`, `jupyter`, `jupyterlab`
* **Libraries:** `requests`, `httpx`, `aiohttp`, `beautifulsoup4`, `lxml`, `numpy`, `pandas`, `Pillow`, `opencv-python`, `PyYAML`, `rich`, `click`, `typer`, `Flask`, `FastAPI`, `Uvicorn`, `Gunicorn`, `SQLAlchemy`, `pytest`, `ruff`, `black`, `mypy`

## 13. NODE.JS
* `nodejs`, `npm`, `corepack`, `pnpm`, `yarn`, `bun`, `deno`, `nvm`, `fnm`, `volta`
* `typescript`, `ts-node`, `tsx`, `eslint`, `prettier`, `vite`, `webpack`, `rollup`, `esbuild`, `parcel`, `nodemon`, `pm2`

## 14. AI CODING AGENTS
* **Agents:** Anthropic Claude Code (`claude`), Google Antigravity CLI (`agy`), OpenAI Codex CLI, Gemini CLI, Qwen Code, OpenCode, Aider, Goose, Cline, Roo Code, Continue, GitHub Copilot CLI, Kiro CLI
* **AI Dev Stack:** `nodejs`, `npm`, `pnpm`, `python3`, `pipx`, `uv`, `git`, `curl`, `wget`, `jq`
* **Local LLM & ML:** `ollama`, `llama.cpp`, `huggingface-cli`, `transformers`, `torch`, `tensorflow`, `onnxruntime`, `jupyter`, `ipython`

## 15. RUST
* `rustc`, `cargo`, `rustup`, `rustfmt`, `clippy`, `rust-analyzer`

## 16. GO
* `golang` (`go`), `gofmt`, `gopls`, `golangci-lint`

## 17. JAVA / JVM
* `openjdk-8`, `openjdk-11`, `openjdk-17`, `openjdk-21`, `openjdk-25`
* `maven`, `gradle`, `ant`, `kotlin`, `scala`

## 18. PHP
* `php`, `php-cli`, `php-fpm`, `php-curl`, `php-gd`, `php-mbstring`, `php-xml`, `php-zip`, `php-mysql`, `php-pgsql`
* `composer`

## 19. RUBY / PERL / OTHER
* `ruby`, `ruby-dev`, `gem`, `bundler`
* `perl`, `cpan`, `cpanm`
* `lua`, `luajit`, `dart`, `flutter`, `zig`, `nim`, `elixir`, `erlang`, `haskell`, `julia`

## 20. WEB SERVER
* `nginx`, `apache2`, `caddy`, `lighttpd`, `traefik`, `haproxy`

## 21. DATABASE CLIENTS
* `sqlite3`, `mysql-client`, `mariadb-client`, `postgresql-client`, `redis-tools`, `mongosh`, `duckdb`, `clickhouse-client`, `cassandra-tools`

## 22. DATABASE SERVERS
* `sqlite`, `mysql`, `mariadb`, `postgresql`, `redis`, `memcached`, `mongodb`, `couchdb`, `clickhouse`, `elasticsearch`, `opensearch`

## 23. DEVOPS / CLOUD
* `docker`, `docker-compose`, `docker-compose-plugin`, `podman`, `buildah`, `skopeo`, `containerd`, `nerdctl`, `runc`
* `kubectl`, `helm`, `kustomize`, `terraform`, `terragrunt`, `ansible`, `packer`, `pulumi`, `vagrant`, `minikube`, `kind`

## 24. CLOUD CLI
* `railway`, `gh`, `glab`, `aws`, `gcloud`, `az`, `doctl`, `hcloud`, `oci`, `flyctl`, `vercel`, `netlify`, `wrangler`

## 25. NETWORK
* `iproute2`, `net-tools`, `iputils-ping`, `dnsutils`, `bind9-dnsutils`, `traceroute`, `mtr`, `netcat-openbsd`, `netcat-traditional`, `socat`, `telnet`, `lftp`, `tcpdump`, `tshark`, `nmap`, `arping`, `ethtool`, `bridge-utils`, `conntrack`, `iptables`, `nftables`, `ipset`, `whois`, `c-ares-tools`, `openssl`

## 26. FILE TRANSFER / DOWNLOAD
* `curl`, `wget`, `aria2`, `axel`, `rclone`, `rsync`, `scp`, `sftp`, `ftp`, `lftp`, `yt-dlp`, `gallery-dl`

## 27. MEDIA
* `ffmpeg`, `ffprobe`, `ffplay`, `mediainfo`, `mkvtoolnix`, `mpv`, `vlc`, `sox`, `lame`, `flac`, `opus-tools`, `vorbis-tools`, `handbrake`, `kdenlive`, `shotcut`, `openshot`, `avidemux`, `audacity`, `obs-studio`

## 28. IMAGE / PDF
* `imagemagick`, `graphicsmagick`, `libvips`, `pngquant`, `optipng`, `jpegoptim`, `gifsicle`, `webp`, `exiftool`
* `ghostscript`, `poppler-utils`, `pdftotext`, `pdftoppm`, `qpdf`, `pdftk`, `tesseract-ocr`, `pandoc`

## 29. BACKUP / SYNC
* `rsync`, `rclone`, `restic`, `borgbackup`, `duplicity`, `rsnapshot`, `tar`, `zstd`, `gzip`

## 30. SECURITY / CERTIFICATES
* `openssl`, `gnupg`, `gpg`, `gpg-agent`, `age`, `pass`, `ssh`, `certbot`, `fail2ban`, `acl`, `attr`, `libcap2-bin`, `auditd`, `apparmor-utils`

## 31. DEBUG / BINARY
* `gdb`, `lldb`, `strace`, `ltrace`, `valgrind`, `perf`, `bpftrace`, `objdump`, `readelf`, `nm`, `strings`, `xxd`, `hexdump`, `objcopy`, `addr2line`, `patchelf`

## 32. ANDROID DEVELOPMENT
* `adb`, `fastboot`, `android-sdk`, `android-sdk-platform-tools`, `android-sdk-build-tools`, `gradle`, `openjdk`, `flutter`, `dart`

## 33. GAME / CREATIVE
* `Blender`, `Godot`, `GIMP`, `Krita`, `Inkscape`, `FreeCAD`, `OpenSCAD`, `Kdenlive`, `Shotcut`, `OBS Studio`, `Ren'Py`, `LÖVE`, `GDevelop`, `Wine`, `Winetricks`

## 34. WINE / WINDOWS APP COMPATIBILITY
* `wine`, `wine64`, `wine32`, `winetricks`, `bottles`, `proton`
* *Catatan:* Wine menjalankan aplikasi Windows tertentu di Linux; bukan Windows VM.

## 35. DOCUMENT / OFFICE
* `LibreOffice`, `OnlyOffice`, `AbiWord`, `Gnumeric`, `Calligra`, `Evince`, `Okular`, `Zathura`, `MuPDF`, `Ghostscript`, `Poppler`, `Pandoc`, `TeX Live`, `Tesseract OCR`

## 36. COMMUNICATION
* `Thunderbird`, `Element`, `Telegram Desktop`, `Signal Desktop`, `Discord`, `WeeChat`, `Irssi`, `HexChat`

## 37. MONITORING / LOGGING
* `htop`, `btop`, `glances`, `atop`, `sysstat`, `prometheus`, `node_exporter`, `grafana`, `loki`, `promtail`, `journalctl`, `logrotate`

---

## 38. RECOMMENDED GENERAL VPS PACK (1-Click Super Bundle)
Paket gabungan rekomendasi siap pakai:
* **OS & GUI:** Debian 12 / Ubuntu 24.04 LTS + XFCE4 + XRDP
* **Browsers:** Google Chrome & Mozilla Firefox ESR
* **Dev & Git:** Git, Git LFS, GitHub CLI (`gh`), cURL, Wget, JQ, Unzip, Zip, Tar, Zstd
* **Terminal UX:** Fastfetch, Neofetch, Htop, Btop, Ncdu, Lsof, Tmux, Zsh, Fzf, Ripgrep, Bat, Eza
* **Runtimes:** Python 3 (pip, venv, uv) + Node.js LTS (npm, pnpm, PM2) + GCC/G++ + Rust/Cargo + Go + OpenJDK
* **Media & Docs:** FFmpeg, ImageMagick, MediaInfo
* **Cloud & Tools:** OpenSSH, Rsync, Rclone, Aria2, SQLite3, PostgreSQL Client, Redis Tools, Nginx, Certbot, Docker CLI, Railway CLI
* **AI Coding Agents:** Claude Code CLI, Google Antigravity CLI, Codex CLI, Gemini CLI, OpenCode, Aider

---

## 39. RAILWAY-SPECIFIC NOTES
* Railway service adalah container workload berbasis cloud (bukan full hypervisor VPS).
* **SSH/RDP Networking:** XRDP listen pada TCP port 3389 internal. Hubungkan client RDP menggunakan Host & Port TCP Proxy eksternal yang dialokasikan Railway (contoh: `tokaido.proxy.rlwy.net:19257` atau `maglev.proxy.rlwy.net:23339`).
* **RAM & CPU:** GUI desktop + browser + AI agent membutuhkan alokasi RAM yang memadai (minimal 1-2 GB).
* **Persistent Files:** Gunakan folder `/root/src` (yang tersinkronisasi otomatis ke GitHub) atau Persistent Volume.
* **Fitur Terbatas:** Docker daemon (nested virtualization), KVM, GPU passthrough, dan systemd mungkin membutuhkan container privileges khusus.

---

## 40. QUICK STACK
```text
Debian 12 / Ubuntu 24.04
         +
        XFCE
         +
        XRDP
         +
    Chrome/Firefox
         +
   Git / GitHub CLI
         +
   Python + Node.js
         +
        FFmpeg
         +
  Fastfetch / Htop / Btop
         +
         SSH
         +
 Claude / Antigravity / Gemini CLI
         +
        Nginx
         +
   Database Clients
         +
   Network Utilities
```

**HASIL AKHIR:**
```text
Windows / Android / iOS / Mac RDP Client
                ↓
              XRDP
                ↓
              XFCE
                ↓
Desktop Linux lengkap + Browser + Coding Tools + AI Agents + Terminal.
```
