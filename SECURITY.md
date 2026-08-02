# Seguridad de Droply

## Antes de publicar

1. Revoca las antiguas credenciales TURN que estuvieron incluidas en `PeerManager.ts`.
2. Sirve frontend y backend exclusivamente mediante HTTPS/WSS.
3. Copia `backend/.env.example` a `.env` solo en el servidor y define `CLIENT_ORIGINS`.
4. Configura coturn o un proveedor compatible con credenciales temporales y guarda
   `TURN_SHARED_SECRET` únicamente en el gestor de secretos del hosting.
5. No pongas contraseñas, tokens ni claves privadas en variables `VITE_*`: Vite las
   incorpora al JavaScript público.
6. Mantén `.env` fuera de Git y rota inmediatamente cualquier secreto publicado.

## Modelo actual

- Los bytes de archivos viajan por WebRTC y no se guardan en el backend de Droply.
- El backend conserva metadatos de las mesas solamente en memoria mientras la sala existe.
- Los códigos de sala son aleatorios, pero no reemplazan una cuenta ni permisos de empresa.
- Para mesas persistentes se debe añadir autenticación, roles, auditoría y cifrado antes de
  guardar metadatos en una base de datos.

## Reportes

No publiques vulnerabilidades ni secretos en issues públicos. Usa un canal privado del equipo.
