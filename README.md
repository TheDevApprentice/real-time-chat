# Real-Time Chat

A real-time chat application built with a Node.js/Express backend (Socket.IO) and a Vue + Vite front-end. This repository contains:

- `server/Express/` – the API + WebSocket server, plus a lightweight test UI under `public/`.
- `interface/Vue/` – the main Vue application (Vite, Tailwind v4 layout utilities).

See the CHANGELOG for the latest features and improvements.

- What's New: [CHANGELOG.md](./CHANGELOG.md)
- Server Infrastructure: [ServerInfrastructure.md](./docs/DockerInfra/DockerInfrastructure.md)
- Backend docs: [server/Express/README.md](./server/Express/README.md)
- Frontend docs: [interface/Vue/README.md](./interface/Vue/README.md)
- Test UI (public) docs: [server/Express/public/README.md](./server/Express/public/README.md)

## Quick Start (Docker Compose)

```bash
# from repo root
docker compose up -d --build
# server listens on http://localhost:3080
```

## Local Development

- Backend only:
  ```bash
  cd server/Express
  npm install
  npm run dev
  ```
- Test UI bundle (desktop-only UI under public/):
  ```bash
  cd server/Express/public
  npx tsc -p tsconfig.json
  ```
- Main Vue UI (if present): see `interface/Vue/README.md`.

## Key Features

- Real-time messaging with WebSockets
- OOP server design with service/repo layers
- Message edit / delete with per-user Undo window
- "(edited) (deleted)" badge persistence across reload; delete-undo restores content without the badge

## Contributing

- Open issues and PRs are welcome. Please follow the project structure and TypeScript conventions.

## License

See [LICENSE](./LICENSE).
