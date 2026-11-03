const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/+$/, '');

const organizationReferenceData = [
  {
    matches: ['pdvsa'],
    genericTitles: ['pdvsa', 'petroleo', 'pdvsa petroleo sa'],
    title: 'Mantenimiento Mayor de Turbocompresores en Complejo Jusepín',
    location: 'Monagas, Venezuela',
    budget: 480000,
    sector: 'Infraestructura',
    details: {
      referenceCode: 'LIC-PDVSA-2026-042',
      description: 'Inspección general, reemplazo de álabes y pruebas dinámicas de alineación para unidades de compresión de gas natural.',
      requirements: [
        'Inscripción Activa y Calificada en el RNC (SNC)',
        'Solvencia Laboral Vigente emitida por el MPPST',
        'Solvencias de IVSS, INCES y BANAVIH al día',
        'Certificación ISO 9001 / ISO 45001 en seguridad industrial',
      ],
      attachments: [
        { name: 'Pliego_Tecnico_PDVSA_042.pdf', url: null },
        { name: 'Anexo_A_Matriz_Riesgos.pdf', url: null },
      ],
      closingDate: '2026-11-10T12:00:00.000Z',
    },
  },
  {
    matches: ['ministerio del poder popular para la salud', 'mpps'],
    genericTitles: ['mpps', 'salud', 'ministerio del poder popular para la salud mpps'],
    title: 'Dotación de Equipos Quirúrgicos para Red Hospitalaria Central',
    location: 'Caracas, Distrito Capital',
    budget: 210000,
    sector: 'Salud',
    details: {
      referenceCode: 'LIC-MPPS-2026-118',
      description: 'Adquisición de 12 mesas de anestesia digital, electrobisturíes de alta frecuencia y monitores de signos vitales multiparámetro.',
      requirements: [
        'Registro Sanitario de Dispositivos Médicos (MPPS)',
        'RNC Vigente en Renglón Medicamentos y Suministros',
        'Fianza de fiel cumplimiento por 15% del valor adjudicado',
      ],
      attachments: [
        { name: 'Especificaciones_Tecnicas_Salud.pdf', url: null },
        { name: 'Terminos_Referencia_MPPS.pdf', url: null },
      ],
      closingDate: '2026-11-04T12:00:00.000Z',
    },
  },
  {
    matches: ['metro de caracas'],
    genericTitles: ['metro', 'metro de caracas', 'ca metro de caracas'],
    title: 'Rehabilitación Integral de Sistema de Rodamiento Línea 1',
    location: 'Caracas, Venezuela',
    budget: 850000,
    sector: 'Construcción',
    details: {
      referenceCode: 'LIC-METRO-2026-009',
      description: 'Sustitución de balasto, rieles y sistemas de electrificación en el tramo Propatria - Palo Verde.',
      requirements: [
        'Experiencia comprobada en obras civiles ferroviarias (> 5 años)',
        'Fianza de licitación expedida por Entidad Financiera de la SUDEBAN',
      ],
      attachments: [
        { name: 'Pliego_Condiciones_Metro_L1.pdf', url: null },
      ],
      closingDate: '2026-12-01T12:00:00.000Z',
    },
  },
  {
    matches: ['cantv'],
    genericTitles: ['cantv', 'telecomunicaciones'],
    title: 'Despliegue de Red Fibra Óptica GPON Sector Norte',
    location: 'Maracaibo, Zulia',
    budget: 175000,
    sector: 'Tecnología',
    details: {
      referenceCode: 'LIC-CANTV-2026-205',
      description: 'Tendido de 45 km de fibra óptica aérea y canalizada con habilitación de 12 nodos OLT para acceso de alta velocidad.',
      requirements: [
        'Habilitación Administrativa CONATEL',
        'RNC Vigente con capacidad de contratación probada',
      ],
      attachments: [
        { name: 'Memoria_Descriptiva_GPON.pdf', url: null },
        { name: 'Mapa_Tendido_Zulia.pdf', url: null },
      ],
      closingDate: '2026-11-18T12:00:00.000Z',
    },
  },
  {
    matches: ['ministerio del poder popular para la alimentacion', 'ministerio para la alimentacion'],
    genericTitles: ['alimentacion', 'ministerio del poder popular para la alimentacion'],
    title: 'Suministro de Granolas e Insumos Agroindustriales Q1 2027',
    location: 'Barquisimeto, Lara',
    budget: 320000,
    sector: 'Alimentación',
    details: {
      referenceCode: 'LIC-MINAL-2026-088',
      description: 'Procesamiento, empaque y distribución logística de harina de maíz precocida y rubros de la cesta básica.',
      requirements: [
        'Permiso de Inocuidad de Alimentos (SACS)',
        'Capacidad de almacenamiento en cavas con temperatura controlada',
      ],
      attachments: [
        { name: 'Requerimientos_Logistica_Alimentos.pdf', url: null },
      ],
      closingDate: '2026-10-25T12:00:00.000Z',
    },
  },
];

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function getReferenceData(licitation) {
  const organization = normalizeText(licitation.organization);
  return organizationReferenceData.find(({ matches }) => matches.some((match) => organization.includes(match)));
}

