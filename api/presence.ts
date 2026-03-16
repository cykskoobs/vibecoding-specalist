const ACTIVE_TTL_MS = 45000;

type PresenceState = {
  lastSeen: number;
  wallet?: string | null;
};

const globalStore = globalThis as unknown as {
  __solReclaimerPresence?: Map<string, PresenceState>;
};

function getStore(): Map<string, PresenceState> {
  if (!globalStore.__solReclaimerPresence) {
    globalStore.__solReclaimerPresence = new Map<string, PresenceState>();
  }
  return globalStore.__solReclaimerPresence;
}

function prune(store: Map<string, PresenceState>, now: number): void {
  for (const [sessionId, presence] of store.entries()) {
    if (now - presence.lastSeen > ACTIVE_TTL_MS) {
      store.delete(sessionId);
    }
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body ?? {};
    const sessionId = String(body.sessionId ?? "").trim();
    if (!sessionId) {
      return res.status(400).json({ error: "Missing sessionId" });
    }

    const leave = Boolean(body.leave);
    const wallet = typeof body.wallet === "string" ? body.wallet : null;

    const store = getStore();
    const now = Date.now();

    if (leave) {
      store.delete(sessionId);
    } else {
      store.set(sessionId, {
        lastSeen: now,
        wallet
      });
    }

    prune(store, now);

    return res.status(200).json({
      activeUsers: Math.max(1, store.size)
    });
  } catch {
    return res.status(200).json({ activeUsers: 1 });
  }
}
