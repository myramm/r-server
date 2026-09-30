# 🔑 R-SERVER · Token Setup Guide

This guide helps you set up optional API tokens for **Claude Code** and **Automatic Work Persistence (`src-sync`)**.

Both tokens are **optional**. You can provide them as environment variables in Railway.

---

## 1️⃣ GitHub Token — For `/root/src` Auto-Backup (`src-sync`)

With this token, your `/root/src` directory is backed up to a **private GitHub repository** on every start and restored on rebuilds, so your work is never lost.

### Steps:
1. Open the [GitHub Token Creation Page](https://github.com/settings/tokens/new?description=R-SERVER%20src-sync&scopes=repo).
2. Set Note/Name to: `R-SERVER src-sync`.
3. Select **Expiration** (e.g., *90 days* or *No expiration*).
4. ✅ Check the **`repo`** checkbox.
5. Click **Generate token** and copy the token starting with `ghp_`.
6. In Railway, set the environment variable:
   ```bash
   GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

---

## 2️⃣ Claude Code Token — For Anthropic AI CLI

If you want to use Anthropic Claude Code CLI (`claude` / `cl`):

### Steps:
1. Create an API key at [Anthropic Console](https://console.anthropic.com/) or [OpenRouter Keys](https://openrouter.ai/keys).
2. In Railway, set the environment variable:
   ```bash
   ANTHROPIC_AUTH_TOKEN=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```
3. Run `claude` (or `cl`) inside the terminal.

---

## 📋 Quick Reference

| Token | Variable | Scope / Type | Direct Link |
|---|---|---|---|
| 🟣 GitHub | `GITHUB_TOKEN` | `repo` | [github.com/settings/tokens/new](https://github.com/settings/tokens/new?scopes=repo) |
| 🟠 Anthropic / OpenRouter | `ANTHROPIC_AUTH_TOKEN` | API Key | [console.anthropic.com](https://console.anthropic.com/) |
