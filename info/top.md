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
