# Droply — registro de producto

Este archivo es la lista oficial de trabajo. Se actualiza al terminar cada cambio.

Estados: `✅ terminado` · `🟡 en progreso` · `⬜ pendiente` · `🧪 experimental` · `⛔ descartado`

## Base funcional

- ✅ Transferencia directa de archivos mediante WebRTC.
- ✅ Progreso, velocidad, tiempo restante y descarga final.
- ✅ Cancelar y volver a iniciar una transferencia sin mezclar fragmentos.
- ✅ Salas mediante código, máximo cuatro integrantes.
- ✅ Lista sincronizada de integrantes.
- ✅ Chat rápido de la mesa.
- ✅ Lienzo desplazable con zoom, búsqueda y elementos movibles.
- ✅ Carpetas y notas; archivos arrastrables dentro de carpetas.
- ✅ Nombre del dispositivo que agregó cada elemento.
- ✅ Animación al arrastrar un archivo sobre “Enviar”.
- ✅ Configuración TURN fuera del paquete web y validación básica del backend.

## Próxima entrega: conexión cercana

- ✅ **Cercanía web v1:** QR y código de un solo uso, vencimiento y confirmación visual con nombres en ambos dispositivos.
  - Terminado cuando un teléfono abre Droply, escanea, ve el nombre del PC y ambos confirman la conexión.
- ⬜ Detectar si ambos dispositivos están en la misma red y priorizar la ruta local.
- ⬜ Recordar dispositivos propios autorizados y permitir reconexión rápida.
- ⬜ Mostrar “Cerca”, “En línea” o “Fuera de línea” sin inventar distancia física.
- ⬜ **Cercanía nativa v2:** descubrimiento real mediante Bluetooth/Wi‑Fi local en las apps móvil y escritorio.
- 🧪 **Cercanía precisa v3:** animación basada en distancia/dirección mediante UWB en equipos compatibles.

## Integridad y continuidad

- ✅ Hash SHA-256 encadenado y verificación final de tamaño y contenido antes de descargar.
- ⬜ Reintentar fragmentos dañados o perdidos.
- ⬜ Pausar y reanudar incluso después de una desconexión.
- ⬜ Descargar desde otra copia disponible si desaparece el dispositivo original.
- ⬜ Transferir carpetas completas conservando su estructura.
- ⬜ Evitar duplicados mediante hash sin inspeccionar el contenido en el servidor.

## Red personal de archivos

- ⬜ Registrar qué dispositivos poseen cada archivo, guardando solo metadatos.
- ⬜ Mostrar fuentes disponibles y elegir automáticamente la más rápida.
- ⬜ “Avísame cuando esté disponible”.
- ⬜ “Descargar automáticamente por Wi‑Fi”.
- ⬜ Mantener disponible: solicitar una copia adicional en otro dispositivo autorizado.
- ⬜ Actualizar el estado cuando una copia aparece, cambia o deja de estar disponible.

## Organización y colaboración

- ⬜ Mesas persistentes con nombre y portada.
- ⬜ Historial de actividad sincronizado.
- ⬜ Versiones de un mismo archivo y restauración de versiones anteriores.
- ⬜ Comentarios ligados a un archivo, no otro chat general.
- ⬜ Estados simples: pendiente, para revisión, aprobado y requiere cambios.
- ⬜ Solicitudes de archivos mediante enlace para personas sin cuenta.
- ⬜ Vista de papelera y recuperación.
- ⬜ Mini mapa del lienzo y botón “mostrar todo”.
- ⬜ Selección múltiple, alineación y agrupación visual.
- ⬜ Cursores colaborativos; activables para no saturar la interfaz.

## Personas y dispositivos

- ⬜ Cuenta opcional para uso personal; el envío rápido seguirá funcionando sin cuenta.
- ⬜ Vincular teléfono, PC y tablet propios.
- ⬜ Aceptar o rechazar cada dispositivo nuevo.
- ⬜ Revocar un dispositivo perdido.
- ⬜ Biometría y llaves de acceso en aplicaciones compatibles.
- ⬜ Notificaciones de solicitudes y transferencias completadas.

## Empresas

- ⬜ Equipos, propietarios, editores y lectores.
- ⬜ Inicio de sesión corporativo y autenticación multifactor.
- ⬜ Auditoría exportable y políticas de retención.
- ⬜ Administración y revocación remota de dispositivos.
- ⬜ Límites por mesa, equipo, extensión y tamaño.
- ⬜ Cifrado de metadatos persistentes y rotación de claves.
- ⬜ Solicitudes externas con acceso limitado a una entrega.
- ⬜ Recuperación y alta disponibilidad del backend.

## Experiencia y herramientas

- ⬜ Vista móvil del archivo seleccionado con Enviar, Firmar y Descargar.
- ⬜ Integrar Firmar PDF, Unir PDF, Convertir y Comprimir desde un archivo de la mesa.
- ⬜ Editar notas sin ventanas del navegador.
- ⬜ Accesibilidad completa por teclado, lector de pantalla y contraste.
- ⬜ Tutorial contextual de tres gestos como máximo; nunca obligatorio.
- ⬜ Instalación como PWA y soporte offline de la interfaz.

## Decisiones para proteger la simplicidad

- ⛔ No almacenar bytes de archivos en el backend por defecto.
- ⛔ No convertir Droply en otro gestor de tareas general.
- ⛔ No añadir calendarios, videollamadas o correo dentro de la primera versión.
- ⛔ No mostrar controles empresariales a usuarios personales.
- ⛔ No llamar “cerca” a un dispositivo basándonos únicamente en que está conectado a internet.

## Regla para incorporar una función

Una función entra al producto solo si reduce al menos uno de estos problemas:

1. Encontrar el archivo correcto.
2. Conseguir que esté disponible.
3. Entregarlo con seguridad y sin errores.
4. Saber qué ocurrió y quién debe actuar.
5. Hacer todo lo anterior con menos pasos que la alternativa.
