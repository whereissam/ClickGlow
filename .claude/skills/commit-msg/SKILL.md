---
name: commit-msg
description: Generate a one-line commit message from staged files
disable-model-invocation: true
---

Generate a commit message from currently staged files:

1. Run `git diff --cached --stat` to see what's staged
2. Run `git diff --cached` to understand the changes
3. Output a single-line conventional commit message: `type: description`
   - Types: feat, fix, docs, style, refactor, perf, test, chore
   - Keep it concise, under 72 characters
4. Do NOT run `git commit` — only output the message
