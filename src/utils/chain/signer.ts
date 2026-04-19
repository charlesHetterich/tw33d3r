import { useEffect, useState } from "react";
import { SignerManager, type SignerState } from "@polkadot-apps/signer";

/**
 * Shared `SignerManager` — one per app. `dappName` surfaces in host wallet
 * prompts when the user is asked to authorize a transaction.
 */
export const signerManager = new SignerManager({ dappName: "tw33d3r" });

/** React hook that subscribes to the signer's state (account + connection status). */
export function useSigner(): SignerState {
  const [state, setState] = useState<SignerState>(signerManager.getState());
  useEffect(() => signerManager.subscribe(setState), []);
  return state;
}

/**
 * Convenience: the currently-selected account, or `undefined` if not connected.
 * Useful when a component only cares about "is there an account I can transact as?".
 */
export function useAccount() {
  return useSigner().selectedAccount;
}
