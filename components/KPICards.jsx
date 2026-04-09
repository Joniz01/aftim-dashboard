'use client'

import { TrendingUp, TrendingDown, DollarSign, ShoppingBag, Calendar, BarChart2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

function fmtBs(n) {
  return new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0)
}
function fmtUsd(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n || 0)
}

function KPICard({ label, valueBs, valueUsd, icon: Icon, color, compare, compareLabel }) {
  const diff = compare !== undefined ? valueUsd - compare : null
  const pct = compare && compare !== 0 ? ((valueUsd - compare) / compare * 100) : null
  const up = diff > 0

  return (
    <div className="card" style={{ padding: '20px 24px', position: 'relative', overflow: 'hidden' }}>
      {/* Accent bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: 3, height: '100%', background: color, borderRadius: '12px 0 0 12px' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <span style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {label}
        </span>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={14} color={color} />
        </div>
      </div>

      <div style={{ marginBottom: 4 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 28, letterSpacing: '0.02em', color: 'var(--text-primary)', lineHeight: 1 }}>
          {fmtUsd(valueUsd)}
        </span>
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 10 }}>
        Bs {fmtBs(valueBs)}
      </div>

      {pct !== null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {up ? <TrendingUp size={12} color="var(--green)" /> : <TrendingDown size={12} color="var(--red)" />}
          <span style={{ fontSize: 11, color: up ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
            {up ? '+' : ''}{pct.toFixed(1)}%
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>vs {compareLabel}</span>
        </div>
      )}
    </div>
  )
}

export default function KPICards({ resumen, ventasProductos }) {
  const topProductosMes = (ventasProductos?.mes || []).slice(0, 8)

  const chartData = topProductosMes.map(p => ({
    name: p.nombre?.length > 16 ? p.nombre.substring(0, 16) + '…' : p.nombre,
    usd: parseFloat(p.monto_usd?.toFixed(2)),
    cantidad: p.cantidad,
  }))

  return (
    <div>
      {/* KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <KPICard
          label="Venta del Día"
          valueBs={resumen.venta_dia_bs}
          valueUsd={resumen.venta_dia_usd}
          icon={ShoppingBag}
          color="var(--accent)"
        />
        <KPICard
          label="Semana Actual"
          valueBs={resumen.venta_semana_bs}
          valueUsd={resumen.venta_semana_usd}
          icon={Calendar}
          color="var(--blue)"
          compare={resumen.venta_semana_ant_usd}
          compareLabel="sem. ant."
        />
        <KPICard
          label="Mes Actual"
          valueBs={resumen.venta_mes_bs}
          valueUsd={resumen.venta_mes_usd}
          icon={BarChart2}
          color="var(--green)"
          compare={resumen.venta_mes_ant_usd}
          compareLabel="mes ant."
        />
        <KPICard
          label="Mes Anterior"
          valueBs={resumen.venta_mes_ant_bs}
          valueUsd={resumen.venta_mes_ant_usd}
          icon={DollarSign}
          color="#8888a8"
        />
      </div>

      {/* Stats secundarios */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Facturas hoy', value: resumen.cant_facturas_dia, color: 'var(--accent)' },
          { label: 'Facturas mes', value: resumen.cant_facturas_mes, color: 'var(--green)' },
          { label: 'Ticket prom. día USD', value: resumen.cant_facturas_dia > 0 ? fmtUsd(resumen.venta_dia_usd / resumen.cant_facturas_dia) : '$0.00', color: 'var(--blue)' },
          { label: 'Ticket prom. mes USD', value: resumen.cant_facturas_mes > 0 ? fmtUsd(resumen.venta_mes_usd / resumen.cant_facturas_mes) : '$0.00', color: '#8888a8' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '14px 18px' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
              {s.label}
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: s.color }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Chart Top Productos del Mes */}
      <div className="card" style={{ padding: '20px 24px' }}>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, letterSpacing: '0.05em' }}>
              TOP PRODUCTOS — MES ACTUAL
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Por monto en USD</div>
          </div>
        </div>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 40 }}>
              <XAxis
                dataKey="name"
                tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                angle={-35}
                textAnchor="end"
                interval={0}
              />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                formatter={(v) => [`$${v.toFixed(2)}`, 'Monto USD']}
              />
              <Bar dataKey="usd" radius={[4, 4, 0, 0]}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? 'var(--accent)' : i < 3 ? 'var(--blue)' : 'var(--text-muted)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Sin datos de ventas para el período</div>
        )}
      </div>
    </div>
  )
}
