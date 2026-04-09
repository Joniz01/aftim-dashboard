'use client'

import { RefreshCw, Clock, CheckCircle, XCircle } from 'lucide-react'

export default function Configuracion({ config, setConfig, syncLog, lastSync, onSync, loading }) {
  const update = (key, value) => setConfig(prev => ({ ...prev, [key]: value }))

  const horas = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
  const intervalos = [
    { value: '30', label: 'Cada 30 minutos' },
    { value: '60', label: 'Cada 1 hora' },
    { value: '120', label: 'Cada 2 horas' },
    { value: '180', label: 'Cada 3 horas' },
    { value: '240', label: 'Cada 4 horas' },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

      {/* Panel configuración */}
      <div>
        <div className="card" style={{ padding: 24, marginBottom: 16 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, letterSpacing: '0.08em', marginBottom: 20 }}>
            ⚙️ CONFIGURACIÓN DE SINCRONIZACIÓN
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Auto sync toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-primary)', marginBottom: 2 }}>Auto-sincronización</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Actualización automática según horario</div>
              </div>
              <button
                onClick={() => update('autoSync', !config.autoSync)}
                style={{
                  width: 44, height: 24, borderRadius: 12, border: 'none',
                  background: config.autoSync ? 'var(--green)' : 'var(--border)',
                  position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
                }}
              >
                <div style={{
                  position: 'absolute', top: 2, left: config.autoSync ? 22 : 2,
                  width: 20, height: 20, borderRadius: '50%', background: '#fff',
                  transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                }} />
              </button>
            </div>

            {/* Hora inicio */}
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Hora de inicio
              </div>
              <select value={config.horaInicio} onChange={e => update('horaInicio', e.target.value)} style={{ width: '100%' }}>
                {horas.map(h => <option key={h} value={h}>{h}:00</option>)}
              </select>
            </div>

            {/* Hora fin */}
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Hora de fin
              </div>
              <select value={config.horaFin} onChange={e => update('horaFin', e.target.value)} style={{ width: '100%' }}>
                {horas.map(h => <option key={h} value={h}>{h}:00</option>)}
              </select>
            </div>

            {/* Intervalo */}
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Intervalo de actualización
              </div>
              <select value={config.intervalo} onChange={e => update('intervalo', e.target.value)} style={{ width: '100%' }}>
                {intervalos.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
              </select>
            </div>

            {/* Resumen config activa */}
            <div style={{ background: 'var(--bg-primary)', borderRadius: 8, padding: '12px 16px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Clock size={13} color="var(--accent)" />
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Configuración activa</span>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent)' }}>
                {config.autoSync
                  ? `Auto-sync: ${config.horaInicio}:00 → ${config.horaFin}:00 | Cada ${config.intervalo} min`
                  : 'Auto-sync desactivado — solo manual'
                }
              </div>
            </div>
          </div>
        </div>

        {/* Botón sync manual */}
        <button
          onClick={onSync}
          disabled={loading}
          style={{
            width: '100%', padding: '14px 20px',
            background: loading ? 'var(--accent-dim)' : 'var(--accent)',
            color: loading ? 'var(--accent)' : '#fff',
            border: loading ? '1px solid var(--accent)' : 'none',
            borderRadius: 10, fontSize: 14, fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <RefreshCw size={16} className={loading ? 'spin' : ''} />
          {loading ? 'Sincronizando...' : 'Ejecutar Sincronización Manual'}
        </button>

        {lastSync && (
          <div style={{ textAlign: 'center', marginTop: 10, fontSize: 11, color: 'var(--text-muted)' }}>
            Última sync exitosa: {lastSync}
          </div>
        )}
      </div>

      {/* Log de sincronizaciones */}
      <div className="card" style={{ padding: 24 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, letterSpacing: '0.08em', marginBottom: 16 }}>
          📋 LOG DE SINCRONIZACIONES
        </div>

        {syncLog.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>
            Sin historial aún. Ejecuta una sincronización.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {syncLog.map((log, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px',
                background: 'var(--bg-primary)',
                borderRadius: 8,
                border: '1px solid var(--border)',
              }}>
                <CheckCircle size={14} color="var(--green)" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-primary)', marginBottom: 2 }}>
                    {log.ts}
                    <span className="badge badge-orange" style={{ marginLeft: 8 }}>{log.tipo}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {log.facturasDia} facturas hoy · ${(log.ventaDiaUsd || 0).toFixed(2)} USD · {log.elapsed}ms
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info variables de entorno */}
        <div style={{ marginTop: 20, padding: '12px 16px', background: 'var(--accent-dim)', borderRadius: 8, border: '1px solid var(--accent)' }}>
          <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600, marginBottom: 6 }}>
            ⚡ CRON JOB EN VERCEL
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            El cron de Vercel ejecuta <code style={{ color: 'var(--accent)' }}>/api/cron</code> cada 2 horas.
            Para cambiar el horario del cron debes modificar <code style={{ color: 'var(--accent)' }}>vercel.json</code> y hacer un nuevo deploy.
            El intervalo de esta pantalla controla el auto-sync del navegador.
          </div>
        </div>
      </div>
    </div>
  )
}
