// Berso · logo de partículas 3D.
// El lienzo cubre toda la portada: las partículas empiezan repartidas por toda la pantalla
// y se van juntando hasta formar el logo. Al pasar el ratón (o el dedo), las cercanas se apartan y vuelven.
// Los puntos vienen de js/logo-puntos.js. Sin WebGL o con movimiento reducido se queda la imagen de respaldo.
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
  portada.insertBefore(renderer.domElement, portada.firstChild);
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

  // Tamaño de la portada en píxeles y en unidades del espacio 3D
  function medir() {
    w = portada.clientWidth; h = portada.clientHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    camara.aspect = w / h;
    camara.updateProjectionMatrix();
    H = 2 * Math.tan((FOV * Math.PI / 180) / 2) * DISTANCIA;
    W = H * camara.aspect;
    // La caja del logo mantiene su hueco en la maqueta
    caja.style.height = (caja.clientWidth * RATIO) + 'px';
    recalcularDestinos();
  }

  // Dónde tiene que estar cada punto: en el sitio exacto de la caja del logo
  function recalcularDestinos() {
    const r = caja.getBoundingClientRect();
    const pr = portada.getBoundingClientRect();
    const cx = (r.left - pr.left) + r.width / 2;
    const cy = (r.top - pr.top) + r.height / 2;
    const anchoW = (r.width / w) * W;          // ancho del logo en unidades 3D
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
    pos[i * 3] = (Math.random() - .5) * W * 1.5;
    pos[i * 3 + 1] = (Math.random() - .5) * H * 1.5;
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

  medir();
  window.addEventListener('resize', medir);

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
    // Sin movimiento: los puntos se colocan directamente en el logo
    for (let i = 0; i < n * 3; i++) pos[i] = destino[i];
    geometria.attributes.position.needsUpdate = true;
    renderer.render(escena, camara);
  } else {
    frame();
  }
})();
