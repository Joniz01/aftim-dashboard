'use client'

import { useState } from 'react'

function fmtUsd(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0)
}
function fmtBs(n) {
  return new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2 }).format(n || 0)
}

const PERIODOS = [
  { id: 'dia', label: 'Día Actual' },
  { id: 'semana', label: 'Semana Actual' },
  { id: 'semanaAnt', label: 'Semana Anterior' },
  { id: 'mes', label: 'Mes Actual' },
  { id: 'mesAnt', label: 'Mes Anterior' },
]

export default function VentasProductos({ ventasProductos }) {
  const [periodo, setPeriodo] = useState('mes')
  const [busqueda, setBusqueda] = useState('')

  const datos = ventasProductos?.[periodo] || []
  const filtrados = datos.filter(p =>
    p.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.codigo?.toLowerCase().includes(busqueda.toLowerCase())
  )

  const totalUsd = filtrados.reduce((s, p) => s + (p.monto_usd || 0), 0)
  const totalBs = filtrados.reduce((s, p) => s + (p.monto_bs || 0), 0)
  const totalCant = filtrados.reduce((s, p) => s + (p.cantidad || 0), 0)

  return (
    <div>
      {/* Controles */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {PERIODOS.map(p => (
            <button
              key={p.id}
              onClick={() => setPeriodo(p.id)}
              style={{
                padding: '6px 14px',
                borderRadius: 8,
                border: '1px solid',
                borderColor: periodo === p.id ? 'var(--accent)' : 'var(--border)',
                background: periodo === p.id ? 'var(--accent-dim)' : 'transparent',
                color: periodo === p.id ? 'var(--accent)' : 'var(--text-muted)',
                fontSize: 12,
                fontWeight: periodo === p.id ? 600 : 400,
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
        <input
          placeholder="Buscar producto..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          style={{ marginLeft: 'auto', width: 200 }}
        />
      </div>

      {/* Totales */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total USD', value: fmtUsd(totalUsd), color: 'var(--green)' },
          { label: 'Total Bs', value: `Bs ${fmtBs(totalBs)}`, color: 'var(--accent)' },
          { label: 'Unidades vendidas', value: totalCant.toLocaleString(), color: 'var(--blue)' },
        ].map(t => (
          <div key={t.label} className="card" style={{ padding: '14px 18px' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{t.label}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: t.color }}>{t.value}</div>
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Producto</th>
                <th>Código</th>
                <th style={{ textAlign: 'right' }}>Cantidad</th>
                <th style={{ textAlign: 'right' }}>Monto USD</th>
                <th style={{ textAlign: 'right' }}>Monto Bs</th>
                <th style={{ textAlign: 'right' }}>% del total</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>Sin datos para este período</td></tr>
              ) : (
                filtrados.map((p, i) => {
                  const pct = totalUsd > 0 ? (p.monto_usd / totalUsd * 100) : 0
                  return (
                    <tr key={p.id || i}>
                      <td style={{ color: 'var(--text-muted)', width: 40 }}>{i + 1}</td>
                      <td style={{ color: 'var(--text-primary)', fontWeight: i < 3 ? 600 : 400 }}>
                        {i < 3 && <span style={{ marginRight: 6 }}>{['🥇', '🥈', '🥉'][i]}</span>}
                        {p.nombre}
                      </td>
                      <td><span className="badge badge-orange">{p.codigo || '—'}</span></td>
                      <td style={{ textAlign: 'right' }} className="num">{(p.cantidad || 0).toLocaleString()}</td>
                      <td style={{ textAlign: 'right', color: 'var(--green)', fontWeight: 600 }} className="num">{fmtUsd(p.monto_usd)}</td>
                      <td style={{ textAlign: 'right' }} className="num">Bs {fmtBs(p.monto_bs)}</td>
                      <td style={{ textAlign: 'right', width: 120 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                          <div style={{ flex: 1, height: 4, background: 'var(--border)', borderRadius: 2, maxWidth: 60 }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: 'var(--accent)', borderRadius: 2 }} />
                          </div>
                          <span className="num" style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 36 }}>{pct.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
