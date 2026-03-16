import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRightLeft, Copy, Eye, Flame, LogOut, RefreshCw, Wallet } from "lucide-react";

import { BackgroundPaths, BackgroundPathsBackdrop, BackgroundPathsLayer } from "@/components/ui/background-paths";
import { Button } from "@/components/ui/button";

type CloseableTokenAccount = {
  address: string;
  mint: string;
  lamports: number;
  programId: string;
};

type DustTokenAccount = CloseableTokenAccount & {
  amountRaw: string;
  uiAmount: number;
  priceUsd: number;
  usdValue: number;
  uiAmountString: string;
  decimals: number;
};

type WalletId = "phantom" | "jupiter";

type PhantomProvider = {
  isPhantom?: boolean;
  isJupiter?: boolean;
  publicKey?: { toBase58: () => string };
  connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: { toBase58: () => string } }>;
  request?: (args: { method: string; params?: unknown[] }) => Promise<any>;
  disconnect?: () => Promise<void>;
  signTransaction?: (transaction: unknown) => Promise<{ serialize: () => Uint8Array }>;
  signAndSendTransaction?: (
    transaction: unknown,
    options?: { skipPreflight?: boolean; maxRetries?: number }
  ) => Promise<{ signature: string }>;
};

declare global {
  interface Window {
    phantom?: { solana?: PhantomProvider };
    solana?: PhantomProvider;
    jupiter?: { solana?: PhantomProvider };
    jup?: { solana?: PhantomProvider };
    jupiterWallet?: { solana?: PhantomProvider };
  }
}

const COMMITMENT = "confirmed";
const LAMPORTS_PER_SOL = 1_000_000_000;
const DUST_THRESHOLD_USD = 3;
const APP_RPC_PROXY =
  typeof window !== "undefined" ? `${window.location.origin}/api/solana-rpc` : "https://api.mainnet-beta.solana.com";
const CUSTOM_RPC_RAW = (import.meta.env.VITE_SOLANA_RPC as string | undefined)?.trim() ?? "";
const CUSTOM_RPC = /^https?:\/\//i.test(CUSTOM_RPC_RAW) ? CUSTOM_RPC_RAW : "";
const RPC_ENDPOINTS: string[] = [
  APP_RPC_PROXY,
  CUSTOM_RPC,
  "https://api.mainnet-beta.solana.com",
  "https://solana.public-rpc.com",
  "https://solana-rpc.publicnode.com",
  "https://rpc.ankr.com/solana"
].filter((endpoint) => Boolean(endpoint));

const WALLET_OPTIONS: Array<{ id: WalletId; name: string; logoUrl: string; logoAlt: string }> = [
  {
    id: "phantom",
    name: "Phantom",
    logoUrl:
      "https://cdn.discordapp.com/attachments/473008774009847809/1483003031527231609/phantom.png?ex=69b901b3&is=69b7b033&hm=eb156f52f639412fdfc110dbb367afb1742426a537d4e40abab9cce372ac8f61",
    logoAlt: "Phantom logo"
  },
  {
    id: "jupiter",
    name: "Jupiter",
    logoUrl:
      "https://cdn.discordapp.com/attachments/473008774009847809/1483003132958212269/logo.png?ex=69b901cb&is=69b7b04b&hm=1bacc84f173a058db42d9eb8a77b3c84ce4a9313c9c9fa642b291651b6205bd0",
    logoAlt: "Jupiter logo"
  }
];

