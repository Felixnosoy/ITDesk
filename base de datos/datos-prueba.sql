-- ITDesk - datos de prueba para desarrollo local
-- Correr DESPUES de schema.sql. Crea una cuenta por rol para poder
-- iniciar sesion en una base recien creada (sin esto no hay forma de
-- entrar: crear usuarios requiere un Administrador), un segundo cliente
-- para probar que cada cliente ve solo lo suyo, y equipos y tickets de
-- ejemplo en todos los estados.
--
-- Contraseña de todas las cuentas: Prueba123!
-- Solo para desarrollo local, nunca usar en un despliegue real.

SET NAMES utf8mb4;

INSERT INTO `usuario`
  (`nombre`, `apellido`, `correo`, `contraseña`, `rol`, `tipo_documento`, `num_documento`, `telefono`, `direccion`, `especialidad`)
VALUES
  ('Administrador', 'Prueba', 'administrador.prueba@itdesk.test', '$2b$10$cQ.Cl4mQdnmTPqDpwESaUeDkLJntWf3RXHgq1yx158CHoOh.pBdVK', 'Administrador', 'Cedula', '000-0000001-1', NULL, NULL, NULL),
  ('Recepcionista', 'Prueba', 'recepcionista.prueba@itdesk.test', '$2b$10$cQ.Cl4mQdnmTPqDpwESaUeDkLJntWf3RXHgq1yx158CHoOh.pBdVK', 'Recepcionista', 'Cedula', '000-0000002-2', NULL, NULL, NULL),
  ('Tecnico', 'Prueba', 'tecnico.prueba@itdesk.test', '$2b$10$cQ.Cl4mQdnmTPqDpwESaUeDkLJntWf3RXHgq1yx158CHoOh.pBdVK', 'Tecnico', 'Cedula', '000-0000003-3', NULL, NULL, 'Hardware'),
  ('Cliente', 'Prueba', 'cliente.prueba@itdesk.test', '$2b$10$cQ.Cl4mQdnmTPqDpwESaUeDkLJntWf3RXHgq1yx158CHoOh.pBdVK', 'Cliente', 'Cedula', '000-0000004-4', '809-555-0000', 'Santo Domingo', NULL),
  ('Maria', 'Gomez', 'maria.gomez@correo.test', '$2b$10$cQ.Cl4mQdnmTPqDpwESaUeDkLJntWf3RXHgq1yx158CHoOh.pBdVK', 'Cliente', 'Cedula', '000-0000005-5', '829-555-0101', 'Santiago', NULL);

-- los ids se buscan por correo para no depender del orden de insercion
SET @cliente = (SELECT id_usuario FROM usuario WHERE correo = 'cliente.prueba@itdesk.test');
SET @maria = (SELECT id_usuario FROM usuario WHERE correo = 'maria.gomez@correo.test');

INSERT INTO `equipo` (`id_usuario`, `tipo`, `marca`, `modelo`, `numero_serie`) VALUES
  (@cliente, 'Laptop', 'Dell', 'Latitude 5420', 'DL5420-0001'),
  (@cliente, 'Impresora', 'HP', 'LaserJet M404', 'HPM404-0002'),
  (@cliente, 'Router', 'TP-Link', 'Archer C6', 'TPC6-0003'),
  (@maria, 'Desktop', 'Lenovo', 'ThinkCentre M70', 'LNM70-0004'),
  (@maria, 'Laptop', 'Asus', 'VivoBook 15', 'ASVB15-0005');

SET @laptop = (SELECT id_equipo FROM equipo WHERE numero_serie = 'DL5420-0001');
SET @impresora = (SELECT id_equipo FROM equipo WHERE numero_serie = 'HPM404-0002');
SET @router = (SELECT id_equipo FROM equipo WHERE numero_serie = 'TPC6-0003');
SET @desktop = (SELECT id_equipo FROM equipo WHERE numero_serie = 'LNM70-0004');
SET @vivobook = (SELECT id_equipo FROM equipo WHERE numero_serie = 'ASVB15-0005');

