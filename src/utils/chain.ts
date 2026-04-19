import { useState, useEffect } from "react";
import { getChainAPI } from "@polkadot-apps/chain-client";
import { ContractManager } from "@polkadot-apps/contracts";
import { BulletinClient, getGateway } from "@polkadot-apps/bulletin";
import { SignerManager, type SignerState } from "@polkadot-apps/signer";
import cdmJson from "../../cdm.json";

export const PAGE = 20;
export const MAX_LEN = 280;
export const gateway = getGateway("paseo");

// --- Signer -----------------------------------------------------------------

export const signerManager = new SignerManager({ dappName: "tw33d3r" });

export function useSignerState(): SignerState {
  const [state, setState] = useState<SignerState>(signerManager.getState());
  useEffect(() => signerManager.subscribe(setState), []);
  return state;
}

// --- Contract (lazy singleton, starts connecting on module load) ------------

export const postsReady = getChainAPI("paseo").then(async api => {
  const manager = await ContractManager.fromClient(cdmJson as any, api.raw.assetHub, {
    signerManager,
  });
  return manager.getContract("@example/tw33d3r-posts");
});

// --- Bulletin client (lazy singleton) ---------------------------------------

let _bulletinClient: BulletinClient | null = null;
export async function getBulletinClient() {
  if (!_bulletinClient) _bulletinClient = await BulletinClient.create("paseo");
  return _bulletinClient;
}
