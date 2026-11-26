// Berso · logo 3D, con aparición progresiva.
// 1) Formación: las partículas salen de toda la portada y van llegando a su sitio poco a poco
//    (empieza por la izquierda y termina a la derecha), hasta dibujar el logo.
// 2) Final: el logo sólido en 3D aparece a la vez que las partículas se desvanecen (fundido suave).
//    Al pasar el ratón (o el dedo), el logo gira suavemente.
// Sin WebGL o si el navegador no deja leer la imagen, se queda el logo normal.
(() => {
  const portada = document.getElementById('inicio');
  const caja = document.getElementById('logo3d');
  if (!portada || !caja || typeof THREE === 'undefined' || !window.PUNTOS_LOGO) return;

  const reducir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Recorte de la imagen a las letras: así el logo sólido y el formado por partículas ocupan lo mismo
  const RECORTE = { x: 22, y: 56, w: 1548, h: 430 };
  const RATIO = RECORTE.h / RECORTE.w;
  const FOV = 40, DISTANCIA = 5;
  const CAPAS = 10, PROFUNDIDAD = .0045;

  // Tiempos de la animación (segundos)
  const INICIO = .4;          // espera antes de empezar
  const FORMACION = 3.0;      // tiempo en el que las partículas van llegando
  const DURACION_PUNTO = 1.6; // cada partícula tarda esto en llegar a su sitio
  const FUNDIDO = 1.1;        // cambio de partículas a logo sólido

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch (e) {
    return; // sin WebGL: queda el logo normal
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

  // Partículas
  const n = window.PUNTOS_LOGO.length;
  const destino = new Float32Array(n * 3);
  const origen = new Float32Array(n * 3);
  const retraso = new Float32Array(n);
  const pos = new Float32Array(n * 3);
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

  // Logo recortado a textura con transparencia (negro opaco, fondo transparente)
  const img = new Image();
  img.onload = () => {
    try {
      const c = document.createElement('canvas');
      c.width = RECORTE.w; c.height = RECORTE.h;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, RECORTE.x, RECORTE.y, RECORTE.w, RECORTE.h, 0, 0, RECORTE.w, RECORTE.h);
      const datos = ctx.getImageData(0, 0, c.width, c.height);
      const d = datos.data;
      for (let i = 0; i < d.length; i += 4) {
        const lum = (d[i] + d[i + 1] + d[i + 2]) / 3;
        d[i] = 0; d[i + 1] = 0; d[i + 2] = 0;
        d[i + 3] = Math.max(0, Math.min(255, 255 - lum * 1.1));
      }
      ctx.putImageData(datos, 0, 0);
      const textura = new THREE.CanvasTexture(c);
      textura.colorSpace = THREE.SRGBColorSpace;
      const geo = new THREE.PlaneGeometry(1, 1);
      for (let k = 0; k < CAPAS; k++) {
        const t = k / (CAPAS - 1);
        const color = new THREE.Color().setScalar(t * .35);
        const mat = new THREE.MeshBasicMaterial({ map: textura, color, transparent: true, alphaTest: .05, opacity: 0 });
        const malla = new THREE.Mesh(geo, mat);
        malla.position.z = -k * PROFUNDIDAD;
        grupo.add(malla);
        materialesCapas.push(mat);
      }
      colocarLogo();
      if (reducir) {
        materialesCapas.forEach((m) => { m.opacity = 1; });
        grupo.visible = true;
        puntos.visible = false;
      }
    } catch (e) {
      // El navegador no deja leer la imagen: se muestra el logo normal
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
    colocarLogo();
  }

  // Dónde está cada punto del logo, en el espacio 3D, exactamente donde está la caja del logo
  function colocarLogo() {
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

  // Origen de cada punto: repartido por toda la portada. Retraso: de izquierda a derecha, con algo de azar
  window.PUNTOS_LOGO.forEach(([x], i) => {
    origen[i * 3] = (Math.random() - .5) * 3.2;
    origen[i * 3 + 1] = (Math.random() - .5) * 4;
    origen[i * 3 + 2] = (Math.random() - .5) * 3;
    retraso[i] = INICIO + ((x + 1) / 2) * (FORMACION - DURACION_PUNTO) + Math.random() * .35;
  });

  medir();
  if ('ResizeObserver' in window) new ResizeObserver(medir).observe(portada);
  window.addEventListener('resize', medir);
  window.addEventListener('load', medir);

  // Suavizado: empieza lento, acelera y frena al llegar (ease in-out)
  const suave = (x) => (x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const clamp01 = (x) => Math.max(0, Math.min(1, x));

  // Giro: sigue al puntero y tiene un vaivén suave
  let giroX = 0, giroY = 0;
  const t0 = performance.now();

  const frame = () => {
    const t = (performance.now() - t0) / 1000;

    // 1) Formación de las partículas, cada una en su momento
    if (t < INICIO + FORMACION + DURACION_PUNTO + .4) {
      for (let i = 0; i < n; i++) {
        const ix = i * 3;
        const p = suave(clamp01((t - retraso[i]) / DURACION_PUNTO));
        pos[ix] = origen[ix] + (destino[ix] - origen[ix]) * p;
        pos[ix + 1] = origen[ix + 1] + (destino[ix + 1] - origen[ix + 1]) * p;
        pos[ix + 2] = origen[ix + 2] + (destino[ix + 2] - origen[ix + 2]) * p;
      }
      geometria.attributes.position.needsUpdate = true;
    }

    // 2) Cambio suave: las partículas se desvanecen y el logo sólido aparece a la vez
    const fin = INICIO + FORMACION + DURACION_PUNTO;
    const cambio = clamp01((t - fin + .3) / FUNDIDO);
    if (cambio > 0) {
      grupo.visible = true;
      materialesCapas.forEach((m) => { m.opacity = cambio; });
      materialPuntos.opacity = 1 - cambio;
      if (cambio >= 1) puntos.visible = false;
    }

    // 3) Giro del logo sólido
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

  // Puntero (ratón o dedo)
  const raton = { activo: false, nx: 0, ny: 0 };
  const alPlano = (clientX, clientY) => {
    const r = portada.getBoundingClientRect();
    raton.nx = (clientX - r.left) / w - .5;
    raton.ny = (clientY - r.top) / h - .5;
    raton.activo = true;
  };
  portada.addEventListener('pointermove', (e) => alPlano(e.clientX, e.clientY));
  portada.addEventListener('pointerdown', (e) => alPlano(e.clientX, e.clientY));
  portada.addEventListener('pointerleave', () => { raton.activo = false; });

  if (reducir) {
    renderer.render(escena, camara);
  } else {
    frame();
  }
})();
