-- Datos de ejemplo: 20 bienes de cocina y almacén.
-- Ejecutar en Supabase: SQL Editor → pegar y ejecutar (después de todas las migraciones). Los bienes se cargan en la sede "Anexo Ceres".

insert into public.bienes
  (codigo_clasificacion, descripcion, marca, modelo, serie, color, ubicacion, unidad_medida, fecha_adquisicion, documento, estado, cantidad, valor_unitario, lugar, lugar_id)
values
  -- Cocina
  ('COC-001', 'Cocina industrial de 3 hornillas a gas',            'Surge',      'CI-3H',      'SG-2023-0451', 'Acero inoxidable', 'Cocina',  'UND', '2023-02-15', 'Factura F001-2231',  'B', 1,  850.00, 'Anexo Ceres', (select id from public.lugares where nombre = 'Anexo Ceres')),
  ('COC-002', 'Balón de gas doméstico 10 kg',                     'Solgas',     null,         null,           'Amarillo',         'Cocina',  'UND', '2023-02-15', 'Boleta B002-0887',   'B', 2,  160.00, 'Anexo Ceres', (select id from public.lugares where nombre = 'Anexo Ceres')),
  ('COC-003', 'Refrigeradora no frost 300 L',                      'LG',         'GT32BPP',    'LG3021187',    'Plateado',         'Cocina',  'UND', '2022-11-20', 'Factura F003-11542', 'R', 1, 1899.00, 'Anexo Ceres', (select id from public.lugares where nombre = 'Anexo Ceres')),
  ('COC-004', 'Olla industrial de aluminio 50 L',                  'Record',     'N° 45',      null,           'Aluminio',         'Cocina',  'UND', '2021-06-10', 'Donación',           'R', 2,  220.00, 'Anexo Ceres', (select id from public.lugares where nombre = 'Anexo Ceres')),
  ('COC-005', 'Olla arrocera eléctrica 1.8 L',                     'Oster',      'CKSTRC6',    'OS-778120',    'Blanco',           'Cocina',  'UND', '2024-04-05', 'Boleta B001-4410',   'B', 1,  149.90, 'Anexo Ceres', (select id from public.lugares where nombre = 'Anexo Ceres')),
  ('COC-006', 'Licuadora de 10 velocidades 1.25 L',                'Oster',      'BLSTMG',     'OS-993214',    'Negro',            'Cocina',  'UND', '2022-08-18', 'Boleta B001-2290',   'M', 1,  199.00, 'Anexo Ceres', (select id from public.lugares where nombre = 'Anexo Ceres')),
  ('COC-007', 'Hervidor eléctrico 1.7 L',                          'Imaco',      'HE1707',     null,           'Acero inoxidable', 'Cocina',  'UND', '2024-09-12', 'Boleta B004-0156',   'B', 2,   79.90, 'Anexo Ceres', (select id from public.lugares where nombre = 'Anexo Ceres')),
  ('COC-008', 'Termo dispensador de café 5 L',                     'Thermos',    null,         null,           'Negro',            'Cocina',  'UND', '2023-12-01', 'Donación',           'B', 3,   95.00, 'Anexo Ceres', (select id from public.lugares where nombre = 'Anexo Ceres')),
  ('COC-009', 'Juego de cubiertos de acero inoxidable (24 piezas)','Tramontina', 'Laguna',     null,           'Plateado',         'Cocina',  'JGO', '2023-05-20', 'Factura F002-0772',  'B', 4,   69.90, 'Anexo Ceres', (select id from public.lugares where nombre = 'Anexo Ceres')),
  ('COC-010', 'Juego de cuchillos de cocina con soporte (6 piezas)','Tramontina','Plenus',     null,           'Negro',            'Cocina',  'JGO', '2023-05-20', 'Factura F002-0772',  'R', 1,   89.90, 'Anexo Ceres', (select id from public.lugares where nombre = 'Anexo Ceres')),
  ('COC-011', 'Platos hondos de loza',                             'Corona',     null,         null,           'Blanco',           'Cocina',  'DOC', '2022-03-14', 'Boleta B003-1821',   'B', 6,   48.00, 'Anexo Ceres', (select id from public.lugares where nombre = 'Anexo Ceres')),
  ('COC-012', 'Vasos de vidrio 300 ml',                            'Nadir',      null,         null,           'Transparente',     'Cocina',  'DOC', '2022-03-14', 'Boleta B003-1821',   'R', 5,   30.00, 'Anexo Ceres', (select id from public.lugares where nombre = 'Anexo Ceres')),
  ('COC-013', 'Tabla de picar de polietileno',                     'Rey',        null,         null,           'Blanco',           'Cocina',  'UND', '2024-01-08', 'Boleta B001-3307',   'M', 3,   25.00, 'Anexo Ceres', (select id from public.lugares where nombre = 'Anexo Ceres')),
  -- Almacén
  ('ALM-001', 'Mesa plegable rectangular 1.80 m',                  'Lifetime',   '80387',      null,           'Blanco',           'Almacén', 'UND', '2022-07-30', 'Factura F001-9981',  'B', 8,  320.00, 'Anexo Ceres', (select id from public.lugares where nombre = 'Anexo Ceres')),
  ('ALM-002', 'Silla plástica apilable sin brazos',                'Rey',        'Clásica',    null,           'Blanco',           'Almacén', 'UND', '2021-10-05', 'Factura F005-0034',  'R', 60,  28.00, 'Anexo Ceres', (select id from public.lugares where nombre = 'Anexo Ceres')),
  ('ALM-003', 'Estante metálico de 5 niveles',                     'Rimax',      'EM-5N',      null,           'Gris',             'Almacén', 'UND', '2022-01-22', 'Factura F001-0213',  'B', 4,  189.00, 'Anexo Ceres', (select id from public.lugares where nombre = 'Anexo Ceres')),
  ('ALM-004', 'Caja organizadora plástica 60 L con tapa',          'Rey',        null,         null,           'Transparente',     'Almacén', 'UND', '2023-08-11', 'Boleta B002-1534',   'B', 12,  39.90, 'Anexo Ceres', (select id from public.lugares where nombre = 'Anexo Ceres')),
  ('ALM-005', 'Escalera tipo tijera de aluminio 6 pasos',          'Werner',     'T-6',        'WR-60088',     'Plateado',         'Almacén', 'UND', '2020-12-15', 'Factura F004-0510',  'R', 1,  280.00, 'Anexo Ceres', (select id from public.lugares where nombre = 'Anexo Ceres')),
  ('ALM-006', 'Carretilla de carga de 2 ruedas 150 kg',            'Truper',     'DIE-150',    'TR-150-2271',  'Rojo',             'Almacén', 'UND', '2021-04-27', 'Factura F004-0322',  'M', 1,  250.00, 'Anexo Ceres', (select id from public.lugares where nombre = 'Anexo Ceres')),
  ('ALM-007', 'Extensión eléctrica de 10 m',                       'Bticino',    null,         null,           'Negro',            'Almacén', 'UND', '2024-06-03', 'Boleta B001-5021',   'B', 5,   45.00, 'Anexo Ceres', (select id from public.lugares where nombre = 'Anexo Ceres'));

-- Enlaza los bienes con las ubicaciones de su misma sede (migraciones 0006 y 0010).
update public.bienes b
set ubicacion_id = u.id
from public.ubicaciones u
where b.ubicacion_id is null and b.ubicacion = u.descripcion and u.lugar_id = b.lugar_id;
