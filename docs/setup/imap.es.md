# Conectar otro buzón IMAP

🇬🇧 [Read in English](imap.md)

Funciona cualquier servidor de correo que admita IMAP estándar con contraseña: proveedores de hosting, servidores de empresa, proveedores centrados en la privacidad, etc. La app solo lee (la carpeta se abre con `EXAMINE`); no se mueve, borra ni marca como leído nada.

> Las webs de los proveedores cambian. Si lo que ves no coincide con estos pasos, sigue lo que aparece en pantalla.

## Antes de empezar

Necesitas tres datos de tu proveedor. Busca «configuración IMAP» en su ayuda o mira los ajustes de una app de correo donde la cuenta ya funcione.

| Dato | Normalmente |
|---|---|
| Servidor IMAP | `imap.tuproveedor.com` o `mail.tudominio.com` |
| Puerto | `993` |
| TLS (SSL) | Activado |

Y una contraseña:

- **Si tu cuenta usa inicio de sesión en dos pasos**, crea una **contraseña de aplicación** en los ajustes de seguridad de la cuenta (puede llamarse *contraseña específica de app* o *contraseña de dispositivo*). Tu contraseña normal casi siempre será rechazada.
- Si no, usa la contraseña de la cuenta. Aun así, si tu proveedor ofrece contraseñas de aplicación, mejor usa una: puedes revocarla sin cambiar tu contraseña principal.

No soportados: **Outlook, Hotmail y Microsoft 365** (Microsoft exige OAuth para IMAP; está previsto) y los proveedores que no ofrecen IMAP con contraseña.

## Pasos

1. En el asistente de configuración (paso 2, *Tu buzón*), elige **Otro IMAP**.
2. Escribe el servidor IMAP, el puerto y si se usa TLS.
3. Escribe tu dirección de correo (o el usuario que te dé tu proveedor) y la contraseña.
4. Pulsa **Probar conexión**. Cuando diga *Conectado*, continúa.

**Con Docker**, pon la contraseña en tu fichero `.env` como `IMAP_PASSWORD` y reinicia el contenedor; deja vacío el campo de contraseña del asistente.

Mantén TLS activado. Desactívalo solo para un servidor en tu propia máquina o red que no tenga TLS, como un puente local o un servidor de pruebas.

## Problemas frecuentes

| Problema | Qué hacer |
|---|---|
| *El servidor rechazó el correo o la contraseña de aplicación* | Revisa el usuario (algunos proveedores piden la dirección completa y otros solo la parte anterior a la `@`) y usa una contraseña de aplicación si la cuenta tiene inicio de sesión en dos pasos. |
| *No se pudo conectar con el servicio* / tiempos de espera | Revisa el nombre del servidor y el puerto, y que TLS corresponda al puerto (el 993 usa TLS). Un cortafuegos puede estar bloqueando el puerto. |
| Conecta, pero no aparece ningún correo | El asistente analiza INBOX por defecto. Elige otra carpeta en el paso 3 si tu proveedor guarda el correo en otro sitio, y revisa los días hacia atrás. |
