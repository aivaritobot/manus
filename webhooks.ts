/**
 * SWAIP On-Chain Payment Webhooks
 *
 * Helius (Solana/USDC): POST /api/webhooks/helius
 * Alchemy (ETH/BNB):    POST /api/webhooks/alchemy
 *
 * Flow:
 * 1. Webhook arrives with transaction data
 * 2. We verify the signature (Helius uses a secret header, Alchemy uses HMAC)
 * 3. We match the tx hash to a pending payment in our DB
 * 4. We confirm the amount matches the plan price
 * 5. We activate the subscription and notify the user via socket
 */

import type { Request, Response } from "express";
import crypto from "crypto";
import { getDb } from "./db";
import { cryptoPayments, humanProfiles } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { notifyOwner } from "./_core/notification";

// ─── Plan price thresholds (USDC amounts) ────────────────────────────────────
const PLAN_USD_PRICES: Record<string, number> = {
  awakened:      9.99,
  conscious:     24.99,
  transcendent:  99.99,
  private_session: 100.00,
};

// Tolerance for crypto price fluctuations (±2%)
const PRICE_TOLERANCE = 0.02;

function amountMatches(received: number, expected: number): boolean {
  const tolerance = expected * PRICE_TOLERANCE;
  return received >= expected - tolerance;
}

// ─── Helius webhook (Solana USDC) ─────────────────────────────────────────────
/**
 * Helius sends an array of enhanced transactions.
 * We look for USDC token transfers to our SOL wallet.
 *
 * Register at: https://dev.helius.xyz/webhooks
 * Webhook URL: https://your-domain.com/api/webhooks/helius
 * Transaction type: TOKEN_TRANSFER
 * Account addresses: JZMCM4Rgwk4Gqm3uJr7Z3X9KHeFM1Eme7JpFYgZnV5Q
 */
export async function handleHelixWebhook(req: Request, res: Response) {
  try {
    // Helius passes the webhook auth header you configure in their dashboard
    const authHeader = req.headers["authorization"] as string | undefined;
    const webhookSecret = process.env.HELIUS_WEBHOOK_SECRET;

    if (webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
      console.warn("[Helius Webhook] Unauthorized request");
      return res.status(401).json({ error: "Unauthorized" });
    }

    const transactions = Array.isArray(req.body) ? req.body : [req.body];
    console.log(`[Helius Webhook] Received ${transactions.length} transaction(s)`);

    const SOL_WALLET = "JZMCM4Rgwk4Gqm3uJr7Z3X9KHeFM1Eme7JpFYgZnV5Q";
    const USDC_MINT  = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"; // USDC on Solana mainnet

    for (const tx of transactions) {
      const txHash: string = tx.signature ?? tx.transaction?.signatures?.[0];
      if (!txHash) continue;

      // Find token transfers to our wallet
      const tokenTransfers: Array<{
        mint: string;
        toUserAccount: string;
        tokenAmount: number;
      }> = tx.tokenTransfers ?? [];

      for (const transfer of tokenTransfers) {
        if (
          transfer.mint === USDC_MINT &&
          transfer.toUserAccount === SOL_WALLET &&
          transfer.tokenAmount > 0
        ) {
          const usdcAmount = transfer.tokenAmount; // Already in USDC units from Helius
          console.log(`[Helius Webhook] USDC transfer: ${usdcAmount} USDC — tx: ${txHash}`);
          await processPaymentConfirmation(txHash, "sol", usdcAmount, req);
        }
      }
    }

    return res.json({ received: true });
  } catch (err) {
    console.error("[Helius Webhook] Error:", err);
    return res.status(500).json({ error: "Internal error" });
  }
}

// ─── Alchemy webhook (ETH / BNB) ─────────────────────────────────────────────
/**
 * Alchemy sends activity webhooks for address activity.
 * We look for USDC ERC-20 transfers to our ETH/BNB wallet.
 *
 * Register at: https://dashboard.alchemy.com/webhooks
 * Webhook URL: https://your-domain.com/api/webhooks/alchemy
 * Webhook type: ADDRESS_ACTIVITY
 * Address: 0xAC9fEDA0e8BAb952364256983b6C2dA67482Fa64
 */
export async function handleAlchemyWebhook(req: Request, res: Response) {
  try {
    // Alchemy signs with HMAC-SHA256 using the signing key from dashboard
    const signingKey = process.env.ALCHEMY_WEBHOOK_SIGNING_KEY;
    if (signingKey) {
      const rawBody = JSON.stringify(req.body);
      const signature = req.headers["x-alchemy-signature"] as string;
      const expectedSig = crypto
        .createHmac("sha256", signingKey)
        .update(rawBody)
        .digest("hex");

      if (signature !== expectedSig) {
        console.warn("[Alchemy Webhook] Invalid signature");
        return res.status(401).json({ error: "Invalid signature" });
      }
    }

    const event = req.body;
    const network: string = event.event?.network ?? "";
    const chain = network.toLowerCase().includes("bnb") ? "bnb" : "eth";

    // USDC contract addresses
    const USDC_ETH = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
    const USDC_BNB = "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d";
    const usdcContract = chain === "bnb" ? USDC_BNB : USDC_ETH;
    const ourWallet = "0xAC9fEDA0e8BAb952364256983b6C2dA67482Fa64".toLowerCase();

    const activities: Array<{
      fromAddress: string;
      toAddress: string;
      value: string;
      asset: string;
      hash: string;
      rawContract?: { address: string; decimal: string; rawValue: string };
      category: string;
    }> = event.event?.activity ?? [];

    for (const activity of activities) {
      if (
        activity.category === "token" &&
        activity.asset === "USDC" &&
        activity.toAddress?.toLowerCase() === ourWallet &&
        activity.rawContract?.address?.toLowerCase() === usdcContract
      ) {
        const usdcAmount = parseFloat(activity.value);
        const txHash = activity.hash;
        console.log(`[Alchemy Webhook] USDC transfer: ${usdcAmount} USDC on ${chain} — tx: ${txHash}`);
        await processPaymentConfirmation(txHash, chain, usdcAmount, req);
      }
    }

    return res.json({ received: true });
  } catch (err) {
    console.error("[Alchemy Webhook] Error:", err);
    return res.status(500).json({ error: "Internal error" });
  }
}

