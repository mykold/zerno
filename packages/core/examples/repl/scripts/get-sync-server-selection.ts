import {
  initKeyhiveWasm,
  peerIdFromSigner,
} from "@automerge/automerge-repo-keyhive";
import { hexToUint8Array } from "@automerge/automerge-repo-keyhive/dist/utilities.js";
import { Signer, Keyhive, CiphertextStore } from "@keyhive/keyhive/slim";

const KEYHIVE_SEED = process.env.KEYHIVE_SEED;

(async () => {
  if (!KEYHIVE_SEED) {
    console.log("ERROR: KEYHIVE_SEED is not set");
    return;
  }

  initKeyhiveWasm();

  const seed = hexToUint8Array(KEYHIVE_SEED);
  const signer = Signer.memorySignerFromBytes(seed);

  const peerId = peerIdFromSigner(signer);

  const store = CiphertextStore.newInMemory();
  const keyhive = await Keyhive.init(signer, store, () => {});
  const contactCard = await keyhive.contactCard();

  console.log({
    peerId: peerId,
    contactCardJson: contactCard.toJson(),
  });
})().catch(console.error);
