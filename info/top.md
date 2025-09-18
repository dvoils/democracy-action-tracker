# Set up initial app

This is still pretty quick, just a few copy-paste commands.

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


Perfect, thank you for showing me the screenshot — it clears things up.

Right now GitHub Pages is **disabled** for your `democracy-action-tracker` repo. That’s why you get the 404. Here’s exactly what to do:

---

### ✅ Steps to enable Pages

1. In your repo, go to **Settings → Pages**.
2. Under **Build and deployment → Source**:

   * Choose **Deploy from a branch**.
3. Under **Branch**:

   * Select **main**.
   * In the **Folder** dropdown, select **/docs**.
4. Click **Save**.

---

### What happens next

* After saving, you’ll see a green box appear that says something like:

  > *Your site is live at [https://dvoils.github.io/democracy-action-tracker/](https://dvoils.github.io/democracy-action-tracker/)*
* The first time, it can take **2–5 minutes** before the URL works.
* Refresh with **Ctrl+Shift+R** (or use incognito) to bypass cached 404s.

---

Once you enable this, your tracker will be available at:
👉 **[https://dvoils.github.io/democracy-action-tracker/](https://dvoils.github.io/democracy-action-tracker/)**

Do you want me to also update the HTML of your main site (`dvoils.github.io`) so the **"Democracy Action Tracker" button** is already pointing to that URL?

