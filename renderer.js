// ── Elementos ──
const els = {
  group:        document.getElementById('robot-group'),
  antennaBall:  document.getElementById('antenna-ball'),
  antennaGlow:  document.getElementById('antenna-glow'),
  pupilsL:      document.getElementById('pupils-l'),
  pupilsR:      document.getElementById('pupils-r'),
  eyelidL:      document.getElementById('eyelid-l'),
  eyelidR:      document.getElementById('eyelid-r'),
  eyeWhiteL:    document.getElementById('eye-white-l'),
  eyeWhiteR:    document.getElementById('eye-white-r'),
  blushL:       document.getElementById('blush-l'),
  blushR:       document.getElementById('blush-r'),
  armL:         document.getElementById('arm-l'),
  armR:         document.getElementById('arm-r'),
  fistL:        document.getElementById('fist-l'),
  fistR:        document.getElementById('fist-r'),
  legL:         document.getElementById('leg-l'),
  legR:         document.getElementById('leg-r'),
  chestIcon:    document.getElementById('chest-icon'),
  chestPrompt:  document.getElementById('chest-prompt'),
  visorText:    document.getElementById('visor-text'),
  label:        document.getElementById('status-label'),
  robotWrap:    document.getElementById('robot-wrap'),
  btnClose:     document.getElementById('btn-close'),
};

// ── Definição dos estados ──
const STATES = {
  idle: {
    visorText:       '>_',
    visorColor:      '#F97316',   // laranja Claude Code
    antennaColor:    '#F97316',
    blush:           0,
    chest:           null,        // null = mostra prompt >_ no peito
    eyelidL:         6,
    eyelidR:         6,
    pupilOffset:     { x: 0, y: 0 },
    armRotL:         0,
    armRotR:         0,
    legRotL:         0,
    legRotR:         0,
    groupAnim:       'anim-float',
    thinkPupils:     false,
    label:           'Olá!',
  },
  thinking: {
    visorText:       '...',
    visorColor:      '#A78BFA',
    antennaColor:    '#A78BFA',
    blush:           0,
    chest:           '💭',
    eyelidL:         5,
    eyelidR:         5,
    pupilOffset:     { x: 0, y: 0 },
    armRotL:         -8,
    armRotR:         8,
    legRotL:         0,
    legRotR:         0,
    groupAnim:       '',
    thinkPupils:     true,
    label:           'Pensando...',
  },
  reading: {
    visorText:       'cat',
    visorColor:      '#34D399',   // teal
    antennaColor:    '#34D399',
    blush:           0,
    chest:           '📖',
    eyelidL:         11,
    eyelidR:         11,
    pupilOffset:     { x: -5, y: 3 },
    armRotL:         6,
    armRotR:         -6,
    legRotL:         0,
    legRotR:         0,
    groupAnim:       'anim-reading',
    thinkPupils:     false,
    label:           'Lendo...',
  },
  working: {
    visorText:       'run',
    visorColor:      '#EA580C',   // laranja escuro
    antennaColor:    '#F97316',
    blush:           0,
    chest:           '⚙️',
    eyelidL:         0,
    eyelidR:         0,
    pupilOffset:     { x: 0, y: -2 },
    armRotL:         -28,
    armRotR:         28,
    legRotL:         -5,
    legRotR:         5,
    groupAnim:       'anim-bounce',
    thinkPupils:     false,
    label:           'Trabalhando...',
  },
  success: {
    visorText:       '[OK]',
    visorColor:      '#4ADE80',
    antennaColor:    '#10B981',
    blush:           0.55,
    chest:           '⭐',
    eyelidL:         0,
    eyelidR:         0,
    pupilOffset:     { x: 0, y: -4 },
    armRotL:         -42,
    armRotR:         42,
    legRotL:         0,
    legRotR:         0,
    groupAnim:       'anim-jump',
    thinkPupils:     false,
    label:           'Pronto! ✓',
  },
  error: {
    visorText:       'ERR',
    visorColor:      '#EF4444',   // vermelho
    antennaColor:    '#EF4444',
    blush:           0,
    chest:           '⚠️',
    eyelidL:         16,
    eyelidR:         16,
    pupilOffset:     { x: 0, y: 5 },
    armRotL:         12,
    armRotR:         -12,
    legRotL:         0,
    legRotR:         0,
    groupAnim:       'anim-shake',
    thinkPupils:     false,
    label:           'Erro!',
  },
};

// ── Estado atual ──
let currentState = 'idle';
let blinkInterval = null;
let idleTimeout = null;
let labelTimeout = null;
let thinkAnimInterval = null;

// ── Rastreamento do cursor ──
// Posição suavizada (interpolada) dos olhos
const eyeL  = { svgX: 73,  svgY: 85 };  // centro da lente esquerda no SVG
const eyeR  = { svgX: 127, svgY: 85 };  // centro da lente direita no SVG
const MAX_TRAVEL = 5.5;                  // raio máximo de deslocamento da pupila

