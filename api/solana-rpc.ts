const PRIMARY_RPC = process.env.SOLANA_RPC_URL || process.env.VITE_SOLANA_RPC || "";
const RPC_URLS = [
  PRIMARY_RPC,
  "https://api.mainnet-beta.solana.com",
  "https://solana.public-rpc.com",
  "https://solana-rpc.publicnode.com",
  "https://rpc.ankr.com/solana"
].filter((url, index, all) => Boolean(url) && all.indexOf(url) === index);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const payload = typeof req.body === "string" ? req.body : JSON.stringify(req.body ?? {});
  let lastError: unknown = null;

  for (const endpoint of RPC_URLS) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const upstream = await fetch(endpoint, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: payload
        });

        const text = await upstream.text();
        if (!upstream.ok) {
          throw new Error(`rpc-http-${upstream.status}`);
        }

        const parsed = JSON.parse(text);
        if (parsed?.error) {
          throw new Error(parsed.error?.message ?? "rpc-error");
        }

        res.status(200).setHeader("content-type", "application/json");
        return res.send(text);
      } catch (error) {
        lastError = error;
        await sleep(200 * (attempt + 1));
      }
    }
  }

  return res.status(502).json({
    jsonrpc: "2.0",
    error: { code: 502, message: lastError instanceof Error ? lastError.message : "Upstream RPC failure" },
    id: null
  });
}
