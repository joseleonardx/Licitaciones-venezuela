-- Replaces only the 11 test licitations identified in the production API on 2026-11-02.
-- Deleting these rows also deletes bids linked to them through ON DELETE CASCADE.
-- The migration runner wraps this file in a transaction.

DO $$
DECLARE
  matched_records INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO matched_records
  FROM licitations
  WHERE id = ANY (ARRAY[
    'd332007b-4a71-483b-b2d4-ef7d60851e6f',
    '120e28ed-5502-475c-800d-3fefcf968f37',
    '5d965a7b-7dae-43ea-a940-d9258b62ef53',
    '9929e2b2-682d-423a-892c-9b4e5993b9bb',
    '57c8618e-ecc4-404b-86de-607b8acdb321',
    'c72d6751-8293-41af-b17d-34f8bdaffd06',
    '4e7298f3-ce39-41e3-b22d-899267ad136b',
    '09cdc884-57e7-470a-a71d-e28b60ebf4fd',
    '5c930427-630d-4e3b-9070-262132f83540',
    '012a86dd-88fc-46d6-9ff7-8098e37238db',
    '777fbcef-d69f-4ac7-ab5b-c6c600c35e2e'
  ]::UUID[]);

  IF matched_records <> 11 THEN
    RAISE EXCEPTION
      'Expected to find all 11 reviewed test licitations; found %. No records were replaced.',
      matched_records;
  END IF;
END $$;

DELETE FROM licitations
WHERE id = ANY (ARRAY[
  'd332007b-4a71-483b-b2d4-ef7d60851e6f',
  '120e28ed-5502-475c-800d-3fefcf968f37',
  '5d965a7b-7dae-43ea-a940-d9258b62ef53',
  '9929e2b2-682d-423a-892c-9b4e5993b9bb',
  '57c8618e-ecc4-404b-86de-607b8acdb321',
  'c72d6751-8293-41af-b17d-34f8bdaffd06',
  '4e7298f3-ce39-41e3-b22d-899267ad136b',
  '09cdc884-57e7-470a-a71d-e28b60ebf4fd',
  '5c930427-630d-4e3b-9070-262132f83540',
  '012a86dd-88fc-46d6-9ff7-8098e37238db',
  '777fbcef-d69f-4ac7-ab5b-c6c600c35e2e'
]::UUID[]);

INSERT INTO licitations (
  title,
  description,
  budget,
  status,
  closing_date,
  organization,
  sector,
  location,
  requirements,
  attachments
)
VALUES
(
  'Mantenimiento Mayor de Turbocompresores en Complejo Jusepín',
  'Inspección general, reemplazo de álabes y pruebas dinámicas de alineación para unidades de compresión de gas natural.',
  480000,
  'active',
  '2026-11-10T12:00:00Z',
  'PDVSA Petróleo, S.A.',
  'Infraestructura',
  'Monagas, Venezuela',
  '["Inscripción Activa y Calificada en el RNC (SNC)", "Solvencia Laboral Vigente emitida por el MPPST", "Solvencias de IVSS, INCES y BANAVIH al día", "Certificación ISO 9001 / ISO 45001 en seguridad industrial"]'::JSONB,
  '[{"name":"Pliego_Tecnico_PDVSA_042.pdf","url":null},{"name":"Anexo_A_Matriz_Riesgos.pdf","url":null}]'::JSONB
),
(
  'Dotación de Equipos Quirúrgicos para Red Hospitalaria Central',
  'Adquisición de 12 mesas de anestesia digital, electrobisturíes de alta frecuencia y monitores de signos vitales multiparámetro.',
  210000,
  'active',
  '2026-11-04T12:00:00Z',
  'Ministerio del Poder Popular para la Salud (MPPS)',
  'Salud',
  'Caracas, Distrito Capital',
  '["Registro Sanitario de Dispositivos Médicos (MPPS)", "RNC Vigente en Renglón Medicamentos y Suministros", "Fianza de fiel cumplimiento por 15% del valor adjudicado"]'::JSONB,
  '[{"name":"Especificaciones_Tecnicas_Salud.pdf","url":null},{"name":"Terminos_Referencia_MPPS.pdf","url":null}]'::JSONB
),
(
  'Rehabilitación Integral de Sistema de Rodamiento Línea 1',
  'Sustitución de balasto, rieles y sistemas de electrificación en el tramo Propatria - Palo Verde.',
  850000,
  'active',
  '2026-12-01T12:00:00Z',
  'C.A. Metro de Caracas',
  'Construcción',
  'Caracas, Venezuela',
  '["Experiencia comprobada en obras civiles ferroviarias (> 5 años)", "Fianza de licitación expedida por Entidad Financiera de la SUDEBAN"]'::JSONB,
  '[{"name":"Pliego_Condiciones_Metro_L1.pdf","url":null}]'::JSONB
),
(
  'Despliegue de Red Fibra Óptica GPON Sector Norte',
  'Tendido de 45 km de fibra óptica aérea y canalizada con habilitación de 12 nodos OLT para acceso de alta velocidad.',
  175000,
  'active',
  '2026-11-18T12:00:00Z',
  'CANTV',
  'Tecnología',
  'Maracaibo, Zulia',
  '["Habilitación Administrativa CONATEL", "RNC Vigente con capacidad de contratación probada"]'::JSONB,
  '[{"name":"Memoria_Descriptiva_GPON.pdf","url":null},{"name":"Mapa_Tendido_Zulia.pdf","url":null}]'::JSONB
),
(
  'Suministro de Granolas e Insumos Agroindustriales Q1 2027',
  'Procesamiento, empaque y distribución logística de harina de maíz precocida y rubros de la cesta básica.',
  320000,
  'active',
  '2027-01-15T12:00:00-04:00',
  'Ministerio del Poder Popular para la Alimentación',
  'Alimentación',
  'Barquisimeto, Lara',
  '["Permiso de Inocuidad de Alimentos (SACS)", "Capacidad de almacenamiento en cavas con temperatura controlada"]'::JSONB,
  '[{"name":"Requerimientos_Logistica_Alimentos.pdf","url":null}]'::JSONB
);
