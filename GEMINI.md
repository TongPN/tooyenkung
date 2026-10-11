# Antigravity Pair Programming Rules: TooYenKung

## 🚨 CRITICAL RULE #1: SECURITY IS 1ST PRIORITY (PUBLIC REPOSITORY)
* **This repository is PUBLIC on GitHub (`https://github.com/TongPN/tooyenkung`).**
* **ABSOLUTELY NEVER** hardcode, commit, or mention any private credentials, passwords, PIN codes (e.g., Family PIN), secret tokens, or personal access keys in ANY code or documentation file:
  * Do NOT put secrets in `app.js`, `index.html`, or any source files.
  * Do NOT put secrets in `TooYenKungPRD.md`, markdown notes, or documentation.
  * Do NOT put secrets in git commit messages.
* **Architecture Constraint:** All sensitive data or security credentials (such as Family PINs) must ALWAYS be managed and verified dynamically via Firebase Cloud Firestore (e.g. collection `settings/security`) or secure external storage, NEVER in Git.
* **Pre-Commit Security Audit:** Before every `git commit` and `git push`, the agent MUST inspect `git diff` to guarantee zero private keys, passwords, or tokens are staged.

---

## 🛠️ RULE #2: ZERO MANUAL DEPLOYMENT FOR USER
* The user is the product owner and expects the agent (the builder) to handle all deployment automation.
* Code updates must be deployed directly by committing and pushing to branch `main` on GitHub Pages (`origin main`).
* Never require the user to copy/paste scripts or manually deploy files.

---

## 📱 RULE #3: MOBILE-FIRST & PWA STABILITY
* The app is designed for mobile PWA usage ("Add to Home Screen" on iOS and Android).
* Maintain strict horizontal scrolling lock (`overflow-x: hidden`, `overscroll-behavior-x: none`, `viewport-fit=cover`).
* Preserve the standalone in-app true reload capability (`window.location.reload()`) for iOS PWAs.
