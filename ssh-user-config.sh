#!/bin/bash

# ============================================================
# ARA TM — SSH User Configuration Script
# Developer / توسعه‌دهنده: Parham_7991
# ============================================================
# This script configures the root password (required), an optional sudo user,
# optional SSH authorized keys and the Claude Code auth token, then launches
# the SSH server. Connect directly as root after deploy.
# این اسکریپت رمز عبور root (الزامی)، یک کاربر sudo اختیاری، کلیدهای مجاز
# اختیاری و توکن Claude Code را تنظیم کرده و سپس سرور SSH را اجرا می‌کند.
# پس از دیپلوی مستقیماً با کاربر root متصل شوید.

# Display language / زبان نمایش
# Default is English. Set APP_LANG=fa for Persian.
# پیش‌فرض انگلیسی است. برای فارسی مقدار fa=APP_LANG را تنظیم کنید.
: ${APP_LANG:="en"}

# Bilingual message helper / تابع نمایش پیام دوزبانه
# Usage: msg "english text" "متن فارسی"
msg() {
    local en="$1"
    local fa="$2"
    if [ "$APP_LANG" = "fa" ]; then
        echo "$fa"
    else
        echo "$en"
    fi
}

# ---------------------------------------------------------------
# ROOT PASSWORD (MANDATORY) / رمز عبور root (الزامی)
# ---------------------------------------------------------------
# Root login is always enabled in the Dockerfile. A root password MUST be
# supplied at deploy time — the container refuses to start without it.
# ورود root همیشه در Dockerfile فعال است. باید حتماً رمز عبور root در زمان
# دیپلوی ست شود؛ در غیر این صورت کانتینر اجازه راه‌اندازی نمی‌یابد.
: ${ROOT_PASSWORD:=""}
if [ -z "$ROOT_PASSWORD" ]; then
    if [ "$APP_LANG" = "fa" ]; then
        echo "خطا: متغیر محیطی ROOT_PASSWORD الزامی است. لطفاً یک رمز عبور برای root ست کنید." >&2
    else
        echo "Error: ROOT_PASSWORD is required. Please set a root password before deploying." >&2
    fi
    exit 1
fi
echo "root:$ROOT_PASSWORD" | chpasswd
msg "Root password set — you can now connect as root" \
    "رمز عبور root تنظیم شد — اکنون می‌توانید با کاربر root متصل شوید"

# ---------------------------------------------------------------
# DEPLOY START MARKER / نشانگر زمان استقرار
# ---------------------------------------------------------------
# Record the first-deploy time once, so the `usage` timer measures from
# deploy (not from each container restart). Stable across restarts.
# زمان اولین استقرار را یک‌بار ثبت می‌کند تا تایمر «usage» از زمان استقرار
# باشد (نه هر ری‌استارت). در برابر ری‌استارت پایدار است.
DEPLOY_MARK=/var/lib/ara/deploy-start
mkdir -p /var/lib/ara
[ -f "$DEPLOY_MARK" ] || date +%s > "$DEPLOY_MARK"

# ---------------------------------------------------------------
# OPTIONAL SUDO USER / کاربر sudo اختیاری
# ---------------------------------------------------------------
# A regular user is no longer required. Provide both SSH_USERNAME and
# SSH_PASSWORD only if you also want a secondary sudo user.
# کاربر عادی دیگر الزامی نیست. فقط در صورتی که می‌خواهید یک کاربر sudo
# ثانویه داشته باشید، SSH_USERNAME و SSH_PASSWORD را با هم ست کنید.
: ${SSH_USERNAME:=""}
: ${SSH_PASSWORD:=""}