INSERT INTO `ticket` (`id_usuario`, `id_equipo`, `titulo`, `descripcion`, `prioridad`, `categoria`, `estado`, `fecha_apertura`, `fecha_resolucion`, `fecha_cierre`) VALUES
  (@cliente, @laptop, 'No enciende', 'La laptop no da imagen al encenderla.', 'Alta', 'Hardware', 'Abierto', NOW() - INTERVAL 1 DAY, NULL, NULL),
  (@cliente, @laptop, 'Windows muy lento', 'Tarda varios minutos en iniciar sesion.', 'Media', 'Software', 'En diagnostico', NOW() - INTERVAL 3 DAY, NULL, NULL),
  (@cliente, @impresora, 'Atasco de papel', 'Se atasca en cada impresion a doble cara.', 'Baja', 'Hardware', 'Esperando aprobacion', NOW() - INTERVAL 5 DAY, NULL, NULL),
  (@cliente, @router, 'Sin conexion a internet', 'El router se reinicia solo cada pocos minutos.', 'Alta', 'Red', 'En reparacion', NOW() - INTERVAL 6 DAY, NULL, NULL),
  (@cliente, @laptop, 'Teclado con teclas muertas', 'No responden la A y la S.', 'Media', 'Hardware', 'Resuelto', NOW() - INTERVAL 12 DAY, NOW() - INTERVAL 8 DAY, NULL),
  (@cliente, @impresora, 'Instalar controlador', 'La impresora no aparece en la computadora nueva.', 'Baja', 'Software', 'Cerrado', NOW() - INTERVAL 20 DAY, NOW() - INTERVAL 18 DAY, NOW() - INTERVAL 17 DAY),
  (@cliente, @router, 'Configurar red de invitados', 'Separar la red de visitas de la red interna.', 'Baja', 'Red', 'Abierto', NOW() - INTERVAL 2 HOUR, NULL, NULL),
  (@maria, @desktop, 'Pantalla azul al iniciar', 'Error de sistema al arrancar Windows.', 'Alta', 'Software', 'En diagnostico', NOW() - INTERVAL 2 DAY, NULL, NULL),
  (@maria, @desktop, 'Ventilador ruidoso', 'Hace ruido fuerte despues de un rato encendida.', 'Media', 'Hardware', 'En reparacion', NOW() - INTERVAL 4 DAY, NULL, NULL),
  (@maria, @vivobook, 'Bateria no carga', 'Se queda en 0% conectada al cargador.', 'Alta', 'Hardware', 'Esperando aprobacion', NOW() - INTERVAL 7 DAY, NULL, NULL),
  (@maria, @vivobook, 'Recuperar archivos borrados', 'Se borro una carpeta de documentos por error.', 'Media', 'Otro', 'Resuelto', NOW() - INTERVAL 10 DAY, NOW() - INTERVAL 9 DAY, NULL),
  (@maria, @desktop, 'Revision general', 'Mantenimiento preventivo antes de fin de ano.', 'Baja', 'Otro', 'Cerrado', NOW() - INTERVAL 30 DAY, NOW() - INTERVAL 28 DAY, NOW() - INTERVAL 27 DAY);

-- todos los tickets de ejemplo quedan asignados al tecnico de prueba,
-- asignados por la recepcionista de prueba
INSERT INTO `asignacion` (`id_ticket`, `id_usuario`, `id_asignado_por`)
SELECT t.id_ticket, tec.id_usuario, rec.id_usuario
FROM ticket t
CROSS JOIN usuario tec
CROSS JOIN usuario rec
WHERE tec.correo = 'tecnico.prueba@itdesk.test'
AND rec.correo = 'recepcionista.prueba@itdesk.test';

SET @tecnico = (SELECT id_usuario FROM usuario WHERE correo = 'tecnico.prueba@itdesk.test');

-- linea de tiempo: un cambio de estado por cada ticket que ya avanzo, y
-- algunos avances y notas privadas de ejemplo
INSERT INTO `actualizacion` (`id_ticket`, `id_usuario`, `tipo`, `estado`, `observaciones`, `fecha`)
SELECT id_ticket, @tecnico, 'Estado', estado, NULL, fecha_apertura + INTERVAL 1 HOUR
FROM ticket
WHERE estado <> 'Abierto';

INSERT INTO `actualizacion` (`id_ticket`, `id_usuario`, `tipo`, `estado`, `observaciones`, `fecha`)
SELECT id_ticket, @tecnico, 'Avance', estado, 'Se reviso el equipo; el disco tiene sectores dañados.', fecha_apertura + INTERVAL 2 HOUR
FROM ticket WHERE titulo = 'Windows muy lento';

INSERT INTO `actualizacion` (`id_ticket`, `id_usuario`, `tipo`, `estado`, `observaciones`, `fecha`)
SELECT id_ticket, @tecnico, 'Avance', estado, 'Se reemplazo la fuente del router; queda en observacion 24 horas.', fecha_apertura + INTERVAL 3 HOUR
FROM ticket WHERE titulo = 'Sin conexion a internet';

