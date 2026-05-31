import { motion } from "framer-motion";

// Seeded "random" for stable dot positions
function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export function OutlierViz({
  zScore,
  amount,
  normalMax,
}: {
  zScore: number;
  amount: number;
  normalMax?: number;
}) {
  const displayZ = typeof zScore === "number" && !isNaN(zScore) ? zScore : 28.9;
  const displayAmount = amount;

  return (
    <div className="space-y-3">
      {/* Dot distribution plot */}
      <div className="relative h-20 bg-surface-container-low rounded-xl px-4 py-3 overflow-hidden">
        {/* Normal cluster dots */}
        {Array.from({ length: 38 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-gray-300"
            style={{
              left: `${3 + seededRandom(i) * 52}%`,
              top: `${20 + seededRandom(i + 100) * 50}%`,
            }}
          />
        ))}

        {/* Axis label */}
        <div className="absolute bottom-1 left-4 text-[9px] text-on-surface-variant/60 font-semibold">
          Normal range ($20–{normalMax ? `$${normalMax.toLocaleString()}` : "$2,100"} CAD)
        </div>

        {/* Outlier star — far right */}
        <motion.div
          className="absolute right-4 top-1/2 -translate-y-1/2 text-error font-black text-3xl leading-none"
          animate={{ scale: [1, 1.18, 1] }}
          transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
          title={`$${displayAmount.toLocaleString()} CAD — ${displayZ}σ above norm`}
        >
          ★
        </motion.div>
        <div className="absolute right-5 bottom-1.5 text-[10px] font-mono font-black text-error">
          {displayAmount.toLocaleString("en-CA", {
            style: "currency",
            currency: "CAD",
            maximumFractionDigits: 0,
          })}
        </div>
      </div>

      {/* Giant Z-score callout */}
      <div className="flex items-baseline gap-3">
        <span className="font-mono font-black text-5xl text-error leading-none">{displayZ}σ</span>
        <div>
          <div className="text-sm font-semibold text-on-surface-variant">above the norm for this MCC</div>
          <div className="text-[11px] text-on-surface-variant/70 mt-0.5">
            Next highest charge: ~{normalMax
              ? (normalMax).toLocaleString("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 })
              : "$2,100 CAD"}
          </div>
        </div>
      </div>
    </div>
  );
}
