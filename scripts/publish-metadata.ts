/**
 * Publishes playground registry metadata from package.json fields.
 *
 * Reads playground:* fields, uploads icon + metadata JSON to Bulletin,
 * and calls registry.publish() on-chain.
 *
 * Usage: tsx scripts/publish-metadata.ts <domain.dot>
 * Env:   MNEMONIC — sr25519 mnemonic for signing
 */

import { existsSync, readFileSync } from "fs";
import { execSync } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { getChainAPI } from "@polkadot-apps/chain-client";
import { ContractManager } from "@polkadot-apps/contracts";
import { seedToAccount } from "@polkadot-apps/keys";
import { computeCid, BulletinClient, type BatchUploadItem } from "@polkadot-apps/bulletin";
import cdmJson from "../cdm.json";
import pkg from "../package.json";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// ---------------------------------------------------------------------------
// Args & env
// ---------------------------------------------------------------------------

const domain = process.argv[2];
if (!domain) {
  console.error("Usage: tsx scripts/publish-metadata.ts <domain.dot>");
  process.exit(1);
}

const mnemonic = process.env.MNEMONIC;
if (!mnemonic) {
  console.error("MNEMONIC env var required");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Signer (same derivation as bulletin-deploy)
// ---------------------------------------------------------------------------

const { signer, ss58Address: origin } = seedToAccount(mnemonic, "");

// ---------------------------------------------------------------------------
// Metadata from package.json
// ---------------------------------------------------------------------------

const description = (pkg as Record<string, unknown>)["playground:description"] as string | undefined;
const tag = (pkg as Record<string, unknown>)["playground:tag"] as string | undefined;
const iconPath = (pkg as Record<string, unknown>)["playground:icon"] as string | undefined;

function gitRemoteUrl(): string | undefined {
  try {
    const raw = execSync("git remote get-url origin", { encoding: "utf-8", stdio: "pipe" }).trim();
    return raw.startsWith("git@")
      ? raw.replace(/^git@([^:]+):/, "https://$1/").replace(/\.git$/, "")
      : raw.replace(/\.git$/, "");
  } catch {
    return undefined;
  }
}

// Build upload items
const items: BatchUploadItem[] = [];
let iconCid: string | undefined;
if (iconPath) {
  const abs = resolve(root, iconPath);
  if (existsSync(abs)) {
    const iconBytes = new Uint8Array(readFileSync(abs));
    iconCid = computeCid(iconBytes);
    items.push({ data: iconBytes, label: "icon" });
    console.log(`Icon: ${abs} -> ${iconCid}`);
  } else {
    console.warn(`Icon not found at ${abs}, skipping`);
  }
}

const readmePath = resolve(root, "README.md");
const readme = existsSync(readmePath) ? readFileSync(readmePath, "utf-8") : undefined;
if (readme) console.log(`Readme: ${readmePath} (${readme.length} chars)`);

const metadata = {
  ...(pkg.name && { name: pkg.name }),
  ...(description && { description }),
  ...(gitRemoteUrl() && { repository: gitRemoteUrl() }),
  ...(iconCid && { icon_cid: iconCid }),
  ...(tag && { tag }),
  ...(readme && { readme }),
};

const metadataBytes = new TextEncoder().encode(JSON.stringify(metadata));
const metadataCid = computeCid(metadataBytes);
items.push({ data: metadataBytes, label: "metadata" });

console.log("Metadata:", JSON.stringify(metadata, null, 2));
console.log("CID:", metadataCid);

// ---------------------------------------------------------------------------
// Upload to Bulletin
// ---------------------------------------------------------------------------

console.log("Uploading to Bulletin...");
const client = await BulletinClient.create("paseo");
const results = await client.batchUpload(items, signer);
const failed = results.filter(r => !r.success);
if (failed.length) {
  console.error("Upload failures:", failed.map(f => `${f.label}: ${"error" in f ? f.error : "unknown"}`));
  process.exit(1);
}
console.log("Upload complete");

// ---------------------------------------------------------------------------
// Publish to registry
// ---------------------------------------------------------------------------

const api = await getChainAPI("paseo");
const manager = new ContractManager(cdmJson as any, api.contracts, {
  defaultSigner: signer,
  defaultOrigin: origin,
});

try {
  const registry = manager.getContract("@example/playground-registry");
  console.log(`Publishing ${domain} as ${origin}...`);
  const result = await registry.publish.tx(domain, metadataCid);
  if (!result.ok) throw new Error("Registry publish transaction failed");
  console.log(`Tx: ${result.txHash}`);
  console.log(`Published ${domain}!`);
} finally {
  api.destroy();
  process.exit(0);
}
