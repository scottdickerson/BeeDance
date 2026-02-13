# Bee Cool!

A browser memory game: watch the leader bee’s path on the grid, then repeat it with the arrow keys, WASD, or by tapping/clicking grid cells before time runs out.

- **Stack:** React 18, TypeScript, Vite
- **Docs:** [docs/GAME.md](docs/GAME.md) — architecture and how the game works

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Build

```bash
npm run build
npm run preview   # serve dist/
```

## Deploy (Vercel)

1. Push this repo to GitHub (already done).
2. Go to [vercel.com](https://vercel.com) → **Add New** → **Project**.
3. Import **scottdickerson/BeeDance**.
4. Leave defaults (Build: `npm run build`, Output: `dist`).
5. Deploy. Vercel will assign a URL (e.g. `beedance.vercel.app`).

Or from the repo root:

```bash
npx vercel
```

Follow the prompts and deploy.
