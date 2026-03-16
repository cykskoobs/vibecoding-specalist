const RPC_URL = process.env.SOLANA_RPC_URL || process.env.VITE_SOLANA_RPC || "https://api.mainnet-beta.solana.com";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const upstream = await fetch(RPC_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(req.body)
    });

    const text = await upstream.text();
    res.status(upstream.status).setHeader("content-type", "application/json");
    return res.send(text);
  } catch (error) {
    return res.status(502).json({
      jsonrpc: "2.0",
      error: { code: 502, message: error instanceof Error ? error.message : "Upstream RPC failure" },
      id: null
    });
  }
}
