# GitHub Push Checklist

Use this checklist before pushing the release candidate to GitHub.

## Local repository checks

1. Confirm the working tree:

   ```bash
   git status --short
   git status --ignored --short
   ```

2. Confirm generated and local-only paths are ignored and not tracked:

   - `deepseek_workbench_v0_2_1_codex_pack/`
   - `node_modules/`
   - `runtime/dist/`
   - `browser-extension/dist/`
   - `conformance/results/`
   - `.tmp/`
   - `evals/reports/`
   - demo workspaces and private payload files

3. Run the release gate:

   ```bash
   pnpm verify:ci
   pnpm release:smoke
   ```

4. Optional manual live conformance:

   ```bash
   DEEPSEEK_CONFORMANCE_LIVE=1 DEEPSEEK_API_KEY=... pnpm test:conformance:live -- --live
   ```

   Keep live results redacted and uncommitted.

## GitHub setup

1. Choose a license before public release.
2. Add a `LICENSE` file and package license metadata.
3. Create the GitHub repository.
4. Add the remote:

   ```bash
   git remote add origin <github-repo-url>
   ```

5. Push the branch:

   ```bash
   git push -u origin <branch-name>
   ```

6. Confirm GitHub Actions are green.
7. Set repository About text, topics, and license.

## Do not push

- API keys or `.env` files.
- `conformance/results/`.
- `deepseek_workbench_v0_2_1_codex_pack/`.
- Generated dist directories.
- `.tmp/` or eval generated reports.
- Private browser payloads, raw DOM, screenshots, clipboard data, or draft CSVs
  from private pages.

## Current blocker

BLOCKER: the repository currently has no `LICENSE` file and no package license
field. Choose a license before public GitHub release.
