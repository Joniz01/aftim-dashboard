// app/api/cron/route.js — Trigger automático de Vercel Cron

import { obtenerTodosLosDatos } from '@/lib/aftim'
import { escribirTodo } from '@/lib/sheets'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request) {
  // Verificar secret del cron
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Verificar horario permitido (7am - 5pm hora Venezuela UTC-4)
  const now = new Date()
  const horaVE = (now.getUTCHours() - 4 + 24) % 24
  const configHoraInicio = parseInt(process.env.CRON_HORA_INICIO || '7')
  const configHoraFin = parseInt(process.env.CRON_HORA_FIN || '17')

  if (horaVE < configHoraInicio || horaVE >= configHoraFin) {
    return Response.json({
      skipped: true,
      reason: `Fuera del horario permitido (${configHoraInicio}:00 - ${configHoraFin}:00 VE). Hora actual VE: ${horaVE}:00`,
    })
  }

  try {
    console.log(`[CRON] Ejecutando sync automático. Hora VE: ${horaVE}:00`)
    const datos = await obtenerTodosLosDatos()
    const sheetsResult = await escribirTodo(datos)

    return Response.json({
      success: true,
      timestamp: new Date().toISOString(),
      hora_ve: horaVE,
      resumen: {
        venta_dia_bs: datos.resumen.venta_dia_bs,
        venta_dia_usd: datos.resumen.venta_dia_usd,
        venta_mes_bs: datos.resumen.venta_mes_bs,
        venta_mes_usd: datos.resumen.venta_mes_usd,
      },
      sheets: sheetsResult,
    })
  } catch (error) {
    console.error('[CRON] Error:', error)
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
