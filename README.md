# 🍎 Atrapa las frutas AR

Juego de realidad aumentada que corre en el navegador del celular. Se activa al **escanear un marcador personalizado** con la cámara y, una vez detectado, empieza la partida: hay que mover la canasta para atrapar las frutas que caen y esquivar las bombas.

Hecho con [A-Frame](https://aframe.io/) y [AR.js](https://ar-js-org.github.io/AR.js-Docs/). No necesita instalar nada: solo abrir el link.

## 🎮 Cómo se juega

1. Abre el juego en el celular y toca **Escanear marcador**.
2. Acepta el permiso de la cámara.
3. Apunta la cámara al marcador (`markers/marcador.png`, impreso o en otra pantalla) y mantenlo a la vista un instante.
4. Al aparecer **¡Marcador detectado!**, el juego comienza.
5. Usa los botones ◀ ▶ para mover la canasta.

**Reglas**

| Evento | Resultado |
| --- | --- |
| Atrapar una fruta | +10 puntos |
| Atrapar una bomba | −1 vida |
| Dejar caer una fruta | −1 vida |
| Quedarte sin vidas (empiezas con 3) | Fin del juego |

La dificultad aumenta con el puntaje: las frutas caen más rápido y aparecen con más frecuencia.

## 🧩 Cómo funciona el marcador

El juego está dividido en dos partes para que no se estorben:

- **`scan.html`** abre la cámara con AR.js y busca el marcador (`markers/marcador.patt`). Se carga dentro de `index.html` como una capa. Si el marcador se mantiene visible 0.6 segundos seguidos, le avisa al juego.
- **`index.html` + `script.js`** reciben el aviso, cierran el escáner, vuelven a abrir la cámara y arrancan el juego con la escena 3D en A-Frame.


## 📁 Estructura

```
├── index.html        # Juego: interfaz y escena 3D
├── scan.html         # Detección del marcador (AR.js)
├── script.js         # Lógica del juego, sonidos y escaneo
├── style.css         # Estilos
├── modelos.html      # Página para revisar los modelos 3D
├── models/           # Modelos 3D (.glb): canasta, manzana, bomba
└── markers/          # Marcador: .patt (detección) y .png (imprimir)
```

## 💡 Si el marcador no se detecta

- Usa buena luz y evita reflejos sobre el papel o la pantalla.
- Que se vea **completo**, con todo el borde negro dentro del encuadre.
- Acércate o aléjate un poco y mantén el celular estable.

## 🛠️ Tecnologías

- [A-Frame](https://aframe.io/) 1.6.0 (juego) y 1.3.0 (escáner)
- [AR.js](https://github.com/AR-js-org/AR.js) 3.4.5
- JavaScript, HTML y CSS
- Web Audio API para la música y los efectos de sonido
- Modelos 3D en formato glTF (`.glb`)
