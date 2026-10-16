// Respuestas rapidas del panel de actividad: frases que el taller escribe
// todos los dias. Se insertan en la caja y se pueden editar antes de enviar.
// Las del cliente van en tono de "tu equipo"; las internas son notas cortas.
export const RESPUESTAS_RAPIDAS = {
    actualizaciones: [
        { etiqueta: "En revisión", texto: "Ya estamos revisando tu equipo. Te avisaremos apenas tengamos el diagnóstico." },
        { etiqueta: "Esperando repuesto", texto: "Estamos esperando un repuesto para continuar. Te avisaremos en cuanto llegue." },
        { etiqueta: "En observación", texto: "La reparación está hecha y el equipo queda 24 horas en observación para confirmar que todo funciona." },
        { etiqueta: "Listo para retirar", texto: "Tu equipo está listo. Puedes pasar a retirarlo por el taller." },
        { etiqueta: "Necesitamos un dato", texto: "Necesitamos que nos confirmes lo siguiente para continuar: " },
    ],
    notas: [
        { etiqueta: "Repuesto pedido", texto: "Repuesto pedido al proveedor. Llega aproximadamente el " },
        { etiqueta: "Sin respuesta", texto: "Llamé al cliente y no respondió. Intentar de nuevo más tarde." },
        { etiqueta: "Contraseña", texto: "Contraseña del equipo: " },
        { etiqueta: "Respaldo hecho", texto: "Respaldo de los datos del cliente realizado antes de intervenir el equipo." },
        { etiqueta: "Prueba final", texto: "Pendiente de prueba final antes de pasar a Resuelto." },
    ],
};
