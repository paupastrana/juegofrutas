document.addEventListener("DOMContentLoaded", () => {
    const btnStart = document.getElementById("btn-start");
    const btnRestart = document.getElementById("btn-restart");
    const cameraStatus = document.getElementById("camera-status");
    const startScreen = document.getElementById("start-screen");
    const gameOverScreen = document.getElementById("game-over-screen");
    const scanScreen = document.getElementById("scan-screen");
    const scanTitle = document.getElementById("scan-title");
    const scanText = document.getElementById("scan-text");
    
    const canasta = document.getElementById("canasta");
    const spawnContainer = document.getElementById("spawn-container");
    
    const scoreEl = document.getElementById("score");
    const vidasEl = document.getElementById("vidas");
    const finalScoreEl = document.getElementById("final-score");

    const btnLeft = document.getElementById("btn-left");
    const btnRight = document.getElementById("btn-right");

    let score = 0;
    let vidas = 3;
    let gameActive = false;
    let canastaPosX = 0;
    
    let objetosEnJuego = [];
    let tiempoUltimoSpawn = 0;
    let velocidadBase = 0.02;
    let videoStreamElement = null;
    let scanFrame = null;
    let marcadorYaDetectado = false;

    // --- SISTEMA DE AUDIO Y MÚSICA DE FONDO (WEB AUDIO API) ---
    let audioCtx = null;
    let backgroundMusicInterval = null;

    function initAudio() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    }

    // Música de fondo estilo minijuego (secuencia de notas retro)
    function iniciarMusicaFondo() {
        if (backgroundMusicInterval) return; // Evitar múltiples loops

        // Melodía alegre tipo jueguito (Frecuencias en Hz)
        const notas = [
            440, 523.25, 659.25, 523.25, // A4, C5, E5, C5
            587.33, 659.25, 783.99, 659.25, // D5, E5, G5, E5
            493.88, 587.33, 659.25, 587.33, // B4, D5, E5, D5
            523.25, 440, 392.00, 440       // C5, A4, G4, A4
        ];
        let notaIndex = 0;

        backgroundMusicInterval = setInterval(() => {
            if (!audioCtx || !gameActive) return;

            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();

            osc.type = 'triangle'; // Tono suave tipo consola retro
            osc.frequency.setValueAtTime(notas[notaIndex], audioCtx.currentTime);

            // Volumen bajito para que no opaque los efectos de la fruta/bomba
            gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.18);

            osc.connect(gain);
            gain.connect(audioCtx.destination);

            osc.start();
            osc.stop(audioCtx.currentTime + 0.18);

            notaIndex = (notaIndex + 1) % notas.length;
        }, 200); // Velocidad del ritmo del jueguito
    }

    function detenerMusicaFondo() {
        if (backgroundMusicInterval) {
            clearInterval(backgroundMusicInterval);
            backgroundMusicInterval = null;
        }
    }

    // Sonido sintetizado para la Fruta
    function reproducirSonidoFruta() {
        if (!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.15);

        gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start();
        osc.stop(audioCtx.currentTime + 0.15);
    }

    // Sonido sintetizado para la Bomba
    function reproducirSonidoBomba() {
        if (!audioCtx) return;

        const duracion = 0.4;
        const bufferSize = audioCtx.sampleRate * duracion;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = audioCtx.createBufferSource();
        noise.buffer = buffer;

        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, audioCtx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + duracion);

        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duracion);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);

        noise.start();
        noise.stop(audioCtx.currentTime + duracion);
    }

    // Efecto visual flotante (+10 / -1)
    function mostrarEfectoVisual(texto, tipo, x, y) {
        const floatingEl = document.createElement("div");
        floatingEl.textContent = texto;
        floatingEl.style.position = "fixed";
        floatingEl.style.left = `${window.innerWidth / 2 + (x * 150)}px`;
        floatingEl.style.top = `${window.innerHeight / 2 - (y * 100)}px`;
        floatingEl.style.fontSize = "2rem";
        floatingEl.style.fontWeight = "bold";
        floatingEl.style.zIndex = "999";
        floatingEl.style.pointerEvents = "none";
        floatingEl.style.transition = "all 0.8s ease-out";
        floatingEl.style.color = tipo === "fruta" ? "#4ade80" : "#f87171";
        floatingEl.style.textShadow = "0 2px 4px rgba(0,0,0,0.8)";
        
        document.body.appendChild(floatingEl);

        setTimeout(() => {
            floatingEl.style.transform = "translateY(-60px) scale(1.3)";
            floatingEl.style.opacity = "0";
        }, 50);

        setTimeout(() => {
            floatingEl.remove();
        }, 850);
    }

    async function activarCamara() {
        initAudio(); 
        try {
            videoStreamElement = document.createElement('video');
            videoStreamElement.setAttribute('autoplay', '');
            videoStreamElement.setAttribute('muted', '');
            videoStreamElement.setAttribute('playsinline', '');
            videoStreamElement.style.position = 'fixed';
            videoStreamElement.style.top = '0';
            videoStreamElement.style.left = '0';
            videoStreamElement.style.width = '100vw';
            videoStreamElement.style.height = '100vh';
            videoStreamElement.style.objectFit = 'cover';
            videoStreamElement.style.zIndex = '-1';
            document.body.appendChild(videoStreamElement);

            const constraints = {
                video: {
                    facingMode: { exact: "environment" },
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            };

            let stream;
            try {
                stream = await navigator.mediaDevices.getUserMedia(constraints);
            } catch (e) {
                stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
            }

            videoStreamElement.srcObject = stream;
            await videoStreamElement.play();

            startScreen.style.display = "none";
            document.body.classList.add("jugando");
            canasta.setAttribute("visible", "true");

            gameActive = true;
            objetosEnJuego = [];
            spawnContainer.innerHTML = "";
            tiempoUltimoSpawn = performance.now();
            iniciarMusicaFondo(); // Arranca la música del jueguito
            iniciarGameLoop(performance.now());
        } catch (error) {
            console.error("Error al acceder a la cámara:", error);
            cameraStatus.textContent = "Error de cámara. Asegúrate de dar permisos y usar HTTPS.";
            startScreen.style.display = "block";
            scanScreen.classList.add("hidden");
            btnStart.textContent = "Reintentar";
            if (videoStreamElement) videoStreamElement.remove();
        }
    }

    // --- ESCANEO DEL MARCADOR (AR.js corre dentro de scan.html) ---
    function iniciarEscaneo() {
        initAudio(); // el toque del botón desbloquea el audio del navegador

        // Modo prueba sin marcador: abre index.html?sinmarcador
        if (window.location.search.includes("sinmarcador")) {
            activarCamara();
            return;
        }

        marcadorYaDetectado = false;
        startScreen.style.display = "none";
        scanTitle.textContent = "Busca el marcador";
        scanText.textContent = "Enfoca el marcador y mantenlo a la vista.";
        scanScreen.classList.remove("hidden");

        scanFrame = document.createElement("iframe");
        scanFrame.id = "scan-frame";
        scanFrame.src = "scan.html";
        scanFrame.setAttribute("allow", "camera");
        document.body.appendChild(scanFrame);
    }

    function cerrarEscaner() {
        if (!scanFrame) return;
        try {
            // Soltar la cámara para que el juego pueda volver a usarla
            scanFrame.contentDocument.querySelectorAll("video").forEach((v) => {
                if (v.srcObject) v.srcObject.getTracks().forEach((t) => t.stop());
            });
        } catch (e) { /* si no se puede, al quitar el iframe se libera igual */ }
        scanFrame.remove();
        scanFrame = null;
    }

    function marcadorDetectado() {
        if (marcadorYaDetectado) return;
        marcadorYaDetectado = true;
        scanTitle.textContent = "¡Marcador detectado!";
        scanText.textContent = "Preparando el juego…";

        setTimeout(async () => {
            cerrarEscaner();
            scanScreen.classList.add("hidden");
            await new Promise((r) => setTimeout(r, 400)); // margen para liberar la cámara
            activarCamara();
        }, 800);
    }

    function errorDeEscaneo() {
        cerrarEscaner();
        scanScreen.classList.add("hidden");
        startScreen.style.display = "block";
        cameraStatus.textContent = "No se pudo abrir la cámara. Da permisos y usa HTTPS.";
        btnStart.textContent = "Reintentar";
    }

    window.addEventListener("message", (event) => {
        if (!scanFrame || event.source !== scanFrame.contentWindow) return;
        const tipo = event.data && event.data.tipo;
        if (tipo === "marcador-encontrado") marcadorDetectado();
        if (tipo === "error-camara") errorDeEscaneo();
    });

    btnLeft.addEventListener("click", () => {
        if (!gameActive) return;
        canastaPosX = Math.max(canastaPosX - 0.25, -0.8);
        canasta.setAttribute("position", `${canastaPosX} -1.25 -3`);
    });

    btnRight.addEventListener("click", () => {
        if (!gameActive) return;
        canastaPosX = Math.min(canastaPosX + 0.25, 0.8);
        canasta.setAttribute("position", `${canastaPosX} -1.25 -3`);
    });

    function crearObjeto() {
        const el = document.createElement("a-entity");
        const esFruta = Math.random() < 0.7;
        
        if (esFruta) {
            el.setAttribute("gltf-model", "#fruta-model");
            el.setAttribute("scale", "0.027 0.027 0.027");
            el.setAttribute("rotation", "-65 0 0");
            el.dataset.tipo = "fruta";
        } else {
            el.setAttribute("gltf-model", "#bomba-model");
            el.setAttribute("scale", "0.27 0.27 0.27");
            el.dataset.tipo = "bomba";
        }

        const posX = (Math.random() * 1.4) - 0.7;
        const posY = 3.0;
        el.setAttribute("position", `${posX} ${posY} -3`);

        spawnContainer.appendChild(el);

        objetosEnJuego.push({
            elemento: el,
            x: posX,
            y: posY,
            tipo: esFruta ? "fruta" : "bomba"
        });
    }

    function iniciarGameLoop(tiempoActual) {
        if (!gameActive) return;

        let factorDificultad = 1 + (score / 50); 
        let velocidadActual = velocidadBase * factorDificultad;
        let intervaloActual = Math.max(800, 2000 - (score * 25));

        if (tiempoActual - tiempoUltimoSpawn > intervaloActual) {
            crearObjeto();
            tiempoUltimoSpawn = tiempoActual;
        }

        for (let i = objetosEnJuego.length - 1; i >= 0; i--) {
            let obj = objetosEnJuego[i];
            obj.y -= velocidadActual;
            obj.elemento.setAttribute("position", `${obj.x} ${obj.y} -3`);

            if (obj.y <= -1.1 && obj.y >= -1.4) {
                if (Math.abs(canastaPosX - obj.x) < 0.45) {
                    if (obj.tipo === "fruta") {
                        score += 10;
                        scoreEl.textContent = score;
                        reproducirSonidoFruta();
                        mostrarEfectoVisual("+10 ", "fruta", obj.x, obj.y);
                    } else {
                        vidas -= 1;
                        vidasEl.textContent = vidas;
                        reproducirSonidoBomba();
                        mostrarEfectoVisual("-1 ", "bomba", obj.x, obj.y);

                        if (vidas <= 0) {
                            terminarJuego();
                            return;
                        }
                    }
                    obj.elemento.parentNode.removeChild(obj.elemento);
                    objetosEnJuego.splice(i, 1);
                    continue;
                }
            }

            if (obj.y < -2.0) {
                if (obj.tipo === "fruta") {
                    vidas -= 1;
                    vidasEl.textContent = vidas;
                    reproducirSonidoBomba();
                    mostrarEfectoVisual("-1 ", "bomba", obj.x, obj.y);

                    if (vidas <= 0) {
                        terminarJuego();
                        return;
                    }
                }
                obj.elemento.parentNode.removeChild(obj.elemento);
                objetosEnJuego.splice(i, 1);
            }
        }

        requestAnimationFrame(iniciarGameLoop);
    }

    function terminarJuego() {
        gameActive = false;
        detenerMusicaFondo(); // Se apaga la música cuando pierdes
        canasta.setAttribute("visible", "false");
        spawnContainer.innerHTML = "";
        finalScoreEl.textContent = score;
        gameOverScreen.classList.remove("hidden");
    }

    btnStart.addEventListener("click", iniciarEscaneo);
    btnRestart.addEventListener("click", () => {
        initAudio();
        score = 0;
        vidas = 3;
        scoreEl.textContent = score;
        vidasEl.textContent = vidas;
        gameOverScreen.classList.add("hidden");
        canasta.setAttribute("visible", "true");
        canastaPosX = 0;
        canasta.setAttribute("position", `${canastaPosX} -1.25 -3`);
        gameActive = true;
        objetosEnJuego = [];
        spawnContainer.innerHTML = "";
        tiempoUltimoSpawn = performance.now();
        iniciarMusicaFondo(); // Reinicia la música al reintentar
        iniciarGameLoop(performance.now());
    });
});