function chunk<T>(values: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

function isProvider(value: unknown): value is PhantomProvider {
  return Boolean(value) && typeof (value as PhantomProvider).connect === "function";
}

function isJupiterProvider(value: unknown): value is PhantomProvider {
  if (!isProvider(value)) {
    return false;
  }

  const provider = value as PhantomProvider & {
    name?: string;
    walletName?: string;
    adapter?: { name?: string };
    isJupiter?: boolean;
  };
  if (provider.isJupiter) {
    return true;
  }

  const nameBlob = `${provider.name ?? ""} ${provider.walletName ?? ""} ${provider.adapter?.name ?? ""}`.toLowerCase();
  return nameBlob.includes("jupiter");
}

function findJupiterProviderFromWindow(win: Window): PhantomProvider | null {
  const anyWindow = win as unknown as Record<string, unknown>;
  const solanaAny = win.solana as unknown as { providers?: unknown[]; isPhantom?: boolean } | undefined;
  const providerList = Array.isArray(solanaAny?.providers) ? solanaAny.providers : [];

  for (const provider of providerList) {
    if (isJupiterProvider(provider)) {
      return provider;
    }
  }

  for (const [key, value] of Object.entries(anyWindow)) {
    if (!key.toLowerCase().includes("jupiter")) {
      continue;
    }

    if (isJupiterProvider(value)) {
      return value;
    }

    const nested = (value as { solana?: unknown } | null)?.solana;
    if (isJupiterProvider(nested)) {
      return nested;
    }
  }

  return null;
}
function shortKey(value: string): string {
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function getProvider(walletId: WalletId): PhantomProvider | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    if (walletId === "phantom") {
      return window.phantom?.solana ?? (window.solana?.isPhantom ? window.solana : null) ?? null;
    }

    if (walletId === "jupiter") {
      const anyWindow = window as unknown as Record<string, unknown>;
      const candidates: unknown[] = [
        window.jupiter?.solana,
        window.jup?.solana,
        window.jupiterWallet?.solana,
        window.jupiter as unknown,
        window.jup as unknown,
        (anyWindow.jupiter as { provider?: unknown; solana?: unknown } | undefined)?.provider,
        (anyWindow.jupiterWallet as { provider?: unknown; solana?: unknown } | undefined)?.provider,
        (anyWindow.JupiterWallet as { provider?: unknown; solana?: unknown } | undefined)?.provider,
        (anyWindow["jupiter-wallet"] as { provider?: unknown; solana?: unknown } | undefined)?.provider
      ];

      for (const candidate of candidates) {
        if (isJupiterProvider(candidate)) {
          return candidate;
        }
      }

      if (isProvider(window.solana) && ((window.solana as PhantomProvider & { isJupiter?: boolean }).isJupiter || !window.solana?.isPhantom)) {
        return window.solana;
      }

      const discovered = findJupiterProviderFromWindow(window);
      if (discovered) {
        return discovered;
      }

      return null;
    }
  } catch {
    return null;
  }

  return null;
}

function isWalletDetected(walletId: WalletId): boolean {
  return Boolean(getProvider(walletId));
}

function pokeWalletDiscovery(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new Event("wallet-standard:app-ready"));
  window.dispatchEvent(new Event("wallet-standard:register-wallet"));
}

function humanizeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("403") || message.toLowerCase().includes("access forbidden")) {
    return "Network access issue. Try Rescan. If it keeps failing, set SOLANA_RPC_URL (and VITE_SOLANA_RPC) to a dedicated mainnet RPC and redeploy.";
  }

  if (message.includes("429")) {
    return "RPC rate limit hit. Please retry shortly.";
  }

  return message;
}

async function loadSolanaSdk() {
  const [web3, spl] = await Promise.all([import("@solana/web3.js"), import("@solana/spl-token")]);

  return {
    Connection: web3.Connection,
    PublicKey: web3.PublicKey,
    Transaction: web3.Transaction,
    TOKEN_PROGRAM_ID: spl.TOKEN_PROGRAM_ID,
    TOKEN_2022_PROGRAM_ID: spl.TOKEN_2022_PROGRAM_ID,
    createBurnInstruction: spl.createBurnInstruction,
    createCloseAccountInstruction: spl.createCloseAccountInstruction
  };
}

async function fetchPrices(mints: string[]): Promise<Map<string, number>> {
  const uniqueMints = Array.from(new Set(mints));
  const prices = new Map<string, number>();

  const baseUrls = ["https://lite-api.jup.ag/price/v2?ids=", "https://price.jup.ag/v4/price?ids="];

  for (const mintBatch of chunk(uniqueMints, 80)) {
    const ids = encodeURIComponent(mintBatch.join(","));
    let body: { data?: Record<string, { price?: number }> } | null = null;

    for (const baseUrl of baseUrls) {
      try {
        const response = await fetch(`${baseUrl}${ids}`);
        if (!response.ok) {
          continue;
        }
        body = (await response.json()) as { data?: Record<string, { price?: number }> };
        break;
      } catch {
        // try next endpoint
      }
    }

    if (!body) {
      throw new Error("Price feed unavailable right now.");
    }

    for (const mint of mintBatch) {
      const price = body.data?.[mint]?.price;
      if (typeof price === "number" && Number.isFinite(price)) {
        prices.set(mint, price);
      }
    }
  }

  return prices;
}

function SolanaLogo(): JSX.Element {
  return (
    <svg viewBox="0 0 220 180" className="h-12 w-12" fill="none" aria-hidden="true">
      <rect x="16" y="20" width="188" height="30" rx="14" fill="#39FFD4" transform="skewX(-18)" />
      <rect x="16" y="76" width="188" height="30" rx="14" fill="#64D4FF" transform="skewX(-18)" />
      <rect x="16" y="132" width="188" height="30" rx="14" fill="#9B6BFF" transform="skewX(-18)" />
    </svg>
  );
}