touch /root/.hushlogin
if [ -n "$SSH_USERNAME" ] && [ -n "$SSH_PASSWORD" ]; then
    if id "$SSH_USERNAME" &>/dev/null; then
        msg "User $SSH_USERNAME already exists" "کاربر $SSH_USERNAME از قبل وجود دارد"
    else
        useradd -ms /bin/bash "$SSH_USERNAME"
        echo "$SSH_USERNAME:$SSH_PASSWORD" | chpasswd
        # Add user to sudo or wheel group
        if getent group sudo >/dev/null 2>&1; then
            usermod -aG sudo "$SSH_USERNAME"
        elif getent group wheel >/dev/null 2>&1; then
            usermod -aG wheel "$SSH_USERNAME"
        fi
        msg "User $SSH_USERNAME created with the provided password and added to sudo/wheel group" \
            "User $SSH_USERNAME created and added to admin group"
    fi
    touch "/home/$SSH_USERNAME/.hushlogin" 2>/dev/null || true
    chown "$SSH_USERNAME:$SSH_USERNAME" "/home/$SSH_USERNAME/.hushlogin" 2>/dev/null || true
elif [ -n "$SSH_USERNAME" ] || [ -n "$SSH_PASSWORD" ]; then
    # Only one of the pair was provided — ignore and warn / فقط یکی ست شده — نادیده گرفته و هشدار
    msg "SSH_USERNAME and SSH_PASSWORD must be set together; skipping extra user creation" \
        "SSH_USERNAME و SSH_PASSWORD باید با هم ست شوند؛ ایجاد کاربر اضافه رد شد"
fi

# ---------------------------------------------------------------
# CONFIGURE CUSTOM HOSTNAME PROMPT (root@server:~#)
# ---------------------------------------------------------------
PROMPT_STR='export PS1="\[\033[01;32m\]\u@server\[\033[00m\]:\[\033[01;34m\]\w\[\033[00m\]\$ "'
echo "$PROMPT_STR" >> /etc/bash.bashrc
echo "$PROMPT_STR" >> /root/.bashrc
echo "$PROMPT_STR" >> /etc/profile
echo "$PROMPT_STR" > /etc/profile.d/00-prompt.sh
chmod 644 /etc/profile.d/00-prompt.sh 2>/dev/null || true
if [ -n "$SSH_USERNAME" ] && [ -d "/home/$SSH_USERNAME" ]; then
    echo "$PROMPT_STR" >> "/home/$SSH_USERNAME/.bashrc"
fi

# ---------------------------------------------------------------
# OPTIONAL AUTHORIZED KEYS / کلیدهای مجاز اختیاری
# ---------------------------------------------------------------
# Set SSH public keys for key-based authentication (does not disable password login).
# کلیدهای عمومی SSH را برای احراز هویت مبتنی بر کلید ست می‌کند (ورود با رمز غیرفعال نمی‌شود).
: ${AUTHORIZED_KEYS:=""}
if [ -n "$AUTHORIZED_KEYS" ]; then
    mkdir -p /root/.ssh
    echo "$AUTHORIZED_KEYS" > /root/.ssh/authorized_keys
    chmod 700 /root/.ssh
    chmod 600 /root/.ssh/authorized_keys
    msg "Authorized keys set for root" "کلیدهای مجاز برای root تنظیم شد"
else
    msg "Authorized keys not set" "کلیدهای مجاز تنظیم نشدند"
fi

# ---------------------------------------------------------------
# OPTIONAL CLAUDE CODE AUTH TOKEN / توکن اختیاری Claude Code
# ---------------------------------------------------------------
# The token is NOT baked in. Supply it via the ANTHROPIC_AUTH_TOKEN build arg
# or (recommended) as a Railway environment variable — it is applied on every
# container start, so editing it takes effect on the next deploy.
# توکن بیک نمی‌شود. آن را از طریق آرگومان ساخت ANTHROPIC_AUTH_TOKEN یا
# (توصیه می‌شود) به عنوان متغیر محیطی Railway ست کنید — روی هر اجرا اعمال
# می‌شود، بنابراین ویرایش آن روی دیپلوی بعدی اثر می‌گذارد.
: ${ANTHROPIC_AUTH_TOKEN:=""}

