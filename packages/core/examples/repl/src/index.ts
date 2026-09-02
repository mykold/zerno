import { mkdir, readFile, writeFile } from "node:fs/promises";
import readline from "node:readline";

import "@automerge/automerge-subduction";
import { isValidAutomergeUrl, Repo } from "@automerge/automerge-repo";
import type {
  AutomergeUrl,
  DocHandle,
  PeerId,
} from "@automerge/automerge-repo";
import { NodeFSStorageAdapter } from "@automerge/automerge-repo-storage-nodefs";
import {
  initializeAutomergeRepoKeyhive,
  uint8ArrayToHex,
} from "@automerge/automerge-repo-keyhive";
import type { SyncServerSelection } from "@automerge/automerge-repo-keyhive";
import {
  encodeContactCard,
  decodeContactCard,
  Access,
  Zerno,
} from "zerno-core";

import { colorize, colors } from "./colorize.js";

const ZERNO_DIR = process.env.ZERNO_DIR ?? ".zerno";
const ZERNO_STORAGE = `${ZERNO_DIR}/storage`;
const ZERNO_DOCUMENT_URL = `${ZERNO_DIR}/document-url`;
const ZERNO_PEER_ID = `${ZERNO_DIR}/peer-id`;
// NOTE: This file contains the Subduction server identity and connection endpoints.
// Generate `syncServer` using `pnpm scripts:get-sync-server-selection > sync-server.json` with the
// Subduction server's private key when using a custom server.
const SYNC_SERVER_FILE = "./sync-server.json";

const storage = new NodeFSStorageAdapter(ZERNO_STORAGE);

async function getPeerId(): Promise<PeerId> {
  let peerId: string;
  try {
    peerId = await readFile(ZERNO_PEER_ID, "utf-8");
  } catch (err) {
    peerId = crypto.randomUUID();
    await mkdir(ZERNO_DIR, { recursive: true });
    await writeFile(ZERNO_PEER_ID, peerId, "utf-8");
  }
  return peerId as PeerId;
}
const ZERNO_PEER = await getPeerId();

async function getDocument(
  zd: ZernoDocument,
): Promise<DocHandle<ZernoDocument>> {
  let id: string;
  try {
    id = await readFile(ZERNO_DOCUMENT_URL, "utf-8");
  } catch (err) {
    const document = await zerno.documents.create<ZernoDocument>(zd);
    await mkdir(ZERNO_DIR, { recursive: true });
    await writeFile(ZERNO_DOCUMENT_URL, document.url, "utf-8");
    return document;
  }
  return await zerno.documents.find<ZernoDocument>(id as AutomergeUrl);
}

const { syncServer, subductionWebsocketEndpoints } = await (async () => {
  const content = await readFile(SYNC_SERVER_FILE, "utf-8");
  return JSON.parse(content) as {
    syncServer: SyncServerSelection;
    subductionWebsocketEndpoints: string[];
  };
})();

const { hive, repo } = await initializeAutomergeRepoKeyhive({
  createRepo: (config) => new Repo(config),
  storage,
  peerIdSuffix: ZERNO_PEER,
  automaticArchiveIngestion: true,
  cachingMode: "periodic",
  syncServer,
  repo: {
    storage,
    subductionWebsocketEndpoints,
    enableRemoteHeadsGossiping: true,
  },
});

const zerno = new Zerno({ repo, hive });

interface ZernoDocument {
  title: string;
}