export default function App(): JSX.Element {
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [connectedWalletName, setConnectedWalletName] = useState<string>("");
  const [selectedWallet, setSelectedWallet] = useState<WalletId>("phantom");
  const [provider, setProvider] = useState<PhantomProvider | null>(null);
  const [brokenLogos, setBrokenLogos] = useState<Record<string, boolean>>({});
  const [addressInput, setAddressInput] = useState<string>("");
  const [scannedOwner, setScannedOwner] = useState<string>("");
  const [accounts, setAccounts] = useState<CloseableTokenAccount[]>([]);
  const [dustAccounts, setDustAccounts] = useState<DustTokenAccount[]>([]);
  const [txSignatures, setTxSignatures] = useState<string[]>([]);
  const [busy, setBusy] = useState<boolean>(false);
  const [status, setStatus] = useState<string>("Choose Phantom or Jupiter to connect.");
  const [activeEndpoint, setActiveEndpoint] = useState<string>(RPC_ENDPOINTS[0]);
  const [claimFx, setClaimFx] = useState<{ show: boolean; amount: string }>({ show: false, amount: "0" });
  const [showWorthlessTools, setShowWorthlessTools] = useState<boolean>(false);
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);
  const [claimReceipt, setClaimReceipt] = useState<{ open: boolean; amount: string }>({ open: false, amount: "0" });

  const reclaimLamports = accounts.reduce((sum, account) => sum + account.lamports, 0);
  const reclaimSol = (reclaimLamports / LAMPORTS_PER_SOL).toFixed(6);
  const dustRentLamports = dustAccounts.reduce((sum, account) => sum + account.lamports, 0);
  const dustRentSol = (dustRentLamports / LAMPORTS_PER_SOL).toFixed(6);
  const canClaim = walletAddress.length > 0 && walletAddress === scannedOwner && accounts.length > 0;
  const canBurnDust = walletAddress.length > 0 && walletAddress === scannedOwner && dustAccounts.length > 0;
  const scanLocked = busy || cooldownSeconds > 0;

  useEffect(() => {
    if (cooldownSeconds <= 0) {
      return;
    }
    const timer = window.setInterval(() => {
      setCooldownSeconds((current) => (current > 0 ? current - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldownSeconds]);

  const playClaimDing = (): void => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) {
        return;
      }
      const audio = new AudioCtx();
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, audio.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(1320, audio.currentTime + 0.12);
      gain.gain.setValueAtTime(0.0001, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.18, audio.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.25);
      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.start();
      oscillator.stop(audio.currentTime + 0.26);
    } catch {
      // no-op
    }
  };

  const withConnectionFallback = async <T,>(
    ConnectionCtor: any,
    runner: (connection: any, endpoint: string) => Promise<T>
  ): Promise<T> => {
    const candidates = [activeEndpoint, ...RPC_ENDPOINTS.filter((endpoint) => endpoint !== activeEndpoint)];
    let latestError: unknown = null;

    for (const endpoint of candidates) {
      try {
        const connection = new ConnectionCtor(endpoint, COMMITMENT);
        const result = await runner(connection, endpoint);
        setActiveEndpoint(endpoint);
        return result;
      } catch (error) {
        latestError = error;
      }
    }

    throw latestError ?? new Error("Unable to reach Solana RPC endpoints.");
  };
  const scanAccounts = async (ownerAddress: string): Promise<void> => {
    const trimmedAddress = ownerAddress.trim();
    if (!trimmedAddress) {
      setStatus("Enter a valid Solana address first.");
      return;
    }

    try {
      setBusy(true);
      setTxSignatures([]);

      const { Connection, PublicKey, TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } = await loadSolanaSdk();
      const owner = new PublicKey(trimmedAddress);

      const parseJsonParsedScan = (responseValue: any[], programIdBase58: string) => {
        const discovered: CloseableTokenAccount[] = [];
        const nonEmptyAccounts: DustTokenAccount[] = [];

        for (const tokenAccount of responseValue) {
          const parsedInfo = (tokenAccount.account.data as any)?.parsed?.info as
            | {
                mint: string;
                tokenAmount: { amount: string; uiAmountString?: string; uiAmount?: number; decimals: number };
              }
            | undefined;

          if (!parsedInfo) {
            continue;
          }

          const amountRaw = parsedInfo.tokenAmount.amount ?? "0";
          const uiAmountFromString = Number(parsedInfo.tokenAmount.uiAmountString ?? "0");
          const uiAmountNormalized =
            Number.isFinite(uiAmountFromString) && uiAmountFromString >= 0
              ? uiAmountFromString
              : typeof parsedInfo.tokenAmount.uiAmount === "number"
                ? parsedInfo.tokenAmount.uiAmount
                : Number(amountRaw) / 10 ** parsedInfo.tokenAmount.decimals;
          const isZeroBalance = amountRaw === "0" || uiAmountNormalized === 0;

          if (isZeroBalance) {
            discovered.push({
              address: typeof tokenAccount.pubkey === "string" ? tokenAccount.pubkey : tokenAccount.pubkey.toBase58(),
              mint: parsedInfo.mint,
              lamports: tokenAccount.account.lamports,
              programId: programIdBase58
            });
            continue;
          }

          nonEmptyAccounts.push({
            address: typeof tokenAccount.pubkey === "string" ? tokenAccount.pubkey : tokenAccount.pubkey.toBase58(),
            mint: parsedInfo.mint,
            lamports: tokenAccount.account.lamports,
            programId: programIdBase58,
            amountRaw,
            decimals: parsedInfo.tokenAmount.decimals,
            uiAmount: uiAmountNormalized,
            uiAmountString: parsedInfo.tokenAmount.uiAmountString ?? "0",
            priceUsd: 0,
            usdValue: 0
          });
        }

        return { discovered, nonEmptyAccounts };
      };

      const scanViaServerApi = async () => {
        const response = await fetch("/api/scan-wallet", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ owner: trimmedAddress })
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(text || `scan-api-${response.status}`);
        }

        const body = (await response.json()) as {
          discovered?: Array<{
            address: string;
            mint: string;
            lamports: number;
            programId: string;
            amountRaw: string;
            uiAmount: number;
            uiAmountString: string;
            decimals: number;
          }>;
          nonEmptyAccounts?: Array<{
            address: string;
            mint: string;
            lamports: number;
            programId: string;
            amountRaw: string;
            uiAmount: number;
            uiAmountString: string;
            decimals: number;
          }>;
        };

        const discovered = (body.discovered ?? []).map((item) => ({
          address: item.address,
          mint: item.mint,
          lamports: item.lamports,
          programId: item.programId
        }));

        const nonEmptyAccounts = (body.nonEmptyAccounts ?? []).map((item) => ({
          address: item.address,
          mint: item.mint,
          lamports: item.lamports,
          programId: item.programId,
          amountRaw: item.amountRaw,
          decimals: item.decimals,
          uiAmount: item.uiAmount,
          uiAmountString: item.uiAmountString,
          priceUsd: 0,
          usdValue: 0
        }));

        return { discovered, nonEmptyAccounts };
      };
      const scanViaConnection = async (connection: any) => {
        const discovered: CloseableTokenAccount[] = [];
        const nonEmptyAccounts: DustTokenAccount[] = [];

        for (const programId of [TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID]) {
          const response = await connection.getTokenAccountsByOwner(
            owner,
            { programId },
            { commitment: COMMITMENT, encoding: "jsonParsed" }
          );

          const parsed = parseJsonParsedScan(response.value, programId.toBase58());
          discovered.push(...parsed.discovered);
          nonEmptyAccounts.push(...parsed.nonEmptyAccounts);
        }

        return { discovered, nonEmptyAccounts };
      };

      const endpoints = [activeEndpoint, ...RPC_ENDPOINTS.filter((endpoint) => endpoint !== activeEndpoint)];
      let bestResult: { discovered: CloseableTokenAccount[]; nonEmptyAccounts: DustTokenAccount[] } | null = null;
      let bestEndpoint = activeEndpoint;
      let latestError: unknown = null;

      try {
        bestResult = await scanViaServerApi();
        bestEndpoint = "server-api";
      } catch (error) {
        latestError = error;
      }

      for (let round = 0; round < 2 && !bestResult; round += 1) {
        for (const endpoint of endpoints) {
          try {
            const connection = new Connection(endpoint, COMMITMENT);
            const scanned = await scanViaConnection(connection);
            const isBetter =
              !bestResult ||
              scanned.discovered.length > bestResult.discovered.length ||
              (bestResult.discovered.length === 0 && scanned.nonEmptyAccounts.length > bestResult.nonEmptyAccounts.length);

            if (isBetter) {
              bestResult = scanned;
              bestEndpoint = endpoint;
            }
          } catch (error) {
            latestError = error;
          }
        }

        if (bestResult) {
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, 350 * (round + 1)));
      }

      if (!bestResult) {
        throw latestError ?? new Error("Unable to scan token accounts right now.");
      }

      if (/^https?:\/\//i.test(bestEndpoint)) {
        setActiveEndpoint(bestEndpoint);
      }

      let lowValueDust: DustTokenAccount[] = [];
      if (bestResult.nonEmptyAccounts.length > 0) {
        try {
          const mintPrices = await fetchPrices(bestResult.nonEmptyAccounts.map((account) => account.mint));
          lowValueDust = bestResult.nonEmptyAccounts
            .map((account) => {
              const priceUsd = mintPrices.get(account.mint) ?? 0;
              const tokenUiAmount =
                account.uiAmount > 0
                  ? account.uiAmount
                  : Number(account.uiAmountString || "0") || Number(account.amountRaw) / 10 ** account.decimals;
              return {
                ...account,
                uiAmount: tokenUiAmount,
                priceUsd,
                usdValue: tokenUiAmount * priceUsd
              };
            })
            .filter((account) => (account.priceUsd > 0 ? account.usdValue <= DUST_THRESHOLD_USD : account.uiAmount > 0));
        } catch {
          lowValueDust = bestResult.nonEmptyAccounts.filter((account) => account.uiAmount > 0);
        }
      }

      setScannedOwner(owner.toBase58());
      setAccounts(bestResult.discovered);
      setDustAccounts(lowValueDust);
      setStatus(`Scan complete: ${bestResult.discovered.length} closeable empty + ${lowValueDust.length} worthless token candidates.`);
    } catch (error) {
      setStatus(humanizeError(error));
    } finally {
      setBusy(false);
      setCooldownSeconds(15);
    }
  };

  const connectWallet = async (walletId: WalletId): Promise<void> => {
    let targetProvider = getProvider(walletId);
    if (!targetProvider && walletId === "jupiter") {
      pokeWalletDiscovery();
      await new Promise((resolve) => setTimeout(resolve, 450));
      targetProvider = getProvider(walletId);
    }
    if (!targetProvider) {
      if (walletId === "jupiter") {
        setStatus("Jupiter extension not detected. Unlock Jupiter Wallet, refresh this page, then click Jupiter again.");
      } else {
        setStatus(`${WALLET_OPTIONS.find((wallet) => wallet.id === walletId)?.name ?? "Wallet"} extension not detected.`);
      }
      return;
    }

    try {
      setBusy(true);
      const response = await targetProvider.connect({ onlyIfTrusted: false });
      const connected = response.publicKey.toBase58();
      setWalletAddress(connected);
      setAddressInput(connected);
      setSelectedWallet(walletId);
      setConnectedWalletName(WALLET_OPTIONS.find((wallet) => wallet.id === walletId)?.name ?? "Wallet");
      setProvider(targetProvider);
      await scanAccounts(connected);
    } catch (error) {
      setStatus(humanizeError(error));
      setBusy(false);
    }
  };

  const disconnectWallet = async (): Promise<void> => {
    try {
      setBusy(true);
      await provider?.disconnect?.();
    } catch {
      // no-op
    } finally {
      setBusy(false);
      setWalletAddress("");
      setAddressInput("");
      setScannedOwner("");
      setAccounts([]);
      setDustAccounts([]);
      setTxSignatures([]);
      setConnectedWalletName("");
      setStatus("Disconnected.");
    }
  };

  const claimAll = async (): Promise<void> => {
    if (!provider) {
      setStatus("Connect wallet first.");
      return;
    }
    if (!walletAddress || walletAddress !== scannedOwner) {
      setStatus("Connect the same wallet that was previewed before claiming.");
      return;
    }
    if (accounts.length === 0) {
      setStatus("Nothing to claim yet.");
      return;
    }

    try {
      setBusy(true);
      const beforeClaimLamports = reclaimLamports;
      const { Connection, PublicKey, Transaction, createCloseAccountInstruction } = await loadSolanaSdk();
      const owner = new PublicKey(walletAddress);

      const signatures = await withConnectionFallback(Connection, async (connection) => {
        const groups = chunk(accounts, 10);
        const localSignatures: string[] = [];

        for (const group of groups) {
          const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash(COMMITMENT);
          const transaction = new Transaction({ feePayer: owner, recentBlockhash: blockhash });

          for (const account of group) {
            transaction.add(
              createCloseAccountInstruction(
                new PublicKey(account.address),
                owner,
                owner,
                [],
                new PublicKey(account.programId)
              )
            );
          }

          let signature: string;
          if (provider.signAndSendTransaction) {
            const response = await provider.signAndSendTransaction(transaction, { skipPreflight: false, maxRetries: 3 });
            signature = response.signature;
          } else if (provider.signTransaction) {
            const signed = await provider.signTransaction(transaction);
            signature = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: false, maxRetries: 3 });
          } else {
            throw new Error("Connected wallet cannot sign transactions.");
          }

          await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, COMMITMENT);
          localSignatures.push(signature);
        }

        return localSignatures;
      });

      const claimedAmount = (beforeClaimLamports / LAMPORTS_PER_SOL).toFixed(6);
      setTxSignatures(signatures);
      setClaimFx({ show: true, amount: claimedAmount });
      setTimeout(() => setClaimFx({ show: false, amount: "0" }), 2200);
      await scanAccounts(walletAddress);
      playClaimDing();
      setClaimReceipt({ open: true, amount: claimedAmount });
    } catch (error) {
      setStatus(humanizeError(error));
    } finally {
      setBusy(false);
    }
  };

  const burnLowValueTokens = async (): Promise<void> => {
    if (!provider) {
      setStatus("Connect wallet first.");
      return;
    }
    if (!walletAddress || walletAddress !== scannedOwner) {
      setStatus("Connect the same wallet that was previewed before burning tokens.");
      return;
    }
    if (dustAccounts.length === 0) {
      setStatus("No worthless tokens found yet.");
      return;
    }

    try {
      setBusy(true);
      const { Connection, PublicKey, Transaction, createBurnInstruction, createCloseAccountInstruction } = await loadSolanaSdk();
      const owner = new PublicKey(walletAddress);

      const signatures = await withConnectionFallback(Connection, async (connection) => {
        const groups = chunk(dustAccounts, 5);
        const localSignatures: string[] = [];

        for (const group of groups) {
          const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash(COMMITMENT);
          const transaction = new Transaction({ feePayer: owner, recentBlockhash: blockhash });

          for (const tokenAccount of group) {
            transaction.add(
              createBurnInstruction(
                new PublicKey(tokenAccount.address),
                new PublicKey(tokenAccount.mint),
                owner,
                BigInt(tokenAccount.amountRaw),
                [],
                new PublicKey(tokenAccount.programId)
              )
            );

            transaction.add(
              createCloseAccountInstruction(
                new PublicKey(tokenAccount.address),
                owner,
                owner,
                [],
                new PublicKey(tokenAccount.programId)
              )
            );
          }

          let signature: string;
          if (provider.signAndSendTransaction) {
            const response = await provider.signAndSendTransaction(transaction, { skipPreflight: false, maxRetries: 3 });
            signature = response.signature;
          } else if (provider.signTransaction) {
            const signed = await provider.signTransaction(transaction);
            signature = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: false, maxRetries: 3 });
          } else {
            throw new Error("Connected wallet cannot sign transactions.");
          }

          await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, COMMITMENT);
          localSignatures.push(signature);
        }

        return localSignatures;
      });

      setTxSignatures(signatures);
      setClaimFx({ show: true, amount: dustRentSol });
      setTimeout(() => setClaimFx({ show: false, amount: "0" }), 2200);
      await scanAccounts(walletAddress);
      setStatus("Worthless tokens burned and rent reclaimed.");
    } catch (error) {
      setStatus(humanizeError(error));
    } finally {
      setBusy(false);
    }
  };

  const copyAddress = async (): Promise<void> => {
    if (!walletAddress) {
      return;
    }

    try {
      await navigator.clipboard.writeText(walletAddress);
    } catch {
      setStatus("Clipboard permission blocked.");
    }
  };

  return (
    <main className="relative mx-auto grid min-h-screen w-full max-w-6xl grid-rows-[auto_minmax(0,1fr)_auto] gap-3 overflow-x-hidden px-3 py-3 sm:px-5 sm:py-4">
      <BackgroundPathsBackdrop />

      <BackgroundPaths
        title="SOL Reclaimer"
        subtitle="Every time you buy a token, around 0.002 SOL gets locked in an account. Close empty accounts and get your SOL back."
        badge="0% platform fee"
        showButton={false}
      />

      <section
        id="reclaimer"
        className="relative min-h-0 overflow-hidden rounded-3xl border border-cyan-300/30 bg-card p-5 shadow-neon sm:p-7"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(0,255,163,0.08),transparent_35%),radial-gradient(circle_at_85%_5%,rgba(125,95,255,0.1),transparent_35%)]" />
        <BackgroundPathsLayer className="!opacity-45" />
        <AnimatePresence>
          {busy ? (
            <motion.div
              className="absolute inset-0 z-20 flex items-center justify-center bg-[#020817]/55 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="w-[min(440px,88%)] rounded-2xl border border-cyan-300/30 bg-[#06142b]/85 p-4 shadow-neon">
                <div className="mb-2 flex items-center justify-between text-sm text-cyan-100/90">
                  <span>Scanning Solana accounts...</span>
                  <span className="text-cyan-200/70">Please wait</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-cyan-100/15">
                  <motion.div
                    className="h-full w-1/3 rounded-full bg-gradient-to-r from-[#00FFA3] via-[#59E2FF] to-[#A86BFF]"
                    animate={{ x: ["-120%", "320%"] }}
                    transition={{ duration: 1.2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                  />
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
        <div className="relative z-10 space-y-5">
          <div className="flex items-center gap-3">
            <SolanaLogo />
            <h2 className="bg-gradient-to-r from-[#00FFA3] via-[#59E2FF] to-[#A86BFF] bg-clip-text text-5xl font-bold text-transparent">
              SOL Reclaimer
            </h2>
          </div>

          {walletAddress ? (
            <div className="rounded-2xl border border-cyan-100/20 bg-[#081329]/80 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-indigo-500/20 p-2">
                    <Wallet className="h-5 w-5 text-indigo-200" />
                  </div>
                  <div>
                    <p className="text-sm text-cyan-100/70">Connected with {connectedWalletName || "wallet"}</p>
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-cyan-50">{shortKey(walletAddress)}</p>
                      <button onClick={copyAddress} className="text-cyan-100/70 hover:text-cyan-50" aria-label="Copy wallet">
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
                <Button variant="ghost" onClick={disconnectWallet} disabled={busy} className="border border-cyan-100/20 bg-slate-900/70 text-cyan-50 hover:bg-slate-800">
                  <LogOut className="mr-2 h-4 w-4" />
                  Disconnect
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {WALLET_OPTIONS.map((wallet) => {
                const detected = isWalletDetected(wallet.id);
                const canAttemptConnect = wallet.id === "jupiter" ? true : detected;
                const selected = selectedWallet === wallet.id;

                return (
                  <button
                    key={wallet.id}
                    type="button"
                    onClick={() => connectWallet(wallet.id)}
                    onMouseEnter={() => setSelectedWallet(wallet.id)}
                    disabled={busy || !canAttemptConnect}
                    className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                      selected
                        ? "border-cyan-300/70 bg-cyan-300/15"
                        : "border-cyan-100/25 bg-[#0a1931]/70"
                    } ${canAttemptConnect ? "hover:bg-cyan-300/20" : "opacity-60"}`}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#16213f]/35">
                      {brokenLogos[wallet.id] ? (
                        <span className="text-xs font-bold text-cyan-50">{wallet.name.slice(0, 2).toUpperCase()}</span>
                      ) : (
                        <img
                          src={wallet.logoUrl}
                          alt={wallet.logoAlt}
                          className="h-7 w-7 object-contain"
                          onError={() => setBrokenLogos((prev) => ({ ...prev, [wallet.id]: true }))}
                        />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-cyan-50">{wallet.name}</p>
                      <p className="text-xs text-cyan-100/70">{wallet.id === "jupiter" ? "Click to connect Jupiter Wallet" : canAttemptConnect ? "Click to connect" : "Extension not detected"}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
            <input
              value={addressInput}
              onChange={(event) => setAddressInput(event.target.value)}
              placeholder="Paste Solana address (or connect + preview)..."
              className="h-12 w-full rounded-xl border border-cyan-100/25 bg-[#091427]/85 px-4 text-sm text-cyan-50 outline-none placeholder:text-cyan-100/40 focus:ring-2 focus:ring-cyan-300/45"
              disabled={busy}
            />

            <Button variant="ghost" onClick={() => scanAccounts(addressInput.trim() || walletAddress)} disabled={scanLocked} className="h-12 rounded-xl border border-cyan-100/25 bg-white/10 px-5 text-cyan-50 hover:bg-white/20 disabled:opacity-60">
              <Eye className="mr-2 h-4 w-4" />
              {cooldownSeconds > 0 ? `Preview (${cooldownSeconds}s)` : "Preview"}
            </Button>

            <Button disabled className="h-12 rounded-xl bg-slate-800/70 px-5 font-semibold text-cyan-100/70">
              <Wallet className="mr-2 h-4 w-4" />
              {walletAddress ? "Connected" : "Click wallet card above"}
            </Button>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-cyan-100/20 bg-[#071426]/80 p-6 text-center">
            <AnimatePresence>
              {claimFx.show ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: -10 }}
                  transition={{ duration: 0.35 }}
                  className="pointer-events-none absolute inset-x-0 top-3 mx-auto w-fit rounded-full border border-emerald-300/40 bg-emerald-300/20 px-4 py-1 text-sm font-semibold text-emerald-100"
                >
                  Claimed +{claimFx.amount} SOL
                </motion.div>
              ) : null}
            </AnimatePresence>

            <p className="text-cyan-100/70">Locked in {accounts.length} empty token accounts</p>
            <div className="mt-2 flex items-center justify-center gap-3">
              <SolanaLogo />
              <p className="text-5xl font-bold text-[#00FFA3]">{reclaimSol} <span className="text-3xl text-cyan-200/70">SOL</span></p>
            </div>
            <p className="mt-2 text-cyan-100/70">• Empty account reclaim: {reclaimSol} SOL ({accounts.length} accounts)</p>
            <p className="mt-1 text-cyan-100/70">• Worthless token burn reclaim: {dustRentSol} SOL ({dustAccounts.length} tokens)</p>

            {walletAddress ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <Button onClick={() => scanAccounts(walletAddress)} disabled={scanLocked} className="h-11 rounded-xl bg-gradient-to-r from-[#00FFA3] to-[#7B5CFF] font-semibold text-[#041629] hover:opacity-90">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {cooldownSeconds > 0 ? `Rescan Wallet (${cooldownSeconds}s)` : "Rescan Wallet"}
                </Button>
                <Button onClick={claimAll} disabled={!canClaim || busy} className="h-11 rounded-xl bg-gradient-to-r from-[#00FFA3] to-[#7B5CFF] font-semibold text-[#041629] hover:opacity-90">
                  <ArrowRightLeft className="mr-2 h-4 w-4" />
                  Claim Empty Accounts
                </Button>
              </div>
            ) : null}

            {walletAddress ? (
              <div className="mt-3 rounded-xl border border-cyan-100/20 bg-[#08152a]/60 p-2.5 text-left">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-cyan-100/85">
                  <input
                    type="checkbox"
                    checked={showWorthlessTools}
                    onChange={(event) => setShowWorthlessTools(event.target.checked)}
                    className="h-4 w-4 accent-[#00FFA3]"
                    disabled={busy}
                  />
                  Optional: Burn worthless tokens
                </label>

                {showWorthlessTools ? (
                  <div className="mt-3">
                    {dustAccounts.length > 0 ? (
                      <Button
                        onClick={burnLowValueTokens}
                        disabled={busy || !canBurnDust}
                        className="h-10 rounded-xl bg-gradient-to-r from-[#24f2c2] to-[#8d7cff] text-[#041629] hover:opacity-90"
                      >
                        <Flame className="mr-2 h-4 w-4" />
                        Burn Worthless Tokens (&lt;$3 USD) + Reclaim ({dustRentSol} SOL)
                      </Button>
                    ) : (
                      <p className="text-xs text-cyan-100/70">
                        No worthless tokens found right now. Your tokens stay untouched unless you run this optional action.
                      </p>
                    )}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <p className="text-center text-xs text-cyan-100/70">{status}</p>
          {cooldownSeconds > 0 ? <p className="text-center text-xs text-cyan-100/60">Buttons unlock in {cooldownSeconds}s</p> : null}
          <p className="sr-only" aria-live="polite">{status}</p>
          <p className="sr-only" aria-hidden="true">{txSignatures.join(",")}</p>
        </div>

        <AnimatePresence>
          {claimReceipt.open ? (
            <motion.div
              className="absolute inset-0 z-30 flex items-center justify-center bg-[#020817]/70 backdrop-blur-md p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                initial={{ y: 24, scale: 0.92, opacity: 0 }}
                animate={{ y: 0, scale: 1, opacity: 1 }}
                exit={{ y: 10, scale: 0.95, opacity: 0 }}
                className="w-full max-w-md rounded-2xl border border-cyan-300/35 bg-[#06142b] p-6 text-center shadow-neon"
              >
                <h3 className="text-xl font-semibold text-cyan-50">Claim Received</h3>
                <p className="mt-1 text-sm text-cyan-100/70">Your SOL has been reclaimed successfully.</p>

                <div className="relative mx-auto mt-5 h-44 w-56">
                  <div className="absolute bottom-2 left-1/2 h-24 w-44 -translate-x-1/2 rounded-b-[48px] rounded-t-[24px] border border-cyan-300/35 bg-gradient-to-b from-[#123564] to-[#0a2142]" />
                  <div className="absolute bottom-[84px] left-1/2 h-10 w-32 -translate-x-1/2 rounded-full border border-cyan-300/35 bg-[#143765]" />
                  <motion.div
                    className="absolute left-1/2 top-4 -translate-x-1/2"
                    animate={{ y: [0, 96], opacity: [1, 1, 0.2] }}
                    transition={{ duration: 0.9, repeat: Number.POSITIVE_INFINITY, repeatDelay: 0.15 }}
                  >
                    <SolanaLogo />
                  </motion.div>
                  <motion.div
                    className="absolute left-[26%] top-12"
                    animate={{ y: [0, 84], opacity: [1, 1, 0.2] }}
                    transition={{ duration: 0.85, repeat: Number.POSITIVE_INFINITY, delay: 0.2 }}
                  >
                    <SolanaLogo />
                  </motion.div>
                  <motion.div
                    className="absolute right-[26%] top-10"
                    animate={{ y: [0, 88], opacity: [1, 1, 0.2] }}
                    transition={{ duration: 0.95, repeat: Number.POSITIVE_INFINITY, delay: 0.35 }}
                  >
                    <SolanaLogo />
                  </motion.div>
                </div>

                <p className="mt-2 text-3xl font-bold text-[#00FFA3]">+{claimReceipt.amount} SOL</p>
                <Button
                  onClick={() => setClaimReceipt({ open: false, amount: "0" })}
                  className="mt-5 h-11 w-full rounded-xl bg-gradient-to-r from-[#00FFA3] to-[#7B5CFF] text-[#041629] font-semibold"
                >
                  OK
                </Button>
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </section>

      <footer className="pb-3 text-center text-xs text-cyan-100/65">Copyright 2026 SOL Reclaimer</footer>
    </main>
  );
}

























































































