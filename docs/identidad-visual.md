# Identidad visual de ITDesk

Decisión del equipo para la épica T3 (HU27). Se compararon cuatro direcciones en maquetas, todas sobre las mismas pantallas (sistema, inicio del cliente, tablero del taller y detalle del ticket) y con los datos de prueba:

| Dirección | Idea | Resultado |
| --- | --- | --- |
| A · Mesa de taller | Papel cálido, tinta y naranja; códigos como etiquetas de inventario | Se tomaron el logo y los códigos |
| B · Centro de control | Oscuro y denso, para el técnico | Descartada: el modo oscuro era demasiado drástico |
| C · Servicio de confianza | Claro, redondeado, tono humano | Se tomó el tono de los textos para el cliente |
| **D · Taller moderno** | Estructura de un CRM moderno (menú con grupos y contadores, indicadores agrupados, tablero por estado) con la identidad de A y el tono de C | **Elegida** |

## Un color por rol

Cada rol tiene su color, para que se reconozca de inmediato en qué espacio se está y cada uno tenga su personalidad:

| Rol | Color principal | Acento | Por qué |
| --- | --- | --- | --- |
| Cliente | Índigo `#3730A3` | Coral `#F26B4F` | Cálido y amable: acompaña, no intimida |
| Técnico | Petróleo `#0F5E5A` | Ámbar `#F59E0B` | Concentración; el ámbar marca lo urgente |
| Recepcionista | Cobalto `#1D4ED8` | Celeste `#60A5FA` | Atención al público, claro y confiable |
| Administrador | Marino `#1E3A6E` | Amarillo `#FACC15` | Autoridad y control |

**Cambia por rol:** logo, opción activa del menú, botones principales, contadores, enlaces y avisos destacados.

**Es igual para todos:** tipografía, estructura, fondos y bordes neutros, y los **colores de estado del ticket**. "En reparación" se ve igual para el cliente y para el técnico.

| Estado | Color |
| --- | --- |
| Abierto | Piedra `#78716C` |
| En diagnóstico | Violeta `#7C3AED` |
| Esperando aprobación | Ámbar `#D97706` |
| En reparación | Azul `#2563EB` |
| Resuelto | Verde `#16A34A` |
| Cerrado | Gris claro `#A8A29E` |

## Tipografía

| Uso | Fuente |
| --- | --- |
| Títulos y cifras | Archivo, versión expandida (ancho 118%): carácter industrial |
| Texto | Hanken Grotesk: neutra y nítida en tamaños chicos |
| Códigos (`TK-0004`, `FAC-0001`) y montos en tablas | IBM Plex Mono: etiquetas de inventario |

## Dónde vive

Todos los valores están en `frontend/src/styles/tokens.css`. El `Layout` pone el rol del usuario en `<html data-rol="...">` y los colores del rol se activan solos. Ningún componente escribe colores, tamaños ni radios sueltos: siempre usa un token.
