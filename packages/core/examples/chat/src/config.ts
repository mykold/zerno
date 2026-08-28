import { join } from "node:path";

const ZERNO_DIR = process.env.ZERNO_DIR ?? ".zerno";

export const CONFIG = {
  ZERNO: {
    DIR: ZERNO_DIR,

    STORAGE: {
      DIR: join(ZERNO_DIR, "storage"),
      REPO: join(ZERNO_DIR, "storage", "repo"),
      KEYHIVE: join(ZERNO_DIR, "storage", "keyhive"),
    },

    WORKSPACE_URL: join(ZERNO_DIR, "workspace-url"),
    PEER_ID: join(ZERNO_DIR, "peer-id"),
  },

  // NOTE: This file contains the Subduction server identity and connection endpoints.
  // Generate `syncServer` using `pnpm scripts:get-sync-server-selection` with the
  // Subduction server's private key when using a custom server.
  SYNC_SERVER_FILE: "./sync-server.json",
} as const;
