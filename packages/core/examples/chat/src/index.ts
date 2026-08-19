import { mkdir, readFile, writeFile } from "node:fs/promises";

import "@automerge/automerge-subduction";
import { Repo } from "@automerge/automerge-repo";
import type { AutomergeUrl, PeerId } from "@automerge/automerge-repo";
import { NodeFSStorageAdapter } from "@automerge/automerge-repo-storage-nodefs";
import {
  initializeAutomergeRepoKeyhive,
  setKeyhiveLogLevel,
} from "@automerge/automerge-repo-keyhive";
import type { SyncServerIdentity } from "@automerge/automerge-repo-keyhive";

import { Zerno } from "zerno-core";
import {
  Service,
  WorkspaceService,
  GroupService,
  PhonebookService,
} from "./service/index.js";
import { render } from "./app.js";

const ZERNO_DIR = process.env.ZERNO_DIR ?? ".zerno";
const ZERNO_STORAGE_DIR = `${ZERNO_DIR}/storage`;
const ZERNO_REPO_STORAGE = `${ZERNO_STORAGE_DIR}/repo`;
const ZERNO_KEYHIVE_STORAGE = `${ZERNO_STORAGE_DIR}/keyhive`;
const ZERNO_WORKSPACE_URL = `${ZERNO_DIR}/workspace-url`;
const ZERNO_PEER_ID = `${ZERNO_DIR}/peer-id`;
// NOTE: This file contains the Subduction server identity and connection endpoints.
// Generate `syncServer` using `pnpm scripts:get-sync-server-selection` with the
// Subduction server's private key when using a custom server.
const SYNC_SERVER_FILE = "./sync-server.json";

const ZERNO_PEER = await (async (): Promise<PeerId> => {
  let peerId: string;
  try {
    peerId = await readFile(ZERNO_PEER_ID, "utf-8");
  } catch (err) {
    peerId = crypto.randomUUID();
    await mkdir(ZERNO_DIR, { recursive: true });
    await writeFile(ZERNO_PEER_ID, peerId, "utf-8");
  }
  return peerId as PeerId;
})();

const { syncServer, subductionWebsocketEndpoints } = await (async () => {
  const content = await readFile(SYNC_SERVER_FILE, "utf-8");
  return JSON.parse(content) as {
    syncServer: SyncServerIdentity;
    subductionWebsocketEndpoints: string[];
  };
})();

const { hive, repo } = await initializeAutomergeRepoKeyhive({
  createRepo: (config) => new Repo(config),
  storage: new NodeFSStorageAdapter(ZERNO_KEYHIVE_STORAGE),
  peerIdSuffix: ZERNO_PEER,
  automaticArchiveIngestion: true,
  cachingMode: "periodic",
  syncServer,
  repo: {
    storage: new NodeFSStorageAdapter(ZERNO_REPO_STORAGE),
    subductionWebsocketEndpoints,
    enableRemoteHeadsGossiping: true,
  },
});

const cacheAutomergeUrl = async (file: string, id: AutomergeUrl) => {
  await mkdir(ZERNO_DIR, { recursive: true });
  await writeFile(file, id, "utf-8");
};
const restoreAutomergeUrl = async (file: string): Promise<AutomergeUrl> => {
  const id = await readFile(file, "utf-8");
  return id as AutomergeUrl;
};

const zerno = new Zerno({ repo, hive });

const phonebooks = new PhonebookService(zerno);
const workspaces = new WorkspaceService(zerno, phonebooks);
const groups = new GroupService(zerno, phonebooks);

// NOTE: For now, we accept that the user can lose the `.zerno/workspace-url` if the file
// containing it is deleted. In the future, we should create a document index.
let workspaceId: AutomergeUrl;
try {
  workspaceId = await restoreAutomergeUrl(ZERNO_WORKSPACE_URL);
} catch {
  const workspace = await workspaces.create();
  workspaceId = workspace.url;
  await cacheAutomergeUrl(ZERNO_WORKSPACE_URL, workspaceId);
}

const service = new Service(zerno, workspaces, groups, phonebooks);

(async () => {
  const { waitUntilExit } = render({ service, workspaceId });
  await waitUntilExit();

  await new Promise((resolve) => setTimeout(resolve, 3000));
  await repo.flush();

  process.exit(0);
})();
