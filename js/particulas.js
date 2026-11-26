// Berso · logo de partículas 3D.
// Los puntos vienen de js/logo-puntos.js (el logo ya convertido). Se dibujan con Three.js:
// empiezan dispersos, se ordenan hasta formar el logo y, al pasar el ratón (o el dedo),
// las partículas cercanas se apartan y luego vuelven a su sitio.
// Sin WebGL o con movimiento reducido, se queda la imagen de respaldo.
(() => {
  const contenedor = document.getElementById('logo3d');
  if (!contenedor || typeof THREE === 'undefined' || !window.PUNTOS_LOGO) return;

  const reducir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const RATIO = 540 / 1600;               // alto / ancho del logo
  const FOV = 40;
  const DISTANCIA = 3.6;                  // cámara más alejada para que quepa el logo entero
  const ESCALA_X = 3.6, ESCALA_Y = 1.22;  // tamaño del logo en el espacio 3D
  const RADIO_RATON = .45, FUERZA = .9;   // alcance y empuje del ratón

  const ancho = contenedor.clientWidth || 300;
  let alto = ancho * RATIO;
  contenedor.style.height = alto + 'px';

  const escena = new THREE.Scene();
  const camara = new THREE.PerspectiveCamera(FOV, ancho / alto, .1, 100);
  camara.position.z = DISTANCIA;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch (e) {
    return; // sin WebGL: se queda la imagen de respaldo
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(ancho, alto);
  contenedor.appendChild(renderer.domElement);
  contenedor.classList.add('is-3d');

  const n = window.PUNTOS_LOGO.length;
  const destino = new Float32Array(n * 3);   // dónde debe estar cada punto (el logo)
  const actual = new Float32Array(n * 3);    // dónde está ahora
  const vel = new Float32Array(n * 3);       // velocidad, para que el empuje tenga inercia

  window.PUNTOS_LOGO.forEach(([x, y], i) => {
    destino[i * 3] = x * ESCALA_X;
    destino[i * 3 + 1] = y * ESCALA_Y;
    destino[i * 3 + 2] = 0;
    // Punto de partida: disperso en una esfera alrededor
    const r = 2.6 + Math.random() * 2.2;
    const t = Math.random() * Math.PI * 2;
    const p = Math.acos(2 * Math.random() - 1);
    actual[i * 3] = r * Math.sin(p) * Math.cos(t);
    actual[i * 3 + 1] = r * Math.sin(p) * Math.sin(t);
    actual[i * 3 + 2] = r * Math.cos(p);
  });

  const geometria = new THREE.BufferGeometry();
  geometria.setAttribute('position', new THREE.BufferAttribute(actual, 3));
  const material = new THREE.PointsMaterial({ size: .03, color: 0x000000, transparent: true, opacity: .95 });
  const puntos = new THREE.Points(geometria, material);
  escena.add(puntos);

  // Ratón o dedo en coordenadas del espacio 3D (plano del logo, z = 0)
  const raton = { x: 0, y: 0, activo: false };
  const alPlano = (clientX, clientY) => {
    const r = contenedor.getBoundingClientRect();
    const nx = ((clientX - r.left) / r.width) * 2 - 1;
    const ny = -(((clientY - r.top) / r.height) * 2 - 1);
    const mediaAltura = Math.tan((FOV * Math.PI / 180) / 2) * DISTANCIA;
    raton.x = nx * mediaAltura * camara.aspect;
    raton.y = ny * mediaAltura;
    raton.activo = true;
  };
  contenedor.addEventListener('pointermove', (e) => alPlano(e.clientX, e.clientY));
  contenedor.addEventListener('pointerdown', (e) => alPlano(e.clientX, e.clientY));
  contenedor.addEventListener('pointerleave', () => { raton.activo = false; });

  // Montaje inicial: cada punto viaja hacia su sitio
  const montaje = { t: reducir ? 1 : 0 };
  const inicio = Float32Array.from(actual);
  const montar = () => {
    for (let i = 0; i < n * 3; i++) actual[i] = inicio[i] + (destino[i] - inicio[i]) * montaje.t;
  };
  if (!reducir && typeof gsap !== 'undefined') {
    gsap.to(montaje, { t: 1, duration: 2.6, ease: 'power3.inOut', delay: .3 });
  } else {
    montar();
  }

  // Bucle: muelle hacia el logo + empuje del ratón
  const K = .08, AMORTIGUA = .82;
  const frame = () => {
    if (montaje.t < 1 && !reducir) montar();
    for (let i = 0; i < n; i++) {
      const ix = i * 3, iy = ix + 1, iz = ix + 2;
      // Muelle hacia el sitio del logo
      vel[ix] += (destino[ix] - actual[ix]) * K;
      vel[iy] += (destino[iy] - actual[iy]) * K;
      vel[iz] += (destino[iz] - actual[iz]) * K;
      // Empuje del ratón
      if (raton.activo) {
        const dx = actual[ix] - raton.x, dy = actual[iy] - raton.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < RADIO_RATON * RADIO_RATON) {
          const d = Math.sqrt(d2) || .0001;
          const fuerza = (1 - d / RADIO_RATON) * FUERZA * .05;
          vel[ix] += (dx / d) * fuerza;
          vel[iy] += (dy / d) * fuerza;
          vel[iz] += (Math.random() - .5) * fuerza;
        }
      }
      vel[ix] *= AMORTIGUA; vel[iy] *= AMORTIGUA; vel[iz] *= AMORTIGUA;
      actual[ix] += vel[ix]; actual[iy] += vel[iy]; actual[iz] += vel[iz];
    }
    geometria.attributes.position.needsUpdate = true;
    renderer.render(escena, camara);
    requestAnimationFrame(frame);
  };
  if (reducir) renderer.render(escena, camara); else frame();

  window.addEventListener('resize', () => {
    const a = contenedor.clientWidth || 300;
    alto = a * RATIO;
    contenedor.style.height = alto + 'px';
    camara.aspect = a / alto;
    camara.updateProjectionMatrix();
    renderer.setSize(a, alto);
  });
})();
