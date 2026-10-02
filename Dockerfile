# ============================================================
# R-SERVER — Railway Arch Linux SSH Server & Workstation
# ============================================================
# A Docker image providing Arch Linux (Rolling Release) with SSH server
# (SSHD) enabled, full developer workstation tools, Fastfetch, and AI agents.

ARG BASE_IMAGE=archlinux:latest
FROM ${BASE_IMAGE}

# Initialize pacman keys and update system
RUN pacman-key --init \
    && pacman-key --populate archlinux \
    && pacman -Syu --noconfirm \
    && pacman -S --noconfirm --needed \
        ca-certificates \
        openssh sudo \
        curl wget \
        iproute2 iputils net-tools traceroute bind whois nmap \
        vim nano micro \
        htop btop ncdu \
        tmux screen less tree bat ripgrep fd jq zsh \
        unzip zip tar gzip bzip2 xz p7zip \
        git base-devel cmake pkg-config gcc \
        python python-pip python-virtualenv \
        nodejs npm ffmpeg \
        glibc-locales which procps-ng shadow fastfetch \
    && (curl -fsSL https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && chmod +x /usr/local/bin/yt-dlp || true) \
    && mkdir -p /run/sshd /var/empty \
    && chmod 755 /run/sshd /var/empty \
    && chown root:root /var/empty \
    && ssh-keygen -A \
    && echo "PasswordAuthentication yes" >> /etc/ssh/sshd_config \
    && echo "PermitRootLogin yes" >> /etc/ssh/sshd_config \
    && echo "PrintMotd no" >> /etc/ssh/sshd_config \
    && echo "PrintLastLog no" >> /etc/ssh/sshd_config \
    && touch /root/.hushlogin /etc/skel/.hushlogin

# Generate English locale
RUN echo "en_US.UTF-8 UTF-8" >> /etc/locale.gen && locale-gen en_US.UTF-8

# Install neofetch
RUN curl -fsSL https://raw.githubusercontent.com/dylanaraps/neofetch/master/neofetch -o /usr/local/bin/neofetch \
    && chmod +x /usr/local/bin/neofetch

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
RUN sed -i "s|__ANTHROPIC_AUTH_TOKEN__|${ANTHROPIC_AUTH_TOKEN}|g" /root/.claude/settings.json 2>/dev/null || true

# Install Claude Code, OpenCode AI, Freebuff, pnpm & pm2 globally
RUN npm install -g @anthropic-ai/claude-code opencode-ai freebuff pnpm pm2 2>/dev/null || npm install -g @anthropic-ai/claude-code \
    && (curl -fsSL https://opencode.ai/install | bash -s -- --dir /usr/local/bin 2>/dev/null || true)

# Install Google Antigravity CLI (agy) globally
RUN (curl -fsSL https://antigravity.google/cli/install.sh | bash -s -- --dir /usr/local/bin 2>/dev/null || true) \
    && ln -sf /usr/local/bin/agy /usr/local/bin/antigravity 2>/dev/null || true

# Install Golang (Go 1.23 Stable)
RUN (curl -fsSL https://go.dev/dl/go1.23.1.linux-amd64.tar.gz | tar -C /usr/local -xzf - 2>/dev/null || true) \
    && ln -sf /usr/local/go/bin/go /usr/local/bin/go 2>/dev/null || true \
    && ln -sf /usr/local/go/bin/gofmt /usr/local/bin/gofmt 2>/dev/null || true

# Install Astral uv, Aider AI, and Hermes Agent
RUN (curl -LsSf https://astral.sh/uv/install.sh | env UV_INSTALL_DIR="/usr/local/bin" sh || true) \
    && (uv pip install --system aider-chat hermes-agent huggingface_hub rich click typer ipython 2>/dev/null || true)

# Copy ssh user config to configure the user's password and authorized keys
COPY ssh-user-config.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/ssh-user-config.sh

# Copy CLI helper commands
COPY cl /usr/local/bin/cl
COPY ag /usr/local/bin/ag
COPY ai /usr/local/bin/ai
COPY oc /usr/local/bin/oc
COPY fb /usr/local/bin/fb
COPY usage /usr/local/bin/usage
RUN chmod +x /usr/local/bin/cl /usr/local/bin/ag /usr/local/bin/ai /usr/local/bin/oc /usr/local/bin/fb /usr/local/bin/usage

# Copy Web Monitoring & Management Dashboard
COPY dashboard /opt/dashboard
RUN chmod -R 755 /opt/dashboard

# Expose port 22 (SSH) and 8080 (Web Dashboard)
EXPOSE 22
EXPOSE 8080

# Start the SSH server & background services
CMD ["/usr/local/bin/ssh-user-config.sh"]
