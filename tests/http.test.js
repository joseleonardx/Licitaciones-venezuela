const app = require('../src/app');
const pool = require('../src/database/pool');

async function testHttpPipeline() {
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  console.log(`Testing HTTP Pipeline on ${baseUrl}...`);

  // 1. Liveness and readiness healthchecks
  const resHealth = await fetch(`${baseUrl}/health`);
  const healthData = await resHealth.json();
  console.log('✅ /health:', resHealth.status, healthData.status);

  const resReady = await fetch(`${baseUrl}/ready`);
  const readyData = await resReady.json();
  console.log('✅ /ready:', resReady.status, readyData.database);

  // 2. Custom X-Request-ID header
  const customUuid = '123e4567-e89b-12d3-a456-426614174000';
  const resHeaderTest = await fetch(`${baseUrl}/api/v1/requests`, {
    headers: { 'X-Request-ID': customUuid },
  });
  const headerRecv = resHeaderTest.headers.get('x-request-id');
  console.log('✅ X-Request-ID preservado:', headerRecv === customUuid);

  // 3. Fail-Fast 400 Bad Request on invalid ID
  const resFailFast = await fetch(`${baseUrl}/api/v1/requests/abc-invalid`);
  const failFastData = await resFailFast.json();
  console.log('✅ Fail-Fast (abc-invalid) Status:', resFailFast.status, failFastData.error.message);

  // 4. Create request via POST
  const resCreate = await fetch(`${baseUrl}/api/v1/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Licitación Construcción Hospital Norte',
      description: 'Obras civiles e infraestructura médica de alta complejidad',
      budget: 1200000.0,
    }),
  });
  const createData = await resCreate.json();
  console.log('✅ POST /api/v1/requests Status:', resCreate.status, 'ID creado:', createData.data?.id);

  const newId = createData.data?.id;

  // 5. PATCH Status to IN_REVIEW
  const resPatch = await fetch(`${baseUrl}/api/v1/requests/${newId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'IN_REVIEW',
      reason: 'Apertura de sobres técnicos',
    }),
  });
  const patchData = await resPatch.json();
  console.log('✅ PATCH Status:', resPatch.status, 'Nuevo estado:', patchData.data?.status);

  // 6. 409 Conflict test on invalid transition (IN_REVIEW -> PENDING)
  const resConflict = await fetch(`${baseUrl}/api/v1/requests/${newId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'PENDING',
      reason: 'Intento ilegal de retroceso',
    }),
  });
  const conflictData = await resConflict.json();
  console.log('✅ 409 Conflict Status:', resConflict.status, conflictData.error.message);

  // 7. Close server and pool
  server.close();
  await pool.end();
  console.log('\n🎉 ¡TODAS LAS PRUEBAS DE LA CAPA HTTP Y OBSERVABILIDAD PASARON!');
}

testHttpPipeline().catch((e) => {
  console.error('Test error:', e);
  pool.end();
  process.exit(1);
});
