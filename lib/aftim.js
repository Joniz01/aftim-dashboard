// lib/aftim.js — Versión Final Optimizada

const AFTIM_URL = process.env.AFTIM_URL;
const AFTIM_TENANT = process.env.AFTIM_TENANT;
const AFTIM_TOKEN = process.env.AFTIM_TOKEN;

async function queryAftim(query, variables = {}) {
  try {
    const res = await fetch(AFTIM_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Tenant-id': AFTIM_TENANT,
        'Authorization': `Bearer ${AFTIM_TOKEN}`,
      },
      body: JSON.stringify({ query, variables }),
      cache: 'no-store',
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    const json = await res.json();
    if (json.errors) throw new Error(json.errors[0].message);
    
    return json.data;
  } catch (error) {
    console.error("[AFTIM API ERROR]:", error.message);
    return null; // Devolvemos null para que el proceso no se rompa
  }
}

// ─── Utilidades de fecha ───────────────────────────────────────────────────

function getFechas() {
  const now = new Date();
  const fmt = (d) => d.toISOString();
  
  const diaInicio = new Date(now.setHours(0,0,0,0));
  const diaFin = new Date(now.setHours(23,59,59,999));
  const mesInicio = new Date(now.getFullYear(), now.getMonth(), 1);
  const mesFin = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  return {
    diaInicio: fmt(diaInicio),
    diaFin: fmt(diaFin),
    mesInicio: fmt(mesInicio),
    mesFin: fmt(mesFin),
  };
}

// ─── Consultas Individuales ────────────────────────────────────────────────

async function getFacturas(fi, ff) {
  const query = `query GetFacturas($fi: DateOrDateTime, $ff: DateOrDateTime) {
    getFacturas(limit: 500, filter: { anulada: { eq: 0 }, fecha_at: { gte: $fi, lte: $ff } }) {
      total total_dolar
    }
  }`;
  const data = await queryAftim(query, { fi, ff });
  return data?.getFacturas || [];
}

async function getInventario() {
  const query = `{ getExistencias(limit: 500) { existencia Concepto { nombre } } }`;
  const data = await queryAftim(query);
  return data?.getExistencias || [];
}

// ─── Función Principal ─────────────────────────────────────────────────────

export async function obtenerTodosLosDatos() {
  const f = getFechas();

  // Ejecución controlada
  const facturasDia = await getFacturas(f.diaInicio, f.diaFin);
  const facturasMes = await getFacturas(f.mesInicio, f.mesFin);
  const inventario = await getInventario();

  const sumar = (arr, campo) => arr.reduce((s, item) => s + (parseFloat(item[campo]) || 0), 0);

  return {
    resumen: {
      venta_dia_bs: sumar(facturasDia, 'total'),
      venta_dia_usd: sumar(facturasDia, 'total_dolar'),
      venta_mes_bs: sumar(facturasMes, 'total'),
      venta_mes_usd: sumar(facturasMes, 'total_dolar'),
      cant_facturas_dia: facturasDia.length,
      ultima_actualizacion: new Date().toISOString(),
    },
    ventasProductos: { mes: [] },
    inventario: inventario.slice(0, 100), // Solo los primeros 100 para evitar peso
    pedidos: [],
  };
}

export { getFechas };