(async () => {
  let handle: DocHandle<ZernoDocument>;
  try {
    handle = await getDocument({
      title: "Conquer the world!",
    });
  } catch (err) {
    const message = (err as Error).message;
    console.log(colorize(`ERROR: ${message}`));
    process.exit(1);
  }

  const stdin = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "zerno> ",
  });
  const prompt = () => {
    const message = `[${new Date().toLocaleTimeString()}] zerno> `;
    stdin.setPrompt(colors.yellow(message));
    stdin.prompt();
  };
  prompt();

  stdin.on("line", async (line) => {
    const args = line.trim().split(/\s+/);

    switch (args[0]) {
      case "exit": {
        stdin.close();
        return;
      }
      case "clear": {
        process.stdout.write("\u001b[2J\u001b[0;0H");
        break;
      }
      case "me": {
        const me = zerno.identity.me();
        const id = uint8ArrayToHex(me.id.toBytes());
        const contactCard = encodeContactCard(me.contactCard);
        switch (args[1]) {
          default: {
            console.log(colorize({ id, ZERNO_PEER, contactCard }));
            break;
          }
          case "id": {
            console.log(colorize(id));
            break;
          }
          case "peer-id": {
            console.log(colorize(ZERNO_PEER));
            break;
          }
          case "contact-card": {
            console.log(contactCard);
            break;
          }
        }
        break;
      }
      case "doc": {
        switch (args[1]) {
          default: /* doc */ {
            console.log(colorize(handle.url));
            break;
          }
          case "title": {
            switch (args[2]) {
              default: /* title */ {
                const zd = handle.doc();
                console.log(colorize(zd.title));
                break;
              }
              case "set": {
                const value = args.slice(3).join(" ");
                if (!value) {
                  console.log(colorize("ERROR: no value was provided"));
                  console.log(
                    colorize("ERROR:   doc title set <value: string>"),
                  );
                  break;
                }
                handle.change((d) => {
                  d.title = value;
                });
                console.log(colorize("INFO: +"));
                break;
              }
            }
            break;
          }
          case "members": {
            const members = await zerno.access.members(handle.url);
            members.forEach((member) => {
              console.log(
                colorize({
                  id: member.id,
                  access: member.access.toString(),
                  isSelf: member.isSelf,
                  isPublic: member.isPublic,
                  isSyncServer: member.isSyncServer,
                }),
              );
            });
            break;
          }
          case "open": {
            const url = args[2];
            if (!isValidAutomergeUrl(url)) {
              console.log(colorize("ERROR: url is not a valid automerge url"));
              return;
            }
            try {
              console.log(colorize("INFO: opening document..."));

              const signal = AbortSignal.timeout(10_000 /* ms */);
              await zerno.documents.find<ZernoDocument>(url, {
                signal,
              });

              await writeFile(ZERNO_DOCUMENT_URL, url, "utf-8");
              console.log(colorize(`INFO: document url successfully updated`));
              console.log(
                colorize(`INFO: restart the program to apply this change`),
              );

              stdin.close();
            } catch (err) {
              // repo.removeFromCache(id); // TODO: Remove from cache
              const message = (err as Error).message;
              console.log(colorize(`ERROR: ${message}`));
              break;
            }
            break;
          }
          case "grant": {
            const access = Access.tryFromString(args[2]);
            if (!access) {
              console.log(colorize("ERROR: invalid access"));
              console.log(
                colorize("ERROR:  choose one: relay | read | edit | admin"),
              );
              break;
            }

            const contactCard = args[3];
            if (!contactCard) {
              console.log(colorize("ERROR: contact card is not provided"));
              break;
            }
            const decodedContactCard = decodeContactCard(contactCard);

            try {
              await zerno.access.grant({
                id: handle.url,
                member: decodedContactCard,
                access: access,
              });
            } catch (err) {
              const message = (err as Error).message;
              console.log(colorize(`ERROR: ${message}`));
              break;
            }

            console.log(
              colorize(
                `INFO: Access granted to user '${uint8ArrayToHex(
                  decodedContactCard.id.toBytes(),
                )}'`,
              ),
            );
            break;
          }
        }
        break;
      }
      default: /* unknown */ {
        console.log(colorize("ERROR: unknown command"));
        console.log(colorize("ERROR:  exit"));
        console.log(colorize("ERROR:  clear"));
        console.log(colorize("ERROR:  me"));
        console.log(colorize("ERROR:  me id"));
        console.log(colorize("ERROR:  me peer-id"));
        console.log(colorize("ERROR:  me contact-card"));
        console.log(colorize("ERROR:  doc"));
        console.log(colorize("ERROR:  doc title"));
        console.log(colorize("ERROR:  doc title set <value: string>"));
        console.log(colorize("ERROR:  doc open <url: automerge-url>"));
        console.log(colorize("ERROR:  doc members"));
        console.log(
          colorize(
            "ERROR:  doc grant <access: relay | read | edit | admin> <contact-card>",
          ),
        );
        break;
      }
    }

    prompt();
  });

  stdin.on("close", async () => {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    await repo.flush();

    process.exit(0);
  });
})();
