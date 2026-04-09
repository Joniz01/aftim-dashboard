// app/api/sync/route.js — Endpoint principal de sincronización

import { obtenerTodosLosDatos } from '@/lib/aftim'
import { escribirTodo } from '@/lib/sheets'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request) {
  const startTime = Date.now()

  try {
    console.log('[SYNC] Iniciando sincronización AFTIM...')

    // 1. Obtener datos de AFTIM
    const datos = await obtenerTodosLosDatos()
    console.log('[SYNC] Datos obtenidos de AFTIM:', {
      facturasDia: datos.resumen.cant_facturas_dia,
      productosMes: datos.ventasProductos.mes.length,
      inventario: datos.inventario.length,
      pedidos: datos.pedidos.length,
    })

    // 2. Escribir en Google Sheets
    const sheetsResult = await escribirTodo(datos)
    console.log('[SYNC] Sheets escritos:', sheetsResult)

    const elapsed = Date.now() - startTime

    return Response.json({
      success: true,
      timestamp: new Date().toISOString(),
      elapsed_ms: elapsed,
      resumen: {
        venta_dia_bs: datos.resumen.venta_dia_bs,
        venta_dia_usd: datos.resumen.venta_dia_usd,
        venta_mes_bs: datos.resumen.venta_mes_bs,
        venta_mes_usd: datos.resumen.venta_mes_usd,
        cant_facturas_dia: datos.resumen.cant_facturas_dia,
        cant_pedidos_activos: datos.pedidos.length,
        cant_productos_inventario: datos.inventario.length,
      },
      sheets: sheetsResult,
      datos,
    })

  } catch (error) {
    console.error('[SYNC] Error:', error)
    return Response.json(
      { success: false, error: error.message, timestamp: new Date().toISOString() },
      { status: 500 }
    )
  }
}

export async function GET() {
  return Response.json({ status: 'Sync endpoint activo. Usa POST para ejecutar.' })
}
