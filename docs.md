# Palet — documentación para construir mini-apps

**Versión 1.0.1** · actualizado el 9 de agosto de 2026 · https://palet.cloud/docs.html

Esto está escrito para que lo lea una IA que va a construir una app de Palet.
Si eres una persona, la versión con formato está en https://palet.cloud/docs.html

---

## Qué es una app de Palet

Un **único documento HTML** con su CSS y su JavaScript dentro. Sin dependencias,
sin build, sin ficheros sueltos.

Se ejecuta **en el dispositivo de quien la usa**, dentro de un sandbox, con un
objeto `window.palet` inyectado. El servidor de Palet **nunca ejecuta el código
de las apps**: guarda su HTML, guarda sus datos y comprueba permisos.

De ahí salen las dos reglas que ordenan todo lo demás:

1. **Todo el cálculo ocurre en el dispositivo**, mientras la app está abierta.
2. **Con la app cerrada no pasa nada.** No hay tareas programadas ni procesos de
   fondo. Lo único que sigue vivo son los avisos ya enviados y las cuentas atrás
   del widget.

---

## El SDK

Todo lo que una app puede hacer pasa por `window.palet`. No hay más superficie.

### `palet.ready(cb)`

Espera a tener contexto. Dentro ya existen `palet.user` y `palet.app`.

```js
palet.ready(() => { /* aquí empieza tu app */ })
```

### Datos: dos sitios y no se parecen

**`palet.storage` — del grupo.** Lo que existe una vez para todos: la lista de
la compra, los gastos, el itinerario. Si la app se comparte, todos lo ven y
todos lo escriben.

```js
await palet.storage.get('gastos')
await palet.storage.set('gastos', lista)      // pisa lo que haya
await palet.storage.update('gastos', l => [...(l||[]), nuevo])   // ← usa esto
await palet.storage.delete('gastos')
await palet.storage.list()
```

**Usa siempre `update()` y no `set()`** cuando la app pueda estar compartida.
`update()` lee, aplica tu cambio y guarda solo si nadie tocó la clave mientras
tanto. Con `set()`, el último en escribir borra lo del anterior.

**`palet.me` — de cada persona.** Su récord, sus preferencias, su progreso.
Nadie más lo ve, ni siquiera quien creó la app.

```js
await palet.me.set('record', 4820)
await palet.me.get('record')
await palet.me.delete('record')
await palet.me.list()
```

**Error clásico**: guardar el récord de un juego en `storage`. Al compartirlo,
todo el mundo hereda la puntuación de otro.

Si el dato es del grupo pero hay que saber de quién es cada cosa (un marcador,
un reparto de gastos), va en `storage`, en un objeto indexado por
`palet.user.id`, con el nombre dentro para mostrarlo. **Nunca uses el nombre
como clave**: se repite.

### `palet.onChange(cb)`

Avisa cuando alguien del grupo toca algo. Recibe las claves cambiadas.

```js
palet.onChange(keys => { if (keys.includes('gastos')) pintar() })
```

### `palet.widget.set({...}, opts)`

Lo que la app enseña en la pantalla de inicio del móvil.

```js
palet.widget.set({ title: 'Casa', value: '5 cosas', caption: 'leche, pan, café' })
```

- `value` se lee de un vistazo: un número, una hora, dos palabras.
- **Si el dato depende del reloj, publica la fecha, no el número**: `until` para
  una cuenta atrás, `since` para tiempo transcurrido. El widget la cuenta solo,
  sin que la app se ejecute. Es la única forma de que vaya al día sin abrirla.
- El formato se elige solo (reloj si faltan horas, lenguaje llano si días).
  `format: 'timer' | 'relative'` lo fuerza, pero casi nunca hace falta.
- Por defecto es de cada persona. Con `{ shared: true }` es del grupo y le llega
  al resto en segundos sin que abran nada — la única forma de que el widget de
  otra persona refleje algo que hiciste tú.

```js
palet.widget.set({ title: 'Pomodoro', until: fin })
palet.widget.set({ title: 'Casa', value: '3 tareas' }, { shared: true })
palet.widget.clear()
```

### `palet.notify(titulo, texto, opts)`

