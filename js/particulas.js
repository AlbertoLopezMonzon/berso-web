// Berso · logo 3D.
// 1) Intro: las partículas se reparten por toda la portada y se juntan formando el logo.
// 2) En cuanto llegan a su sitio, el logo se convierte directamente en un bloque sólido en 3D (capas con volumen).
//    Al pasar el ratón (o el dedo), el logo gira suavemente.
// Sin WebGL o si el navegador no deja leer la imagen, se queda el logo normal.
(() => {
  const portada = document.getElementById('inicio');
  const caja = document.getElementById('logo3d');
  if (!portada || !caja || typeof THREE === 'undefined' || !window.PUNTOS_LOGO) return;

  const reducir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Proporción de las letras (alto / ancho) y recorte de la imagen a esas letras: así el logo sólido
  // y el formado por partículas ocupan exactamente lo mismo.
  const RECORTE = { x: 22, y: 56, w: 1548, h: 430 };
  const RATIO = RECORTE.h / RECORTE.w;
  const FOV = 40, DISTANCIA = 5;
  const CAPAS = 10, PROFUNDIDAD = .0045;   // poco volumen para que las letras pequeñas se lean
  const RADIO_RATON = .55, FUERZA = .025;

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

  // Partículas (intro)
  const n = window.PUNTOS_LOGO.length;
  const destino = new Float32Array(n * 3);
  const pos = new Float32Array(n * 3);
  const vel = new Float32Array(n * 3);
  const geometria = new THREE.BufferGeometry();
  geometria.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const materialPuntos = new THREE.PointsMaterial({ size: .012, color: 0x000000 });
  const puntos = new THREE.Points(geometria, materialPuntos);
  escena.add(puntos);

  // Logo sólido (capas)
  const grupo = new THREE.Group();
  grupo.visible = false;
  escena.add(grupo);
  const materialesCapas = [];

  let W = 1, H = 1, w = 1, h = 1;
  let centroX = 0, centroY = 0, anchoW = 1, altoW = 1;

  // Carga el logo recortado y lo convierte en textura con transparencia (negro opaco, fondo transparente)
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
      // El navegador no deja leer la imagen: se muestra el logo normal y se quitan las partículas
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

  // Posición y tamaño del logo en el espacio 3D, exactamente donde está su caja
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
    raton.nx = (clientX - r.left) / w - .5;
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

  // Cambio directo: en cuanto las partículas están en su sitio, aparece el logo sólido en el mismo instante
  let finalizado = false;
  function pasarAlSolido() {
    if (finalizado || materialesCapas.length === 0) return;
    finalizado = true;
    materialesCapas.forEach((m) => { m.opacity = 1; });
    grupo.visible = true;
    puntos.visible = false;
  }

  // ¿Han llegado ya las partículas? Se mira una muestra de puntos
  function llegadas() {
    let suma = 0;
    const paso = 37;
    let cuenta = 0;
    for (let i = 0; i < n; i += paso) {
      const ix = i * 3;
      const dx = pos[ix] - destino[ix], dy = pos[ix + 1] - destino[ix + 1];
      suma += dx * dx + dy * dy;
      cuenta++;
    }
    return Math.sqrt(suma / cuenta) < .03;
  }

  // Giro: sigue al puntero y tiene un vaivén suave
  let giroX = 0, giroY = 0, contador = 0;
  const K = .035, AMORTIGUA = .86;
  const t0 = performance.now();

  const frame = () => {
    const t = (performance.now() - t0) / 1000;

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
      contador++;
      if (!finalizado && (t > 3.2 || (contador % 10 === 0 && llegadas()))) pasarAlSolido();
    }

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
