'use client'

import { useState } from 'react'

function fmtFecha(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-VE', {
    timeZone: 'America/Caracas',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function PedidosActivos({ pedidos }) {
  const [busqueda, setBusqueda] = useState('')
  const [estado, setEstado] = useState('todos')

  const estados = ['todos', ...new Set(pedidos.map(p => p.estado).filter(Boolean))]

  const filtrados = pedidos.filter(p => {
    const matchBusq = !busqueda ||
      p.Cliente?.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.id?.toString().includes(busqueda)
    const matchEstado = estado === 'todos' || p.estado === estado
    return matchBusq && matchEstado
  })

  const badgeEstado = (e) => {
    if (e === 'ENTREGADO') return 'badge-blue'
    if (e === 'FACTURADO') return 'badge-green'
    if (e === 'ANULADO') return 'badge-red'
    return 'badge-orange'
  }

  return (
    <div>
      {/* Filtros */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          placeholder="Buscar cliente o ID pedido..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          style={{ width: 260 }}
        />
        <select value={estado} onChange={e => setEstado(e.target.value)}>
          {estados.map(e => <option key={e} value={e}>{e === 'todos' ? 'Todos los estados' : e}</option>)}
        </select>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
          {filtrados.length} pedidos
        </span>
      </div>

      {/* Métricas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
        {estados.filter(e => e !== 'todos').map(e => {
          const count = pedidos.filter(p => p.estado === e).length
          return (
            <div key={e} className="card" style={{ padding: '14px 18px' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{e}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text-primary)' }}>{count}</div>
            </div>
          )
        })}
      </div>

      {/* Tabla */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Fecha</th>
                <th>Estado</th>
                <th>Cliente</th>
                <th>Observación</th>
                <th>Productos</th>
                <th style={{ textAlign: 'center' }}>Ítems</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                  {pedidos.length === 0 ? 'No hay pedidos activos' : 'Sin resultados para el filtro aplicado'}
                </td></tr>
              ) : (
                filtrados.map((p) => {
                  const productos = p.DetPedidos?.map(d => d.Concepto?.nombre || `Producto ${d.adm_conceptos_id}`).join(', ') || '—'
                  return (
                    <tr key={p.id}>
                      <td className="num" style={{ color: 'var(--accent)', fontWeight: 700 }}>#{p.id}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{fmtFecha(p.fecha_at)}</td>
                      <td><span className={`badge ${badgeEstado(p.estado)}`}>{p.estado}</span></td>
                      <td style={{ color: 'var(--text-primary)' }}>{p.Cliente?.nombre || <span style={{ color: 'var(--text-muted)' }}>Sin cliente</span>}</td>
                      <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.observacion || '—'}
                      </td>
                      <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }}>
                        {productos}
                      </td>
                      <td style={{ textAlign: 'center' }} className="num">
                        <span className="badge badge-blue">{p.DetPedidos?.length || 0}</span>
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
