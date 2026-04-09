// lib/aftim.js — Todas las queries GraphQL hacia AFTIM API

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

// ─── Utilidades de fecha ───────────────────────────────────────────────────

function getFechas() {
  const now = new Date()

  // Día actual
  const diaInicio = new Date(now)
  diaInicio.setHours(0, 0, 0, 0)
  const diaFin = new Date(now)
  diaFin.setHours(23, 59, 59, 999)

  // Semana actual (Lunes a Domingo)
  const diaSemana = now.getDay() === 0 ? 6 : now.getDay() - 1
  const semanaInicio = new Date(now)
  semanaInicio.setDate(now.getDate() - diaSemana)
  semanaInicio.setHours(0, 0, 0, 0)
  const semanaFin = new Date(semanaInicio)
  semanaFin.setDate(semanaInicio.getDate() + 6)
  semanaFin.setHours(23, 59, 59, 999)

  // Semana anterior
  const semanaAntInicio = new Date(semanaInicio)
  semanaAntInicio.setDate(semanaInicio.getDate() - 7)
  const semanaAntFin = new Date(semanaInicio)
  semanaAntFin.setDate(semanaInicio.getDate() - 1)
  semanaAntFin.setHours(23, 59, 59, 999)

  // Mes actual
  const mesInicio = new Date(now.getFullYear(), now.getMonth(), 1)
  const mesFin = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

  // Mes anterior
  const mesAntInicio = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const mesAntFin = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)

  const fmt = (d) => d.toISOString()

  return {
    diaInicio: fmt(diaInicio),
    diaFin: fmt(diaFin),
    semanaInicio: fmt(semanaInicio),
    semanaFin: fmt(semanaFin),
    semanaAntInicio: fmt(semanaAntInicio),
    semanaAntFin: fmt(semanaAntFin),
    mesInicio: fmt(mesInicio),
    mesFin: fmt(mesFin),
    mesAntInicio: fmt(mesAntInicio),
    mesAntFin: fmt(mesAntFin),
  }
}

// ─── Query base de facturas por rango ────────────────────────────────────────

async function getFacturasPorRango(fechaInicio, fechaFin) {
  const query = `
    query GetFacturas($fi: DateOrDateTime, $ff: DateOrDateTime) {
      getFacturas(
        limit: 10000
        filter: {
          anulada: { eq: 0 }
          fecha_at: { gte: $fi, lte: $ff }
        }
      ) {
        id
        numero_factura
        fecha_at
        total
        total_dolar
        subtotal
        subtotal_dolar
        iva
        iva_dolar
        descuento
        descuento_dolar
        anulada
        adm_clientes_id
        Cliente { id nombre }
      }
    }
  `
  const data = await queryAftim(query, { fi: fechaInicio, ff: fechaFin })
  return data.getFacturas || []
}

// ─── Ventas por producto por rango ───────────────────────────────────────────

async function getVentasProductosPorRango(fechaInicio, fechaFin) {
  const query = `
    query GetDetFacturas($fi: DateOrDateTime, $ff: DateOrDateTime) {
      getDetFacturas(
        limit: 50000
        filter: {
          fecha_at: { gte: $fi, lte: $ff }
        }
      ) {
        id
        adm_enc_facturas_id
        cantidad
        precio
        precio_dolar
        fecha_at
        Concepto { id nombre codigo }
        Factura { id anulada }
      }
    }
  `
  const data = await queryAftim(query, { fi: fechaInicio, ff: fechaFin })
  const detalles = data.getDetFacturas || []
  // Filtrar los que pertenecen a facturas no anuladas
  return detalles.filter(d => d.Factura && d.Factura.anulada === 0)
}

// ─── Consolidar ventas por producto ──────────────────────────────────────────

function consolidarPorProducto(detalles) {
  const mapa = {}
  for (const d of detalles) {
    const id = d.adm_conceptos_id || d.Concepto?.id
    const nombre = d.Concepto?.nombre || 'Sin nombre'
    const codigo = d.Concepto?.codigo || ''
    if (!mapa[id]) {
      mapa[id] = { id, nombre, codigo, cantidad: 0, monto_bs: 0, monto_usd: 0 }
    }
    mapa[id].cantidad += parseFloat(d.cantidad) || 0
    mapa[id].monto_bs += (parseFloat(d.cantidad) || 0) * (parseFloat(d.precio) || 0)
    mapa[id].monto_usd += (parseFloat(d.cantidad) || 0) * (parseFloat(d.precio_dolar) || 0)
  }
  return Object.values(mapa).sort((a, b) => b.monto_usd - a.monto_usd)
}

