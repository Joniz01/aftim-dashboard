// lib/sheets.js — Escritura en Google Sheets via Apps Script

const SCRIPT_URL = process.env.SHEETS_SCRIPT_URL

async function writeSheet(sheetName, rows, action = 'clear_and_write') {
  const res = await fetch(SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sheet: sheetName, rows, action }),
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error(`Sheets error: ${res.status}`)
  }

  return res.json()
}

function fmtNum(n, decimals = 2) {
  return parseFloat((n || 0).toFixed(decimals))
}

function fmtFecha(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('es-VE', {
    timeZone: 'America/Caracas',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export async function escribirResumen(resumen) {
  const now = fmtFecha(resumen.ultima_actualizacion)
  const rows = [
    ['AFTIM DASHBOARD — RESUMEN DE VENTAS', '', '', ''],
    ['Última actualización:', now, '', ''],
    ['', '', '', ''],
    ['PERÍODO', 'TOTAL Bs', 'TOTAL USD', 'FACTURAS'],
    ['Día actual', fmtNum(resumen.venta_dia_bs), fmtNum(resumen.venta_dia_usd), resumen.cant_facturas_dia],
    ['Semana actual', fmtNum(resumen.venta_semana_bs), fmtNum(resumen.venta_semana_usd), ''],
    ['Semana anterior', fmtNum(resumen.venta_semana_ant_bs), fmtNum(resumen.venta_semana_ant_usd), ''],
    ['Mes actual', fmtNum(resumen.venta_mes_bs), fmtNum(resumen.venta_mes_usd), resumen.cant_facturas_mes],
    ['Mes anterior', fmtNum(resumen.venta_mes_ant_bs), fmtNum(resumen.venta_mes_ant_usd), ''],
  ]
  return writeSheet('Resumen', rows)
}

export async function escribirVentasProductos(ventasProductos) {
  const header = [
    'PRODUCTO', 'CÓDIGO',
    'CANT DÍA', 'MONTO DÍA Bs', 'MONTO DÍA USD',
    'CANT SEMANA', 'MONTO SEMANA Bs', 'MONTO SEMANA USD',
    'CANT SEM ANT', 'MONTO SEM ANT Bs', 'MONTO SEM ANT USD',
    'CANT MES', 'MONTO MES Bs', 'MONTO MES USD',
    'CANT MES ANT', 'MONTO MES ANT Bs', 'MONTO MES ANT USD',
  ]

  // Combinar todos los productos únicos
  const todosIds = new Set([
    ...ventasProductos.dia.map(p => p.id),
    ...ventasProductos.semana.map(p => p.id),
    ...ventasProductos.semanaAnt.map(p => p.id),
    ...ventasProductos.mes.map(p => p.id),
    ...ventasProductos.mesAnt.map(p => p.id),
  ])

  const mapear = (arr) => {
    const m = {}
    arr.forEach(p => { m[p.id] = p })
    return m
  }

  const mDia = mapear(ventasProductos.dia)
  const mSem = mapear(ventasProductos.semana)
  const mSemAnt = mapear(ventasProductos.semanaAnt)
  const mMes = mapear(ventasProductos.mes)
  const mMesAnt = mapear(ventasProductos.mesAnt)

  // Tomar nombre del que tenga datos
  const nombreMap = {}
  ;[...ventasProductos.dia, ...ventasProductos.semana, ...ventasProductos.mes].forEach(p => {
    if (!nombreMap[p.id]) nombreMap[p.id] = { nombre: p.nombre, codigo: p.codigo }
  })

  const rows = [header]
  for (const id of todosIds) {
    const info = nombreMap[id] || { nombre: 'Desconocido', codigo: '' }
    const d = mDia[id] || {}
    const s = mSem[id] || {}
    const sa = mSemAnt[id] || {}
    const m = mMes[id] || {}
    const ma = mMesAnt[id] || {}
    rows.push([
      info.nombre, info.codigo,
      fmtNum(d.cantidad, 0), fmtNum(d.monto_bs), fmtNum(d.monto_usd),
      fmtNum(s.cantidad, 0), fmtNum(s.monto_bs), fmtNum(s.monto_usd),
      fmtNum(sa.cantidad, 0), fmtNum(sa.monto_bs), fmtNum(sa.monto_usd),
      fmtNum(m.cantidad, 0), fmtNum(m.monto_bs), fmtNum(m.monto_usd),
      fmtNum(ma.cantidad, 0), fmtNum(ma.monto_bs), fmtNum(ma.monto_usd),
    ])
  }

  return writeSheet('Ventas_Productos', rows)
}

export async function escribirInventario(inventario) {
  const header = ['PRODUCTO', 'CÓDIGO', 'DEPÓSITO', 'EXISTENCIA', 'COMPROMETIDO', 'DISPONIBLE', 'PRECIO']
  const rows = [header]
  for (const item of inventario) {
    const disponible = (parseFloat(item.existencia) || 0) - (parseFloat(item.existencia_comprometida) || 0)
    rows.push([
      item.Concepto?.nombre || '',
      item.Concepto?.codigo || '',
      item.Deposito?.nombre || '',
      fmtNum(item.existencia, 2),
      fmtNum(item.existencia_comprometida, 2),
      fmtNum(disponible, 2),
      fmtNum(item.precio, 2),
    ])
  }
  return writeSheet('Inventario', rows)
}

export async function escribirPedidosActivos(pedidos) {
  const header = ['ID PEDIDO', 'FECHA', 'ESTADO', 'CLIENTE', 'OBSERVACIÓN', 'PRODUCTOS', 'CANT ÍTEMS']
  const rows = [header]
  for (const p of pedidos) {
    const productos = p.DetPedidos?.map(d => d.Concepto?.nombre || `ID:${d.adm_conceptos_id}`).join(', ') || ''
    rows.push([
      p.id,
      fmtFecha(p.fecha_at),
      p.estado,
      p.Cliente?.nombre || 'Sin cliente',
      p.observacion || '',
      productos,
      p.DetPedidos?.length || 0,
    ])
  }
  return writeSheet('Pedidos_Activos', rows)
}

export async function escribirConfig(config) {
  const rows = [
    ['CONFIGURACIÓN AFTIM DASHBOARD', ''],
    ['', ''],
    ['Parámetro', 'Valor'],
    ['Hora inicio sync', config.horaInicio || '07:00'],
    ['Hora fin sync', config.horaFin || '17:00'],
    ['Intervalo (minutos)', config.intervalo || '120'],
    ['Auto-sync activo', config.autoSync ? 'SI' : 'NO'],
    ['Última sync exitosa', config.ultimaSync || ''],
    ['', ''],
    ['NOTA: Modifica los valores de esta hoja y recarga el dashboard para aplicar cambios.', ''],
  ]
  return writeSheet('Config', rows)
}

export async function escribirTodo(datos) {
  const resultados = await Promise.allSettled([
    escribirResumen(datos.resumen),
    escribirVentasProductos(datos.ventasProductos),
    escribirInventario(datos.inventario),
    escribirPedidosActivos(datos.pedidos),
  ])

  return resultados.map((r, i) => ({
    sheet: ['Resumen', 'Ventas_Productos', 'Inventario', 'Pedidos_Activos'][i],
    status: r.status,
    error: r.reason?.message || null,
  }))
}
