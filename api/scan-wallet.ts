const RPC_URL = process.env.SOLANA_RPC_URL || process.env.VITE_SOLANA_RPC || "https://api.mainnet-beta.solana.com";

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
      const upstream = await fetch(RPC_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });

      const raw = await upstream.text();
      const json = JSON.parse(raw);
      if (json?.error) {
        throw new Error(json.error?.message ?? "RPC error");
      }

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

    return res.status(200).json({
      discovered,
      nonEmptyAccounts
    });
  } catch (error) {
    return res.status(502).json({
      error: error instanceof Error ? error.message : "Scan failed"
    });
  }
}
