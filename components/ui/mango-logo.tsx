import { cn } from "@/lib/utils";

/**
 * Objetos de marca MANGO — recreados en CSS a partir del spec del handoff
 * (design_handoff_mango/README.md, sección "Objetos de branding").
 * El mango NUNCA va sin la hoja.
 */

type MarkVariant = "onLight" | "onNavy";

interface MangoMarkProps {
  /** lado del cuadrado en px */
  size?: number;
  /** onLight = chip navy sobre superficies claras (sidebar, login);
   *  onNavy  = chip blanco sobre superficies navy (botón MANGO AI) */
  variant?: MarkVariant;
  className?: string;
}

/** Cuadrado redondeado con el mango + hoja adentro. */
export function MangoMark({
  size = 32,
  variant = "onLight",
  className,
}: MangoMarkProps) {
  const onNavy = variant === "onNavy";
  return (
    <div
      className={cn("relative shrink-0", className)}
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.3),
        // onLight = chip navy; onNavy = sin chip, el mango va directo sobre navy
        background: onNavy ? "transparent" : "#1e3a5f",
        overflow: "hidden",
      }}
    >
      {/* cuerpo del mango */}
      <div
        style={{
          position: "absolute",
          width: size * 0.62,
          height: size * 0.66,
          left: size * 0.2,
          top: size * 0.22,
          borderRadius: "57% 63% 55% 60% / 63% 67% 54% 56%",
          transform: "rotate(-12deg)",
          background:
            "radial-gradient(ellipse at 30% 24%, #ffdf94, #f0b74d 40%, #d98f2b 80%)",
          boxShadow:
            "inset -3px -4px 8px rgba(120,60,10,.45), inset 2px 3px 6px rgba(255,240,200,.5)",
        }}
      />
      {/* hoja — nunca sin hoja. En onNavy va un verde más claro para contrastar sobre #1e3a5f */}
      <div
        style={{
          position: "absolute",
          width: size * 0.3,
          height: size * 0.18,
          left: size * 0.5,
          top: size * 0.1,
          borderRadius: "0 100% 0 100%",
          transform: "rotate(-32deg)",
          background: onNavy
            ? "linear-gradient(135deg,#8fd0a0,#5aa374)"
            : "linear-gradient(135deg,#4a7a56,#284f33)",
        }}
      />
    </div>
  );
}

interface MangoWordmarkProps {
  /** font-size en px */
  size?: number;
  /** cream = sobre navy; navy = sobre claro */
  tone?: "navy" | "cream";
  className?: string;
}

/**
 * Wordmark "MANGO" con el guiño "Ai": la pata izquierda de la N se corta en
 * diagonal (del color del fondo) y un tittle cuadrado oro la remata → "Ai".
 * Manrope 800, letter-spacing -1px.
 */
export function MangoWordmark({
  size = 20,
  tone = "navy",
  className,
}: MangoWordmarkProps) {
  const color = tone === "cream" ? "#e8d9b4" : "#1e3a5f";
  const bg = tone === "cream" ? "#1e3a5f" : "transparent";
  return (
    <span
      className={cn("inline-flex items-baseline font-display font-extrabold leading-none", className)}
      style={{ fontSize: size, letterSpacing: "-1px", color }}
    >
      MA
      <span className="relative">
        N
        {/* corte diagonal de la pata izquierda (color del fondo) */}
        {tone === "cream" && (
          <span
            aria-hidden
            style={{
              position: "absolute",
              left: 0,
              bottom: 0,
              width: size * 0.34,
              height: size * 0.7,
              background: bg,
              clipPath: "polygon(0 0, 100% 0, 0 100%)",
            }}
          />
        )}
        {/* tittle oro → convierte la N en "i" */}
        <span
          aria-hidden
          style={{
            position: "absolute",
            top: -size * 0.16,
            left: size * 0.06,
            width: size * 0.16,
            height: size * 0.16,
            borderRadius: 2,
            background: "#c98a2b",
          }}
        />
      </span>
      GO
    </span>
  );
}

interface MangoLogoProps {
  size?: number;
  showWordmark?: boolean;
  variant?: MarkVariant;
  className?: string;
}

/** Lockup: MangoMark + wordmark opcional. */
export function MangoLogo({
  size = 32,
  showWordmark = false,
  variant = "onLight",
  className,
}: MangoLogoProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <MangoMark size={size} variant={variant} />
      {showWordmark && (
        <MangoWordmark
          size={size * 0.72}
          tone={variant === "onNavy" ? "cream" : "navy"}
        />
      )}
    </div>
  );
}
