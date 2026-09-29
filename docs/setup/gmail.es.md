# Conectar Gmail

🇬🇧 [Read in English](gmail.md)

JEV Mail Filtering inicia sesión en Gmail por IMAP con una **contraseña de aplicación**: una contraseña de 16 caracteres que solo usa esta app y que puedes revocar cuando quieras. Tu contraseña normal de Google no sirve aquí.

> Las webs de los proveedores cambian. Si lo que ves no coincide con estos pasos, sigue lo que aparece en pantalla.

## Antes de empezar

- **La verificación en dos pasos debe estar activa.** Google solo ofrece contraseñas de aplicación cuando lo está. Actívala en [myaccount.google.com/security](https://myaccount.google.com/security) → *Verificación en dos pasos*.
- **Cuentas de trabajo o de centro educativo (Google Workspace):** puede que tu administrador haya desactivado las contraseñas de aplicación o IMAP. Si los pasos de abajo no funcionan, pregúntale.
- IMAP está activado por defecto en las cuentas personales de Gmail; no hace falta cambiar nada en la configuración de Gmail.

## Pasos

1. Abre [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) e inicia sesión si te lo pide.
2. Escribe un nombre como `JEV Mail Filtering` y pulsa **Crear**.
3. Copia la contraseña de 16 caracteres que aparece. Google solo la muestra una vez.
4. En el asistente de configuración (paso 2, *Tu buzón*), elige **Gmail**, escribe tu dirección de Gmail completa y pega la contraseña de aplicación.
5. Pulsa **Probar conexión**. Cuando diga *Conectado*, continúa.

![Paso 2 del asistente de configuración con Gmail seleccionado](../assets/setup-mailbox.png)

**Con Docker**, pon la contraseña de aplicación en tu fichero `.env` como `IMAP_PASSWORD` y reinicia el contenedor; deja vacío el campo de contraseña del asistente.

## Datos del servidor

El asistente los rellena por ti:

| Dato | Valor |
|---|---|
| Servidor IMAP | `imap.gmail.com` |
| Puerto | `993` |
| TLS | Activado |
| Usuario | Tu dirección completa, p. ej. `tu@gmail.com` |

## Problemas frecuentes

| Problema | Qué hacer |
|---|---|
| La página de contraseñas de aplicación dice que la opción no está disponible | La verificación en dos pasos está desactivada, tu cuenta usa la Protección Avanzada o el administrador de Workspace ha desactivado las contraseñas de aplicación. |
| *El servidor rechazó el correo o la contraseña de aplicación* | Comprueba que has usado la dirección completa. Si copiaste la contraseña con espacios y la rechaza, pégala sin ellos. Si sigue fallando, crea una contraseña de aplicación nueva. |
| Antes funcionaba y ahora falla | Cambiar la contraseña de Google revoca tus contraseñas de aplicación. Crea una nueva e introdúcela en el asistente (o en `.env`). |
| *No se pudo conectar con el servicio* / tiempos de espera | Un cortafuegos o la red puede estar bloqueando el puerto 993. Prueba con otra red. |

Para desconectar, elimina la contraseña de aplicación en [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords). La app nunca modifica tu buzón: no se mueve, borra ni marca como leído nada.