# Configure Claude Code settings and inject the auth token (if provided)
# پیکربندی تنظیمات Claude Code و تزریق توکن احراز هویت (در صورت وجود)
configure_claude_settings() {
    local token="$ANTHROPIC_AUTH_TOKEN"
    # Home directories that should have Claude Code settings
    # دایرکتوری‌های خانه که باید تنظیمات Claude Code را داشته باشند
    local homes="/root"
    if [ -n "$SSH_USERNAME" ] && [ -d "/home/$SSH_USERNAME" ]; then
        homes="$homes /home/$SSH_USERNAME"
    fi
    for home in $homes; do
        local claude_dir="$home/.claude"
        local settings="$claude_dir/settings.json"
        mkdir -p "$claude_dir"
        if [ ! -f "$settings" ]; then
            # Fallback to the baked root template if this user has no settings yet
            # در صورت نبود تنظیمات، از قالب آماده root استفاده می‌کنیم
            cp /root/.claude/settings.json "$settings" 2>/dev/null || continue
        fi
        if [ -n "$token" ] && command -v jq >/dev/null 2>&1; then
            # Overwrite only the token; everything else stays as the default
            # فقط توکن بازنویسی می‌شود؛ بقیه مقادیر پیش‌فرض باقی می‌مانند
            jq --arg t "$token" '.env.ANTHROPIC_AUTH_TOKEN = $t' "$settings" > "$settings.tmp" \
                && mv "$settings.tmp" "$settings"
        fi
        # Fix ownership so the user can read/write their own settings
        # اصلاح مالکیت تا کاربر بتواند تنظیمات خود را بخواند و بنویسد
        chown -R "$(stat -c '%U:%G' "$home" 2>/dev/null)" "$claude_dir" 2>/dev/null || true
    done
    if [ -n "$token" ]; then
        msg "Claude Code auth token applied" "توکن احراز هویت Claude Code اعمال شد"
    else
        msg "Claude Code auth token not set — provide ANTHROPIC_AUTH_TOKEN to use Claude Code" \
            "توکن احراز هویت Claude Code تنظیم نشد — برای استفاده از Claude Code مقدار ANTHROPIC_AUTH_TOKEN را وارد کنید"
    fi
}

configure_claude_settings

# ---------------------------------------------------------------
# OPTIONAL GOOGLE ANTIGRAVITY AUTH TOKEN & DB / توکن و دیتابیس Antigravity
# ---------------------------------------------------------------
: ${ANTIGRAVITY_AUTH_TOKEN:=""}
: ${ANTIGRAVITY_TOKEN:=""}
: ${GEMINI_API_KEY:=""}

