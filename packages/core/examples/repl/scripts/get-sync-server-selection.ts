import {
  initKeyhiveWasm,
  peerIdFromSigner,
} from "@automerge/automerge-repo-keyhive";
import { Signer, Keyhive, CiphertextStore } from "@keyhive/keyhive/slim";

const KEYHIVE_SEED = process.env.KEYHIVE_SEED;

function hexToUint8Array(hex: string): Uint8Array {
  const clean = hex.trim().replace(/^0x/i, "");
  const out = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

(async () => {
  if (!KEYHIVE_SEED) {
    console.log("ERROR: KEYHIVE_SEED is not set");
    return;
  }

  // await initKeyhiveWasm();
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
