export interface TemplateSubcategoria {
  nombre: string;
  personalizable?: boolean;
  conceptos_tipicos?: string[];
}

export interface TemplateCategoria {
  nombre: string;
  tipo: "Egreso" | "Ingreso";
  subcategorias: TemplateSubcategoria[];
}

export const TEMPLATE_CATEGORIAS: TemplateCategoria[] = [
  // ── EGRESOS ─────────────────────────────────────────────────────────────────
  {
    nombre: "Alimentos", tipo: "Egreso",
    subcategorias: [
      { nombre: "Supermercado" },
      { nombre: "Restaurantes" },
      { nombre: "Delivery" },
      { nombre: "Verdulería" },
      { nombre: "Carnicería" },
      { nombre: "Pescadería" },
      { nombre: "Fiambrería" },
      { nombre: "Panadería" },
    ],
  },
  {
    nombre: "Hogar", tipo: "Egreso",
    subcategorias: [
      { nombre: "Servicios", conceptos_tipicos: ["Edenor", "Edesur", "AySA", "Metrogas", "Personal", "Movistar", "Claro", "Telecom"] },
      { nombre: "Mantenimiento" },
      { nombre: "Alquiler/Expensas" },
      { nombre: "Decoración" },
      { nombre: "Equipamiento" },
    ],
  },
  {
    nombre: "Familia", tipo: "Egreso",
    subcategorias: [
      { nombre: "Hijo 1", personalizable: true },
      { nombre: "Hijo 2", personalizable: true },
      { nombre: "Hijos en general" },
      { nombre: "Pareja" },
      { nombre: "Padres" },
    ],
  },
  {
    nombre: "Cuidado personal", tipo: "Egreso",
    subcategorias: [
      { nombre: "Peluquería" },
      { nombre: "Estética" },
      { nombre: "Indumentaria" },
    ],
  },
  {
    nombre: "Salud", tipo: "Egreso",
    subcategorias: [
      { nombre: "Obra social" },
      { nombre: "Médicos" },
      { nombre: "Estudios" },
      { nombre: "Psicólogo" },
      { nombre: "Farmacia" },
    ],
  },
  {
    nombre: "Transporte", tipo: "Egreso",
    subcategorias: [
      { nombre: "Combustible" },
      { nombre: "Estacionamiento" },
      { nombre: "Lavado" },
      { nombre: "Mantenimiento" },
      { nombre: "Seguro Auto" },
      { nombre: "Seguro Moto" },
      { nombre: "Traslados", conceptos_tipicos: ["Uber", "Cabify", "Didi", "Taxi", "SUBE"] },
      { nombre: "Peajes" },
    ],
  },
  {
    nombre: "Educación", tipo: "Egreso",
    subcategorias: [
      { nombre: "Cursos" },
      { nombre: "Libros" },
      { nombre: "Universidad" },
      { nombre: "Colegio" },
    ],
  },
  {
    nombre: "Mascotas", tipo: "Egreso",
    subcategorias: [
      { nombre: "Veterinario" },
      { nombre: "Alimento" },
      { nombre: "Accesorios" },
      { nombre: "Peluquería" },
    ],
  },
  {
    nombre: "Social", tipo: "Egreso",
    subcategorias: [
      { nombre: "Salidas" },
      { nombre: "Juntadas" },
      { nombre: "Regalos" },
      { nombre: "Cumpleaños" },
    ],
  },
  {
    nombre: "Viajes", tipo: "Egreso",
    subcategorias: [
      { nombre: "Pasajes" },
      { nombre: "Hospedaje" },
      { nombre: "Comidas" },
      { nombre: "Actividades" },
      { nombre: "Seguro de viaje" },
      { nombre: "Traslados" },
    ],
  },
  {
    nombre: "Suscripciones", tipo: "Egreso",
    subcategorias: [
      { nombre: "Streaming", conceptos_tipicos: ["Netflix", "HBO Max", "Disney+", "Prime Video", "Paramount"] },
      { nombre: "Música", conceptos_tipicos: ["Spotify", "Apple Music", "YouTube Music"] },
      { nombre: "Software" },
      { nombre: "Cursos online" },
      { nombre: "Diarios/revistas" },
      { nombre: "Compras recurrentes" },
    ],
  },
  {
    nombre: "Deportes", tipo: "Egreso",
    subcategorias: [
      { nombre: "Club" },
      { nombre: "Gimnasio" },
      { nombre: "Equipamiento" },
      { nombre: "Clases" },
    ],
  },
  {
    nombre: "Fiscales", tipo: "Egreso",
    subcategorias: [
      { nombre: "Impuestos" },
      { nombre: "Monotributo" },
      { nombre: "Sellos" },
      { nombre: "ARBA" },
      { nombre: "AFIP" },
    ],
  },
  {
    nombre: "Profesional", tipo: "Egreso",
    subcategorias: [
      { nombre: "Suscripciones" },
      { nombre: "Materiales" },
      { nombre: "Marketing" },
      { nombre: "Honorarios" },
      { nombre: "Servicios de terceros" },
    ],
  },
  {
    nombre: "Inversiones", tipo: "Egreso",
    subcategorias: [
      { nombre: "Comisiones" },
      { nombre: "Asesoría" },
    ],
  },
  {
    nombre: "Donaciones", tipo: "Egreso",
    subcategorias: [],
  },
  // ── INGRESOS ─────────────────────────────────────────────────────────────────
  {
    nombre: "Haberes", tipo: "Ingreso",
    subcategorias: [
      { nombre: "Sueldo" },
      { nombre: "Aguinaldo" },
      { nombre: "Vacaciones" },
    ],
  },
  {
    nombre: "Honorarios profesionales", tipo: "Ingreso",
    subcategorias: [],
  },
  {
    nombre: "Renta inmobiliaria", tipo: "Ingreso",
    subcategorias: [],
  },
  {
    nombre: "Inversiones", tipo: "Ingreso",
    subcategorias: [
      { nombre: "Intereses" },
      { nombre: "Dividendos" },
      { nombre: "Renta variable" },
    ],
  },
  {
    nombre: "Ventas", tipo: "Ingreso",
    subcategorias: [],
  },
  {
    nombre: "Comisiones", tipo: "Ingreso",
    subcategorias: [],
  },
  {
    nombre: "Premios", tipo: "Ingreso",
    subcategorias: [
      { nombre: "Bonus" },
      { nombre: "Hallazgos" },
      { nombre: "Sorteos" },
    ],
  },
  {
    nombre: "Reembolsos", tipo: "Ingreso",
    subcategorias: [],
  },
  {
    nombre: "Regalos recibidos", tipo: "Ingreso",
    subcategorias: [],
  },
  {
    nombre: "Otros ingresos", tipo: "Ingreso",
    subcategorias: [],
  },
];
