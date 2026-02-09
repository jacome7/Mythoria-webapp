---
description: 'Run `npm run logs` to download the lastest logs to the `/logs` folder and analyze them for errors.'
agent: 'agent'
---

Goal: Check the server logs for any errors or warnings that must be fixed.

Process:
1. Using the terminal, run the command `npm run logs`.
2. Check the `/logs` folder for the downloaded logs.
3. Analyze the logs for any errors or warnings that need to be addressed.
4. Fix any identified issues with minimal, targeted code changes.

Rules:
- Prefer the smallest safe change.
- Don’t refactor unrelated code.
- If multiple fixes are possible, choose the one that best matches existing patterns in the repo.
- When done, summarize what was fixed and where.