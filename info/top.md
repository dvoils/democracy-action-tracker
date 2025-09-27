# Set up initial app

1. Install **Node.js LTS** (from nodejs.org) if you don’t have it.
2. Open Terminal (Mac) or Command Prompt/PowerShell (Windows) and run:

   ```
   npx create-next-app@latest democracy-tracker --typescript --eslint --tailwind --app --src-dir --use-npm
   cd democracy-tracker
   npx shadcn@latest init -d
   npx shadcn@latest add button card input textarea slider
   npm i framer-motion recharts html2canvas lucide-react
   ```
3. Open the project folder in your editor (or stay in Terminal) and replace the contents of `src/app/page.tsx` with the code I put in the canvas. Add **'use client'** at the very top.
4. Start it:

   ```
   npm run dev
   ```
5. Visit **[http://localhost:3000](http://localhost:3000)** in your browser.
6. Use **Export Card** to download the image for posting.

# Steps to enable Pages
+ Needed because this repo is being served as a link from my personal github.io page
1. In the repo, go to **Settings → Pages**.
2. Under **Build and deployment → Source**:

   * Choose **Deploy from a branch**.
3. Under **Branch**:

   * Select **main**.
   * In the **Folder** dropdown, select **/docs**.
4. Click **Save**.


* After saving, you’ll see a green box appear that says something like:

  > *Your site is live at [https://dvoils.github.io/democracy-action-tracker/](https://dvoils.github.io/democracy-action-tracker/)*
* The first time, it can take **2–5 minutes** before the URL works.
* Refresh with **Ctrl+Shift+R** (or use incognito) to bypass cached 404s.

# Test the PR locally

Run this sequence in your repo root:

```bash
# Make sure you have the latest branches from GitHub
git fetch origin

# Create a new test branch based on main
git checkout -b modular-refactor origin/main

# Merge in the PR branch
git merge origin/codex/improve-code-for-better-maintainability

# Install dependencies (in case PR added new ones)
npm install

# Run locally in dev mode
npm run dev

# Build + deploy to docs/ (simulate GitHub Pages)
npm run build:pages && npm run deploy:pages
```

## What this does

* `git fetch origin` → pulls down the latest PR branch from GitHub.
* `git checkout -b modular-refactor origin/main` → creates a fresh branch from your main branch.
* `git merge origin/codex/improve-code-for-better-maintainability` → merges in the PR changes so you can test them.
* Then you just install, run, and build as usual.


👉 If everything looks good in your local test, you can merge the PR into `main` directly on GitHub, and then re-run:

```bash
git pull origin main
npm run build:pages && npm run deploy:pages
git add docs
git commit -m "Publish updated tracker"
git push
```

asdf 

```bash
npm install
npm run dev      # open http://localhost:3000 and click around
npm run build:pages && npm run deploy:pages
```

(That copies the static export into `docs/` so you can sanity-check the export locally in the repo.)

## If it looks good, merge the PR to `main`

**Easiest: GitHub UI**

* Open the PR on GitHub and click **Merge pull request**.

**Or locally**

```bash
git checkout main
git fetch origin
git merge --no-ff origin/codex/improve-code-for-better-maintainability -m "Merge PR #1"
git push origin main
```

## Publish the updated site to GitHub Pages

Because Pages serves from `main`’s `docs/`, rebuild after the merge:

```bash
# ensure you’re on main and up to date
git checkout main
git pull

# rebuild static export and publish to docs/
npm run build:pages
npm run deploy:pages

git add docs
git commit -m "Publish updated tracker to GitHub Pages"
git push
```

Your live URL stays: **[https://dvoils.github.io/democracy-action-tracker/](https://dvoils.github.io/democracy-action-tracker/)**

# Deploy to Production

Congrats on the merge! To ship it to your live GitHub Pages site, you just need to rebuild the static export and push the updated `docs/` folder to `main`.

## Quick manual deploy (current setup)

From your repo root:

```bash
# 1) Get latest + install
git switch main
git pull
npm ci

# 2) Build & export (static HTML in ./out)
npm run build:pages
npx next export -o out

# 3) Copy export to /docs (what Pages serves)
rm -rf docs && mkdir -p docs && cp -r out/* docs/ && touch docs/.nojekyll

# 4) Commit and push
git add -A docs
git commit -m "Deploy: $(date -u +'%Y-%m-%d %H:%M:%SZ')"
git push origin main
```

Your site (already configured to serve **/docs** on `main`) will update at:
**[https://dvoils.github.io/democracy-action-tracker/](https://dvoils.github.io/democracy-action-tracker/)**

### Sanity checks

* Open the URL above (hard refresh).
* Confirm no hydration warnings in DevTools Console.
* Test “Import Events (JSON)” placeholder + “Load Example”.
* Click **Export Card** and verify the PNG downloads.

---

## (Optional) One-liner release script

If you like fewer keystrokes, add this to `package.json`:

```json
{
  "scripts": {
    "export:pages": "next export -o out",
    "release:pages": "npm run build:pages && npm run export:pages && npm run deploy:pages && git add -A docs && git commit -m \"Deploy: $(date -u +'%Y-%m-%d %H:%M:%SZ')\" || true && git push origin main"
  }
}
```

Then run:

```bash
npm run release:pages
```

---

## (Optional) Auto-deploy on merge to main

If you’d rather not commit `docs/` by hand, we can switch to a GitHub Actions Pages flow that builds the static export and publishes automatically (no `docs/` in git). If you want that, say the word and I’ll give you the exact workflow and minimal Next config tweaks for the **Pages (Actions)** pipeline.

