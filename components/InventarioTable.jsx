'use client'

import { useState } from 'react'

function fmtNum(n, d = 2) {
  return new Intl.NumberFormat('es-VE', { minimumFractionDigits: d, maximumFractionDigits: d }).format(n || 0)
}

export default function InventarioTable({ inventario }) {
  const [busqueda, setBusqueda] = useState('')
  const [deposito, setDeposito] = useState('todos')
  const [soloStock, setSoloStock] = useState(false)

  const depositos = ['todos', ...new Set(inventario.map(i => i.Deposito?.nombre).filter(Boolean))]

  const filtrados = inventario.filter(i => {
    const matchBusq = !busqueda ||
      i.Concepto?.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      i.Concepto?.codigo?.toLowerCase().includes(busqueda.toLowerCase())
    const matchDeposito = deposito === 'todos' || i.Deposito?.nombre === deposito
    const matchStock = !soloStock || (parseFloat(i.existencia) || 0) > 0
    return matchBusq && matchDeposito && matchStock
  })

  const totalProductos = filtrados.length
  const totalUnidades = filtrados.reduce((s, i) => s + (parseFloat(i.existencia) || 0), 0)
  const sinStock = filtrados.filter(i => (parseFloat(i.existencia) || 0) <= 0).length

  return (
    <div>
      {/* Filtros */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          placeholder="Buscar producto o código..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          style={{ width: 240 }}
        />
        <select value={deposito} onChange={e => setDeposito(e.target.value)}>
          {depositos.map(d => <option key={d} value={d}>{d === 'todos' ? 'Todos los depósitos' : d}</option>)}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)' }}>
          <input
            type="checkbox"
            checked={soloStock}
            onChange={e => setSoloStock(e.target.checked)}
            style={{ width: 'auto', accentColor: 'var(--accent)' }}
          />
          Solo con stock
        </label>
      </div>

      {/* Métricas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Productos', value: totalProductos, color: 'var(--blue)' },
          { label: 'Unidades totales', value: fmtNum(totalUnidades, 0), color: 'var(--green)' },
          { label: 'Sin stock', value: sinStock, color: sinStock > 0 ? 'var(--red)' : 'var(--green)' },
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
                <th>Producto</th>
                <th>Código</th>
                <th>Depósito</th>
                <th style={{ textAlign: 'right' }}>Existencia</th>
                <th style={{ textAlign: 'right' }}>Comprometido</th>
                <th style={{ textAlign: 'right' }}>Disponible</th>
                <th style={{ textAlign: 'right' }}>Precio</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>Sin resultados</td></tr>
              ) : (
                filtrados.map((item, i) => {
                  const exist = parseFloat(item.existencia) || 0
                  const comprometido = parseFloat(item.existencia_comprometida) || 0
                  const disponible = exist - comprometido
                  const sinStock = exist <= 0
                  const bajo = exist > 0 && exist <= 5

                  return (
                    <tr key={item.id || i}>
                      <td style={{ color: 'var(--text-primary)' }}>{item.Concepto?.nombre || '—'}</td>
                      <td><span className="badge badge-orange">{item.Concepto?.codigo || '—'}</span></td>
                      <td style={{ color: 'var(--text-muted)' }}>{item.Deposito?.nombre || '—'}</td>
                      <td style={{ textAlign: 'right' }} className="num">{fmtNum(exist)}</td>
                      <td style={{ textAlign: 'right', color: comprometido > 0 ? 'var(--accent)' : undefined }} className="num">{fmtNum(comprometido)}</td>
                      <td style={{ textAlign: 'right', color: disponible <= 0 ? 'var(--red)' : disponible <= 5 ? 'var(--accent)' : 'var(--green)', fontWeight: 600 }} className="num">
                        {fmtNum(disponible)}
                      </td>
                      <td style={{ textAlign: 'right' }} className="num">Bs {fmtNum(item.precio)}</td>
                      <td>
                        {sinStock
                          ? <span className="badge badge-red">Sin stock</span>
                          : bajo
                            ? <span className="badge badge-orange">Stock bajo</span>
                            : <span className="badge badge-green">OK</span>
                        }
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