function getEconomicSector(value, referenceData) {
  const rawSector = String(value || '').trim();
  const normalizedSector = normalizeText(rawSector);

  if (!rawSector || normalizedSector === 'general') {
    return referenceData?.sector || 'Otros';
  }

  if (normalizedSector.includes('infra')) return 'Infraestructura';
  if (normalizedSector.includes('salud') || normalizedSector.includes('medic')) return 'Salud';
  if (normalizedSector.includes('constru') || normalizedSector.includes('obra')) return 'Construcción';
  if (normalizedSector.includes('tecnolog') || normalizedSector.includes('telecom') || normalizedSector.includes('informat')) return 'Tecnología';
  if (normalizedSector.includes('aliment') || normalizedSector.includes('agro')) return 'Alimentación';

  return rawSector;
}

export async function apiRequest(path, { token, ...options } = {}) {
  const headers = { ...(options.headers || {}) };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  let response;
  try {
    response = await fetch(`${API_URL}/api/v1${path}`, { ...options, headers });
  } catch (error) {
    throw new Error(`No se pudo conectar con la API en ${API_URL}. Verifica que el backend esté iniciado.`);
  }

  let payload;
  try {
    payload = await response.json();
  } catch (error) {
    throw new Error(`La API respondió con un formato inesperado (HTTP ${response.status}).`);
  }

  if (!response.ok) {
    const error = new Error(payload.error?.message || payload.message || `La solicitud falló (HTTP ${response.status}).`);
    error.status = response.status;
    throw error;
  }

  return payload.data;
}

export function mapLicitation(licitation) {
  const referenceData = getReferenceData(licitation);
  const referenceDetails = referenceData?.details;
  const currentTitle = String(licitation.title || '').trim();
  const normalizedTitle = normalizeText(currentTitle);
  const titleIsGeneric = !currentTitle
    || normalizedTitle === normalizeText(licitation.organization)
    || referenceData?.genericTitles.includes(normalizedTitle);
  const title = titleIsGeneric && referenceData ? referenceData.title : currentTitle;
  const rawBudget = Number(licitation.budget);
  const hasBudget = Number.isFinite(rawBudget) && rawBudget > 0;
  const location = String(licitation.location || '').trim();
  const hasLocation = location && normalizeText(location) !== 'no especificada';
  const closingDateValue = referenceDetails?.closingDate || licitation.closingDate;
  const closingDate = closingDateValue ? new Date(closingDateValue) : null;
  const budget = hasBudget ? rawBudget : referenceData?.budget || rawBudget;
  const rawStatus = String(licitation.status || '').trim().toLowerCase().replace(/[_-]+/g, ' ');
  const statusLabels = {
    active: 'Abierta',
    open: 'Abierta',
    abierta: 'Abierta',
    evaluation: 'En evaluación',
    evaluating: 'En evaluación',
    'under evaluation': 'En evaluación',
    'in evaluation': 'En evaluación',
    'in review': 'En evaluación',
    review: 'En evaluación',
    evaluacion: 'En evaluación',
    'en evaluacion': 'En evaluación',
    'en evaluación': 'En evaluación',
    adjudicated: 'Adjudicada',
    'under adjudication': 'Adjudicada',
    'en adjudicacion': 'Adjudicada',
    'en adjudicación': 'Adjudicada',
    awarded: 'Adjudicada',
    adjudicada: 'Adjudicada',
  };

  return {
    id: licitation.id,
    title,
    organization: licitation.organization || 'Organismo no especificado',
    sector: getEconomicSector(licitation.sector, referenceData),
    status: statusLabels[rawStatus] || String(licitation.status || 'Sin estado'),
    deadline: closingDate ? closingDate.toLocaleDateString('es-VE') : 'Sin fecha límite',
    receiptLimit: closingDate
      ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(closingDate)
      : 'No especificado',
    daysLeft: closingDate ? Math.max(0, Math.ceil((closingDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : null,
    budget: Number.isFinite(budget) && budget > 0 ? new Intl.NumberFormat('es-VE', { maximumFractionDigits: 2 }).format(budget) : 'No especificado',
    budgetAmount: Number.isFinite(budget) && budget > 0 ? budget : null,
    budgetCurrency: referenceData ? 'USD' : null,
    budgetUsd: null,
    location: hasLocation ? location : referenceData?.location || location || 'No especificada',
    description: referenceDetails?.description || licitation.description || 'Sin descripción disponible.',
    requirements: referenceDetails?.requirements || licitation.requirements || [],
    attachments: referenceDetails?.attachments || licitation.attachments || [],
    referenceCode: referenceDetails?.referenceCode || licitation.id,
  };
}