INSERT INTO `nota_privada` (`id_ticket`, `id_usuario`, `contenido`, `fecha`)
SELECT id_ticket, @tecnico, 'El cliente pidio no reinstalar Windows si se puede evitar.', fecha_apertura + INTERVAL 2 HOUR
FROM ticket WHERE titulo = 'Windows muy lento';

INSERT INTO `nota_privada` (`id_ticket`, `id_usuario`, `contenido`, `fecha`)
SELECT id_ticket, @tecnico, 'Bateria original agotada; cotizar reemplazo generico y original.', fecha_apertura + INTERVAL 2 HOUR
FROM ticket WHERE titulo = 'Bateria no carga';

-- diagnostico en todos los tickets que ya pasaron por diagnostico
INSERT INTO `diagnostico` (`id_ticket`, `id_usuario`, `diagnostico`, `solucion`, `fecha_diagnostico`)
SELECT id_ticket, @tecnico,
  CONCAT('Revision de: ', LOWER(titulo), '. Se identifico la causa del problema.'),
  'Reparar o reemplazar la pieza afectada.',
  fecha_apertura + INTERVAL 90 MINUTE
FROM ticket
WHERE estado IN ('Esperando aprobacion', 'En reparacion', 'Resuelto', 'Cerrado');

-- cotizaciones, facturas y pagos de ejemplo, uno por cada situacion:
--   Atasco de papel            una rechazada y otra pendiente (recotizado)
--   Bateria no carga           pendiente (Maria)
--   Ventilador ruidoso         aprobada, falta facturar (Maria)
--   Sin conexion a internet    aprobada y facturada, falta pagar
--   Teclado con teclas muertas resuelto con factura pendiente de pago
--   Instalar controlador       cerrado con factura pagada
-- Los montos ya vienen calculados como los calcula el backend
-- (ITBIS 18%).
SET @atasco = (SELECT id_ticket FROM ticket WHERE titulo = 'Atasco de papel');
SET @bateria = (SELECT id_ticket FROM ticket WHERE titulo = 'Bateria no carga');
SET @ventilador = (SELECT id_ticket FROM ticket WHERE titulo = 'Ventilador ruidoso');
SET @router_t = (SELECT id_ticket FROM ticket WHERE titulo = 'Sin conexion a internet');
SET @teclado = (SELECT id_ticket FROM ticket WHERE titulo = 'Teclado con teclas muertas');
SET @controlador = (SELECT id_ticket FROM ticket WHERE titulo = 'Instalar controlador');

INSERT INTO `cotizacion` (`id_ticket`, `id_usuario`, `estado`, `subtotal`, `itbis`, `total`, `motivo_rechazo`, `fecha_creacion`, `fecha_decision`) VALUES
  (@atasco, @tecnico, 'Rechazada', 3500.00, 630.00, 4130.00, 'Prefiero un repuesto generico.', NOW() - INTERVAL 4 DAY, NOW() - INTERVAL 3 DAY);
SET @c = LAST_INSERT_ID();
INSERT INTO `cotizacion_linea` (`id_cotizacion`, `descripcion`, `cantidad`, `precio_unitario`, `importe`) VALUES
  (@c, 'Rodillo de arrastre original', 1, 3500.00, 3500.00);

INSERT INTO `cotizacion` (`id_ticket`, `id_usuario`, `estado`, `subtotal`, `itbis`, `total`, `fecha_creacion`) VALUES
  (@atasco, @tecnico, 'Pendiente', 2600.00, 468.00, 3068.00, NOW() - INTERVAL 2 DAY);
SET @c = LAST_INSERT_ID();
INSERT INTO `cotizacion_linea` (`id_cotizacion`, `descripcion`, `cantidad`, `precio_unitario`, `importe`) VALUES
  (@c, 'Rodillo de arrastre generico', 1, 1800.00, 1800.00),
  (@c, 'Mano de obra', 1, 800.00, 800.00);

INSERT INTO `cotizacion` (`id_ticket`, `id_usuario`, `estado`, `subtotal`, `itbis`, `total`, `fecha_creacion`) VALUES
  (@bateria, @tecnico, 'Pendiente', 3500.00, 630.00, 4130.00, NOW() - INTERVAL 6 DAY);
SET @c = LAST_INSERT_ID();
INSERT INTO `cotizacion_linea` (`id_cotizacion`, `descripcion`, `cantidad`, `precio_unitario`, `importe`) VALUES
  (@c, 'Bateria generica 3 celdas', 1, 2900.00, 2900.00),
  (@c, 'Mano de obra', 1, 600.00, 600.00);