// Posição-alvo e posição atual suavizada (lerp)
const pupil = {
  targetL:  { x: 0, y: 0 },
  targetR:  { x: 0, y: 0 },
  currentL: { x: 0, y: 0 },
  currentR: { x: 0, y: 0 },
};

function lerp(a, b, t) { return a + (b - a) * t; }

// Calcula o offset da pupila dado centro do olho (em px de tela) e cursor
function calcOffset(eyeScreenX, eyeScreenY, cursorX, cursorY) {
  const dx = cursorX - eyeScreenX;
  const dy = cursorY - eyeScreenY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 1) return { x: 0, y: 0 };
  // Influência: satura em ~120px de distância
  const influence = Math.min(dist / 120, 1);
  return {
    x: (dx / dist) * influence * MAX_TRAVEL,
    y: (dy / dist) * influence * MAX_TRAVEL,
  };
}

// Loop de animação das pupilas (roda sempre, 60fps)
function pupilLoop() {
  const LERP_SPEED = 0.10;
  pupil.currentL.x = lerp(pupil.currentL.x, pupil.targetL.x, LERP_SPEED);
  pupil.currentL.y = lerp(pupil.currentL.y, pupil.targetL.y, LERP_SPEED);
  pupil.currentR.x = lerp(pupil.currentR.x, pupil.targetR.x, LERP_SPEED);
  pupil.currentR.y = lerp(pupil.currentR.y, pupil.targetR.y, LERP_SPEED);

  // Só aplica o tracking se o estado não tiver CSS animation nos pupilas
  if (currentState !== 'thinking') {
    const lx = pupil.currentL.x.toFixed(2);
    const ly = pupil.currentL.y.toFixed(2);
    const rx = pupil.currentR.x.toFixed(2);
    const ry = pupil.currentR.y.toFixed(2);
    els.pupilsL.style.transform = `translate(${lx}px,${ly}px)`;
    els.pupilsR.style.transform = `translate(${rx}px,${ry}px)`;
  }
  requestAnimationFrame(pupilLoop);
}

// Recebe posição do cursor do processo main (a cada ~25ms)
window.robotAPI.onCursorPos(({ cursorX, cursorY, winX, winY }) => {
  if (currentState === 'thinking') return;

  // Origem do SVG em coordenadas de tela:
  // robot-wrap tem offset de ~10px da esquerda e ~2px do topo dentro da janela
  const svgOriginX = winX + 10;
  const svgOriginY = winY + 2;

  // Centro de cada lente em coordenadas de tela
  const eyeLscreenX = svgOriginX + eyeL.svgX;
  const eyeLscreenY = svgOriginY + eyeL.svgY;
  const eyeRscreenX = svgOriginX + eyeR.svgX;
  const eyeRscreenY = svgOriginY + eyeR.svgY;

  pupil.targetL = calcOffset(eyeLscreenX, eyeLscreenY, cursorX, cursorY);
  pupil.targetR = calcOffset(eyeRscreenX, eyeRscreenY, cursorX, cursorY);
});

// ── Aplicar estado ──
function applyState(name) {
  const s = STATES[name] || STATES.idle;
  currentState = name;

  // Animação do grupo
  const anims = ['anim-float','anim-bounce','anim-shake','anim-jump','anim-reading'];
  anims.forEach(c => els.group.classList.remove(c));
  if (s.groupAnim) {
    void els.group.offsetWidth; // force reflow para reiniciar
    els.group.classList.add(s.groupAnim);
  }

  // Antena
  els.antennaBall.setAttribute('fill', s.antennaColor);
  els.antennaGlow.setAttribute('fill', s.antennaColor);
  els.antennaBall.classList.toggle('anim-pulse-antenna', name === 'thinking' || name === 'working');

  // Pálpebras (suave)
  animEyelid(els.eyelidL, s.eyelidL);
  animEyelid(els.eyelidR, s.eyelidR);

  // Pupilas: define target base do estado — o loop de tracking suaviza até lá
  pupil.targetL = { x: s.pupilOffset.x,                                    y: s.pupilOffset.y };
  pupil.targetR = { x: s.pupilOffset.x === 0 ? 0 : -s.pupilOffset.x,      y: s.pupilOffset.y };

  // Thinking: CSS animation nas pupilas (spin); zera target e entrega pro CSS
  clearInterval(thinkAnimInterval);
  els.pupilsL.classList.toggle('anim-thinking-pupils', s.thinkPupils);
  els.pupilsR.classList.toggle('anim-thinking-pupils', s.thinkPupils);
  if (s.thinkPupils) {
    pupil.targetL = { x: 0, y: 0 };
    pupil.targetR = { x: 0, y: 0 };
  }

  // Texto da viseira
  updateVisorText(s.visorText, s.visorColor, name === 'thinking');

  // Bochechas
  fadeProp(els.blushL, 'opacity', s.blush);
  fadeProp(els.blushR, 'opacity', s.blush);

  // Braços e pernas
  els.armL.style.transform = `rotate(${s.armRotL}deg)`;
  els.armR.style.transform = `rotate(${s.armRotR}deg)`;
  els.legL.style.transform  = `rotate(${s.legRotL}deg)`;
  els.legR.style.transform  = `rotate(${s.legRotR}deg)`;

  // Peito: null = mostra prompt ">_" (idle), string = emoji
  if (s.chest === null) {
    els.chestIcon.setAttribute('opacity', '0');
    els.chestPrompt.setAttribute('opacity', '1');
  } else {
    els.chestIcon.textContent = s.chest;
    els.chestIcon.setAttribute('opacity', '1');
    els.chestPrompt.setAttribute('opacity', '0');
  }

  // Label
  showLabel(s.label);

  // Partículas em sucesso
  if (name === 'success') spawnSparkles();

  // Retorna ao idle após success/error
  clearTimeout(idleTimeout);
  if (name === 'success' || name === 'error') {
    idleTimeout = setTimeout(() => applyState('idle'), 4500);
  }
}

