// NOTE: Contains the Subduction server identity and connection endpoints.
// Generate and paste `syncServer` using `pnpm scripts:get-sync-server-selection` with the

import type { SyncServerIdentity } from "@automerge/automerge-repo-keyhive"

// Subduction server's private key when using a custom server.
export const SYNC_SERVER = {
  syncServer: {
    peerId: "SsKY06xiOOAQtQDwBJ+Zhw72xv5p3WKf4AWGeUu1ADs=",
    contactCardJson:
      '{"Rotate":{"payload":{"old":[53,13,136,197,215,151,15,141,65,11,187,113,107,250,59,203,101,72,223,208,165,86,109,126,52,216,227,233,180,14,194,35],"new":[241,194,169,72,38,195,185,240,205,119,123,113,4,231,51,205,230,217,0,104,48,190,10,125,145,177,168,82,10,129,23,83]},"issuer":[74,194,152,211,172,98,56,224,16,181,0,240,4,159,153,135,14,246,198,254,105,221,98,159,224,5,134,121,75,181,0,59],"signature":[219,176,80,37,128,141,25,244,232,245,137,141,195,35,192,25,108,155,240,155,221,78,109,108,82,207,47,80,143,252,3,28,249,134,171,140,109,210,63,167,135,150,218,96,184,19,126,67,56,9,145,233,44,1,83,204,213,166,140,70,143,82,244,1]}}',
  } as SyncServerIdentity,
  subductionWebsocketEndpoints: ["ws://194.61.52.50:8944"],
}