INSERT INTO `cotizacion` (`id_ticket`, `id_usuario`, `estado`, `subtotal`, `itbis`, `total`, `fecha_creacion`, `fecha_decision`) VALUES
  (@ventilador, @tecnico, 'Aprobada', 1900.00, 342.00, 2242.00, NOW() - INTERVAL 3 DAY, NOW() - INTERVAL 2 DAY);
SET @c = LAST_INSERT_ID();
INSERT INTO `cotizacion_linea` (`id_cotizacion`, `descripcion`, `cantidad`, `precio_unitario`, `importe`) VALUES
  (@c, 'Ventilador de CPU', 1, 1200.00, 1200.00),
  (@c, 'Limpieza interna', 1, 700.00, 700.00);

INSERT INTO `cotizacion` (`id_ticket`, `id_usuario`, `estado`, `subtotal`, `itbis`, `total`, `fecha_creacion`, `fecha_decision`) VALUES
  (@router_t, @tecnico, 'Aprobada', 1450.00, 261.00, 1711.00, NOW() - INTERVAL 5 DAY, NOW() - INTERVAL 5 DAY);
SET @c = LAST_INSERT_ID();
INSERT INTO `cotizacion_linea` (`id_cotizacion`, `descripcion`, `cantidad`, `precio_unitario`, `importe`) VALUES
  (@c, 'Fuente de poder 12V', 1, 950.00, 950.00),
  (@c, 'Configuracion del router', 1, 500.00, 500.00);
INSERT INTO `factura` (`id_cotizacion`, `id_ticket`, `id_usuario`, `subtotal`, `itbis`, `total`, `fecha_emision`) VALUES
  (@c, @router_t, @tecnico, 1450.00, 261.00, 1711.00, NOW() - INTERVAL 4 DAY);

INSERT INTO `cotizacion` (`id_ticket`, `id_usuario`, `estado`, `subtotal`, `itbis`, `total`, `fecha_creacion`, `fecha_decision`) VALUES
  (@teclado, @tecnico, 'Aprobada', 3000.00, 540.00, 3540.00, NOW() - INTERVAL 11 DAY, NOW() - INTERVAL 10 DAY);
SET @c = LAST_INSERT_ID();
INSERT INTO `cotizacion_linea` (`id_cotizacion`, `descripcion`, `cantidad`, `precio_unitario`, `importe`) VALUES
  (@c, 'Teclado de reemplazo', 1, 2500.00, 2500.00),
  (@c, 'Mano de obra', 1, 500.00, 500.00);
INSERT INTO `factura` (`id_cotizacion`, `id_ticket`, `id_usuario`, `subtotal`, `itbis`, `total`, `fecha_emision`) VALUES
  (@c, @teclado, @tecnico, 3000.00, 540.00, 3540.00, NOW() - INTERVAL 8 DAY);

INSERT INTO `cotizacion` (`id_ticket`, `id_usuario`, `estado`, `subtotal`, `itbis`, `total`, `fecha_creacion`, `fecha_decision`) VALUES
  (@controlador, @tecnico, 'Aprobada', 600.00, 108.00, 708.00, NOW() - INTERVAL 19 DAY, NOW() - INTERVAL 19 DAY);
SET @c = LAST_INSERT_ID();
INSERT INTO `cotizacion_linea` (`id_cotizacion`, `descripcion`, `cantidad`, `precio_unitario`, `importe`) VALUES
  (@c, 'Instalacion de controlador', 1, 600.00, 600.00);
INSERT INTO `factura` (`id_cotizacion`, `id_ticket`, `id_usuario`, `subtotal`, `itbis`, `total`, `estado`, `fecha_emision`, `fecha_pago`, `referencia_pago`, `tarjeta_ultimos4`) VALUES
  (@c, @controlador, @tecnico, 600.00, 108.00, 708.00, 'Pagada', NOW() - INTERVAL 18 DAY, NOW() - INTERVAL 17 DAY, 'PAG-EJEMPLO001', '4242');

-- las lineas de cada factura son copia de las de su cotizacion
INSERT INTO `factura_linea` (`id_factura`, `descripcion`, `cantidad`, `precio_unitario`, `importe`)
SELECT f.id_factura, l.descripcion, l.cantidad, l.precio_unitario, l.importe
FROM factura f
INNER JOIN cotizacion_linea l
  ON l.id_cotizacion = f.id_cotizacion
ORDER BY f.id_factura, l.id_linea;

-- los resueltos o cerrados sin factura se resolvieron con la excepcion
-- sin costo (regla de cierre)
UPDATE `ticket` SET `resuelto_sin_costo` = 1
WHERE `estado` IN ('Resuelto', 'Cerrado')
AND `id_ticket` NOT IN (SELECT `id_ticket` FROM `factura`);

