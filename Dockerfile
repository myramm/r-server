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
    && apt-get install -y --no-install-recommends \
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
        nodejs npm \
        locales ncurses-term \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/* \
    && mkdir -p /run/sshd \
    && chmod 755 /run/sshd \
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
    && touch /root/.hushlogin /etc/skel/.hushlogin

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
RUN chmod +x /etc/profile.d/ara-welcome.sh

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
RUN chmod +x /usr/local/bin/cl \
    && ln -sf /usr/local/bin/cl /usr/local/bin/زم

# Copy the "ag" helper command (opens a tmux session running Antigravity CLI)
COPY ag /usr/local/bin/ag
RUN chmod +x /usr/local/bin/ag

# Copy the "usage" command (Railway trial credit + uptime monitor)
COPY usage /usr/local/bin/usage
RUN chmod +x /usr/local/bin/usage

# Copy Web Monitoring & Management Dashboard
COPY dashboard /opt/dashboard
RUN chmod -R 755 /opt/dashboard

# Expose port 22 (SSH) and 8080 (Web Dashboard)
EXPOSE 22
EXPOSE 8080

# Start the SSH server & background services
CMD ["/usr/local/bin/ssh-user-config.sh"]

