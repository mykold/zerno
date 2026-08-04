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
  ContactCard,
  initializeAutomergeRepoKeyhive,
} from "@automerge/automerge-repo-keyhive";

import { KeyhiveAccess, Zerno } from "zerno-core";
import { colorize, colors } from "./colorize.js";

const ZERNO_DIR = process.env.ZERNO_DIR ?? ".zerno";
const ZERNO_STORAGE = `${ZERNO_DIR}/storage`;
const ZERNO_DOCUMENT_URL = `${ZERNO_DIR}/document-url`;
const ZERNO_PEER_ID = `${ZERNO_DIR}/peer-id`;

const storage = new NodeFSStorageAdapter(ZERNO_STORAGE);

async function getPeerId(): Promise<PeerId> {
  let peerId: string;
  try {
    peerId = await readFile(ZERNO_PEER_ID, { encoding: "utf-8" });
  } catch (err) {
    peerId = crypto.randomUUID();
    await mkdir(ZERNO_DIR, { recursive: true });
    await writeFile(ZERNO_PEER_ID, peerId, { encoding: "utf-8" });
  }
  return peerId as PeerId;
}
const ZERNO_PEER = await getPeerId();

async function getDocument(zd: ZernoDocument) {
  let url: string;
  try {
    url = await readFile(ZERNO_DOCUMENT_URL, { encoding: "utf-8" });
  } catch (err) {
    const document = await zerno.documents.create<ZernoDocument>(zd);
    await mkdir(ZERNO_DIR, { recursive: true });
    await writeFile(ZERNO_DOCUMENT_URL, document.url, { encoding: "utf-8" });
    return document;
  }
  return await zerno.documents.find<ZernoDocument>(url as AutomergeUrl);
}

const { hive, repo } = await initializeAutomergeRepoKeyhive({
  createRepo: (config) => new Repo(config),
  storage,
  peerIdSuffix: ZERNO_PEER,
  automaticArchiveIngestion: true,
  cachingMode: "periodic",
  // NOTE: `syncServer` is generated using `pnpm scripts:get-sync-server-selection`
  //       by providing the private key file of the Subduction server.
  syncServer: {
    peerId: "nbBpOd+ZNw4HpNXh0qSPToA9QOyqlrTHlCQ3xghjl9s=" as PeerId,
    contactCardJson:
      '{"Rotate":{"payload":{"old":[164,141,139,96,3,171,244,103,27,111,227,70,11,197,163,130,230,110,151,210,88,85,207,151,83,144,160,157,12,241,93,91],"new":[55,127,37,222,203,102,93,149,229,122,146,44,122,115,85,46,111,66,83,236,135,36,181,220,27,164,92,242,121,233,142,125]},"issuer":[157,176,105,57,223,153,55,14,7,164,213,225,210,164,143,78,128,61,64,236,170,150,180,199,148,36,55,198,8,99,151,219],"signature":[19,14,65,99,240,65,107,161,118,109,246,230,83,1,7,192,237,5,157,217,8,105,189,100,192,181,96,13,255,44,239,199,81,197,17,173,22,215,15,131,95,64,182,79,232,48,243,86,250,226,150,87,16,104,3,160,75,85,78,60,58,53,106,12]}}',
  },
  repo: {
    storage,
    subductionWebsocketEndpoints: ["ws://194.61.52.50:8944"],
  },
});

const zerno = new Zerno({ repo, hive });

interface ZernoDocument {
  title: string;
}

function encodeContactCard(contactCard: ContactCard): string {
  return Buffer.from(contactCard.toJson(), "utf8").toString("base64");
}

function decodeContactCard(encoded: string): ContactCard {
  return ContactCard.fromJson(Buffer.from(encoded, "base64").toString("utf8"));
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
        switch (args[1]) {
          default: {
            console.log(
              colorize({
                id: me.id,
                peerId: me.peerId,
                contactCard: encodeContactCard(me.contactCard),
              }),
            );
            break;
          }
          case "id": {
            console.log(colorize(me.id));
            break;
          }
          case "peer-id": {
            console.log(colorize(me.peerId));
            break;
          }
          case "contact-card": {
            console.log(encodeContactCard(me.contactCard));
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
            members.forEach((member, i) => {
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

              await writeFile(ZERNO_DOCUMENT_URL, url, { encoding: "utf-8" });
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
            const access = KeyhiveAccess.tryFromString(args[2]);
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
                document: handle.url,
                contactCard: decodedContactCard,
                access: access,
              });
            } catch (err) {
              const message = (err as Error).message;
              console.log(colorize(`ERROR: ${message}`));
              break;
            }

            // TODO: `${decodedContactCard.id}` returns '[object Object]'
            console.log(
              colorize(
                `INFO: Access granted to user '${decodedContactCard.id}'`,
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
