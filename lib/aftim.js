const AFTIM_URL = process.env.AFTIM_URL;
const AFTIM_TENANT = process.env.AFTIM_TENANT;
const AFTIM_TOKEN = process.env.AFTIM_TOKEN;

async function queryAftim(query) {
  const res = await fetch(AFTIM_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Tenant-id': AFTIM_TENANT,
      'Authorization': `Bearer ${AFTIM_TOKEN}`,
    },
    // Inyectamos el query limpio para evitar errores de red y AST
    body: JSON.stringify({ query: query.replace(/\s+/g, ' ').trim() }),
    cache: 'no-store',
  });

  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0].message);
  return json.data;
}

function getFechas() {
  const now = new Date();
  const fmt = (d) => d.toISOString().split('T')[0];
  const mesInicio = new Date(now.getFullYear(), now.getMonth(), 1);
  const mesFin = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    hoy: fmt(now),
    mesI: fmt(mesInicio),
    mesF: fmt(mesFin),
  };
}

export async function obtenerTodosLosDatos() {
  const f = getFechas();

  // Queries con fechas inyectadas directamente para máxima compatibilidad
  const qDia = `{ getFacturas(limit: 500, filter: { anulada: { eq: 0 }, fecha_at: { gte: "${f.hoy}", lte: "${f.hoy}" } }) { total total_dolar } }`;
  const qMes = `{ getFacturas(limit: 1000, filter: { anulada: { eq: 0 }, fecha_at: { gte: "${f.mesI}", lte: "${f.mesF}" } }) { total total_dolar } }`;
  const qDet = `{ getDetFacturas(limit: 1000, filter: { fecha_at: { gte: "${f.mesI}", lte: "${f.mesF}" } }) { cantidad precio_dolar Concepto { nombre } Factura { anulada } } }`;

  try {
    // Ejecución secuencial para proteger la estabilidad del servidor
    const dDia = await queryAftim(qDia);
    const dMes = await queryAftim(qMes);
    const dDet = await queryAftim(qDet);

    const fDia = dDia?.getFacturas || [];
    const fMes = dMes?.getFacturas || [];
    const det = (dDet?.getDetFacturas || []).filter(d => d.Factura?.anulada === 0);

    const sumar = (arr, campo) => arr.reduce((s, i) => s + (parseFloat(i[campo]) || 0), 0);

    return {
      resumen: {
        venta_dia_bs: sumar(fDia, 'total'),
        venta_dia_usd: sumar(fDia, 'total_dolar'),
        venta_mes_bs: sumar(fMes, 'total'),
        venta_mes_usd: sumar(fMes, 'total_dolar'),
        cant_facturas_dia: fDia.length,
        ultima_actualizacion: new Date().toISOString(),
      },
      ventasProductos: { mes: [] }, // Se puede expandir luego
      inventario: [],
      pedidos: []
    };
  } catch (error) {
    console.error("Error sincronizando Hechizo Gourmet:", error.message);
    throw error;
  }
}
