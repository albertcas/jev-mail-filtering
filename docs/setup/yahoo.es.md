# Conectar Yahoo Mail

🇬🇧 [Read in English](yahoo.md)

JEV Mail Filtering inicia sesión en Yahoo Mail por IMAP con una **contraseña de aplicación**: una contraseña que solo usa esta app y que puedes revocar cuando quieras. Tu contraseña normal de Yahoo no sirve aquí.

> Las webs de los proveedores cambian. Si lo que ves no coincide con estos pasos, sigue lo que aparece en pantalla.

## Antes de empezar

- Una cuenta de Yahoo Mail en la que puedas iniciar sesión desde la web.

## Pasos

1. Abre [login.yahoo.com/account/security](https://login.yahoo.com/account/security) (*Seguridad de la cuenta*) e inicia sesión si te lo pide.
2. Pulsa **Generar contraseña de aplicación** (puede llamarse *Generar y gestionar contraseñas de aplicación*).
3. Escribe un nombre como `JEV Mail Filtering` y pulsa **Generar contraseña**.
4. Copia la contraseña que aparece y pulsa **Hecho**.
5. En el asistente de configuración (paso 2, *Tu buzón*), elige **Yahoo Mail**, escribe tu dirección de Yahoo completa y pega la contraseña.
6. Pulsa **Probar conexión**. Cuando diga *Conectado*, continúa.

![Paso 2 del asistente de configuración (se muestra con Gmail; elige Yahoo Mail)](../assets/setup-mailbox.png)

**Con Docker**, pon la contraseña en tu fichero `.env` como `IMAP_PASSWORD` y reinicia el contenedor; deja vacío el campo de contraseña del asistente.

## Datos del servidor

El asistente los rellena por ti:

| Dato | Valor |
|---|---|
| Servidor IMAP | `imap.mail.yahoo.com` |
| Puerto | `993` |
| TLS | Activado |
| Usuario | Tu dirección completa, p. ej. `tu@yahoo.com` |

## Problemas frecuentes

| Problema | Qué hacer |
|---|---|
| No aparece *Generar contraseña de aplicación* | Yahoo puede exigir antes la verificación en dos pasos. Actívala en *Seguridad de la cuenta* y vuelve a mirar. |
| *El servidor rechazó el correo o la contraseña de aplicación* | Comprueba que has usado la dirección completa y la contraseña de aplicación (no tu contraseña normal). Genera otra si hace falta. |
| *No se pudo conectar con el servicio* / tiempos de espera | Un cortafuegos o la red puede estar bloqueando el puerto 993. Prueba con otra red. |

Para desconectar, elimina la contraseña de aplicación en *Seguridad de la cuenta*. La app nunca modifica tu buzón: no se mueve, borra ni marca como leído nada.
