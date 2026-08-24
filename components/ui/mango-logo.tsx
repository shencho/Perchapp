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
  void variant; // la marca es la misma sobre claro y sobre navy
  // UN solo círculo: disco navy con un borde blanco fino. Nada de discos
  // blancos envolviendo al mango.
  const borde = Math.max(1, Math.round(size * 0.028));
  const inner = size - borde * 2;

  return (
    <span
      className={cn("relative inline-block shrink-0 align-middle", className)}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "#1e3a5f",
        border: `${borde}px solid #ffffff`,
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      {/* cuerpo del mango */}
      <span
        style={{
          position: "absolute",
          width: inner * 0.62,
          height: inner * 0.66,
          left: inner * 0.2,
          top: inner * 0.22,
          borderRadius: "57% 63% 55% 60% / 63% 67% 54% 56%",
          transform: "rotate(-12deg)",
          background:
            "radial-gradient(ellipse at 30% 24%, #ffdf94, #f0b74d 40%, #d98f2b 78%)",
          boxShadow: "inset -3px -4px 8px rgba(120,60,10,.45)",
        }}
      />
      {/* hoja — el mango nunca va sin hoja */}
      <span
        style={{
          position: "absolute",
          width: inner * 0.3,
          height: inner * 0.18,
          left: inner * 0.47,
          top: inner * 0.11,
          borderRadius: "0 100% 0 100%",
          transform: "rotate(-32deg)",
          background: "linear-gradient(135deg,#8fd0a0,#5aa374)",
        }}
      />
    </span>
  );
}

interface MangoWordmarkProps {
  /** font-size en px */
  size?: number;
  /** cream = sobre navy; navy = sobre claro */
  tone?: "navy" | "cream";
  /** Color explícito (pisa `tone`). */
  color?: string;
  className?: string;
}

/**
 * Wordmark "MANGO" con el guiño "Ai": a la N se le recorta la pata izquierda en
 * diagonal y un tittle la remata arriba, así el arranque se lee "Ai".
 *
 * El corte es un RECORTE REAL de la letra (clip-path sobre el glifo), no un
 * rectángulo pintado del color del fondo: así el wordmark funciona sobre
 * cualquier superficie (blanco, crema del sidebar, navy) sin dejar muescas.
 */
export function MangoWordmark({
  size = 20,
  tone = "navy",
  color,
  className,
}: MangoWordmarkProps) {
  const fill = color ?? (tone === "cream" ? "#e8d9b4" : "#1e3a5f");
  // Poppins 400: geométrica, trazo medio y espaciado amplio (ver referencia).
  // A la N se le QUITA una franja diagonal del asta izquierda; el fragmento que
  // queda arriba es la cuña que hace de punto de la "i" — no se agrega nada, y
  // por eso nada sobresale de la altura de las letras.
  const corte = {
    maskImage:
      "linear-gradient(135deg, #000 0 26%, transparent 26% 34%, #000 34% 100%), linear-gradient(#000, #000)",
    WebkitMaskImage:
      "linear-gradient(135deg, #000 0 26%, transparent 26% 34%, #000 34% 100%), linear-gradient(#000, #000)",
    maskSize: "40% 100%, 60% 100%",
    WebkitMaskSize: "40% 100%, 60% 100%",
    maskPosition: "left top, right top",
    WebkitMaskPosition: "left top, right top",
    maskRepeat: "no-repeat",
    WebkitMaskRepeat: "no-repeat",
  } as const;

  return (
    <span
      className={cn("inline-flex items-baseline font-display leading-none select-none", className)}
      style={{ fontSize: size, fontWeight: 400, letterSpacing: "0.04em", color: fill, lineHeight: 1 }}
      role="img"
      aria-label="MANGO"
    >
      <span aria-hidden>MA</span>
      <span aria-hidden className="inline-block" style={corte}>
        N
      </span>
      <span aria-hidden>GO</span>
    </span>
  );
}

interface MangoLogoProps {
  size?: number;
  showWordmark?: boolean;
  variant?: MarkVariant;
  className?: string;
}

/** Lockup. Con `showWordmark` el logo es SOLO las letras (sin el ícono). */
export function MangoLogo({
  size = 32,
  showWordmark = false,
  variant = "onLight",
  className,
}: MangoLogoProps) {
  // El logo "con letras" va solo: la N cortada ya hace de identidad.
  if (showWordmark) {
    return (
      <MangoWordmark
        size={size * 0.86}
        tone={variant === "onNavy" ? "cream" : "navy"}
        className={className}
      />
    );
  }
  return (
    <div className={cn("flex items-center", className)}>
      <MangoMark size={size} variant={variant} />
    </div>
  );
}

interface MangoBlobProps {
  /** lado en px */
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Textura de marca: la misma silueta del mango a baja opacidad. Va dentro de
 * cards navy y paneles (el contenedor debe ser `relative overflow-hidden`).
 */
export function MangoBlob({ size = 180, className, style }: MangoBlobProps) {
  return (
    <span
      aria-hidden
      className={cn("mango-blob", className)}
      style={{ width: size, height: size, ...style }}
    />
  );
}
