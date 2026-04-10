// lib/aftim.js — Versión Corregida para Hechizo Gourmet

const AFTIM_URL = process.env.AFTIM_URL
const AFTIM_TENANT = process.env.AFTIM_TENANT
const AFTIM_TOKEN = process.env.AFTIM_TOKEN

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
  })

  if (!res.ok) {
    throw new Error(`AFTIM API error: ${res.status} ${res.statusText}`)
  }

  const json = await res.json()

  if (json.errors) {
    throw new Error(`GraphQL error: ${json.errors[0].message}`)
  }

  return json.data
}

// ─── Utilidades de fecha con formato compatible ────────────────────────────

function getFechas() {
  const now = new Date()
  
  // Formato YYYY-MM-DD para evitar errores de zona horaria en la API
  const fmt = (d) => d.toISOString().split('T')[0]

  const diaInicio = new Date(now)
  const diaFin = new Date(now)

  const mesInicio = new Date(now.getFullYear(), now.getMonth(), 1)
  const mesFin = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  return {
    diaInicio: fmt(diaInicio),
    diaFin: fmt(diaFin),
    mesInicio: fmt(mesInicio),
    mesFin: fmt(mesFin),
  }
}

// ─── Query de facturas (Límites optimizados) ───────────────────────────────

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
        fecha_at
        anulada
      }
    }
  `
  const data = await queryAftim(query, { fi: fechaInicio, ff: fechaFin })
  return data?.getFacturas || []
}

// ─── Ventas por producto (Límites optimizados) ──────────────────────────────

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
  `
  const data = await queryAftim(query, { fi: fechaInicio, ff: fechaFin })
  const detalles = data?.getDetFacturas || []
  return detalles.filter(d => d.Factura && d.Factura.anulada === 0)
}

function consolidarPorProducto(detalles) {
  const mapa = {}
  for (const d of detalles) {
    const id = d.Concepto?.id || 'sin-id'
    const nombre = d.Concepto?.nombre || 'Sin nombre'
    if (!mapa[id]) {
      mapa[id] = { id, nombre, cantidad: 0, monto_bs: 0, monto_usd: 0 }
    }
    mapa[id].cantidad += parseFloat(d.cantidad) || 0
    mapa[id].monto_bs += (parseFloat(d.cantidad) || 0) * (parseFloat(d.precio) || 0)
    mapa[id].monto_usd += (parseFloat(d.cantidad) || 0) * (parseFloat(d.precio_dolar) || 0)
  }
  return Object.values(mapa).sort((a, b) => b.monto_usd - a.monto_usd)
}

// ─── Inventario y Pedidos ──────────────────────────────────────────────────

async function getInventario() {
  const query = `
    {
      getExistencias(limit: 500) {
        id
        existencia
        Concepto { id nombre codigo }
      }
    }
  `
  const data = await queryAftim(query)
  return data?.getExistencias || []
}

async function getPedidosActivos() {
  const query = `
    {
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
    }
  `
  const data = await queryAftim(query)
  return data?.getPedidos || []
}

// ─── Función principal (Mantiene la estructura original para el Dashboard) ──

export async function obtenerTodosLosDatos() {
  const f = getFechas()

  // Ejecución secuencial para evitar timeouts en Vercel
  const facturasDia = await getFacturasPorRango(f.diaInicio, f.diaFin)
  const facturasMes = await getFacturasPorRango(f.mesInicio, f.mesFin)
  const detMes = await getVentasProductosPorRango(f.mesInicio, f.mesFin)
  const inventario = await getInventario()
  const pedidos = await getPedidosActivos()

  const sumar = (arr, campo) => arr.reduce((s, f) => s + (parseFloat(f[campo]) || 0), 0)

  const resumen = {
    venta_dia_bs: sumar(facturasDia, 'total'),
    venta_dia_usd: sumar(facturasDia, 'total_dolar'),
    venta_mes_bs: sumar(facturasMes, 'total'),
    venta_mes_usd: sumar(facturasMes, 'total_dolar'),
    cant_facturas_dia: facturasDia.length,
    ultima_actualizacion: new Date().toISOString(),
    fechas: f,
  }

  return {
    resumen,
    ventasProductos: {
      dia: [], 
      semana: [],
      mes: consolidarPorProducto(detMes),
    },
    inventario,
    pedidos,
  }
}

export { getFechas }
