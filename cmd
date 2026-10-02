#!/bin/bash

# ============================================================
# R-SERVER — "cmd" command: List all CLI shortcuts & AI Agents
# ============================================================

# Colors
C_RESET=$'\e[0m'
C_BOLD=$'\e[1m'
C_DIM=$'\e[2m'
C_CYAN=$'\e[38;5;51m'
C_BLUE=$'\e[38;5;33m'
C_PURPLE=$'\e[38;5;135m'
C_GREEN=$'\e[38;5;46m'
C_YELLOW=$'\e[38;5;220m'
C_GREY=$'\e[38;5;245m'
C_WHITE=$'\e[38;5;231m'

printf '\n'
printf '%s\n' "  ${C_CYAN}${C_BOLD}🚀 R-SERVER — Terminal Commands & AI Hub${C_RESET}"
printf '%s\n' "  ${C_GREY}───────────────────────────────────────────────────────────────${C_RESET}"

header() {
    printf "\n  ${C_PURPLE}${C_BOLD}▶ %s${C_RESET}\n" "$1"
}

row() {
    printf "  ${C_YELLOW}%-22s${C_RESET} ${C_GREY}│${C_RESET} ${C_WHITE}%-28s${C_RESET} ${C_DIM}%s${C_RESET}\n" "$1" "$2" "$3"
}

header "🤖 AI CODING AGENTS"
row "claude (or cl)" "Anthropic Claude Code CLI" "(Runs in tmux session)"
row "agy (or ag)" "Google Antigravity CLI" "(Official AI Agent)"
row "opencode (or oc)" "OpenCode AI Assistant" "(Terminal AI Agent)"
row "freebuff (or fb)" "Freebuff AI Assistant" "(Terminal AI Agent)"
row "hermes" "Hermes Agent TUI" "(Autonomous AI Agent)"
row "aider (or ai)" "Aider Pair Programming" "(Terminal Git Pair)"

header "🌐 WEB HOSTING & TUNNELING (NO PUBLIC IP NEEDED)"
row "serve-html [folder]" "Host HTML + Public HTTPS URL" "(Instant Cloudflare Tunnel)"
row "tunnel <port>" "Expose any port to HTTPS" "(Port forward to Internet)"

header "🐍 PYTHON & NODE.JS RUNTIMES"
row "uv pip install <pkg>" "Astral UV Installer" "(10-100x faster pip)"
row "uv venv" "Instant Python Virtualenv" "(Blazing fast)"
row "python / pip" "Python 3 & PIP toolchain" "(Pre-configured)"
row "node / npm / pnpm" "Node.js & Package Managers" "(Active runtime)"

header "💾 AI LOGIN BACKUP & PERSISTENCE"
row "ai-backup" "Save AI Agent Login Data" "(Claude, AGY, Hermes, OpenCode)"
row "ai-restore" "Restore AI Login Sessions" "(Instant auto-relogin)"
row "ai-sync status" "Check AI Auth & Backups" "(Status of all logins)"

header "📊 SYSTEM METRICS & UTILITIES"
row "usage" "Railway Credit & Uptime" "(Live burn rate & stats)"
row "fastfetch / neofetch" "System & OS Banner" "(Hardware & Kernel info)"
row "htop / btop" "Interactive Task Manager" "(Live CPU/RAM & Processes)"
row "src-sync --status" "GitHub /root/src Backup" "(Private sync repo)"

printf '\n'
printf '%s\n' "  ${C_GREY}───────────────────────────────────────────────────────────────${C_RESET}"
printf "  ${C_GREEN}💡 Tip:${C_RESET} ${C_DIM}Run ${C_YELLOW}cmd${C_RESET}${C_DIM} anytime to show this cheat sheet again.${C_RESET}\n\n"
