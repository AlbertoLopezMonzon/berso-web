// Berso · logo de partículas 3D.
// Los puntos vienen de js/logo-puntos.js (el logo ya convertido). Aquí solo se dibujan con Three.js:
// empiezan dispersos en el espacio y se ordenan hasta formar el logo; luego siguen el ratón con suavidad.
// Sin WebGL o con movimiento reducido, se queda el logo en imagen normal (la etiqueta <img> de respaldo).
(() => {
  const contenedor = document.getElementById('logo3d');
  if (!contenedor || typeof THREE === 'undefined' || !window.PUNTOS_LOGO) return;

  const reducir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ancho = contenedor.clientWidth;
  const alto = ancho * (540 / 1600);
  contenedor.style.height = alto + 'px';

  const escena = new THREE.Scene();
  const camara = new THREE.PerspectiveCamera(40, ancho / alto, .1, 100);
  camara.position.z = 3.2;

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
  const posiciones = new Float32Array(n * 3);
  const destinos = new Float32Array(n * 3);
  window.PUNTOS_LOGO.forEach(([x, y], i) => {
    destinos[i * 3] = x * 1.6;
    destinos[i * 3 + 1] = y * .55;
    destinos[i * 3 + 2] = 0;
    // Punto de partida: disperso en una esfera alrededor
    const r = 2.4 + Math.random() * 2;
    const t = Math.random() * Math.PI * 2;
    const p = Math.acos(2 * Math.random() - 1);
    posiciones[i * 3] = r * Math.sin(p) * Math.cos(t);
    posiciones[i * 3 + 1] = r * Math.sin(p) * Math.sin(t);
    posiciones[i * 3 + 2] = r * Math.cos(p);
  });

  const geometria = new THREE.BufferGeometry();
  geometria.setAttribute('position', new THREE.BufferAttribute(posiciones, 3));
  const material = new THREE.PointsMaterial({ size: .022, color: 0x000000, transparent: true, opacity: .95 });
  const puntos = new THREE.Points(geometria, material);
  escena.add(puntos);

  // Montaje: cada punto viaja a su sitio con un pequeño retardo aleatorio
  const estado = { t: reducir ? 1 : 0 };
  const dibujar = () => {
    const pos = geometria.attributes.position.array;
    for (let i = 0; i < n * 3; i++) {
      pos[i] = posiciones[i] + (destinos[i] - posiciones[i]) * estado.t;
    }
    geometria.attributes.position.needsUpdate = true;
  };
  dibujar();

  if (!reducir && typeof gsap !== 'undefined') {
    gsap.to(estado, { t: 1, duration: 2.6, ease: 'power3.inOut', delay: .3, onUpdate: dibujar });
  }

  // Giro suave con el ratón o el dedo, que vuelve solo al quedarse quieto
  let objetivoX = 0, objetivoY = 0;
  const mover = (x, y) => {
    const r = contenedor.getBoundingClientRect();
    objetivoY = ((x - r.left) / r.width - .5) * .6;
    objetivoX = ((y - r.top) / r.height - .5) * .3;
  };
  contenedor.addEventListener('pointermove', (e) => mover(e.clientX, e.clientY));
  contenedor.addEventListener('pointerleave', () => { objetivoX = 0; objetivoY = 0; });

  const bucle = () => {
    puntos.rotation.y += (objetivoY - puntos.rotation.y) * .08;
    puntos.rotation.x += (objetivoX - puntos.rotation.x) * .08;
    renderer.render(escena, camara);
    requestAnimationFrame(bucle);
  };
  if (!reducir) bucle(); else renderer.render(escena, camara);

  window.addEventListener('resize', () => {
    const a = contenedor.clientWidth;
    const h = a * (540 / 1600);
    contenedor.style.height = h + 'px';
    camara.aspect = a / h;
    camara.updateProjectionMatrix();
    renderer.setSize(a, h);
  });
})();
