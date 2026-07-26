/* Technical part illustrations (SVG, offline) + keyword matcher */
window.__ART__ = (() => {
  const S = (inner) => `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" fill="none" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
  const A = '#c8631f'; // accent
  const G = '#9a938a'; // grey
  const F = 'rgba(150,140,125,.18)'; // soft fill

  const art = {
    piston: S(`
      <rect x="42" y="14" width="36" height="30" rx="4" fill="${F}" stroke="${G}" stroke-width="3"/>
      <line x1="42" y1="24" x2="78" y2="24" stroke="${A}" stroke-width="3"/>
      <line x1="42" y1="32" x2="78" y2="32" stroke="${A}" stroke-width="3"/>
      <circle cx="60" cy="52" r="5" fill="${F}" stroke="${G}" stroke-width="3"/>
      <path d="M60 57 L52 84" stroke="${G}" stroke-width="6"/>
      <circle cx="50" cy="92" r="10" fill="${F}" stroke="${A}" stroke-width="3.5"/>
      <circle cx="50" cy="92" r="3" fill="${A}"/>
      <path d="M60 92 a26 26 0 1 0 -14 23" stroke="${G}" stroke-width="3" stroke-dasharray="4 5"/>`),
    turbo: S(`
      <circle cx="44" cy="60" r="26" fill="${F}" stroke="${G}" stroke-width="3.5"/>
      <path d="M44 60 m0 -18 a18 18 0 0 1 15 28" stroke="${A}" stroke-width="3.5"/>
      <path d="M44 60 l0 -14 M44 60 l12 7 M44 60 l-12 7" stroke="${A}" stroke-width="3"/>
      <path d="M70 60 h18" stroke="${G}" stroke-width="5"/>
      <circle cx="92" cy="60" r="16" fill="${F}" stroke="${A}" stroke-width="3.5"/>
      <path d="M92 60 l0 -11 M92 60 l9 6 M92 60 l-9 6" stroke="${G}" stroke-width="3"/>
      <path d="M18 40 q-8 20 0 40" stroke="${A}" stroke-width="3" stroke-dasharray="3 5"/>`),
    injector: S(`
      <rect x="50" y="10" width="20" height="26" rx="4" fill="${F}" stroke="${G}" stroke-width="3.5"/>
      <path d="M40 22 h10 M70 22 h10" stroke="${A}" stroke-width="3.5"/>
      <rect x="54" y="36" width="12" height="38" fill="${F}" stroke="${G}" stroke-width="3.5"/>
      <path d="M60 74 L60 92" stroke="${G}" stroke-width="5"/>
      <path d="M60 96 l-10 14 M60 96 l0 16 M60 96 l10 14" stroke="${A}" stroke-width="3" stroke-dasharray="2 4"/>
      <circle cx="60" cy="94" r="4" fill="${A}"/>`),
    battery: S(`
      <rect x="16" y="42" width="88" height="52" rx="8" fill="${F}" stroke="${G}" stroke-width="3.5"/>
      <rect x="26" y="30" width="14" height="12" rx="3" fill="${G}"/>
      <rect x="80" y="30" width="14" height="12" rx="3" fill="${A}"/>
      <path d="M27 22 h12 M86 16 v12 M80 22 h12" stroke="${A}" stroke-width="3.5"/>
      <path d="M50 82 l8 -18 h-6 l8 -14" stroke="${A}" stroke-width="4"/>`),
    alternator: S(`
      <circle cx="62" cy="58" r="30" fill="${F}" stroke="${G}" stroke-width="3.5"/>
      <circle cx="62" cy="58" r="12" fill="none" stroke="${A}" stroke-width="3.5"/>
      <circle cx="62" cy="58" r="4" fill="${A}"/>
      <path d="M62 28 v-10 M62 88 v10 M32 58 h-10 M92 58 h10" stroke="${G}" stroke-width="3.5"/>
      <path d="M20 100 q20 -14 40 0 q-20 8 -40 0z" fill="${F}" stroke="${A}" stroke-width="3"/>`),
    clutch: S(`
      <circle cx="60" cy="60" r="40" fill="${F}" stroke="${G}" stroke-width="3.5"/>
      <circle cx="60" cy="60" r="26" fill="none" stroke="${A}" stroke-width="3.5"/>
      <circle cx="60" cy="60" r="8" fill="${G}"/>
      <g stroke="${A}" stroke-width="3">
        <path d="M60 34 l0 10 M83 45 l-8 6 M83 75 l-8 -6 M60 86 l0 -10 M37 75 l8 -6 M37 45 l8 6"/>
      </g>`),
    brake: S(`
      <circle cx="60" cy="64" r="38" fill="${F}" stroke="${G}" stroke-width="3.5"/>
      <circle cx="60" cy="64" r="12" fill="none" stroke="${G}" stroke-width="3"/>
      <g fill="${G}"><circle cx="60" cy="38" r="3"/><circle cx="83" cy="52" r="3"/><circle cx="83" cy="77" r="3"/><circle cx="60" cy="90" r="3"/><circle cx="37" cy="77" r="3"/><circle cx="37" cy="52" r="3"/></g>
      <path d="M88 30 a34 34 0 0 1 12 26 l-12 4 a22 22 0 0 0 -8 -22z" fill="${F}" stroke="${A}" stroke-width="3.5"/>`),
    suspension: S(`
      <path d="M48 16 h24" stroke="${G}" stroke-width="5"/>
      <path d="M60 16 v14" stroke="${G}" stroke-width="4"/>
      <path d="M42 34 l36 8 M42 46 l36 8 M42 58 l36 8 M42 70 l36 8" stroke="${A}" stroke-width="4"/>
      <path d="M42 30 v52 M78 38 v52" stroke="${A}" stroke-width="3"/>
      <rect x="52" y="86" width="16" height="18" rx="3" fill="${F}" stroke="${G}" stroke-width="3.5"/>
      <path d="M40 110 h40" stroke="${G}" stroke-width="5"/>`),
    radiator: S(`
      <rect x="20" y="30" width="80" height="60" rx="6" fill="${F}" stroke="${G}" stroke-width="3.5"/>
      <g stroke="${G}" stroke-width="2.5"><line x1="32" y1="30" x2="32" y2="90"/><line x1="46" y1="30" x2="46" y2="90"/><line x1="60" y1="30" x2="60" y2="90"/><line x1="74" y1="30" x2="74" y2="90"/><line x1="88" y1="30" x2="88" y2="90"/></g>
      <path d="M20 40 h-8 v-14 h14" stroke="${A}" stroke-width="4"/>
      <path d="M100 80 h8 v14 h-14" stroke="${A}" stroke-width="4"/>
      <path d="M50 14 q4 -8 8 0 q4 8 8 0" stroke="${A}" stroke-width="3"/>`),
    obd: S(`
      <path d="M24 40 h72 l-8 34 h-56z" fill="${F}" stroke="${G}" stroke-width="3.5"/>
      <g fill="${A}"><rect x="34" y="48" width="7" height="5" rx="1"/><rect x="46" y="48" width="7" height="5" rx="1"/><rect x="58" y="48" width="7" height="5" rx="1"/><rect x="70" y="48" width="7" height="5" rx="1"/><rect x="82" y="48" width="7" height="5" rx="1"/></g>
      <g fill="${G}"><rect x="37" y="60" width="7" height="5" rx="1"/><rect x="49" y="60" width="7" height="5" rx="1"/><rect x="61" y="60" width="7" height="5" rx="1"/><rect x="73" y="60" width="7" height="5" rx="1"/></g>
      <path d="M60 84 v10 m-14 6 a16 10 0 0 0 28 0" stroke="${A}" stroke-width="3.5"/>`),
    belt: S(`
      <circle cx="36" cy="40" r="18" fill="${F}" stroke="${G}" stroke-width="3.5"/>
      <circle cx="84" cy="40" r="12" fill="${F}" stroke="${G}" stroke-width="3.5"/>
      <circle cx="60" cy="88" r="14" fill="${F}" stroke="${G}" stroke-width="3.5"/>
      <path d="M36 22 q30 -8 48 6 M95 46 q4 28 -24 40 M47 96 q-26 -10 -28 -40" stroke="${A}" stroke-width="4" stroke-dasharray="6 4"/>
      <circle cx="36" cy="40" r="4" fill="${A}"/><circle cx="84" cy="40" r="4" fill="${A}"/><circle cx="60" cy="88" r="4" fill="${A}"/>`),
    oil: S(`
      <path d="M40 34 h28 l14 14 v44 a8 8 0 0 1 -8 8 h-40 a8 8 0 0 1 -8 -8 v-50 a8 8 0 0 1 8 -8z" fill="${F}" stroke="${G}" stroke-width="3.5"/>
      <path d="M46 34 v-10 h12 v10" stroke="${G}" stroke-width="3.5"/>
      <path d="M82 48 l16 -12" stroke="${A}" stroke-width="4"/>
      <path d="M60 62 q-10 14 0 22 q10 -8 0 -22z" fill="${A}" opacity=".85"/>`),
    spark: S(`
      <path d="M50 12 h20 v14 h-20z" fill="${F}" stroke="${G}" stroke-width="3.5"/>
      <path d="M46 26 h28 l-4 16 h-20z" fill="${F}" stroke="${G}" stroke-width="3"/>
      <rect x="54" y="42" width="12" height="30" fill="${F}" stroke="${G}" stroke-width="3.5"/>
      <path d="M60 72 v14 M52 94 h6 M60 86 v8" stroke="${G}" stroke-width="3.5"/>
      <path d="M60 104 l-8 -8 M60 104 l8 -8" stroke="${A}" stroke-width="3.5"/>
      <path d="M42 100 l-8 8 M78 100 l8 8" stroke="${A}" stroke-width="3" stroke-dasharray="2 3"/>`),
    dpf: S(`
      <rect x="26" y="42" width="68" height="36" rx="18" fill="${F}" stroke="${G}" stroke-width="3.5"/>
      <path d="M10 60 h16 M94 60 h16" stroke="${G}" stroke-width="5"/>
      <g stroke="${A}" stroke-width="2.5"><line x1="40" y1="46" x2="40" y2="74"/><line x1="50" y1="46" x2="50" y2="74"/><line x1="60" y1="46" x2="60" y2="74"/><line x1="70" y1="46" x2="70" y2="74"/><line x1="80" y1="46" x2="80" y2="74"/></g>
      <g fill="${G}"><circle cx="18" cy="54" r="2"/><circle cx="14" cy="62" r="2"/><circle cx="20" cy="66" r="2"/></g>
      <path d="M100 52 q6 -6 8 -12" stroke="${A}" stroke-width="3" stroke-dasharray="2 4"/>`),
    egr: S(`
      <path d="M20 84 h36 v-24 h28" stroke="${G}" stroke-width="6"/>
      <circle cx="84" cy="60" r="16" fill="${F}" stroke="${A}" stroke-width="3.5"/>
      <path d="M84 44 v-16 M76 30 h16" stroke="${G}" stroke-width="4"/>
      <path d="M84 52 v16 M76 60 h16" stroke="${A}" stroke-width="3.5"/>
      <g fill="${G}"><circle cx="30" cy="78" r="2.5"/><circle cx="40" cy="80" r="2.5"/><circle cx="36" cy="72" r="2.5"/></g>`),
    tyre: S(`
      <circle cx="60" cy="60" r="42" fill="${F}" stroke="${G}" stroke-width="7"/>
      <circle cx="60" cy="60" r="24" fill="none" stroke="${G}" stroke-width="3.5"/>
      <g stroke="${A}" stroke-width="3"><path d="M60 20 l0 10 M92 38 l-9 5 M92 82 l-9 -5 M60 100 l0 -10 M28 82 l9 -5 M28 38 l9 5"/></g>
      <path d="M52 60 a8 8 0 1 1 8 8 v6" stroke="${A}" stroke-width="3.5"/>
      <circle cx="60" cy="80" r="2" fill="${A}"/>`),
    gearbox: S(`
      <circle cx="42" cy="50" r="22" fill="${F}" stroke="${G}" stroke-width="3.5"/>
      <g stroke="${G}" stroke-width="3"><path d="M42 28 v-8 M42 72 v8 M20 50 h-8 M64 50 h8 M27 35 l-6 -6 M57 35 l6 -6 M27 65 l-6 6 M57 65 l6 6"/></g>
      <circle cx="82" cy="74" r="16" fill="${F}" stroke="${A}" stroke-width="3.5"/>
      <g stroke="${A}" stroke-width="2.5"><path d="M82 58 v-6 M82 90 v6 M66 74 h-6 M98 74 h6"/></g>
      <circle cx="42" cy="50" r="5" fill="${A}"/><circle cx="82" cy="74" r="4" fill="${G}"/>`),
    tools: S(`
      <path d="M30 90 L74 46 a16 16 0 1 1 10 10 L40 100 a7 7 0 0 1 -10 -10z" fill="${F}" stroke="${G}" stroke-width="3.5"/>
      <circle cx="88" cy="36" r="7" fill="none" stroke="${A}" stroke-width="3.5"/>
      <path d="M26 24 l16 16 m-16 0 l16 -16" stroke="${A}" stroke-width="4"/>`),
    car: S(`
      <path d="M14 74 q2 -12 14 -14 l10 -16 q4 -6 12 -6 h22 q8 0 12 6 l10 16 q12 2 14 14 v10 h-10" stroke="${G}" stroke-width="3.5" fill="${F}"/>
      <path d="M40 84 h32" stroke="${G}" stroke-width="3.5"/>
      <circle cx="34" cy="86" r="10" fill="${F}" stroke="${A}" stroke-width="3.5"/>
      <circle cx="86" cy="86" r="10" fill="${F}" stroke="${A}" stroke-width="3.5"/>
      <path d="M44 58 h30 l-6 -14 h-18z" fill="${F}" stroke="${G}" stroke-width="3"/>`),
    ecu: S(`
      <rect x="34" y="34" width="52" height="52" rx="8" fill="${F}" stroke="${G}" stroke-width="3.5"/>
      <rect x="48" y="48" width="24" height="24" rx="4" fill="none" stroke="${A}" stroke-width="3.5"/>
      <g stroke="${G}" stroke-width="3"><path d="M44 34 v-12 M60 34 v-12 M76 34 v-12 M44 86 v12 M60 86 v12 M76 86 v12 M34 44 h-12 M34 60 h-12 M34 76 h-12 M86 44 h12 M86 60 h12 M86 76 h12"/></g>`),
    steering: S(`
      <circle cx="60" cy="60" r="38" fill="none" stroke="${G}" stroke-width="5"/>
      <circle cx="60" cy="60" r="10" fill="${F}" stroke="${A}" stroke-width="3.5"/>
      <path d="M22 60 h28 M70 60 h28 M60 70 v28" stroke="${G}" stroke-width="5"/>
      <path d="M60 50 v-27" stroke="${A}" stroke-width="4"/>`),
    exhaust: S(`
      <path d="M10 50 h24" stroke="${G}" stroke-width="6"/>
      <rect x="34" y="38" width="44" height="24" rx="12" fill="${F}" stroke="${A}" stroke-width="3.5"/>
      <g stroke="${G}" stroke-width="2"><line x1="44" y1="42" x2="44" y2="58"/><line x1="52" y1="42" x2="52" y2="58"/><line x1="60" y1="42" x2="60" y2="58"/><line x1="68" y1="42" x2="68" y2="58"/></g>
      <path d="M78 50 h14 v28 h-24" stroke="${G}" stroke-width="6"/>
      <path d="M56 78 h4" stroke="${G}" stroke-width="6"/>
      <g stroke="${A}" stroke-width="3" stroke-dasharray="1 5"><path d="M46 88 q-4 10 2 18 M56 88 q-4 10 2 18"/></g>`),
    sensor: S(`
      <rect x="26" y="40" width="46" height="32" rx="6" fill="${F}" stroke="${G}" stroke-width="3.5"/>
      <circle cx="49" cy="56" r="9" fill="none" stroke="${A}" stroke-width="3.5"/>
      <circle cx="49" cy="56" r="3" fill="${A}"/>
      <g stroke="${A}" stroke-width="3"><path d="M80 44 a22 22 0 0 1 0 24 M90 36 a34 34 0 0 1 0 40 M100 28 a46 46 0 0 1 0 56"/></g>`),
    ev: S(`
      <rect x="20" y="46" width="64" height="34" rx="8" fill="${F}" stroke="${G}" stroke-width="3.5"/>
      <g stroke="${A}" stroke-width="3"><line x1="32" y1="52" x2="32" y2="74"/><line x1="44" y1="52" x2="44" y2="74"/><line x1="56" y1="52" x2="56" y2="74"/><line x1="68" y1="52" x2="68" y2="74"/></g>
      <path d="M84 58 h8 v12 h-8" stroke="${G}" stroke-width="3.5"/>
      <path d="M100 44 a18 18 0 0 1 0 40" stroke="${A}" stroke-width="3.5"/>
      <path d="M58 26 l-8 14 h8 l-6 12" stroke="${A}" stroke-width="4"/>`),
    warning: S(`
      <path d="M60 18 L106 96 H14z" fill="${F}" stroke="${A}" stroke-width="4"/>
      <path d="M60 44 v26" stroke="${G}" stroke-width="6"/>
      <circle cx="60" cy="82" r="4" fill="${G}"/>`),
    money: S(`
      <circle cx="60" cy="60" r="38" fill="${F}" stroke="${A}" stroke-width="3.5"/>
      <path d="M74 44 a18 18 0 1 0 0 32 M40 54 h26 M40 66 h26" stroke="${G}" stroke-width="4"/>`),
    ai: S(`
      <rect x="30" y="30" width="60" height="48" rx="10" fill="${F}" stroke="${G}" stroke-width="3.5"/>
      <circle cx="48" cy="52" r="5" fill="${A}"/><circle cx="72" cy="52" r="5" fill="${A}"/>
      <path d="M48 66 q12 8 24 0" stroke="${A}" stroke-width="3.5"/>
      <path d="M60 30 v-10 M54 14 a6 6 0 1 1 12 0" stroke="${G}" stroke-width="3.5"/>
      <path d="M44 78 l-6 14 l16 -8" fill="${F}" stroke="${G}" stroke-width="3"/>`),
  };

  // Ordered keyword → art matching (first hit wins)
  const RULES = [
    [/turbo|intercooler|sobrealim|geometria variable|vgt/i, 'turbo'],
    [/inyector|inyeccion|common rail|bomba de alta|combustible|gasolina gdi|rail/i, 'injector'],
    [/piston|ciguenal|biela|bloque|culata|segmentos|compresion/i, 'piston'],
    [/bateria de traccion|electrico puro|bev|enchufable|cargador|soh|kwh|regenerativa/i, 'ev'],
    [/bateria|agm|efb|start.?stop|voltaje|12v|bornes/i, 'battery'],
    [/alternador|carga electrica/i, 'alternator'],
    [/embrague|bimasa|volante motor/i, 'clutch'],
    [/freno|pastilla|disco|abs|latiguillo|pedal/i, 'brake'],
    [/amortiguad|suspension|silentblock|bieleta|muelle/i, 'suspension'],
    [/radiador|refrigera|termostato|bomba de agua|temperatura|calefaccion|climatiz|aire acondicionado/i, 'radiator'],
    [/obd|codigo|escaner|diagnosis|lector|p0|testigo/i, 'obd'],
    [/correa|distribucion|cadena|tensor|polea/i, 'belt'],
    [/aceite|lubrica|filtro de aceite|nivel/i, 'oil'],
    [/bujia|precalentamiento|encendido|misfire|bobina/i, 'spark'],
    [/dpf|fap|gpf|particulas|regeneracion/i, 'dpf'],
    [/egr|recircula/i, 'egr'],
    [/neumatico|rueda|tpms|presion de neu|equilibrado|llanta/i, 'tyre'],
    [/caja de cambios|transmision|valvulina|atf|marchas|homocinetica/i, 'gearbox'],
    [/herramienta|llave|multimetro|carraca|dinamometrica|gato|caballete|kit esencial/i, 'tools'],
    [/direccion|rotula|volante(?! bimasa)|alineacion|geometria/i, 'steering'],
    [/escape|catalizador|humo|silencioso/i, 'exhaust'],
    [/adas|camara|radar|sensor|calibra|luna/i, 'sensor'],
    [/ecu|centralita|software|ota|electronica|modulo/i, 'ecu'],
    [/presupuesto|precio|euros|coste|ahorr|negocia|factura/i, 'money'],
    [/claude|agente|ia |prompt|inteligencia artificial|chatbot|gemini|perplexity/i, 'ai'],
    [/urgencia|peligro|no conduzcas|averia|sintoma|fallo|testigo rojo/i, 'warning'],
    [/coche|vehiculo|motor|taller|mecanic/i, 'car'],
  ];

  function match(text) {
    for (const [re, key] of RULES) if (re.test(text)) return key;
    return 'car';
  }

  return { art, match };
})();
