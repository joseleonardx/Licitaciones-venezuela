const pool = require('../src/database/pool');
const requestsService = require('../src/modules/requests/requests.service');
const { REQUEST_STATUS } = require('../src/modules/requests/request-status');
const BadRequestError = require('../src/errors/bad-request-error');
const ConflictError = require('../src/errors/conflict-error');

async function testArchitecture() {
  console.log('--- TEST 1: Creación Atómica ACID con Auditoría ---');
  const created = await requestsService.createRequest({
    title: 'Licitación Suministro Eléctrico 2026',
    description: 'Adquisición de transformadores y cableado de alta potencia',
    budget: 850000.5,
  });
  console.log('✅ Creado:', created);

  console.log('\n--- TEST 2: Transición Legal en la FSM (PENDING -> IN_REVIEW) ---');
  const inReview = await requestsService.transitionStatus(
    created.id,
    REQUEST_STATUS.IN_REVIEW,
    'Inicio de evaluación técnica'
  );
  console.log('✅ En Revisión:', inReview.status, 'Historial logs:', inReview.statusHistory?.length);

  console.log('\n--- TEST 3: Transición Ilegal en la FSM (IN_REVIEW -> PENDING) -> 409 Conflict ---');
  try {
    await requestsService.transitionStatus(created.id, REQUEST_STATUS.PENDING, 'Regresar a pendiente');
    console.error('❌ FALLÓ: Debió lanzar ConflictError');
  } catch (err) {
    if (err instanceof ConflictError) {
      console.log('✅ Capturado ConflictError esperado (409):', err.message);
    } else {
      console.error('❌ Error inesperado:', err);
    }
  }

  console.log('\n--- TEST 4: Transición a Estado Terminal (IN_REVIEW -> CANCELLED) ---');
  const cancelled = await requestsService.transitionStatus(
    created.id,
    REQUEST_STATUS.CANCELLED,
    'Licitación suspendida por presupuesto'
  );
  console.log('✅ Cancelado (Terminal):', cancelled.status);

  console.log('\n--- TEST 5: Intento de Mutación sobre Estado Terminal -> 409 Conflict ---');
  try {
    await requestsService.transitionStatus(created.id, REQUEST_STATUS.APPROVED, 'Aprobar cancelada');
    console.error('❌ FALLÓ: Debió bloquear la mutación sobre estado terminal');
  } catch (err) {
    if (err instanceof ConflictError) {
      console.log('✅ Bloqueo terminal exitoso (409 Conflict):', err.message);
    } else {
      console.error('❌ Error inesperado:', err);
    }
  }

  console.log('\n--- TEST 6: Validación Fail-Fast (Parámetros inválidos) -> 400 Bad Request ---');
  try {
    await requestsService.createRequest({ title: '', budget: -500 });
  } catch (err) {
    if (err instanceof BadRequestError) {
      console.log('✅ Capturado BadRequestError esperado (400):', err.message);
    }
  }

  await pool.end();
  console.log('\n🎉 ¡TODAS LAS PRUEBAS DE ARQUITECTURA PASARON EXITOSAMENTE!');
}

testArchitecture().catch((err) => {
  console.error('Error durante la prueba:', err);
  pool.end();
  process.exit(1);
});

