import { cn } from "@/lib/utils";

interface MangoLogoProps {
  size?: number;
  showWordmark?: boolean;
  className?: string;
}

/**
 * Logo MANGO reusable: cuadrado navy con "M" crema en Poppins,
 * opcionalmente seguido del wordmark "MANGO" en navy.
 */
export function MangoLogo({
  size = 32,
  showWordmark = false,
  className,
}: MangoLogoProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        style={{ width: size, height: size }}
        className="bg-navy rounded-lg flex items-center justify-center shrink-0"
      >
        <span
          className="font-display font-extrabold text-cream leading-none"
          style={{ fontSize: size * 0.5 }}
        >
          M
        </span>
      </div>
      {showWordmark && (
        <span
          className="font-display font-extrabold text-navy tracking-tight leading-none"
          style={{ fontSize: size * 0.58 }}
        >
          MANGO
        </span>
      )}
    </div>
  );
}
