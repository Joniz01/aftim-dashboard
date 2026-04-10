const AFTIM_URL = process.env.AFTIM_URL;
const AFTIM_TENANT = process.env.AFTIM_TENANT;
const AFTIM_TOKEN = process.env.AFTIM_TOKEN;

async function queryAftim(query, variables = {}) {
  const res = await fetch(AFTIM_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Tenant-id': AFTIM_TENANT,
      'Authorization': `Bearer ${AFTIM_TOKEN}`,
    },
    body: JSON.stringify({ query, variables }),
    cache: 'no-store',
  });

  const json = await res.json();
  if (json.errors) {
    throw new Error(json.errors[0].message);
  }
  return json.data;
}

function getFechas() {
  const now = new Date();
  // Formato YYYY-MM-DD para evitar errores de zona horaria
  const fmt = (d) => d.toISOString().split('T')[0];

  const diaInicio = new Date(now);
  const mesInicio = new Date(now.getFullYear(), now.getMonth(), 1);
  const mesFin = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    diaInicio: fmt(diaInicio),
    diaFin: fmt(diaInicio),
    mesInicio: fmt(mesInicio),
    mesFin: fmt(mesFin),
  };
}

async function getFacturasRango(fi, ff) {
  const query = `query($fi: DateOrDateTime, $ff: DateOrDateTime) {
    getFacturas(limit: 1000, filter: { anulada: { eq: 0 }, fecha_at: { gte: $fi, lte: $ff } }) {
      total total_dolar
    }
  }`;
  const data = await queryAftim(query, { fi, ff });
  return data?.getFacturas || [];
}

async function getVentasProductos(fi, ff) {
  const query = `query($fi: DateOrDateTime, $ff: DateOrDateTime) {
    getDetFacturas(limit: 1000, filter: { fecha_at: { gte: $fi, lte: $ff } }) {
      cantidad precio precio_dolar
      Concepto { nombre }
      Factura { anulada }
    }
  }`;
  const data = await queryAftim(query, { fi, ff });
  return (data?.getDetFacturas || []).filter(d => d.Factura?.anulada === 0);
}

export async function obtenerTodosLosDatos() {
  const f = getFechas();

  // Ejecución secuencial para evitar el error 400 por saturación
  const facturasDia = await getFacturasRango(f.diaInicio, f.diaFin);
  const facturasMes = await getFacturasRango(f.mesInicio, f.mesFin);
  const detMes = await getVentasProductos(f.mesInicio, f.mesFin);

  const sumar = (arr, campo) => arr.reduce((s, i) => s + (parseFloat(i[campo]) || 0), 0);

  // Consolidación de productos para el Top
  const productosMap = {};
  detMes.forEach(d => {
    const nombre = d.Concepto?.nombre || 'Otro';
    if (!productosMap[nombre]) productosMap[nombre] = { nombre, cantidad: 0, monto_usd: 0 };
    productosMap[nombre].cantidad += parseFloat(d.cantidad) || 0;
    productosMap[nombre].monto_usd += (parseFloat(d.cantidad) || 0) * (parseFloat(d.precio_dolar) || 0);
  });

  return {
    resumen: {
      venta_dia_bs: sumar(facturasDia, 'total'),
      venta_dia_usd: sumar(facturasDia, 'total_dolar'),
      venta_mes_bs: sumar(facturasMes, 'total'),
      venta_mes_usd: sumar(facturasMes, 'total_dolar'),
      cant_facturas_dia: facturasDia.length,
      ultima_actualizacion: new Date().toISOString(),
    },
    ventasProductos: {
      mes: Object.values(productosMap).sort((a, b) => b.monto_usd - a.monto_usd).slice(0, 10)
    },
    inventario: [],
    pedidos: []
  };
}
