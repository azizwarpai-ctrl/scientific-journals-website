---
description: SpecKit Git Workflow Guide
---

# SpecKit Git Workflow Guide

This guide defines the strict Git workflow all agents and contributors must follow when implementing features or fixing bugs in this repository using SpecKit.

## Core Mandates

1. **NEVER COMMIT TO MAIN DIRECTLY**
   - The `main` branch is strictly protected.
   - All work must be pushed to a designated feature or fix branch.

2. **Branch Naming Convention**
   - Features: `feature/[short-desc]`
   - Fixes: `fix/[short-desc]`
   - Chores/Docs: `chore/[short-desc]`

## Step-by-Step Workflow

1. **Create the Branch**
   Before making *any* code changes, checkout a new designated branch:
   ```bash
   git checkout -b <branch-name>
   ```

2. **Make Incremental Commits**
   Commit your work in small, logical steps using semantic commit messages. Ensure each commit references the active SpecKit spec.
   ```bash
   git add <files>
   git commit -m "feat(module): description of change per spec"
   ```

3. **Push to Remote**
   Once the implementation or fix is complete, push the branch to the origin:
   ```bash
   git push -u origin <branch-name>
   ```

4. **CodeRabbit Review (MANDATORY)**
   - Request a CodeRabbit review on the pushed branch.
   - Resolve all inline and nitpick feedback iteratively on the *same* branch.
   - Do not merge until the architecture aligns perfectly with the SpecKit constraints.

---
*Note: This is a living document. The user will help expand this guide with further SpecKit usage patterns and rules as needed.*
