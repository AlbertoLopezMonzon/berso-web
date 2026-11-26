// Berso · logo de partículas 3D.
// El lienzo cubre toda la portada: las partículas empiezan repartidas por toda la pantalla
// y se van juntando hasta formar el logo. Al pasar el ratón (o el dedo), las cercanas se apartan y vuelven.
// Los puntos vienen de js/logo-puntos.js. Sin WebGL o con movimiento reducido se queda la imagen de respaldo.
// En móvil la barra del navegador cambia la altura: por eso el tamaño se recalcula siempre (ResizeObserver).
(() => {
  const portada = document.getElementById('inicio');
  const caja = document.getElementById('logo3d');
  if (!portada || !caja || typeof THREE === 'undefined' || !window.PUNTOS_LOGO) return;

  const reducir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const RATIO = 540 / 1600;          // alto / ancho del logo
  const FOV = 40;
  const DISTANCIA = 5;
  const RADIO_RATON = .55, FUERZA = .025;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch (e) {
    return; // sin WebGL: se queda la imagen de respaldo
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

  const n = window.PUNTOS_LOGO.length;
  const destino = new Float32Array(n * 3);
  const pos = new Float32Array(n * 3);
  const vel = new Float32Array(n * 3);
  const geometria = new THREE.BufferGeometry();
  geometria.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const material = new THREE.PointsMaterial({ size: .028, color: 0x000000, transparent: true, opacity: .95 });
  const puntos = new THREE.Points(geometria, material);
  escena.add(puntos);

  let W = 1, H = 1, w = 1, h = 1;

  // Tamaño real de la portada en este momento (píxeles y unidades 3D)
  function medir() {
    const nw = portada.clientWidth, nh = portada.clientHeight;
    if (!nw || !nh) return;
    w = nw; h = nh;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h, false);          // false: no toca el estilo; el CSS manda el tamaño
    camara.aspect = w / h;
    camara.updateProjectionMatrix();
    H = 2 * Math.tan((FOV * Math.PI / 180) / 2) * DISTANCIA;
    W = H * camara.aspect;
    caja.style.height = (caja.clientWidth * RATIO) + 'px';
    recalcularDestinos();
  }

  // Dónde debe estar cada punto: en el sitio exacto de la caja del logo
  function recalcularDestinos() {
    const r = caja.getBoundingClientRect();
    const pr = portada.getBoundingClientRect();
    const cx = (r.left - pr.left) + r.width / 2;
    const cy = (r.top - pr.top) + r.height / 2;
    const anchoW = (r.width / w) * W;
    const altoW = anchoW * RATIO;
    const centroX = (cx / w - .5) * W;
    const centroY = (.5 - cy / h) * H;
    window.PUNTOS_LOGO.forEach(([x, y], i) => {
      destino[i * 3] = centroX + x * (anchoW / 2);
      destino[i * 3 + 1] = centroY + y * (altoW / 2);
      destino[i * 3 + 2] = 0;
    });
  }

  // Punto de partida: repartidos por toda la pantalla, también fuera del logo
  window.PUNTOS_LOGO.forEach((_, i) => {
    pos[i * 3] = (Math.random() - .5) * 3;
    pos[i * 3 + 1] = (Math.random() - .5) * 4;
    pos[i * 3 + 2] = (Math.random() - .5) * 3;
  });

  // Ratón o dedo en coordenadas 3D
  const raton = { x: 0, y: 0, activo: false };
  const alPlano = (clientX, clientY) => {
    const r = portada.getBoundingClientRect();
    raton.x = ((clientX - r.left) / w - .5) * W;
    raton.y = (.5 - (clientY - r.top) / h) * H;
    raton.activo = true;
  };
  portada.addEventListener('pointermove', (e) => alPlano(e.clientX, e.clientY));
  portada.addEventListener('pointerdown', (e) => alPlano(e.clientX, e.clientY));
  portada.addEventListener('pointerleave', () => { raton.activo = false; });

  // El tamaño se vuelve a medir cada vez que cambia la portada (móvil, giro, barra del navegador)
  if ('ResizeObserver' in window) new ResizeObserver(medir).observe(portada);
  window.addEventListener('resize', medir);
  window.addEventListener('load', medir);
  medir();

  // Bucle: muelle hacia el logo + empuje del ratón con inercia
  const K = .035, AMORTIGUA = .86;
  const frame = () => {
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
    renderer.render(escena, camara);
    requestAnimationFrame(frame);
  };

  if (reducir) {
    for (let i = 0; i < n * 3; i++) pos[i] = destino[i];
    geometria.attributes.position.needsUpdate = true;
    renderer.render(escena, camara);
  } else {
    frame();
  }
})();
