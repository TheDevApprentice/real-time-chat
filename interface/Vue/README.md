# Real-Time Chat UI (Vue 3 + TypeScript + Vite)

> **Official user interface for the Real-Time Chat project – built for speed, flexibility, and theming.**

---

## 📚 About This Project

This repository contains the front-end interface for a real-time chat application. It is designed to connect to a Node.js + Socket.IO backend and provide a modern, responsive, and customizable chat experience. The UI is built with **Vue 3**, **TypeScript**, and **Vite** for optimal DX and performance.

## 🛠️ Tech Stack

- **Vue 3** – Progressive JavaScript Framework
- **TypeScript** – Type-safe development
- **Vite** – Lightning-fast build tool
- **Tailwind CSS v4** – Utility-first CSS for layout, placement, and responsive design (inline only)
- **Custom CSS (style.css)** – All theming, color, and dark/light mode via CSS variables and classes
- **socket.io-client** – Real-time WebSocket communication with the backend
- **dotenv / @dotenvx/dotenvx** – Environment variable management

## 🎨 UI & Theming Guidelines

- **Tailwind CSS** is used **exclusively** for structure, layout, and responsive utilities (e.g. flex, grid, spacing, breakpoints). No color or theme management via Tailwind.
- **All colors, themes, and dark/light modes** are handled by custom CSS classes and variables in `src/style.css`.
- You can import CSS from other projects to accelerate theming or maintain design consistency.
- Environment variables are fully customizable for different deployments.

## 🚀 Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```
2. **Start the dev server:**
   ```bash
   npm run dev
   ```
3. **Build for production:**
   ```bash
   npm run build
   ```

## 📁 Main Dependencies (from package.json)

```json
{
  "vue": "^3.x",
  "socket.io-client": "^4.x",
  "tailwindcss": "^4.x",
  "dotenv": "^17.x",
  "@dotenvx/dotenvx": "^1.x"
}
```

## 📝 Project Goals

- Provide a beautiful, responsive, and accessible chat UI
- Allow easy customization and theming for any brand or use-case
- Serve as a reference implementation for other UI frameworks (React, Svelte, etc.)
- Ensure seamless integration with the Node.js real-time chat backend

---

For more details on architecture, usage, or contributing, see the full documentation or open an issue!