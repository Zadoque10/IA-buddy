// ── Elementos do DOM ──
const els = {
  group:       document.getElementById('robot-group'),
  antennaBall: document.getElementById('antenna-ball'),
  antennaGlow: document.getElementById('antenna-glow'),
  antennaGlowEl: document.getElementById('antenna-glow'),
  pupilsL:     document.getElementById('pupils-l'),
  pupilsR:     document.getElementById('pupils-r'),
  eyelidL:     document.getElementById('eyelid-l'),
  eyelidR:     document.getElementById('eyelid-r'),
  mouth:       document.getElementById('mouth'),
  blushL:      document.getElementById('blush-l'),
  blushR:      document.getElementById('blush-r'),
  armL:        document.getElementById('arm-l'),
  armR:        document.getElementById('arm-r'),
  chestIcon:   document.getElementById('chest-icon'),
  label:       document.getElementById('status-label'),
  robotWrap:   document.getElementById('robot-wrap'),
  btnClose:    document.getElementById('btn-close'),
};

// ── Definição de estados ──
const STATES = {
  idle: {
    mouth:         'M 80 118 Q 100 130 120 118',
    antennaColor:  '#60A5FA',
    glowColor:     '#93C5FD',
    blush:         0,
    chest:         '🤖',
    eyelidL:       6,
    eyelidR:       6,
    pupilOffsetL:  { x: 0, y: 0 },
    pupilOffsetR:  { x: 0, y: 0 },
    armRotL:       0,
    armRotR:       0,
    groupAnim:     'anim-float',
    thinkPupils:   false,
    label:         'Olá!',
  },
  thinking: {
    mouth:         'M 87 118 Q 100 120 113 118',
    antennaColor:  '#A78BFA',
    glowColor:     '#C4B5FD',
    blush:         0,
    chest:         '💭',
    eyelidL:       4,
    eyelidR:       4,
    pupilOffsetL:  { x: 0, y: 0 },
    pupilOffsetR:  { x: 0, y: 0 },
    armRotL:       -10,
    armRotR:       10,
    groupAnim:     '',
    thinkPupils:   true,
    label:         'Pensando...',
  },
  reading: {
    mouth:         'M 84 119 Q 100 121 116 119',
    antennaColor:  '#34D399',
    glowColor:     '#6EE7B7',
    blush:         0,
    chest:         '📖',
    eyelidL:       11,
    eyelidR:       11,
    pupilOffsetL:  { x: -5, y: 3 },
    pupilOffsetR:  { x: -5, y: 3 },
    armRotL:       5,
    armRotR:       -5,
    groupAnim:     'anim-reading',
    thinkPupils:   false,
    label:         'Lendo...',
  },
  working: {
    mouth:         'M 79 113 Q 100 130 121 113',
    antennaColor:  '#F59E0B',
    glowColor:     '#FCD34D',
    blush:         0,
    chest:         '⚙️',
    eyelidL:       0,
    eyelidR:       0,
    pupilOffsetL:  { x: 0, y: -2 },
    pupilOffsetR:  { x: 0, y: -2 },
    armRotL:       -20,
    armRotR:       20,
    groupAnim:     'anim-bounce',
    thinkPupils:   false,
    label:         'Trabalhando...',
  },
  success: {
    mouth:         'M 70 112 Q 100 137 130 112',
    antennaColor:  '#10B981',
    glowColor:     '#6EE7B7',
    blush:         0.55,
    chest:         '⭐',
    eyelidL:       0,
    eyelidR:       0,
    pupilOffsetL:  { x: -2, y: -3 },
    pupilOffsetR:  { x: 2,  y: -3 },
    armRotL:       -35,
    armRotR:       35,
    groupAnim:     'anim-jump',
    thinkPupils:   false,
    label:         'Pronto! ✓',
  },
  error: {
    mouth:         'M 79 127 Q 100 113 121 127',
    antennaColor:  '#EF4444',
    glowColor:     '#FCA5A5',
    blush:         0,
    chest:         '⚠️',
    eyelidL:       15,
    eyelidR:       15,
    pupilOffsetL:  { x: 0, y: 4 },
    pupilOffsetR:  { x: 0, y: 4 },
    armRotL:       10,
    armRotR:       -10,
    groupAnim:     'anim-shake',
    thinkPupils:   false,
    label:         'Opa...',
  },
};

// ── Máquina de estado ──
let currentState = 'idle';
let blinkInterval = null;
let idleTimeout = null;
let labelTimeout = null;

