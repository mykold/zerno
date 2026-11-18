// NOTE: Contains the Subduction server identity and connection endpoints.
// Generate and paste `syncServer` using `pnpm scripts:get-sync-server-selection` with the

import type { PeerId } from "@automerge/automerge-repo"
import type { SyncServerIdentity } from "@automerge/automerge-repo-keyhive"
import { hexToUint8Array } from "@automerge/automerge-repo-keyhive/dist/utilities.js"

// Subduction server's private key when using a custom server.
export const SYNC_SERVER = {
  syncServer: {
    peerId: "9oSVb+XUi65JmXgrTZuxiD1YTf/VLOUgFpxKWNgt5mI=" as PeerId,
    contactCard: hexToUint8Array(
      "4b485400f684956fe5d48bae4999782b4d9bb1883d584dffd52ce520169c4a58d82de6624085e28f3fdf7fbe1d3a1d58de38d7b0f2dd480033091333b3e704ee9010522b3ca8ca6f3c9f2ce8ce70a75747bc0cc74b50b2d2473ab24143ebda04aa4f0c6f394eeb95ebf2768d69250d136059ec91521dd1fb49ad8a6dd2a5254a6386d95bf3f1cf885b14a664219dc146f8fa946c9f57d387aa03c455ab8dbc73d68bc6cc09",
    ),
  } satisfies SyncServerIdentity,
  subductionWebsocketEndpoints: ["wss://subduction.mykold.xyz"],
}
