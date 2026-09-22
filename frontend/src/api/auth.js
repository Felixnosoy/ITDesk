import { apiFetch } from "./client";

export async function login(correo, contraseña) {
    const respuesta = await apiFetch("/auth/login", {
        method: "POST",
        body: { correo, contraseña },
    });

    return respuesta.data; // { token, usuario }
}
