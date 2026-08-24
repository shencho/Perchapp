import { MangoBlob, MangoMark, MangoWordmark } from "@/components/ui/mango-logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-dvh md:flex">
      {/* Panel de marca — oculto en mobile, donde el form ocupa toda la pantalla */}
      <aside className="hidden md:flex md:w-[52%] mango-card-navy rounded-none flex-col justify-between p-12 relative">
        <MangoBlob size={420} style={{ right: -140, top: -120 }} />
        <MangoBlob size={280} style={{ left: -90, bottom: -110 }} />

        <div className="relative">
          <MangoWordmark size={26} tone="cream" />
        </div>

        {/* Mango grande */}
        <div className="relative flex-1 grid place-items-center">
          <MangoMark size={230} variant="onNavy" />
        </div>

        <div className="relative max-w-md">
          <h2 className="text-cream font-semibold leading-tight" style={{ fontSize: 34 }}>
            Tus finanzas, en tus palabras.
          </h2>
          <p className="text-cream/70 text-sm mt-3">
            Contale a MANGO AI lo que gastaste y lo registra por vos.
          </p>
          <div className="flex flex-wrap gap-2 mt-5">
            {["Gasté 15 mil en el super", "Cobré el sueldo"].map((f) => (
              <span
                key={f}
                className="text-xs px-3 py-1.5 rounded-[var(--radius-pill)] text-cream/90"
                style={{ background: "rgba(255,255,255,0.12)" }}
              >
                {f}
              </span>
            ))}
          </div>
        </div>
      </aside>

      {/* Panel del formulario */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[360px]">{children}</div>
      </div>
    </main>
  );
}
