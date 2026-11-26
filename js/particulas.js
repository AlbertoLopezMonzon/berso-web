// Berso · logo 3D.
// 1) Intro: las partículas se reparten por toda la portada y se juntan formando el logo.
// 2) Final: el logo se convierte en un bloque sólido en 3D (capas apiladas, con volumen).
//    Al pasar el ratón (o el dedo), el logo gira suavemente.
// Sin WebGL o con movimiento reducido se queda la imagen normal del logo.
(() => {
  const portada = document.getElementById('inicio');
  const caja = document.getElementById('logo3d');
  if (!portada || !caja || typeof THREE === 'undefined' || !window.PUNTOS_LOGO) return;

  const reducir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const RATIO = 540 / 1600;
  const FOV = 40, DISTANCIA = 5;
  const CAPAS = 10, PROFUNDIDAD = .0045;    // grosor del logo sólido (poco volumen para que las letras pequeñas se lean)
  const RADIO_RATON = .55, FUERZA = .025;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch (e) {
    return; // sin WebGL: queda la imagen del logo
  }
  const lienzo = renderer.domElement;
  lienzo.style.position = 'absolute';
  lienzo.style.top = '0';
  lienzo.style.left = '0';
  lienzo.style.width = '100%';
  lienzo.style.height = '100%';
  portada.insertBefore(lienzo, portada.firstChild);
  portada.classList.add('is-3d');

  const escena = new THREE.Scene();
  const camara = new THREE.PerspectiveCamera(FOV, 1, .1, 100);
  camara.position.z = DISTANCIA;

  // Partículas (intro)
  const n = window.PUNTOS_LOGO.length;
  const destino = new Float32Array(n * 3);
  const pos = new Float32Array(n * 3);
  const vel = new Float32Array(n * 3);
  const geometria = new THREE.BufferGeometry();
  geometria.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const materialPuntos = new THREE.PointsMaterial({ size: .012, color: 0x000000, transparent: true, opacity: 1 });
  const puntos = new THREE.Points(geometria, materialPuntos);
  escena.add(puntos);

  // Logo sólido (capas)
  const grupo = new THREE.Group();
  grupo.visible = false;
  escena.add(grupo);
  const materialesCapas = [];

  let W = 1, H = 1, w = 1, h = 1;
  let centroX = 0, centroY = 0, anchoW = 1, altoW = 1;

  // Carga el logo y lo convierte en textura con transparencia (negro opaco, fondo transparente)
  const img = new Image();
  img.onload = () => {
    try {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const datos = ctx.getImageData(0, 0, c.width, c.height);
      const d = datos.data;
      for (let i = 0; i < d.length; i += 4) {
        const lum = (d[i] + d[i + 1] + d[i + 2]) / 3;
        d[i] = 0; d[i + 1] = 0; d[i + 2] = 0;
        d[i + 3] = Math.max(0, Math.min(255, 255 - lum * 1.1));
      }
      ctx.putImageData(datos, 0, 0);
      const textura = new THREE.CanvasTexture(c);
      const geo = new THREE.PlaneGeometry(1, 1);
      for (let k = 0; k < CAPAS; k++) {
        const t = k / (CAPAS - 1);
        const color = new THREE.Color().setScalar(t * .35);  // la cara de atrás se ve algo más clara
        const mat = new THREE.MeshBasicMaterial({ map: textura, color, transparent: true, alphaTest: .05, opacity: 0 });
        const malla = new THREE.Mesh(geo, mat);
        malla.position.z = -k * PROFUNDIDAD;
        grupo.add(malla);
        materialesCapas.push(mat);
      }
      grupo.position.set(centroX, centroY, 0);
      grupo.scale.set(anchoW, altoW, 1);
      if (reducir) {
        materialesCapas.forEach((m) => { m.opacity = 1; });
        grupo.visible = true;
        puntos.visible = false;
      }
    } catch (e) {
      // Si el navegador no deja leer la imagen, se muestra el logo normal y se quitan las partículas
      portada.classList.remove('is-3d');
      puntos.visible = false;
      lienzo.style.display = 'none';
    }
  };
  img.src = 'assets/logo.jpeg';

  // Tamaño de la portada en píxeles y en unidades 3D
  function medir() {
    const nw = portada.clientWidth, nh = portada.clientHeight;
    if (!nw || !nh) return;
    w = nw; h = nh;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h, false);
    camara.aspect = w / h;
    camara.updateProjectionMatrix();
    H = 2 * Math.tan((FOV * Math.PI / 180) / 2) * DISTANCIA;
    W = H * camara.aspect;
    caja.style.height = (caja.clientWidth * RATIO) + 'px';
    recalcularDestinos();
  }

  // Posición y tamaño del logo en el espacio 3D, exactamente donde está su caja
  function recalcularDestinos() {
    const r = caja.getBoundingClientRect();
    const pr = portada.getBoundingClientRect();
    const cx = (r.left - pr.left) + r.width / 2;
    const cy = (r.top - pr.top) + r.height / 2;
    anchoW = (r.width / w) * W;
    altoW = anchoW * RATIO;
    centroX = (cx / w - .5) * W;
    centroY = (.5 - cy / h) * H;
    window.PUNTOS_LOGO.forEach(([x, y], i) => {
      destino[i * 3] = centroX + x * (anchoW / 2);
      destino[i * 3 + 1] = centroY + y * (altoW / 2);
      destino[i * 3 + 2] = 0;
    });
    grupo.position.set(centroX, centroY, 0);
    grupo.scale.set(anchoW, altoW, 1);
  }

  // Punto de partida de las partículas: repartidas por toda la portada
  window.PUNTOS_LOGO.forEach((_, i) => {
    pos[i * 3] = (Math.random() - .5) * 3;
    pos[i * 3 + 1] = (Math.random() - .5) * 4;
    pos[i * 3 + 2] = (Math.random() - .5) * 3;
  });

  // Puntero (ratón o dedo): en el espacio 3D
  const raton = { x: 0, y: 0, activo: false, nx: 0, ny: 0 };
  const alPlano = (clientX, clientY) => {
    const r = portada.getBoundingClientRect();
    raton.x = ((clientX - r.left) / w - .5) * W;
    raton.y = (.5 - (clientY - r.top) / h) * H;
    raton.nx = (clientX - r.left) / w - .5;   // de -0,5 a 0,5
    raton.ny = (clientY - r.top) / h - .5;
    raton.activo = true;
  };
  portada.addEventListener('pointermove', (e) => alPlano(e.clientX, e.clientY));
  portada.addEventListener('pointerdown', (e) => alPlano(e.clientX, e.clientY));
  portada.addEventListener('pointerleave', () => { raton.activo = false; });

  if ('ResizeObserver' in window) new ResizeObserver(medir).observe(portada);
  window.addEventListener('resize', medir);
  window.addEventListener('load', medir);
  medir();

  // Paso de la intro al logo sólido
  let finalizado = false;
  function pasarAlSolido() {
    if (finalizado || materialesCapas.length === 0) return;
    finalizado = true;
    grupo.visible = true;
    materialesCapas.forEach((m, k) => {
      setTimeout(() => { m.opacity = 1; }, k * 25);  // las capas aparecen una a una, de dentro afuera
    });
    // Las partículas se desvanecen
    const fundido = { o: 1 };
    const tick = () => {
      fundido.o = Math.max(0, fundido.o - .03);
      materialPuntos.opacity = fundido.o;
      if (fundido.o > 0) requestAnimationFrame(tick); else puntos.visible = false;
    };
    tick();
  }

  // Giro: sigue al puntero y tiene un vaivén suave
  let giroX = 0, giroY = 0;
  const K = .035, AMORTIGUA = .86;
  const t0 = performance.now();
  let inicio = performance.now();

  const frame = () => {
    const ahora = performance.now();
    const t = (ahora - t0) / 1000;

    // Intro de partículas
    if (puntos.visible) {
      for (let i = 0; i < n; i++) {
        const ix = i * 3, iy = ix + 1, iz = ix + 2;
        vel[ix] += (destino[ix] - pos[ix]) * K;
        vel[iy] += (destino[iy] - pos[iy]) * K;
        vel[iz] += (destino[iz] - pos[iz]) * K;
        if (raton.activo) {
          const dx = pos[ix] - raton.x, dy = pos[iy] - raton.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < RADIO_RATON * RADIO_RATON) {
            const d = Math.sqrt(d2) || .0001;
            const f = (1 - d / RADIO_RATON) * FUERZA;
            vel[ix] += (dx / d) * f;
            vel[iy] += (dy / d) * f;
          }
        }
        vel[ix] *= AMORTIGUA; vel[iy] *= AMORTIGUA; vel[iz] *= AMORTIGUA;
        pos[ix] += vel[ix]; pos[iy] += vel[iy]; pos[iz] += vel[iz];
      }
      geometria.attributes.position.needsUpdate = true;
      if (!finalizado && ahora - inicio > 3800) pasarAlSolido();
    }

    // Logo sólido: giro suave hacia el puntero y vaivén en reposo
    if (grupo.visible) {
      const objY = raton.activo ? raton.nx * .35 : Math.sin(t * .6) * .05;
      const objX = raton.activo ? raton.ny * -.2 : Math.sin(t * .45) * .03;
      giroY += (objY - giroY) * .08;
      giroX += (objX - giroX) * .08;
      grupo.rotation.y = giroY;
      grupo.rotation.x = giroX;
    }

    renderer.render(escena, camara);
    requestAnimationFrame(frame);
  };

  if (reducir) {
    puntos.visible = false;
    renderer.render(escena, camara);
  } else {
    frame();
  }
})();
