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
  
  // Para el día actual, usamos el formato YYYY-MM-DD
  const hoy = fmt(now);
  const mesInicio = new Date(now.getFullYear(), now.getMonth(), 1);
  const mesFin = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    diaI: `${hoy}T00:00:00`, // Inicio del día
    diaF: `${hoy}T23:59:59`, // Fin del día
    mesI: fmt(mesInicio),
    mesF: fmt(mesFin),
  };
}

export async function obtenerTodosLosDatos() {
  const f = getFechas();

  // Queries con rangos de tiempo explícitos para el día
  const qDia = `{ getFacturas(limit: 500, filter: { anulada: { eq: 0 }, fecha_at: { gte: "${f.diaI}", lte: "${f.diaF}" } }) { total total_dolar } }`;
  const qMes = `{ getFacturas(limit: 1000, filter: { anulada: { eq: 0 }, fecha_at: { gte: "${f.mesI}", lte: "${f.mesF}" } }) { total total_dolar } }`;
  const qDet = `{ getDetFacturas(limit: 1000, filter: { fecha_at: { gte: "${f.mesI}", lte: "${f.mesF}" } }) { cantidad precio_dolar Concepto { nombre } Factura { anulada } } }`;

  try {
    const dDia = await queryAftim(qDia);
    const dMes = await queryAftim(qMes);
    const dDet = await queryAftim(qDet);

    const fDia = dDia?.getFacturas || [];
    const fMes = dMes?.getFacturas || [];
    const det = (dDet?.getDetFacturas || []).filter(d => d.Factura?.anulada === 0);

    const sumar = (arr, campo) => arr.reduce((s, i) => s + (parseFloat(i[campo]) || 0), 0);

    // Consolidación de productos (Top 10)
    const productosMap = {};
    det.forEach(d => {
      const nombre = d.Concepto?.nombre || 'Otro';
      if (!productosMap[nombre]) productosMap[nombre] = { nombre, cantidad: 0, monto_usd: 0 };
      const cant = parseFloat(d.cantidad) || 0;
      productosMap[nombre].cantidad += cant;
      productosMap[nombre].monto_usd += cant * (parseFloat(d.precio_dolar) || 0);
    });

    return {
      resumen: {
        venta_dia_bs: sumar(fDia, 'total'),
        venta_dia_usd: sumar(fDia, 'total_dolar'),
        venta_mes_bs: sumar(fMes, 'total'),
        venta_mes_usd: sumar(fMes, 'total_dolar'),
        cant_facturas_dia: fDia.length,
        ultima_actualizacion: new Date().toISOString(),
      },
      ventasProductos: {
        mes: Object.values(productosMap).sort((a, b) => b.monto_usd - a.monto_usd).slice(0, 10)
      },
      inventario: [],
      pedidos: []
    };
  } catch (error) {
    console.error("Error en Hechizo Gourmet:", error.message);
    throw error;
  }
}
