# ============================================================
# R-SERVER — Railway Debian 12 SSH Server
# ============================================================
# A Docker image that provides a Debian 12 base with an SSH server
# (SSHD) enabled, so you can connect to your Railway container via SSH.

FROM debian:12

# Remove default unprivileged user if present
RUN userdel -r debian 2>/dev/null || userdel -r ubuntu 2>/dev/null || true

# Install dependencies. Root login is enabled so you can connect directly as root.
# A full cloud-workstation toolkit on Debian 12: networking, editors, monitoring, archives,
# dev tools, Python, Node.js and locales.
RUN apt-get update \
    && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
        ca-certificates gnupg apt-transport-https \
        openssh-server sudo \
        curl wget \
        iproute2 iputils-ping net-tools dnsutils traceroute whois telnet nmap \
        vim nano micro \
        htop btop ncdu \
        tmux screen less tree bat ripgrep fd-find jq zsh \
        unzip zip tar gzip bzip2 xz-utils p7zip-full \
        git build-essential cmake pkg-config autoconf automake libtool gcc g++ \
        python3 python3-pip python3-venv python3-dev \
        nodejs npm ffmpeg \
        locales ncurses-term \
        dbus dbus-x11 x11-xserver-utils \
        xrdp xorgxrdp xfce4 xfce4-terminal \
        chromium xdg-utils libgbm1 libnss3 fonts-liberation \
    && (curl -fsSL https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb -o /tmp/chrome.deb \
        && dpkg -i /tmp/chrome.deb || apt-get install -fy -y \
        && rm -f /tmp/chrome.deb || true) \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/* \
    && (curl -fsSL https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && chmod +x /usr/local/bin/yt-dlp || true) \
    && (npm install -g n 2>/dev/null || true) \
    && mkdir -p /run/sshd /var/run/dbus /var/run/xrdp /var/log/xrdp \
    && chmod 755 /run/sshd /var/run/dbus /var/run/xrdp \
    && ssh-keygen -A \
    && echo "PasswordAuthentication yes" >> /etc/ssh/sshd_config \
    # Enable root login
    && echo "PermitRootLogin yes" >> /etc/ssh/sshd_config \
    # Disable default MOTD and Lastlog
    && echo "PrintMotd no" >> /etc/ssh/sshd_config \
    && echo "PrintLastLog no" >> /etc/ssh/sshd_config \
    && sed -i 's/^session.*pam_motd.so/#&/' /etc/pam.d/sshd /etc/pam.d/login 2>/dev/null || true \
    && sed -i 's/^session.*pam_lastlog.so/#&/' /etc/pam.d/sshd /etc/pam.d/login 2>/dev/null || true \
    && chmod -x /etc/update-motd.d/* 2>/dev/null || true \
    && rm -f /etc/legal /etc/motd /etc/update-motd.d/* 2>/dev/null || true \
    && touch /root/.hushlogin /etc/skel/.hushlogin \
    # XRDP and XFCE4 default session setup
    && adduser xrdp ssl-cert 2>/dev/null || true \
    && echo "startxfce4" > /etc/skel/.xsession \
    && echo "startxfce4" > /root/.xsession \
    && chmod 644 /etc/skel/.xsession /root/.xsession

# Generate English locale
RUN echo "en_US.UTF-8 UTF-8" >> /etc/locale.gen && locale-gen en_US.UTF-8

# Install neofetch and fastfetch
RUN curl -fsSL https://raw.githubusercontent.com/dylanaraps/neofetch/master/neofetch -o /usr/local/bin/neofetch \
    && chmod +x /usr/local/bin/neofetch \
    && (curl -fsSL https://github.com/fastfetch-cli/fastfetch/releases/latest/download/fastfetch-linux-amd64.deb -o /tmp/fastfetch.deb \
        && dpkg -i /tmp/fastfetch.deb \
        && rm -f /tmp/fastfetch.deb || true)

# Welcome banner shown on interactive SSH login
COPY ara-welcome.sh /etc/profile.d/ara-welcome.sh
RUN chmod +x /etc/profile.d/ara-welcome.sh \
    && echo 'export PS1="\[\033[01;32m\]\u@server\[\033[00m\]:\[\033[01;34m\]\w\[\033[00m\]\$ "' >> /etc/bash.bashrc \
    && echo 'export PS1="\[\033[01;32m\]\u@server\[\033[00m\]:\[\033[01;34m\]\w\[\033[00m\]\$ "' >> /root/.bashrc

# Set locale and terminal environment
ENV LANG=en_US.UTF-8
ENV LC_ALL=en_US.UTF-8
ENV LANGUAGE=en_US.UTF-8
ENV TERM=xterm-256color

# Claude Code settings
ARG ANTHROPIC_AUTH_TOKEN=""
COPY claude-settings.json /root/.claude/settings.json
RUN sed -i "s|__ANTHROPIC_AUTH_TOKEN__|${ANTHROPIC_AUTH_TOKEN}|g" /root/.claude/settings.json

# Install Claude Code (official CLI by Anthropic) globally
RUN npm install -g @anthropic-ai/claude-code

# Install Google Antigravity CLI (agy) globally
RUN curl -fsSL https://antigravity.google/cli/install.sh | bash -s -- --dir /usr/local/bin \
    && ln -sf /usr/local/bin/agy /usr/local/bin/antigravity || true

# Copy ssh user config to configure the user's password and authorized keys
COPY ssh-user-config.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/ssh-user-config.sh

# Copy the "cl" helper command (opens a tmux session running Claude Code)
COPY cl /usr/local/bin/cl
RUN chmod +x /usr/local/bin/cl

# Copy the "ag" helper command (opens a tmux session running Antigravity CLI)
COPY ag /usr/local/bin/ag
RUN chmod +x /usr/local/bin/ag

# Copy the "usage" command (Railway trial credit + uptime monitor)
COPY usage /usr/local/bin/usage
RUN chmod +x /usr/local/bin/usage

# Copy Web Monitoring & Management Dashboard
COPY dashboard /opt/dashboard
RUN chmod -R 755 /opt/dashboard

# Expose port 22 (SSH), 3389 (XRDP / Remote Desktop) and 8080 (Web Dashboard)
EXPOSE 22
EXPOSE 3389
EXPOSE 8080

# Start the SSH server & background services
CMD ["/usr/local/bin/ssh-user-config.sh"]