```js
palet.notify('Bloque terminado', 'Descansa cinco minutos')          // a quien la usa
palet.notify('Te toca', 'Ana te ha asignado la compra', { to: id }) // a alguien
palet.notify('Ya está', 'Lista terminada', { to: '*' })             // a todos menos a ti
```

Solo llega a gente que participa en esa app. **Avisa solo de lo que interrumpe**:
te han asignado algo, vence mañana, te toca a ti. Hay tope diario, y sobre todo
cualquiera puede silenciar la app sin que la app se entere ni pueda evitarlo. Si
avisas de más te silencian, y con ello se pierden también los avisos que
importaban.

### `palet.connect(nombre).fetch(url, opts)`

Llamar a una API externa con un secreto que la app nunca ve.

```js
const r = await palet.connect('notion').fetch('/v1/pages', { method: 'POST', body: {...} })
// devuelve { status, ok, content_type, body }
```

**Nunca escribas una clave de API en el HTML**: queda visible en la definición de
la app y en el chat donde se creó. Los secretos se dan de alta en Ajustes →
Integraciones.

Si la app se va a compartir, declara qué puede hacer al crearla:

```json
"integrations": [{ "name": "notion", "allow": ["GET /v1/pages/*", "POST /v1/pages"] }]
```

Entonces se usa la clave de quien creó la app y funciona para todos, **pero solo
para esas rutas**. Sin declararlo, cada persona necesita dar de alta la suya.
Cada regla es `MÉTODO /ruta`; el `*` final abre lo que cuelgue. Pide lo mínimo.

### `palet.openUrl(url)`

Abre un enlace externo. Esquemas: `https`, `mailto`, `tel`, `sms`, `geo`.
Llámalo siempre desde un clic, o el navegador lo bloquea.

### `palet.user` · `palet.app`

Quién la usa (`id`, `name`) y qué app es (`id`, `name`).

---

## Red

Por defecto una app **no tiene red**. Para llamar a una API hay que declarar sus
orígenes al crearla (`origins`), y quien la use los aprueba la primera vez.

Solo funcionan APIs que acepten peticiones desde un navegador (CORS) y sin
autenticación de servidor. Para el resto, `palet.connect`.

---

## Límites

Se aplican en el servidor, que es el único sitio donde tiene sentido: el
JavaScript de una app se puede cambiar, el servidor no.

| | Boceto | Atelier | Maestro |
|---|---|---|---|
| Apps propias | 1 | 10 | 20 |
| Almacenamiento | 10 MB | 200 MB | 2 GB |
| Tamaño de un valor | 256 KB | 1 MB | 5 MB |

- **240 llamadas por minuto** y cuenta desde las apps, 60 desde una IA.
- **25 personas** por app compartida, contando a quien la creó.
- **10 apps** que te pueden compartir.
- Enlaces para unirse: **3 días**.
- Avisos: **10 al día por persona**, 60 por app.

**Agrupa los datos en pocas claves.** Una lista de la compra es una clave con un
array dentro, no cincuenta claves. Va más rápido, gasta menos cupo y ocupa menos.

---

## Lo que Palet NO hace

- **No ejecuta código en el servidor.** Nada de lógica de negocio, procesos ni
  tareas programadas.
- **No hace nada con la app cerrada.** No existe «cada noche recalcula».
- **No es una base de datos.** Es un almacén de claves y valores JSON: no hay
  consultas ni índices; se lee la clave entera y se filtra en el dispositivo.
- **No sirve para muchos usuarios.** Está pensado para un grupo con nombres y
  caras, no para publicar a mil desconocidos.
- **No guarda secretos en la app.** Cualquier clave escrita en el HTML es
  visible.
- **No corre binarios ni instala paquetes.** Un HTML y ya.

---

## Al construir una app, ten esto en cuenta

1. **Decide de quién es cada dato** antes de escribir nada: `storage` si es del
   grupo, `me` si es de cada cual. Equivocarse aquí es lo que peor sienta
   arreglar después.
2. **Escribe con `update()`**, no con `set()`, y repinta con `onChange()`.
3. **Publica al widget** si la app tiene un dato que se mira más de lo que se
   toca. Si depende del reloj, publica la fecha.
4. **Avisa poco.** Solo lo que interrumpe.
5. **Economiza llamadas**: pocas claves, nada de sondeos ni bucles.
6. **Una sola pantalla de HTML**, sin recursos externos.
