'use client'

import { useState, useEffect, useCallback } from 'react'
import KPICards from '@/components/KPICards'
import VentasProductos from '@/components/VentasProductos'
import InventarioTable from '@/components/InventarioTable'
import PedidosActivos from '@/components/PedidosActivos'
import Configuracion from '@/components/Configuracion'
import { RefreshCw, LayoutDashboard, ShoppingCart, Package, ClipboardList, Settings, Wifi, WifiOff } from 'lucide-react'

const TABS = [
  { id: 'resumen', label: 'Resumen', icon: LayoutDashboard },
  { id: 'ventas', label: 'Ventas por Producto', icon: ShoppingCart },
  { id: 'inventario', label: 'Inventario', icon: Package },
  { id: 'pedidos', label: 'Pedidos Activos', icon: ClipboardList },
  { id: 'config', label: 'Configuración', icon: Settings },
]

export default function Dashboard() {
  const [tab, setTab] = useState('resumen')
  const [datos, setDatos] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lastSync, setLastSync] = useState(null)
  const [syncLog, setSyncLog] = useState([])
  const [config, setConfig] = useState({
    horaInicio: '07',
    horaFin: '17',
    intervalo: '120',
    autoSync: true,
  })

  const ejecutarSync = useCallback(async (manual = false) => {
    setLoading(true)
    setError(null)
    const inicio = Date.now()
    try {
      const res = await fetch('/api/sync', { method: 'POST' })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      setDatos(json)
      const ts = new Date().toLocaleString('es-VE', { timeZone: 'America/Caracas' })
      setLastSync(ts)
      setSyncLog(prev => [{
        ts,
        tipo: manual ? 'Manual' : 'Auto',
        elapsed: Date.now() - inicio,
        facturasDia: json.resumen?.cant_facturas_dia,
        ventaDiaUsd: json.resumen?.venta_dia_usd,
      }, ...prev.slice(0, 19)])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  // Carga inicial
  useEffect(() => {
    ejecutarSync(false)
  }, [])

  // Auto-sync según configuración
  useEffect(() => {
    if (!config.autoSync) return
    const intervaloMs = parseInt(config.intervalo) * 60 * 1000
    const timer = setInterval(() => {
      const horaVE = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Caracas' })).getHours()
      if (horaVE >= parseInt(config.horaInicio) && horaVE < parseInt(config.horaFin)) {
        ejecutarSync(false)
      }
    }, intervaloMs)
    return () => clearInterval(timer)
  }, [config, ejecutarSync])

  const horaActual = new Date().toLocaleTimeString('es-VE', {
    timeZone: 'America/Caracas',
    hour: '2-digit', minute: '2-digit',
  })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>

      {/* Header */}
      <header style={{
        borderBottom: '1px solid var(--border)',
        background: 'rgba(10,10,15,0.95)',
        backdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        padding: '0 24px',
      }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 32, height: 32,
              background: 'var(--accent)',
              borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-display)', fontSize: 18, color: '#fff',
            }}>A</div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: '0.05em', color: 'var(--text-primary)', lineHeight: 1 }}>
                AFTIM DASHBOARD
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Hechizo Gourmet
              </div>
            </div>
          </div>

          {/* Status + Sync */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Hora */}
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>
              🕐 {horaActual} VE
            </span>

            {/* Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {error
                ? <><WifiOff size={14} color="var(--red)" /><span style={{ fontSize: 11, color: 'var(--red)' }}>Error</span></>
                : datos
                  ? <><div className="pulse-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)' }} /><span style={{ fontSize: 11, color: 'var(--green)' }}>En línea</span></>
                  : <><Wifi size={14} color="var(--text-muted)" /><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Esperando...</span></>
              }
            </div>

            {/* Last sync */}
            {lastSync && (
              <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'none' }} className="hidden md:inline">
                Sync: {lastSync}
              </span>
            )}

            {/* Botón sync */}
            <button
              onClick={() => ejecutarSync(true)}
              disabled={loading}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: loading ? 'var(--accent-dim)' : 'var(--accent)',
                color: loading ? 'var(--accent)' : '#fff',
                border: loading ? '1px solid var(--accent)' : 'none',
                borderRadius: 8,
                padding: '7px 14px',
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: '0.05em',
              }}
            >
              <RefreshCw size={13} className={loading ? 'spin' : ''} />
              {loading ? 'SINCRONIZANDO...' : 'SINCRONIZAR'}
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <nav style={{ borderBottom: '1px solid var(--border)', padding: '0 24px', background: 'var(--bg-card)' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', gap: 2 }}>
          {TABS.map(t => {
            const Icon = t.icon
            const active = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '12px 16px',
                  background: 'none',
                  border: 'none',
                  borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
                  color: active ? 'var(--accent)' : 'var(--text-muted)',
                  fontSize: 12,
                  fontWeight: active ? 600 : 400,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  marginBottom: -1,
                }}
              >
                <Icon size={13} />
                {t.label}
              </button>
            )
          })}
        </div>
      </nav>

      {/* Error banner */}
      {error && (
        <div style={{
          background: 'var(--red-dim)', border: '1px solid var(--red)',
          borderRadius: 8, margin: '16px 24px', padding: '12px 16px',
          color: 'var(--red)', fontSize: 13,
        }}>
          ⚠️ Error de sincronización: {error}
        </div>
      )}

      {/* Contenido */}
      <main style={{ maxWidth: 1400, margin: '0 auto', padding: '24px' }}>
        {!datos && !error && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
            <RefreshCw size={32} className="spin" style={{ margin: '0 auto 16px', display: 'block', color: 'var(--accent)' }} />
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, letterSpacing: '0.1em' }}>
              CARGANDO DATOS...
            </div>
            <div style={{ fontSize: 12, marginTop: 8 }}>Consultando API AFTIM</div>
          </div>
        )}

        {datos && (
          <div className="fade-in">
            {tab === 'resumen' && <KPICards resumen={datos.resumen} ventasProductos={datos.ventasProductos} />}
            {tab === 'ventas' && <VentasProductos ventasProductos={datos.ventasProductos} />}
            {tab === 'inventario' && <InventarioTable inventario={datos.inventario} />}
            {tab === 'pedidos' && <PedidosActivos pedidos={datos.pedidos} />}
            {tab === 'config' && (
              <Configuracion
                config={config}
                setConfig={setConfig}
                syncLog={syncLog}
                lastSync={lastSync}
                onSync={() => ejecutarSync(true)}
                loading={loading}
              />
            )}
          </div>
        )}
      </main>
    </div>
  )
}
