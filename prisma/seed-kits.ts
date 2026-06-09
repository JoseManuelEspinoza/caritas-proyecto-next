/**
 * Seed idempotente de CATÁLOGOS DE ARTÍCULOS por tipo de kit.
 * El nombre del catálogo coincide EXACTAMENTE con el tipo de kit que usa el
 * informe del especialista (Kit de Víveres, Kit de Higiene, ...), de modo que
 * cada kit muestre solo los artículos de su catálogo.
 *
 * Ejecutar: docker compose exec web npx tsx prisma/seed-kits.ts
 */
import { prisma } from "../app/lib/prisma";
import "dotenv/config";

const CATALOGOS_KIT: { nombre: string; prefijo: string; articulos: string[] }[] = [
  {
    nombre: "Kit de Víveres",
    prefijo: "VV",
    articulos: [
      "Arroz 1kg",
      "Atún en lata",
      "Fideos 500g",
      "Aceite vegetal 1L",
      "Azúcar 1kg",
      "Leche evaporada",
      "Menestras 1kg",
      "Agua embotellada 2.5L",
      "Conserva de pollo",
      "Avena 500g",
    ],
  },
  {
    nombre: "Kit de Higiene",
    prefijo: "HI",
    articulos: [
      "Jabón de tocador",
      "Papel higiénico",
      "Pasta dental",
      "Cepillo dental",
      "Toallas higiénicas",
      "Shampoo",
      "Alcohol en gel",
      "Detergente 1kg",
    ],
  },
  {
    nombre: "Kit de Dormitorio",
    prefijo: "DO",
    articulos: [
      "Frazada 1.5 plazas",
      "Colchón 1.5 plazas",
      "Juego de sábanas",
      "Almohada",
      "Carpa familiar",
      "Sleeping / saco de dormir",
    ],
  },
  {
    nombre: "Kit de Complementos",
    prefijo: "CO",
    articulos: [
      "Linterna LED",
      "Pilas AA (pack)",
      "Velas (pack)",
      "Fósforos (caja)",
      "Botiquín básico",
      "Mochila de emergencia",
      "Poncho impermeable",
    ],
  },
];

async function main() {
  for (const cat of CATALOGOS_KIT) {
    const catalogo = await prisma.catalogoGRD.upsert({
      where: { nombreCatalogo: cat.nombre },
      update: {},
      create: { nombreCatalogo: cat.nombre, descripcion: `Artículos del ${cat.nombre}` },
    });
    let n = 0;
    for (let i = 0; i < cat.articulos.length; i++) {
      const codigo = `${cat.prefijo}-${String(i + 1).padStart(3, "0")}`;
      await prisma.catalogoDetalleGRD.upsert({
        where: {
          idCatalogoGRD_codigo: { idCatalogoGRD: catalogo.idCatalogoGRD, codigo },
        },
        update: { valor: cat.articulos[i] },
        create: {
          idCatalogoGRD: catalogo.idCatalogoGRD,
          codigo,
          valor: cat.articulos[i],
          orden: i + 1,
        },
      });
      n++;
    }
    console.log(`✓ ${cat.nombre}: ${n} artículos`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
