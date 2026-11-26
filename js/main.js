// Berso · tarjeta digital. Sin menús: todo fluye al hacer scroll.
// vCard: se genera el archivo .vcf con los datos de contacto y se descarga (iPhone y Android lo abren como contacto).
(() => {
  document.documentElement.classList.add('js');

  // Datos de contacto: cambiarlos aquí cuando estén confirmados
  const CONTACTO = {
    nombre: 'Nombre Apellidos', // por confirmar
    empresa: 'Berso',
    cargo: 'Cargo',             // por confirmar
    telefono: '+34600000000',   // por confirmar
    email: 'hola@berso.example',// por confirmar
    web: 'https://albertolopezmonzon.github.io/berso/', // provisional
    direccion: '',              // por confirmar
  };

  // 1. Descarga de la tarjeta de contacto (vCard 3.0)
  function vcard() {
    const lineas = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `N:${CONTACTO.nombre.split(' ').slice(1).join(' ')};${CONTACTO.nombre.split(' ')[0]};;;`,
      `FN:${CONTACTO.nombre}`,
      `ORG:${CONTACTO.empresa}`,
      `TITLE:${CONTACTO.cargo}`,
      `TEL;TYPE=CELL:${CONTACTO.telefono}`,
      `EMAIL;TYPE=INTERNET:${CONTACTO.email}`,
      `URL:${CONTACTO.web}`,
      CONTACTO.direccion ? `ADR;TYPE=WORK:;;${CONTACTO.direccion};;;;` : null,
      'END:VCARD',
    ].filter(Boolean);
    return lineas.join('\r\n');
  }

  const btnVcard = document.getElementById('btn-vcard');
  btnVcard.addEventListener('click', (e) => {
    e.preventDefault();
    const blob = new Blob([vcard()], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = 'berso.vcf';
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  // 2. Animación al hacer scroll (solo si no se pide reducir movimiento)
  const reducir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducir || typeof gsap === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger);

  gsap.from('#inicio [data-anim]', { y: 24, opacity: 0, duration: 1, ease: 'power3.out', stagger: .15, delay: .1 });

  document.querySelectorAll('.bloque [data-anim]').forEach((el) => {
    gsap.from(el, {
      y: 28, opacity: 0, duration: .9, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 88%' },
    });
  });
})();
