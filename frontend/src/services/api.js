const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/+$/, '');

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
  const closingDate = licitation.closingDate ? new Date(licitation.closingDate) : null;
  const budget = Number(licitation.budget);

  return {
    id: licitation.id,
    title: licitation.title,
    organization: licitation.organization || 'Organismo no especificado',
    sector: licitation.sector || 'General',
    status: licitation.status === 'active' ? 'Abierta' : licitation.status,
    deadline: closingDate ? closingDate.toLocaleDateString('es-VE') : 'Sin fecha límite',
    daysLeft: closingDate ? Math.max(0, Math.ceil((closingDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : null,
    budget: Number.isFinite(budget) && budget > 0 ? new Intl.NumberFormat('es-VE', { maximumFractionDigits: 2 }).format(budget) : 'No especificado',
    budgetUsd: null,
    location: licitation.location || 'No especificada',
    description: licitation.description || 'Sin descripción disponible.',
    requirements: licitation.requirements || [],
    attachments: licitation.attachments || [],
  };
}