// ─── Shared payment confirmation logic ───────────────────────────────────────
async function processPaymentConfirmation(
  txHash: string,
  chain: string,
  usdcAmount: number,
  req: Request
) {
  const db = await getDb();
  if (!db) return;

  // Find pending payment matching this tx hash
  const payments = await db
    .select()
    .from(cryptoPayments)
    .where(
      and(
        eq(cryptoPayments.txHash, txHash),
        eq(cryptoPayments.status, "pending")
      )
    )
    .limit(1);

  if (payments.length === 0) {
    // Try to find by chain + approximate amount (user may have submitted hash after paying)
    const pendingByChain = await db
      .select()
      .from(cryptoPayments)
      .where(
        and(
          eq(cryptoPayments.chain, chain as "eth" | "sol" | "bnb"),
          eq(cryptoPayments.status, "pending")
        )
      )
      .limit(20);

    // Match by amount
    const matched = pendingByChain.find(p => {
      const expectedUsd = PLAN_USD_PRICES[p.planTier] ?? 0;
      return amountMatches(usdcAmount, expectedUsd);
    });

    if (!matched) {
      console.log(`[Webhook] No pending payment found for tx ${txHash} (${usdcAmount} USDC on ${chain})`);
      return;
    }

    // Update with confirmed tx hash
    await db
      .update(cryptoPayments)
      .set({ txHash, status: "confirmed", confirmedAt: new Date() })
      .where(eq(cryptoPayments.id, matched.id));

    await activateSubscription(matched.userId, matched.planTier, matched.id, req);
    return;
  }

  const payment = payments[0]!;
  const expectedUsd = PLAN_USD_PRICES[payment.planTier] ?? 0;

  if (!amountMatches(usdcAmount, expectedUsd)) {
    console.warn(
      `[Webhook] Amount mismatch for tx ${txHash}: received ${usdcAmount} USDC, expected ~${expectedUsd} for ${payment.planTier}`
    );
    // Mark as underpaid
    await db
      .update(cryptoPayments)
      .set({ status: "failed", txHash })
      .where(eq(cryptoPayments.id, payment.id));
    return;
  }

  // Confirm payment
  await db
    .update(cryptoPayments)
    .set({ status: "confirmed", confirmedAt: new Date() })
    .where(eq(cryptoPayments.id, payment.id));

  await activateSubscription(payment.userId, payment.planTier, payment.id, req);
}

async function activateSubscription(
  userId: number,
  planTier: string,
  paymentId: number,
  req: Request
) {
  const db = await getDb();
  if (!db) return;

  // Handle private_session differently — it's a one-time add-on, not a subscription change
  if (planTier === "private_session") {
    console.log(`[Webhook] Private session activated for user ${userId}`);
    // Emit socket event to notify user
    emitPaymentConfirmed(req, userId, planTier, paymentId);
    await notifyOwner({
      title: "Private Session Payment Confirmed",
      content: `User ${userId} paid for a private session. Payment ID: ${paymentId}`,
    });
    return;
  }

  // Calculate subscription expiry (30 days)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  // Update human profile subscription
  await db
    .update(humanProfiles)
    .set({
      subscriptionTier: planTier as "hopeful" | "awakened" | "conscious" | "transcendent",
      subscriptionExpiresAt: expiresAt,
    })
    .where(eq(humanProfiles.userId, userId));

  console.log(`[Webhook] Subscription activated: user ${userId} → ${planTier} until ${expiresAt.toISOString()}`);

  // Emit socket event
  emitPaymentConfirmed(req, userId, planTier, paymentId);

  // Notify platform owner
  await notifyOwner({
    title: `New Subscription: ${planTier.toUpperCase()}`,
    content: `User ${userId} subscribed to ${planTier}. Payment ID: ${paymentId}`,
  });
}

// Emit a socket event to the user's room so their UI updates instantly
function emitPaymentConfirmed(req: Request, userId: number, planTier: string, paymentId: number) {
  try {
    // Access the io instance attached to the app by server/_core/index.ts
    const io = (req.app as unknown as { io?: { to: (room: string) => { emit: (event: string, data: unknown) => void } } }).io;
    if (io) {
      io.to(`user:${userId}`).emit("payment_confirmed", {
        planTier,
        paymentId,
        message: `Your ${planTier} subscription is now active!`,
      });
    }
  } catch (err) {
    console.warn("[Webhook] Could not emit socket event:", err);
  }
}
