// lib/aftim.js — Optimizado para Plan Hobby de Vercel

const AFTIM_URL = process.env.AFTIM_URL;
const AFTIM_TENANT = process.env.AFTIM_TENANT;
const AFTIM_TOKEN = process.env.AFTIM_TOKEN;

async function queryAftim(query, variables = {}) {
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

  if (!res.ok) {
    throw new Error(`AFTIM API error: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();

  if (!json || json.errors) {
    console.error("Detalle GraphQL:", json?.errors);
    throw new Error(`GraphQL error: ${json?.errors?.[0]?.message || 'Error desconocido'}`);
  }

  return json.data;
}

// ─── Utilidades de fecha ───────────────────────────────────────────────────

function getFechas() {
  const now = new Date();
  const diaInicio = new Date(now);
  diaInicio.setHours(0, 0, 0, 0);
  const diaFin = new Date(now);
  diaFin.setHours(23, 59, 59, 999);

  const mesInicio = new Date(now.getFullYear(), now.getMonth(), 1);
  const mesFin = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const fmt = (d) => d.toISOString();

  return {
    diaInicio: fmt(diaInicio),
    diaFin: fmt(diaFin),
    mesInicio: fmt(mesInicio),
    mesFin: fmt(mesFin),
  };
}

// ─── Queries con límites reducidos para evitar Timeouts ─────────────────────

async function getFacturasPorRango(fechaInicio, fechaFin) {
  const query = `
    query GetFacturas($fi: DateOrDateTime, $ff: DateOrDateTime) {
      getFacturas(
        limit: 1000
        filter: {
          anulada: { eq: 0 }
          fecha_at: { gte: $fi, lte: $ff }
        }
      ) {
        id
        total
        total_dolar
        anulada
      }
    }
  `;
  const data = await queryAftim(query, { fi: fechaInicio, ff: fechaFin });
  return data.getFacturas || [];
}

async function getVentasProductosPorRango(fechaInicio, fechaFin) {
  const query = `
    query GetDetFacturas($fi: DateOrDateTime, $ff: DateOrDateTime) {
      getDetFacturas(
        limit: 2000
        filter: {
          fecha_at: { gte: $fi, lte: $ff }
        }
      ) {
        id
        cantidad
        precio
        precio_dolar
        Concepto { id nombre codigo }
        Factura { id anulada }
      }
    }
  `;
  const data = await queryAftim(query, { fi: fechaInicio, ff: fechaFin });
  const detalles = data.getDetFacturas || [];
  return detalles.filter(d => d.Factura && d.Factura.anulada === 0);
}

function consolidarPorProducto(detalles) {
  const mapa = {};
  for (const d of detalles) {
    const id = d.Concepto?.id || 'sin-id';
    const nombre = d.Concepto?.nombre || 'Sin nombre';
    if (!mapa[id]) {
      mapa[id] = { id, nombre, cantidad: 0, monto_usd: 0 };
    }
    mapa[id].cantidad += parseFloat(d.cantidad) || 0;
    mapa[id].monto_usd += (parseFloat(d.cantidad) || 0) * (parseFloat(d.precio_dolar) || 0);
  }
  return Object.values(mapa).sort((a, b) => b.monto_usd - a.monto_usd).slice(0, 20);
}

async function getInventario() {
  const query = `{
    getExistencias(limit: 1000) {
      id
      existencia
      Concepto { id nombre codigo }
    }
  }`;
  const data = await queryAftim(query);
  return data.getExistencias || [];
}

async function getPedidosActivos() {
  const query = `{
    getPedidos(
      limit: 100
      filter: {
        estado: { in: ["ENTREGADO", "PENDIENTE", "EN_PROCESO"] }
        adm_enc_facturas_id: { eq: null }
      }
    ) {
      id
      fecha_at
      estado
      Cliente { nombre }
    }
  }`;
  const data = await queryAftim(query);
  return data.getPedidos || [];
}

// ─── Función Principal (Optimización de tiempo de respuesta) ──────────────

export async function obtenerTodosLosDatos() {
  const f = getFechas();

  // Ejecución secuencial o limitada para no exceder los 10 segundos de Vercel
  const facturasDia = await getFacturasPorRango(f.diaInicio, f.diaFin);
  const facturasMes = await getFacturasPorRango(f.mesInicio, f.mesFin);
  const detMes = await getVentasProductosPorRango(f.mesInicio, f.mesFin);
  const inventario = await getInventario();
  const pedidos = await getPedidosActivos();

  const sumar = (arr, campo) => arr.reduce((s, f) => s + (parseFloat(f[campo]) || 0), 0);

  const resumen = {
    venta_dia_bs: sumar(facturasDia, 'total'),
    venta_dia_usd: sumar(facturasDia, 'total_dolar'),
    venta_mes_bs: sumar(facturasMes, 'total'),
    venta_mes_usd: sumar(facturasMes, 'total_dolar'),
    cant_facturas_dia: facturasDia.length,
    ultima_actualizacion: new Date().toISOString(),
  };

  return {
    resumen,
    ventasProductos: {
      mes: consolidarPorProducto(detMes),
    },
    inventario,
    pedidos,
  };
}

export { getFechas };