configure_antigravity_settings() {
    local token="${ANTIGRAVITY_AUTH_TOKEN:-$ANTIGRAVITY_TOKEN}"
    local homes="/root"
    if [ -n "$SSH_USERNAME" ] && [ -d "/home/$SSH_USERNAME" ]; then
        homes="$homes /home/$SSH_USERNAME"
    fi
    for home in $homes; do
        local agy_dir="$home/.gemini/antigravity-cli"
        mkdir -p "$agy_dir"
        # 1. Apply token from environment variable if provided
        if [ -n "$token" ]; then
            echo "$token" > "$agy_dir/antigravity-oauth-token"
            chmod 600 "$agy_dir/antigravity-oauth-token"
        fi
        # 2. Or fallback to restored persistent backup from src
        if [ ! -f "$agy_dir/antigravity-oauth-token" ] && [ -f "/root/src/.gemini_state/antigravity-oauth-token" ]; then
            cp -a /root/src/.gemini_state/* "$agy_dir/" 2>/dev/null || true
            chmod 600 "$agy_dir/antigravity-oauth-token" 2>/dev/null || true
        fi
        # 3. Apply Gemini API key if provided
        if [ -n "$GEMINI_API_KEY" ]; then
            echo "{\"apiKey\":\"$GEMINI_API_KEY\"}" > "$agy_dir/settings.json" 2>/dev/null || true
            chmod 600 "$agy_dir/settings.json" 2>/dev/null || true
        fi
        chown -R "$(stat -c '%U:%G' "$home" 2>/dev/null)" "$home/.gemini" 2>/dev/null || true
    done
    if [ -f "/root/.gemini/antigravity-cli/antigravity-oauth-token" ]; then
        msg "Google Antigravity session & token loaded — no login needed" \
            "نشست و توکن Antigravity بارگذاری شد — بدون نیاز به لاگین مجدد"
    fi
}

configure_antigravity_settings

# ---------------------------------------------------------------
# OPTIONAL AI AGENT API KEYS / کلیدهای API برای هوش مصنوعی
# ---------------------------------------------------------------
: ${OPENAI_API_KEY:=""}
: ${ANTHROPIC_API_KEY:=""}
: ${DEEPSEEK_API_KEY:=""}
: ${OPENCODE_TOKEN:=""}
: ${AIDER_API_KEY:=""}

configure_ai_keys() {
    local keys_sh="/etc/profile.d/01-ai-keys.sh"
    rm -f "$keys_sh"
    touch "$keys_sh"
    chmod 644 "$keys_sh"

    [ -n "$OPENAI_API_KEY" ] && echo "export OPENAI_API_KEY=\"$OPENAI_API_KEY\"" >> "$keys_sh"
    [ -n "$ANTHROPIC_API_KEY" ] && echo "export ANTHROPIC_API_KEY=\"$ANTHROPIC_API_KEY\"" >> "$keys_sh"
    [ -n "$GEMINI_API_KEY" ] && echo "export GEMINI_API_KEY=\"$GEMINI_API_KEY\"" >> "$keys_sh"
    [ -n "$DEEPSEEK_API_KEY" ] && echo "export DEEPSEEK_API_KEY=\"$DEEPSEEK_API_KEY\"" >> "$keys_sh"
    [ -n "$OPENCODE_TOKEN" ] && echo "export OPENCODE_TOKEN=\"$OPENCODE_TOKEN\"" >> "$keys_sh"
    [ -n "$AIDER_API_KEY" ] && echo "export AIDER_API_KEY=\"$AIDER_API_KEY\"" >> "$keys_sh"

    # Also append to bashrc for interactive shells
    cat "$keys_sh" >> /root/.bashrc 2>/dev/null || true
    if [ -n "$SSH_USERNAME" ] && [ -d "/home/$SSH_USERNAME" ]; then
        cat "$keys_sh" >> "/home/$SSH_USERNAME/.bashrc" 2>/dev/null || true
    fi
}

configure_ai_keys

# ---------------------------------------------------------------
# SRC FOLDER ⇄ GITHUB SYNC / همگام‌سازی پوشه src با GitHub
# ---------------------------------------------------------------
# /root/src is auto-backed up to a PRIVATE repo (ara-tm-src-<id>) and restored
# on every start, so your work survives container rebuilds.
# پوشه src به صورت خودکار در یک مخزن خصوصی (ara-tm-src-<id>) پشتیبان‌گیری شده
# و در هر اجرا بازیابی می‌شود تا کار شما با بازسازی کانتینر از دست نرود.
: ${GITHUB_TOKEN:=""}
SRC_DIR=/root/src
mkdir -p "$SRC_DIR"
# Persist the token so interactive SSH sessions can use src-sync too.
# sshd login shells do NOT inherit the container env, so GITHUB_TOKEN would
# otherwise be missing when you run `src-sync` by hand over SSH.
# توکن را برای نشست‌های تعاملی SSH ذخیره می‌کنیم؛ پوسته‌های ورود sshd
# محیط کانتینر را به ارث نمی‌برند، پس وإلا با دستور دستی src-sync توکن گم می‌شد.
if [ -n "$GITHUB_TOKEN" ]; then
    echo "$GITHUB_TOKEN" > /var/lib/ara/github-token
    chmod 600 /var/lib/ara/github-token
fi
if [ -n "$GITHUB_TOKEN" ]; then
    # Create/link the private ARA TM repo immediately, then restore any
    # existing content from a previous server, then keep it in sync.
    repo=$(/usr/local/bin/src-sync --init 2>/dev/null)
    /usr/local/bin/src-sync --restore 2>&1 | while IFS= read -r l; do msg "$l" "$l"; done
    msg "src sync ON — /root/src ⇄ private GitHub repo: $repo" \
        "همگام‌سازی src روشن — پوشه src ⇄ مخزن خصوصی GitHub: $repo"
    nohup /usr/local/bin/src-sync --watch >/var/log/src-sync.log 2>&1 &

    # Restore and auto-sync AI Agent login sessions and credentials
    ai_repo=$(/usr/local/bin/ai-sync --init 2>/dev/null || true)
    /usr/local/bin/ai-sync restore 2>&1 | while IFS= read -r l; do msg "$l" "$l"; done
    nohup /usr/local/bin/ai-sync --watch >/var/log/ai-sync.log 2>&1 &
else
    # Local restore if backup exists
    /usr/local/bin/ai-sync restore >/dev/null 2>&1 || true
    msg "GitHub token not set — /root/src won't sync (set GITHUB_TOKEN to enable)" \
        "توکن GitHub ست نشده — پوشه src همگام‌سازی نمی‌شود (برای فعال‌سازی GITHUB_TOKEN را تنظیم کنید)"
fi

# ---------------------------------------------------------------
# OPTIONAL CUSTOM NODE.JS VERSION & EXTRA TOOLS
# ---------------------------------------------------------------
if [ -n "$NODE_VERSION" ] && [ "$NODE_VERSION" != "default" ]; then
    msg "Configuring Node.js version $NODE_VERSION..." "Configuring Node.js version $NODE_VERSION..."
    if ! command -v n >/dev/null 2>&1; then
        curl -fsSL https://raw.githubusercontent.com/tj/n/master/bin/n -o /usr/local/bin/n 2>/dev/null && chmod +x /usr/local/bin/n 2>/dev/null || true
    fi
    n "$NODE_VERSION" 2>&1 || true
    hash -r 2>/dev/null || true
fi

if [ -n "$EXTRA_PACKAGES" ]; then
    msg "Installing extra packages: $EXTRA_PACKAGES..." "Installing extra packages: $EXTRA_PACKAGES..."
    if command -v pacman >/dev/null 2>&1; then
        pacman -Sy --noconfirm $EXTRA_PACKAGES 2>/dev/null || true
    elif command -v apk >/dev/null 2>&1; then
        apk add --no-cache $EXTRA_PACKAGES 2>/dev/null || true
    elif command -v dnf >/dev/null 2>&1; then
        dnf install -y $EXTRA_PACKAGES 2>/dev/null || true
    elif command -v yum >/dev/null 2>&1; then
        yum install -y $EXTRA_PACKAGES 2>/dev/null || true
    elif command -v apt-get >/dev/null 2>&1; then
        apt-get update -y && apt-get install -y --no-install-recommends $EXTRA_PACKAGES 2>/dev/null || true
    fi
fi

if [[ "$INSTALL_AI" =~ "aider" ]]; then
    pip3 install --break-system-packages aider-chat 2>/dev/null || pip3 install aider-chat 2>/dev/null || true
fi

# Ensure Hermes Agent, OpenCode AI, Freebuff, and PM2 background services exist across all restarts
(
    command -v opencode >/dev/null 2>&1 || (npm install -g opencode-ai 2>/dev/null || curl -fsSL https://opencode.ai/install | bash -s -- --dir /usr/local/bin 2>/dev/null || true)
    command -v freebuff >/dev/null 2>&1 || npm install -g freebuff 2>/dev/null || true
    command -v hermes >/dev/null 2>&1 || pip3 install --break-system-packages hermes-agent python-telegram-bot==22.8 2>/dev/null || true
    if [ -f "/etc/init.d/pm2-root" ]; then
        /etc/init.d/pm2-root start 2>/dev/null || true
    else
        pm2 resurrect 2>/dev/null || true
    fi
) >/var/log/ai-agents-init.log 2>&1 &

# ---------------------------------------------------------------
# START WEB MONITORING & MANAGEMENT DASHBOARD
# ---------------------------------------------------------------
msg "Starting Web Monitoring Dashboard on port ${PORT:-8080}..." "Starting Web Monitoring Dashboard..."
if [ -f "/opt/dashboard/server.js" ]; then
    nohup node /opt/dashboard/server.js >/var/log/dashboard.log 2>&1 &
fi

# ---------------------------------------------------------------
# START SSH SERVER
# ---------------------------------------------------------------
msg "Starting SSH server on port 22..." "Starting SSH server..."
# Generate host keys if missing (idempotent)
ssh-keygen -A 2>/dev/null || true
SSHD_BIN=$(command -v sshd || echo "/usr/sbin/sshd")
exec "$SSHD_BIN" -D

