# Security Guardrails

## 🚨 CRITICAL RULE: SECURITY IS #1 PRIORITY (PUBLIC REPOSITORIES)
1. **Public Repository Awareness:**
   * Always treat repositories as PUBLIC by default unless explicitly confirmed otherwise.
   * **ABSOLUTELY NEVER** hardcode, commit, or mention private credentials, passwords, PIN codes, secret tokens, or personal access keys in ANY code or documentation file (`app.js`, `index.html`, `TooYenKungPRD.md`, documentation, or git commit messages).

2. **Decoupled Secret Management:**
   * All sensitive data, security credentials, or PIN codes must ALWAYS be stored and verified dynamically via secure external storage (e.g., Firebase Cloud Firestore, Secret Manager, or environment variables) — NEVER in Git.

3. **Pre-Commit Security Audit:**
   * Before executing any `git commit` or `git push`, the agent MUST inspect `git diff` to guarantee zero private keys, passwords, or tokens are staged.
