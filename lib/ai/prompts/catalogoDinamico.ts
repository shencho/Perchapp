export function buildCatalogoDinamico(
  categorias: { id: string; nombre: string; tipo: string; parent_id: string | null }[],
  movimientos: { concepto: string | null; categoria_id: string | null }[],
): string {
  // Solo categorías de egreso (Egreso + Ambos cubren egresos)
  const cats = categorias.filter(c => c.tipo === "Egreso" || c.tipo === "Ambos");
  const padres = cats.filter(c => !c.parent_id);
  if (padres.length === 0) return "(sin categorías de egreso cargadas)";

  // Contar frecuencia de conceptos por categoria_id
  const conceptCounts = new Map<string, Map<string, number>>();
  for (const m of movimientos) {
    const concepto = m.concepto?.trim();
    if (!concepto || !m.categoria_id) continue;
    if (!conceptCounts.has(m.categoria_id)) {
      conceptCounts.set(m.categoria_id, new Map());
    }
    const counts = conceptCounts.get(m.categoria_id)!;
    counts.set(concepto, (counts.get(concepto) ?? 0) + 1);
  }

  function topConceptos(catId: string, n = 5): string[] {
    const counts = conceptCounts.get(catId);
    if (!counts) return [];
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([c]) => c);
  }

  const lines: string[] = ["EGRESOS — catálogo del usuario:", ""];

  for (const padre of padres) {
    const hijos = cats.filter(c => c.parent_id === padre.id);

    if (hijos.length === 0) {
      // Categoría plana: derivar conceptos del padre directamente
      const top = topConceptos(padre.id);
      const suffix = top.length > 0
        ? ` (conceptos típicos: ${top.map(c => `"${c}"`).join(", ")})`
        : "";
      lines.push(`${padre.nombre}${suffix}`);
    } else {
      lines.push(padre.nombre);
      for (const hijo of hijos) {
        const top = topConceptos(hijo.id);
        const suffix = top.length > 0
          ? ` (conceptos típicos: ${top.map(c => `"${c}"`).join(", ")})`
          : "";
        lines.push(`  - ${hijo.nombre}${suffix}`);
      }
    }
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}
