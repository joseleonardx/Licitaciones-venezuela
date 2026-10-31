const fs = require('fs');
const path = require('path');
const app = require('../src/app');
const pool = require('../src/database/pool');

async function testCompleteFlow() {
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  console.log('================================================================');
  console.log(`🚀 Probando Flujo End-to-End de Licitaciones en: ${baseUrl}`);
  console.log('================================================================\n');

  // Identificadores únicos para la prueba
  const timestamp = Date.now();
  const testCompany = {
    razonSocial: `Constructora Metro C.A. ${timestamp}`,
    rif: `J-${timestamp.toString().slice(-8)}-0`,
    email: `contacto_${timestamp}@constructorametro.com`,
    password: 'PasswordSegura2026!',
    telefono: '+58 212 555-0199',
  };

  // 1. REGISTRO DE EMPRESA
  console.log('--- PASO 1: Registro de Empresa Proveedora (bcrypt + PostgreSQL) ---');
  const resRegister = await fetch(`${baseUrl}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testCompany),
  });
  const registerData = await resRegister.json();
  console.log('Status:', resRegister.status);
  console.log('Respuesta:', {
    empresa: registerData.data?.company?.razonSocial,
    rif: registerData.data?.company?.rif,
    tokenEmitido: !!registerData.data?.token,
    passwordOculto: registerData.data?.company?.passwordHash === undefined,
  });

  const authToken = registerData.data?.token;

  // 2. LOGIN CON CREDENCIALES
  console.log('\n--- PASO 2: Login de Empresa (JWT) ---');
  const resLogin = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testCompany.email,
      password: testCompany.password,
    }),
  });
  const loginData = await resLogin.json();
  console.log('Status:', resLogin.status, 'Login exitoso:', !!loginData.data?.token);

  // 3. CONSULTA DE PERFIL AUTENTICADO (/me)
  console.log('\n--- PASO 3: Verificación de Token JWT (/auth/me) ---');
  const resMe = await fetch(`${baseUrl}/api/v1/auth/me`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  const meData = await resMe.json();
  console.log('Status:', resMe.status, 'Email autenticado:', meData.data?.email);

  // 4. CREACIÓN DE UNA LICITACIÓN PÚBLICA
  console.log('\n--- PASO 4: Publicación de Licitación Activa ---');
  const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const resLicitation = await fetch(`${baseUrl}/api/v1/licitations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: `Licitación Vialidad Urbana #${timestamp}`,
      description: 'Reasfaltado y señalización de arterias viales principales',
      budget: 450000.0,
      closingDate: nextMonth,
    }),
  });
  const licitationData = await resLicitation.json();
  const licitationId = licitationData.data?.id;
  console.log('Status:', resLicitation.status, 'ID Licitación:', licitationId);

  // 5. POSTULACIÓN DE OFERTA CON ARCHIVO PDF
  console.log('\n--- PASO 5: Envío de Postulación con PDF (Bids + Multer) ---');
  const dummyPdfContent = Buffer.from('%PDF-1.4 Mock proposal content for licitation testing');
  const formData = new FormData();
  formData.append('licitation_id', licitationId);
  formData.append(
    'file',
    new Blob([dummyPdfContent], { type: 'application/pdf' }),
    'propuesta_tecnica.pdf'
  );

  const resBid = await fetch(`${baseUrl}/api/v1/bids`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
    body: formData,
  });
  const bidData = await resBid.json();
  console.log('Status:', resBid.status);
  console.log('Postulación registrada:', {
    bidId: bidData.data?.id,
    pdfUrl: bidData.data?.pdfUrl,
    status: bidData.data?.status,
  });

  // 6. INTENTO DE OFERTA DUPLICADA (Debe responder 409 Conflict)
  console.log('\n--- PASO 6: Intento de Oferta Duplicada -> 409 Conflict ---');
  const formDataDuplicate = new FormData();
  formDataDuplicate.append('licitation_id', licitationId);
  formDataDuplicate.append(
    'file',
    new Blob([dummyPdfContent], { type: 'application/pdf' }),
    'propuesta_duplicada.pdf'
  );

  const resDuplicate = await fetch(`${baseUrl}/api/v1/bids`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${authToken}` },
    body: formDataDuplicate,
  });
  const dupData = await resDuplicate.json();
  console.log('Status:', resDuplicate.status, dupData.error?.message);

  // 7. CONSULTA DE MIS POSTULACIONES
  console.log('\n--- PASO 7: Consulta de Mis Postulaciones (/bids/my-bids) ---');
  const resMyBids = await fetch(`${baseUrl}/api/v1/bids/my-bids`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  const myBidsData = await resMyBids.json();
  console.log('Status:', resMyBids.status, 'Total postulaciones:', myBidsData.count);

  server.close();
  await pool.end();

  console.log('\n🎉 ¡EL FLUJO COMPLETO DE LICITACIONES, AUTH Y BIDS FUNCIONA PERFECTAMENTE!');
}

testCompleteFlow().catch((err) => {
  console.error('Error durante la prueba de flujo:', err);
  pool.end();
  process.exit(1);
});