function applyState(stateName) {
  const s = STATES[stateName] || STATES.idle;
  currentState = stateName;

  // Animação do grupo principal
  const animClasses = ['anim-float','anim-bounce','anim-shake','anim-jump','anim-reading'];
  animClasses.forEach(c => els.group.classList.remove(c));
  if (s.groupAnim) {
    // force reflow pra reiniciar a animação
    void els.group.offsetWidth;
    els.group.classList.add(s.groupAnim);
  }

  // Antena
  els.antennaBall.setAttribute('fill', s.antennaColor);
  els.antennaBall.setAttribute('stroke', s.glowColor);
  els.antennaGlow.setAttribute('fill', s.glowColor);

  // Pálpebras
  smoothEyelid(els.eyelidL, s.eyelidL);
  smoothEyelid(els.eyelidR, s.eyelidR);

  // Pupilas
  movePupils(els.pupilsL, s.pupilOffsetL);
  movePupils(els.pupilsR, s.pupilOffsetR);

  // Pensando: anima pupilas
  els.pupilsL.classList.toggle('anim-thinking-pupils', s.thinkPupils);
  els.pupilsR.classList.toggle('anim-thinking-pupils', s.thinkPupils);
  els.antennaBall.classList.toggle('anim-pulse-antenna', s.thinkPupils || stateName === 'working');

  // Boca
  els.mouth.setAttribute('d', s.mouth);

  // Bochechas
  animateProp(els.blushL, 'opacity', parseFloat(els.blushL.getAttribute('opacity') || 0), s.blush);
  animateProp(els.blushR, 'opacity', parseFloat(els.blushR.getAttribute('opacity') || 0), s.blush);

  // Braços
  els.armL.style.transform = `rotate(${s.armRotL}deg)`;
  els.armR.style.transform = `rotate(${s.armRotR}deg)`;

  // Ícone do peito
  els.chestIcon.textContent = s.chest;

  // Label
  showLabel(s.label);

  // Partículas de sucesso
  if (stateName === 'success') spawnSparkles();

  // Volta pro idle após 4s em success/error
  clearTimeout(idleTimeout);
  if (stateName === 'success' || stateName === 'error') {
    idleTimeout = setTimeout(() => applyState('idle'), 4000);
  }
}

// ── Helpers ──

function smoothEyelid(el, targetH) {
  const current = parseFloat(el.getAttribute('height') || 0);
  if (Math.abs(current - targetH) < 0.5) {
    el.setAttribute('height', targetH);
    return;
  }
  const next = current + (targetH - current) * 0.25;
  el.setAttribute('height', next.toFixed(1));
  requestAnimationFrame(() => smoothEyelid(el, targetH));
}

function movePupils(group, offset) {
  group.style.transform = `translate(${offset.x}px, ${offset.y}px)`;
}

function animateProp(el, attr, from, to, steps = 20) {
  let i = 0;
  const step = (to - from) / steps;
  const tick = () => {
    i++;
    const val = from + step * i;
    el.setAttribute(attr, val.toFixed(3));
    if (i < steps) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function showLabel(text) {
  els.label.textContent = text;
  els.label.style.opacity = '1';
  clearTimeout(labelTimeout);
  labelTimeout = setTimeout(() => {
    els.label.style.opacity = '0';
  }, 2500);
}

function spawnSparkles() {
  const emojis = ['✨','⭐','💫','🌟'];
  for (let i = 0; i < 5; i++) {
    setTimeout(() => {
      const spark = document.createElement('div');
      spark.className = 'spark';
      spark.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      spark.style.left = (30 + Math.random() * 140) + 'px';
      spark.style.top  = (40 + Math.random() * 200) + 'px';
      spark.style.animationDelay = (Math.random() * 0.3) + 's';
      document.getElementById('app').appendChild(spark);
      setTimeout(() => spark.remove(), 1200);
    }, i * 100);
  }
}

// ── Piscada automática ──
function startBlink() {
  blinkInterval = setInterval(() => {
    if (currentState !== 'idle' && currentState !== 'working') return;
    const lid = STATES[currentState]?.eyelidL ?? 6;

    // Pisca rápido: abre e fecha
    smoothEyelid(els.eyelidL, 24);
    smoothEyelid(els.eyelidR, 24);
    setTimeout(() => {
      smoothEyelid(els.eyelidL, lid);
      smoothEyelid(els.eyelidR, lid);
    }, 120);
  }, 3500 + Math.random() * 2000);
}

// ── Listener de eventos dos hooks ──
window.robotAPI.onStateChange((data) => {
  const s = data.state || 'idle';
  if (STATES[s]) applyState(s);
});

// ── Controles ──
els.btnClose.addEventListener('click', (e) => {
  e.stopPropagation();
  window.robotAPI.close();
});

// Clique direito abre menu
document.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  window.robotAPI.contextMenu();
});

// Hover: desativa click-through pra poder arrastar
els.robotWrap.addEventListener('mouseenter', () => window.robotAPI.setIgnoreMouse(false));
els.robotWrap.addEventListener('mouseleave', () => window.robotAPI.setIgnoreMouse(true));

// ── Inicialização ──
applyState('idle');
startBlink();
