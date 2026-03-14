/**
 * On-chain payment verifier for SWAIP
 * Supports: Solana (USDC via Helius RPC), Ethereum (ETH/USDC via Alchemy), BNB Chain
 * Strategy: polling-based verification — no external webhook setup required.
 */

import axios from "axios";

// ─── Wallet addresses ──────────────────────────────────────────────────────────
export const WALLETS = {
  sol: "3PDBkNUhxrZhzvQNM1v47NfxoeJzX1ZAKmDh5LMs61vH",
  eth: "0xAC9fEDA0e8BAb952364256983b6C2dA67482Fa64",
  bnb: "0xAC9fEDA0e8BAb952364256983b6C2dA67482Fa64",
};

// USDC contract addresses
const USDC_ETH  = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const USDC_BNB  = "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d"; // BSC USDC
const USDC_SOL  = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"; // SPL USDC mint

// RPC endpoints — use public fallbacks if no API keys provided
const HELIUS_RPC = process.env.HELIUS_RPC_URL ?? "https://api.mainnet-beta.solana.com";
const ALCHEMY_ETH = process.env.ALCHEMY_ETH_URL ?? "https://eth-mainnet.g.alchemy.com/v2/demo";
const ALCHEMY_BNB = process.env.ALCHEMY_BNB_URL ?? "https://bnb-mainnet.g.alchemy.com/v2/demo";

// ─── Types ─────────────────────────────────────────────────────────────────────
export type Chain = "sol" | "eth" | "bnb";

export interface VerifyResult {
  verified: boolean;
  amount?: number;      // USD-equivalent amount transferred
  tokenSymbol?: string; // "ETH", "USDC", "BNB", "SOL"
  error?: string;
}

// ─── Solana verifier ───────────────────────────────────────────────────────────
/**
 * Verifies a Solana transaction hash.
 * Checks that:
 *  1. The transaction is confirmed (finalized).
 *  2. The destination account is our SOL wallet.
 *  3. The amount transferred matches the expected USD amount (±5% tolerance).
 *
 * Accepts both native SOL transfers and SPL USDC token transfers.
 */
export async function verifySolTransaction(
  txHash: string,
  expectedUsd: number,
  solPriceUsd: number = 150 // fallback SOL price; ideally pass live price
): Promise<VerifyResult> {
  try {
    const body = {
      jsonrpc: "2.0",
      id: 1,
      method: "getTransaction",
      params: [txHash, { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 }],
    };
    const { data } = await axios.post(HELIUS_RPC, body, { timeout: 10_000 });
    const tx = data?.result;
    if (!tx) return { verified: false, error: "Transaction not found or not yet finalized" };

    const meta = tx.meta;
    if (meta?.err) return { verified: false, error: "Transaction failed on-chain" };

    // Check SPL token transfer (USDC)
    const tokenBalances: any[] = meta?.postTokenBalances ?? [];
    for (const bal of tokenBalances) {
      if (bal.mint === USDC_SOL && bal.owner === WALLETS.sol) {
        const preBal = meta?.preTokenBalances?.find((b: any) => b.accountIndex === bal.accountIndex);
        const preAmt = parseFloat(preBal?.uiTokenAmount?.uiAmountString ?? "0");
        const postAmt = parseFloat(bal.uiTokenAmount?.uiAmountString ?? "0");
        const received = postAmt - preAmt;
        if (received >= expectedUsd * 0.95) {
          return { verified: true, amount: received, tokenSymbol: "USDC" };
        }
      }
    }

    // Check native SOL transfer
    const accounts: string[] = tx.transaction?.message?.accountKeys?.map((k: any) =>
      typeof k === "string" ? k : k.pubkey
    ) ?? [];
    const destIdx = accounts.indexOf(WALLETS.sol);
    if (destIdx >= 0) {
      const preLamports: number[] = meta?.preBalances ?? [];
      const postLamports: number[] = meta?.postBalances ?? [];
      const receivedLamports = (postLamports[destIdx] ?? 0) - (preLamports[destIdx] ?? 0);
      const receivedSol = receivedLamports / 1e9;
      const receivedUsd = receivedSol * solPriceUsd;
      if (receivedUsd >= expectedUsd * 0.95) {
        return { verified: true, amount: receivedUsd, tokenSymbol: "SOL" };
      }
    }

    return { verified: false, error: "Amount insufficient or destination mismatch" };
  } catch (e: any) {
    return { verified: false, error: e?.message ?? "RPC error" };
  }
}

