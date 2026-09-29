# Conectar iCloud Mail

🇬🇧 [Read in English](icloud.md)

JEV Mail Filtering inicia sesión en iCloud Mail por IMAP con una **contraseña específica de app**: una contraseña que solo usa esta app y que puedes revocar cuando quieras. La contraseña de tu cuenta de Apple no sirve aquí.

> Las webs de los proveedores cambian. Si lo que ves no coincide con estos pasos, sigue lo que aparece en pantalla.

## Antes de empezar

- **La autenticación de doble factor debe estar activa** en tu cuenta de Apple. Apple solo ofrece contraseñas específicas de app cuando lo está. La mayoría de cuentas ya la tienen; puedes comprobarlo en *Ajustes → [tu nombre] → Inicio de sesión y seguridad* en un iPhone o en [account.apple.com](https://account.apple.com).
- Necesitas una dirección de iCloud Mail (`@icloud.com`, `@me.com` o `@mac.com`).

## Pasos

1. Inicia sesión en [account.apple.com](https://account.apple.com).
2. Abre **Inicio de sesión y seguridad → Contraseñas específicas de apps**.
3. Pulsa **Generar una contraseña específica de app** (o **+**), escribe una etiqueta como `JEV Mail Filtering` y confirma. Apple puede pedirte la contraseña de tu cuenta de Apple.
4. Copia la contraseña (tiene el formato `xxxx-xxxx-xxxx-xxxx`).
5. En el asistente de configuración (paso 2, *Tu buzón*), elige **iCloud Mail**, escribe tu dirección de iCloud **completa** (por ejemplo `tu@icloud.com`) como correo y pega la contraseña.
6. Pulsa **Probar conexión**. Cuando diga *Conectado*, continúa.

![Paso 2 del asistente de configuración (se muestra con Gmail; elige iCloud Mail)](../assets/setup-mailbox.png)

**Con Docker**, pon la contraseña en tu fichero `.env` como `IMAP_PASSWORD` y reinicia el contenedor; deja vacío el campo de contraseña del asistente.

## Datos del servidor

El asistente los rellena por ti:

| Dato | Valor |
|---|---|
| Servidor IMAP | `imap.mail.me.com` |
| Puerto | `993` |
| TLS | Activado |
| Usuario | Tu dirección de iCloud completa, p. ej. `tu@icloud.com` |

## Problemas frecuentes

| Problema | Qué hacer |
|---|---|
| No aparece *Contraseñas específicas de apps* | La autenticación de doble factor no está activa en esta cuenta de Apple. Actívala primero. |
| *El servidor rechazó el correo o la contraseña de aplicación* | Usa tu dirección de iCloud Mail, no un número de teléfono ni otra dirección vinculada a la cuenta. Crea una contraseña específica nueva si hace falta. |
| Antes funcionaba y ahora falla | Cambiar la contraseña de tu cuenta de Apple revoca todas las contraseñas específicas de app. Crea una nueva. |
| *No se pudo conectar con el servicio* / tiempos de espera | Un cortafuegos o la red puede estar bloqueando el puerto 993. Prueba con otra red. |

Para desconectar, revoca la contraseña en **Inicio de sesión y seguridad → Contraseñas específicas de apps**. La app nunca modifica tu buzón: no se mueve, borra ni marca como leído nada.
