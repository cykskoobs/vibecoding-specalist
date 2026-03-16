"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function SolanaMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 200"
      aria-hidden="true"
      className={cn("h-8 w-8", className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="solana-grad" x1="0" y1="0" x2="220" y2="200" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#00FFA3" />
          <stop offset="1" stopColor="#7B5CFF" />
        </linearGradient>
      </defs>
      <rect x="16" y="16" width="208" height="38" rx="16" fill="url(#solana-grad)" transform="skewX(-16)" />
      <rect x="16" y="82" width="208" height="38" rx="16" fill="url(#solana-grad)" opacity="0.92" transform="skewX(-16)" />
      <rect x="16" y="148" width="208" height="38" rx="16" fill="url(#solana-grad)" opacity="0.85" transform="skewX(-16)" />
    </svg>
  );
}

function FloatingPaths({ position }: { position: number }) {
  const paths = Array.from({ length: 36 }, (_, i) => ({
    id: i,
    d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${
      380 - i * 5 * position
    } -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${
      152 - i * 5 * position
    } ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${
      684 - i * 5 * position
    } ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
    width: 0.45 + i * 0.03
  }));

  return (
    <div className="pointer-events-none absolute inset-0">
      <svg className="h-full w-full text-cyan-300/70" viewBox="0 0 696 316" fill="none">
        <title>Background Paths</title>
        {paths.map((path) => (
          <motion.path
            key={path.id}
            d={path.d}
            stroke="currentColor"
            strokeWidth={path.width}
            strokeOpacity={0.08 + path.id * 0.02}
            initial={{ pathLength: 0.3, opacity: 0.45 }}
            animate={{
              pathLength: 1,
              opacity: [0.2, 0.55, 0.2],
              pathOffset: [0, 1, 0]
            }}
            transition={{
              duration: 16 + Math.random() * 8,
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear"
            }}
          />
        ))}
      </svg>
    </div>
  );
}

export function BackgroundPathsLayer({ className }: { className?: string }) {
  return (
    <div className={cn("pointer-events-none absolute inset-0 opacity-35", className)}>
      <FloatingPaths position={1} />
      <FloatingPaths position={-1} />
    </div>
  );
}

export function BackgroundPathsBackdrop({ className }: { className?: string }) {
  return (
    <div className={cn("pointer-events-none fixed inset-0 -z-10 opacity-30", className)}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_18%,rgba(0,255,163,0.08),transparent_38%),radial-gradient(circle_at_80%_10%,rgba(123,92,255,0.1),transparent_35%)]" />
      <BackgroundPathsLayer className="!opacity-100" />
    </div>
  );
}

export function BackgroundPaths({
  title = "SOL Reclaimer",
  subtitle = "Every time you buy a token, around 0.002 SOL can get locked in token accounts.",
  ctaLabel = "Discover Reclaim",
  onCtaClick,
  showButton = true,
  badge = "0% platform fee"
}: {
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  onCtaClick?: () => void;
  showButton?: boolean;
  badge?: string;
}) {
  const words = title.split(" ");

  return (
    <div className="relative w-full overflow-hidden rounded-3xl border border-cyan-300/25 bg-gradient-to-br from-[#071325] via-[#071b2f] to-[#140f2b] shadow-neon">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_20%,rgba(0,255,163,0.2),transparent_35%),radial-gradient(circle_at_86%_5%,rgba(123,92,255,0.25),transparent_28%)]" />
      <BackgroundPathsLayer className="!opacity-100" />

      <div className="relative z-10 mx-auto max-w-4xl px-4 py-8 text-center md:px-8 md:py-10">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.2 }}>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-200/30 bg-cyan-200/10 px-4 py-1 text-xs font-medium tracking-wide text-cyan-100">
            <Sparkles className="h-3.5 w-3.5" />
            {badge}
          </div>

          <div className="mb-6 flex items-center justify-center gap-3">
            <SolanaMark className="h-10 w-10" />
            <h1 aria-label={title} className="text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl">
              {words.map((word, wordIndex) => (
                <span key={wordIndex} className="mr-3 inline-block last:mr-0">
                  {word.split("").map((letter, letterIndex) => (
                    <motion.span
                      key={`${wordIndex}-${letterIndex}`}
                      initial={{ y: 80, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{
                        delay: wordIndex * 0.08 + letterIndex * 0.02,
                        type: "spring",
                        stiffness: 160,
                        damping: 24
                      }}
                      className="inline-block bg-gradient-to-r from-[#00FFA3] via-[#4DE2D4] to-[#8D7CFF] bg-clip-text text-transparent"
                    >
                      {letter}
                    </motion.span>
                  ))}
                </span>
              ))}
            </h1>
          </div>

          <p className="mx-auto max-w-2xl text-sm text-cyan-50/80 sm:text-base">{subtitle}</p>

          {showButton ? (
            <div className="mt-8 inline-block rounded-2xl border border-cyan-100/25 bg-white/10 p-1 shadow-lg backdrop-blur-xl">
              <Button
                variant="ghost"
                onClick={onCtaClick}
                className="rounded-xl border border-cyan-100/20 bg-[#040912]/85 px-8 py-6 text-base font-semibold text-cyan-50 hover:bg-[#071221] hover:text-white"
              >
                {ctaLabel}
                <span className="ml-3 text-lg">{"->"}</span>
              </Button>
            </div>
          ) : null}
        </motion.div>
      </div>
    </div>
  );
}