// ─── Inventario / Existencias ────────────────────────────────────────────────

async function getInventario() {
  const query = `
    {
      getExistencias(limit: 10000) {
        id
        existencia
        existencia_comprometida
        precio
        adm_conceptos_id
        Concepto { id nombre codigo }
        Deposito { id nombre }
      }
    }
  `
  const data = await queryAftim(query)
  return data.getExistencias || []
}

// ─── Pedidos activos (no anulados, no facturados) ────────────────────────────

async function getPedidosActivos() {
  const query = `
    {
      getPedidos(
        limit: 500
        filter: {
          estado: { in: ["ENTREGADO", "PENDIENTE", "EN_PROCESO"] }
          adm_enc_facturas_id: { eq: null }
        }
      ) {
        id
        fecha_at
        estado
        observacion
        adm_clientes_id
        Cliente { id nombre }
        DetPedidos {
          id
          cantidad
          adm_conceptos_id
          Concepto { id nombre }
        }
      }
    }
  `
  const data = await queryAftim(query)
  return data.getPedidos || []
}

// ─── Función principal: obtiene todos los datos ───────────────────────────────

export async function obtenerTodosLosDatos() {
  const f = getFechas()

  const [
    facturasDia,
    facturasSemana,
    facturasSemanaAnt,
    facturasMes,
    facturasMesAnt,
    detDia,
    detSemana,
    detSemanaAnt,
    detMes,
    detMesAnt,
    inventario,
    pedidos,
  ] = await Promise.all([
    getFacturasPorRango(f.diaInicio, f.diaFin),
    getFacturasPorRango(f.semanaInicio, f.semanaFin),
    getFacturasPorRango(f.semanaAntInicio, f.semanaAntFin),
    getFacturasPorRango(f.mesInicio, f.mesFin),
    getFacturasPorRango(f.mesAntInicio, f.mesAntFin),
    getVentasProductosPorRango(f.diaInicio, f.diaFin),
    getVentasProductosPorRango(f.semanaInicio, f.semanaFin),
    getVentasProductosPorRango(f.semanaAntInicio, f.semanaAntFin),
    getVentasProductosPorRango(f.mesInicio, f.mesFin),
    getVentasProductosPorRango(f.mesAntInicio, f.mesAntFin),
    getInventario(),
    getPedidosActivos(),
  ])

  const sumar = (arr, campo) => arr.reduce((s, f) => s + (parseFloat(f[campo]) || 0), 0)

  const resumen = {
    venta_dia_bs: sumar(facturasDia, 'total'),
    venta_dia_usd: sumar(facturasDia, 'total_dolar'),
    venta_semana_bs: sumar(facturasSemana, 'total'),
    venta_semana_usd: sumar(facturasSemana, 'total_dolar'),
    venta_semana_ant_bs: sumar(facturasSemanaAnt, 'total'),
    venta_semana_ant_usd: sumar(facturasSemanaAnt, 'total_dolar'),
    venta_mes_bs: sumar(facturasMes, 'total'),
    venta_mes_usd: sumar(facturasMes, 'total_dolar'),
    venta_mes_ant_bs: sumar(facturasMesAnt, 'total'),
    venta_mes_ant_usd: sumar(facturasMesAnt, 'total_dolar'),
    cant_facturas_dia: facturasDia.length,
    cant_facturas_mes: facturasMes.length,
    ultima_actualizacion: new Date().toISOString(),
    fechas: f,
  }

  return {
    resumen,
    ventasProductos: {
      dia: consolidarPorProducto(detDia),
      semana: consolidarPorProducto(detSemana),
      semanaAnt: consolidarPorProducto(detSemanaAnt),
      mes: consolidarPorProducto(detMes),
      mesAnt: consolidarPorProducto(detMesAnt),
    },
    inventario,
    pedidos,
  }
}

export { getFechas }
