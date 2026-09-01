import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // @automerge/automerge resolves to fullfat_bundler.js under the "browser"
    // condition, which requires sync wasm ESM imports that Vite's dep
    // pre-bundler cannot provide. The "webpack" condition picks the
    // base64-inline entrypoint instead, which automerge ships for exactly
    // this case. See HACKING.md in the automerge repo.
    conditions: ["webpack"],
    alias: [
      {
        find: "@",
        replacement: path.resolve(import.meta.dirname, "./src"),
      },
      // Shim the Node "ws" package: @automerge/react re-exports the (unused
      // in the browser) WebSocketServerAdapter, which imports "ws" statically.
      // See src/shims/ws.ts. Same approach as the keyhive-todo-app-demo.
      {
        find: "ws",
        replacement: path.resolve(import.meta.dirname, "./src/shims/ws.ts"),
      },
    ],
  },
})
