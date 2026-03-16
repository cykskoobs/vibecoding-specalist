const PRIMARY_RPC = process.env.SOLANA_RPC_URL || process.env.VITE_SOLANA_RPC || "";
const RPC_URLS = [
  PRIMARY_RPC,
  "https://api.mainnet-beta.solana.com",
  "https://solana.public-rpc.com",
  "https://solana-rpc.publicnode.com",
  "https://rpc.ankr.com/solana"
].filter((url, index, all) => Boolean(url) && all.indexOf(url) === index);

type ScanAccount = {
  address: string;
  mint: string;
  lamports: number;
  programId: string;
  amountRaw: string;
  uiAmount: number;
  uiAmountString: string;
  decimals: number;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function callRpcWithRetry(payload: unknown) {
  let lastError: unknown = null;

  for (const endpoint of RPC_URLS) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const upstream = await fetch(endpoint, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload)
        });

        const raw = await upstream.text();
        const json = JSON.parse(raw);

        if (!upstream.ok || json?.error) {
          throw new Error(json?.error?.message ?? `rpc-http-${upstream.status}`);
        }

        return json;
      } catch (error) {
        lastError = error;
        await sleep(250 * (attempt + 1));
      }
    }
  }

  throw lastError ?? new Error("RPC retries exhausted");
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body ?? {};
    const owner = String(body.owner ?? "").trim();
    if (!owner) {
      return res.status(400).json({ error: "Missing owner address" });
    }

    const payload = {
      jsonrpc: "2.0",
      id: Date.now(),
      method: "getTokenAccountsByOwner",
      params: [owner, { programId: "" }, { encoding: "jsonParsed", commitment: "confirmed" }]
    };

    const programIds = [
      "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
      "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
    ];

    const discovered: ScanAccount[] = [];
    const nonEmptyAccounts: ScanAccount[] = [];

    for (const programId of programIds) {
      payload.params[1] = { programId };
      const json = await callRpcWithRetry(payload);

      const items = (json?.result?.value ?? []) as any[];
      for (const tokenAccount of items) {
        const parsedInfo = tokenAccount?.account?.data?.parsed?.info;
        if (!parsedInfo?.tokenAmount) {
          continue;
        }

        const amountRaw = String(parsedInfo.tokenAmount.amount ?? "0");
        const uiAmountFromString = Number(parsedInfo.tokenAmount.uiAmountString ?? "0");
        const decimals = Number(parsedInfo.tokenAmount.decimals ?? 0);
        const uiAmount =
          Number.isFinite(uiAmountFromString) && uiAmountFromString >= 0
            ? uiAmountFromString
            : typeof parsedInfo.tokenAmount.uiAmount === "number"
              ? parsedInfo.tokenAmount.uiAmount
              : Number(amountRaw) / 10 ** decimals;

        const normalized: ScanAccount = {
          address: String(tokenAccount?.pubkey ?? ""),
          mint: String(parsedInfo.mint ?? ""),
          lamports: Number(tokenAccount?.account?.lamports ?? 0),
          programId,
          amountRaw,
          uiAmount,
          uiAmountString: String(parsedInfo.tokenAmount.uiAmountString ?? "0"),
          decimals
        };

        if (amountRaw === "0" || uiAmount === 0) {
          discovered.push(normalized);
        } else {
          nonEmptyAccounts.push(normalized);
        }
      }
    }

    return res.status(200).json({ discovered, nonEmptyAccounts });
  } catch (error) {
    return res.status(502).json({
      error: error instanceof Error ? error.message : "Scan failed"
    });
  }
}