// ─── EVM verifier (ETH & BNB) ──────────────────────────────────────────────────
/**
 * Verifies an EVM transaction (Ethereum or BNB Chain).
 * Checks native ETH/BNB transfers and ERC-20 USDC transfers.
 */
export async function verifyEvmTransaction(
  txHash: string,
  chain: "eth" | "bnb",
  expectedUsd: number,
  nativePriceUsd: number = chain === "eth" ? 3000 : 300
): Promise<VerifyResult> {
  const rpc = chain === "eth" ? ALCHEMY_ETH : ALCHEMY_BNB;
  const usdcContract = chain === "eth" ? USDC_ETH : USDC_BNB;
  const destWallet = WALLETS[chain].toLowerCase();

  try {
    // Fetch transaction receipt
    const receiptRes = await axios.post(rpc, {
      jsonrpc: "2.0", id: 1, method: "eth_getTransactionReceipt", params: [txHash],
    }, { timeout: 10_000 });
    const receipt = receiptRes.data?.result;
    if (!receipt) return { verified: false, error: "Transaction not found or pending" };
    if (receipt.status !== "0x1") return { verified: false, error: "Transaction reverted" };

    // Fetch transaction details
    const txRes = await axios.post(rpc, {
      jsonrpc: "2.0", id: 2, method: "eth_getTransactionByHash", params: [txHash],
    }, { timeout: 10_000 });
    const tx = txRes.data?.result;
    if (!tx) return { verified: false, error: "Transaction details not found" };

    // Check native ETH/BNB transfer
    if (tx.to?.toLowerCase() === destWallet) {
      const weiValue = BigInt(tx.value ?? "0x0");
      const nativeAmount = Number(weiValue) / 1e18;
      const usdValue = nativeAmount * nativePriceUsd;
      if (usdValue >= expectedUsd * 0.95) {
        return { verified: true, amount: usdValue, tokenSymbol: chain === "eth" ? "ETH" : "BNB" };
      }
    }

    // Check ERC-20 USDC Transfer event
    // Transfer(address indexed from, address indexed to, uint256 value)
    // topic[0] = keccak256("Transfer(address,address,uint256)")
    const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
    const logs: any[] = receipt.logs ?? [];
    for (const log of logs) {
      if (
        log.address?.toLowerCase() === usdcContract.toLowerCase() &&
        log.topics?.[0] === TRANSFER_TOPIC &&
        log.topics?.[2]?.toLowerCase().endsWith(destWallet.slice(2).toLowerCase())
      ) {
        const rawValue = BigInt(log.data ?? "0x0");
        const usdcDecimals = 6;
        const usdcAmount = Number(rawValue) / 10 ** usdcDecimals;
        if (usdcAmount >= expectedUsd * 0.95) {
          return { verified: true, amount: usdcAmount, tokenSymbol: "USDC" };
        }
      }
    }

    return { verified: false, error: "Amount insufficient or destination mismatch" };
  } catch (e: any) {
    return { verified: false, error: e?.message ?? "RPC error" };
  }
}

// ─── Unified verifier ──────────────────────────────────────────────────────────
export async function verifyPayment(
  txHash: string,
  chain: Chain,
  expectedUsd: number
): Promise<VerifyResult> {
  if (chain === "sol") {
    return verifySolTransaction(txHash, expectedUsd);
  }
  return verifyEvmTransaction(txHash, chain, expectedUsd);
}