// ── Texto da viseira ──
let thinkDots = 0;
let thinkTextInterval = null;

function updateVisorText(text, color, isThinking) {
  clearInterval(thinkTextInterval);
  els.visorText.setAttribute('fill', color);

  if (isThinking) {
    const frames = ['   .  ', '  ..  ', ' ...  ', '  ..  '];
    let i = 0;
    els.visorText.textContent = frames[0];
    thinkTextInterval = setInterval(() => {
      i = (i + 1) % frames.length;
      els.visorText.textContent = frames[i];
    }, 400);
  } else {
    els.visorText.textContent = text;
  }
}

// ── Helpers de animação ──

function animEyelid(el, target) {
  const current = parseFloat(el.getAttribute('height') || 0);
  if (Math.abs(current - target) < 0.6) { el.setAttribute('height', target); return; }
  el.setAttribute('height', (current + (target - current) * 0.22).toFixed(1));
  requestAnimationFrame(() => animEyelid(el, target));
}

function fadeProp(el, attr, target, steps = 18) {
  const from = parseFloat(el.getAttribute(attr) || 0);
  const step = (target - from) / steps;
  let i = 0;
  const tick = () => {
    i++;
    el.setAttribute(attr, (from + step * i).toFixed(3));
    if (i < steps) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function showLabel(text) {
  els.label.textContent = text;
  els.label.style.opacity = '1';
  clearTimeout(labelTimeout);
  labelTimeout = setTimeout(() => els.label.style.opacity = '0', 2800);
}

function spawnSparkles() {
  const emojis = ['✨','⭐','💫','🌟','⚡'];
  for (let i = 0; i < 6; i++) {
    setTimeout(() => {
      const el = document.createElement('div');
      el.className = 'spark';
      el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      el.style.left  = (25 + Math.random() * 150) + 'px';
      el.style.top   = (30 + Math.random() * 220) + 'px';
      el.style.animationDelay = (Math.random() * 0.25) + 's';
      document.getElementById('app').appendChild(el);
      setTimeout(() => el.remove(), 1200);
    }, i * 90);
  }
}

// ── Piscada automática ──
function startBlink() {
  const doBlink = () => {
    if (currentState !== 'idle' && currentState !== 'working') return;
    const lid = STATES[currentState]?.eyelidL ?? 6;
    animEyelid(els.eyelidL, 24);
    animEyelid(els.eyelidR, 24);
    setTimeout(() => { animEyelid(els.eyelidL, lid); animEyelid(els.eyelidR, lid); }, 130);
  };

  const scheduleNext = () => {
    blinkInterval = setTimeout(() => { doBlink(); scheduleNext(); }, 3200 + Math.random() * 2500);
  };
  scheduleNext();
}

// ── Listener de eventos dos hooks ──
window.robotAPI.onStateChange((data) => {
  const s = data.state || 'idle';
  if (STATES[s]) applyState(s);
});

// ── Controles ──
els.btnClose.addEventListener('click', (e) => { e.stopPropagation(); window.robotAPI.close(); });
document.addEventListener('contextmenu', (e) => { e.preventDefault(); window.robotAPI.contextMenu(); });
els.robotWrap.addEventListener('mouseenter', () => window.robotAPI.setIgnoreMouse(false));
els.robotWrap.addEventListener('mouseleave', () => window.robotAPI.setIgnoreMouse(true));

// ── Init ──
applyState('idle');
startBlink();
requestAnimationFrame(pupilLoop); // inicia loop de tracking suave
