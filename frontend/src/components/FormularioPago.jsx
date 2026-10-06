import { useState } from "react";
import { formatearMonto } from "../utils/formato";
import Modal from "./Modal";

// Las mismas tarjetas que acepta el backend (pago.service.js). Se muestran
// en pantalla porque el pago es simulado: cualquier otro numero da 400, asi
// nadie llega a escribir una tarjeta real.
const TARJETAS_PRUEBA = [
    { numero: "4242 4242 4242 4242", resultado: "Pago aprobado" },
    { numero: "4000 0000 0000 0002", resultado: "Pago rechazado" },
];

// agrupa los digitos de a 4 mientras se escribe: 4242 4242 4242 4242
const formatearNumero = (texto) =>
    texto
        .replace(/\D/g, "")
        .slice(0, 16)
        .replace(/(\d{4})(?=\d)/g, "$1 ");

// agrega la barra sola despues del mes: 12/30
const formatearVencimiento = (texto) => {
    const digitos = texto.replace(/\D/g, "").slice(0, 4);
    return digitos.length > 2 ? `${digitos.slice(0, 2)}/${digitos.slice(2)}` : digitos;
};

// MM/AA valido y no vencido (vale hasta el ultimo dia de ese mes)
const vencimientoValido = (texto) => {
    const coincide = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(texto);
    if (!coincide) return false;

    const finDelMes = new Date(2000 + Number(coincide[2]), Number(coincide[1]), 1);
    return finDelMes > new Date();
};

// Formulario de pago en linea de la factura (solo el cliente dueno). Le
// pide al navegador que no autocomplete, para que nunca aparezca una
// tarjeta real guardada, y no guarda nada en el navegador.
export default function FormularioPago({ factura, guardando, error, onPagar, onCerrar }) {
    const [valores, setValores] = useState({ numero_tarjeta: "", titular: "", vencimiento: "", cvv: "" });
    // los errores se muestran recien al intentar pagar, no mientras se escribe
    const [intentado, setIntentado] = useState(false);

    const cambiar = (campo, formato = (v) => v) => (evento) =>
        setValores({ ...valores, [campo]: formato(evento.target.value) });

    const problemas = {
        numero_tarjeta: valores.numero_tarjeta.replace(/\D/g, "").length !== 16 ? "Escribe los 16 dígitos." : "",
        titular: !valores.titular.trim() ? "Escribe el nombre como aparece en la tarjeta." : "",
        vencimiento: !vencimientoValido(valores.vencimiento) ? "Usa el formato MM/AA y una fecha que no haya pasado." : "",
        cvv: !/^\d{3,4}$/.test(valores.cvv) ? "3 o 4 dígitos." : "",
    };
    const valido = Object.values(problemas).every((p) => !p);

    // completa tambien vencimiento y CVV de ejemplo si estan vacios
    const usarPrueba = (numero) =>
        setValores({
            ...valores,
            numero_tarjeta: numero,
            vencimiento: valores.vencimiento || "12/30",
            cvv: valores.cvv || "123",
        });

    const enviar = (evento) => {
        evento.preventDefault();
        setIntentado(true);
        if (valido) onPagar(valores);
    };

    const errorDe = (campo) =>
        intentado && problemas[campo] ? <span className="pago-error">{problemas[campo]}</span> : null;

    const invalido = (campo) => Boolean(intentado && problemas[campo]);

    return (
        <Modal titulo="Pagar factura" onCerrar={onCerrar}>
            <form onSubmit={enviar} noValidate autoComplete="off">
                {error && (
                    <div className="aviso aviso-error" role="alert">
                        {error}
                    </div>
                )}

                <p className="decision-total">
                    Total a pagar: <strong>{formatearMonto(factura.total)}</strong>
                </p>

                <div className="pago-prueba">
                    <p>
                        <strong>Pago de prueba.</strong> No escribas una tarjeta real: usa una de estas.
                    </p>
                    <ul>
                        {TARJETAS_PRUEBA.map(({ numero, resultado }) => (
                            <li key={numero}>
                                <button
                                    type="button"
                                    className="boton boton-chico boton-secundario"
                                    onClick={() => usarPrueba(numero)}
                                >
                                    Usar
                                </button>
                                <code>{numero}</code>
                                <span>{resultado}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="campo">
                    <label htmlFor="pago-numero">Número de tarjeta</label>
                    <input
                        id="pago-numero"
                        inputMode="numeric"
                        autoComplete="off"
                        placeholder="4242 4242 4242 4242"
                        value={valores.numero_tarjeta}
                        aria-invalid={invalido("numero_tarjeta")}
                        onChange={cambiar("numero_tarjeta", formatearNumero)}
                    />
                    {errorDe("numero_tarjeta")}
                </div>

                <div className="campo">
                    <label htmlFor="pago-titular">Titular</label>
                    <input
                        id="pago-titular"
                        autoComplete="off"
                        maxLength={100}
                        value={valores.titular}
                        aria-invalid={invalido("titular")}
                        onChange={cambiar("titular")}
                    />
                    {errorDe("titular")}
                </div>

                <div className="pago-fila">
                    <div className="campo">
                        <label htmlFor="pago-vencimiento">Vencimiento</label>
                        <input
                            id="pago-vencimiento"
                            inputMode="numeric"
                            autoComplete="off"
                            placeholder="MM/AA"
                            value={valores.vencimiento}
                            aria-invalid={invalido("vencimiento")}
                            onChange={cambiar("vencimiento", formatearVencimiento)}
                        />
                        {errorDe("vencimiento")}
                    </div>
                    <div className="campo">
                        <label htmlFor="pago-cvv">CVV</label>
                        <input
                            id="pago-cvv"
                            inputMode="numeric"
                            autoComplete="off"
                            placeholder="123"
                            value={valores.cvv}
                            aria-invalid={invalido("cvv")}
                            onChange={cambiar("cvv", (v) => v.replace(/\D/g, "").slice(0, 4))}
                        />
                        {errorDe("cvv")}
                    </div>
                </div>

                <div className="modal-acciones">
                    <button type="button" className="boton boton-secundario" onClick={onCerrar}>
                        Cancelar
                    </button>
                    <button type="submit" className="boton" disabled={guardando}>
                        {guardando ? "Procesando..." : `Pagar ${formatearMonto(factura.total)}`}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
