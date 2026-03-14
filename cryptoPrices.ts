/**
 * Live crypto price fetcher — CoinGecko free API
 * Prices are cached for 60 seconds to avoid rate limits.
 * Falls back to conservative static prices if the API is unavailable.
 */

interface CryptoPrices {
  eth: number;
  sol: number;
  bnb: number;
  fetchedAt: number;
}

// Conservative fallback prices (slightly below typical market to avoid under-receiving)
const FALLBACK_PRICES: Omit<CryptoPrices, "fetchedAt"> = {
  eth: 2400,
  sol: 130,
  bnb: 280,
};

const CACHE_TTL_MS = 60_000; // 60 seconds

let cache: CryptoPrices | null = null;

export async function getLiveCryptoPrices(): Promise<Omit<CryptoPrices, "fetchedAt">> {
  const now = Date.now();

  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
    return { eth: cache.eth, sol: cache.sol, bnb: cache.bnb };
  }

  try {
    const url =
      "https://api.coingecko.com/api/v3/simple/price?ids=ethereum,solana,binancecoin&vs_currencies=usd";
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);

    const data = (await res.json()) as {
      ethereum?: { usd?: number };
      solana?: { usd?: number };
      binancecoin?: { usd?: number };
    };

    const eth = data.ethereum?.usd ?? FALLBACK_PRICES.eth;
    const sol = data.solana?.usd ?? FALLBACK_PRICES.sol;
    const bnb = data.binancecoin?.usd ?? FALLBACK_PRICES.bnb;

    cache = { eth, sol, bnb, fetchedAt: now };
    console.log(`[CryptoPrices] Live — ETH:$${eth} SOL:$${sol} BNB:$${bnb}`);
    return { eth, sol, bnb };
  } catch (err) {
    console.warn("[CryptoPrices] API unavailable, using fallback:", err);
    if (cache) return { eth: cache.eth, sol: cache.sol, bnb: cache.bnb };
    return FALLBACK_PRICES;
  }
}

/**
 * Convert USD to crypto amounts.
 * Adds a 0.5% buffer so we never receive less than the USD value.
 */
export async function usdToCrypto(usd: number): Promise<{ eth: number; sol: number; bnb: number }> {
  const prices = await getLiveCryptoPrices();
  const BUFFER = 1.005; // 0.5% buffer
  return {
    eth: parseFloat(((usd / prices.eth) * BUFFER).toFixed(6)),
    sol: parseFloat(((usd / prices.sol) * BUFFER).toFixed(4)),
    bnb: parseFloat(((usd / prices.bnb) * BUFFER).toFixed(5)),
  };
}
