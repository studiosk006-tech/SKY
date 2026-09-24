const STORAGE_KEY = 'sky-web-v2';
const DEFAULT_DATA = { profile: null, goals: [], entries: [], checkins: {}, usageDays: [] };
let data = loadData();
let currentView = 'home';
let goalFilter = 'active';
let selectedDate = dateKey(new Date());
let onboardingDraft = {};
let toastTimer;
let breathInterval;

const appShell = document.querySelector('#appShell');
const onboardingRoot = document.querySelector('#onboardingRoot');
const viewRoot = document.querySelector('#viewRoot');
const sidebar = document.querySelector('#sidebar');
const toast = document.querySelector('#toast');
const skyBuddy = document.querySelector('#skyBuddy');

const moodOptions = [
  { label: 'Genial', emoji: '😊', color: 'blue' },
  { label: 'Bien', emoji: '🙂', color: 'teal' },
  { label: 'Regular', emoji: '😐', color: 'amber' },
  { label: 'Mal', emoji: '🙁', color: 'peach' },
];
const suggestionGoals = [
  { id: 'rest', emoji: '🌙', title: 'Cuidar mi descanso', description: 'Crear una rutina que me ayude a descansar mejor.' },
  { id: 'move', emoji: '🏃', title: 'Moverme con constancia', description: 'Encontrar una forma de actividad que disfrute.' },
  { id: 'learn', emoji: '📚', title: 'Dedicar tiempo a aprender', description: 'Avanzar poco a poco en algo que me interesa.' },
  { id: 'calm', emoji: '🧘', title: 'Reservar un momento para mí', description: 'Hacer una pausa y bajar el ritmo cada día.' },
];
const sectionLabels = { home: 'Inicio', timeline: 'Timeline', goals: 'Objetivos', insights: 'Insights', chat: 'Chat con SKY', profile: 'Perfil' };
const icon = (name, extra = '') => `<svg class="icon ${extra}" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const uid = () => globalThis.crypto?.randomUUID?.() || `sky-${Date.now()}-${Math.random().toString(16).slice(2)}`;

function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return { ...DEFAULT_DATA, ...saved, profile: saved.profile || null, goals: saved.goals || [], entries: saved.entries || [], checkins: saved.checkins || {}, usageDays: saved.usageDays || [] };
  } catch { return structuredClone(DEFAULT_DATA); }
}
function saveData() { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
function dateKey(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
function fromDateKey(key) { const [year, month, day] = key.split('-').map(Number); return new Date(year, month - 1, day, 12); }
function formatDate(key, options = { weekday: 'long', day: 'numeric', month: 'long' }) { return new Intl.DateTimeFormat('es-ES', options).format(fromDateKey(key)); }
function todayKey() { return dateKey(new Date()); }
function mascot(state = 'curious', extraClass = '') {
  return document.querySelector('#mascotTemplate').innerHTML.trim().replace('mascot--curious', `mascot--${state} ${extraClass}`);
}
function showToast(message) {
  toast.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2800);
}
function trackUsage() {
  const today = todayKey();
  if (!data.usageDays.includes(today)) data.usageDays.push(today);
  data.usageDays.sort();
  saveData();
}
function getStreak() {
  const days = new Set(data.usageDays);
  let cursor = fromDateKey(todayKey());
  if (!days.has(dateKey(cursor))) return 0;
  let count = 0;
  while (days.has(dateKey(cursor))) { count += 1; cursor.setDate(cursor.getDate() - 1); }
  return count;
}

function renderOnboarding(step = 0) {
  const dots = `<div class="onboarding-dots" aria-label="Paso ${step + 1} de 3"><i class="${step >= 0 ? 'active' : ''}"></i><i class="${step >= 1 ? 'active' : ''}"></i><i class="${step >= 2 ? 'active' : ''}"></i><span>${step + 1} de 3</span></div>`;
  let content = '';
  if (step === 0) {
    content = `<div class="onboarding-welcome"><span class="onboarding-brand"><span class="brand-mark">${icon('sparkle')}</span><b>SKY</b></span><div class="onboarding-copy"><span class="eyebrow">TU COMPAÑERO. TU CLARIDAD. TU CAMINO.</span><h1>Hola, soy SKY.</h1><p>Estoy aquí para conocerte, escucharte y ayudarte a avanzar a tu manera.</p><p class="onboarding-soft">No hace falta tenerlo todo claro para empezar.</p><button class="primary-button" type="button" data-onboard="next">Comenzar ${icon('arrow')}</button></div><div class="onboarding-sky-art">${mascot('curious', 'onboarding-mascot')}<span class="orbit orbit-one"></span><span class="orbit orbit-two"></span></div><div class="onboarding-footer">Un espacio tranquilo, solo para ti.</div></div>`;
  } else if (step === 1) {
    content = `<div class="onboarding-form-wrap"><div class="onboarding-form-head"><span class="eyebrow">PARA PODER AYUDARTE, QUIERO CONOCERTE</span><h1>¿Cómo es tu mundo?</h1><p>No tienes que responderlo todo ahora. Puedes completar estas preguntas a tu ritmo.</p></div><form id="onboardingForm" class="onboarding-form">
      <label class="field"><span>¿Cómo te llamas o cómo prefieres que te llame?</span><input name="name" maxlength="40" required autocomplete="given-name" placeholder="Tu nombre" value="${escapeHtml(onboardingDraft.name || '')}" /></label>
      <label class="field"><span>¿Qué te gustaría lograr?</span><textarea name="goal" rows="2" maxlength="240" placeholder="Puede ser algo pequeño o un sueño grande…">${escapeHtml(onboardingDraft.goal || '')}</textarea></label>
      <label class="field"><span>¿Qué suele ponértelo difícil?</span><textarea name="blocker" rows="2" maxlength="240" placeholder="Solo si te apetece compartirlo…">${escapeHtml(onboardingDraft.blocker || '')}</textarea></label>
      <label class="field"><span>¿Qué te gustaría que SKY recuerde?</span><textarea name="remember" rows="2" maxlength="240" placeholder="Esto también lo puedes añadir más adelante…">${escapeHtml(onboardingDraft.remember || '')}</textarea></label>
      <div class="onboarding-form-actions"><button class="text-action" type="button" data-onboard="back">${icon('left')} Volver</button><button class="primary-button" type="submit">Continuar ${icon('arrow')}</button></div>
    </form>${dots}</div>`;
  } else {
    const name = escapeHtml(onboardingDraft.name || '');
    content = `<div class="onboarding-thanks"><span class="onboarding-brand"><span class="brand-mark">${icon('sparkle')}</span><b>SKY</b></span><div class="thanks-mark">${icon('check')}</div><span class="eyebrow">TU CAMINO EMPIEZA AQUÍ</span><h1>¡Gracias, ${name}!</h1><p>Lo que compartas ayudará a SKY a acompañarte mejor. Tú decides qué contar y qué recordar.</p><p class="onboarding-soft">¿Listo para empezar este viaje juntos?</p><button class="primary-button" type="button" data-onboard="finish">Vamos allá ${icon('arrow')}</button>${dots}${mascot('happy', 'thanks-mascot')}</div>`;
  }
  onboardingRoot.innerHTML = `<main class="onboarding-screen step-${step}">${content}</main>`;
  appShell.hidden = true;
  skyBuddy.hidden = true;
}

function enterApp() {
  if (!data.profile?.name) { renderOnboarding(0); return; }
  onboardingRoot.innerHTML = '';
  appShell.hidden = false;
  skyBuddy.hidden = false;
  document.querySelector('#skyBuddyAvatar').innerHTML = mascot('happy');
  document.querySelector('#skyBuddyPanelAvatar').innerHTML = mascot('supporting');
  trackUsage();
  renderView('home');
}

function moodButtons(selected) {
  return moodOptions.map((mood) => `<button class="mood-option mood-${mood.color}" type="button" aria-pressed="${selected === mood.label}" data-mood="${mood.label}"><span class="mood-face">${mood.emoji}</span><span>${mood.label}</span></button>`).join('');
}
function renderEntryRow(entry) {
  const mood = moodOptions.find((option) => option.label === entry.mood);
  return `<article class="entry-row"><span class="entry-symbol">${escapeHtml(entry.emoji || '✦')}</span><div class="entry-main"><div class="entry-title-line"><strong>${escapeHtml(entry.activity || 'Momento del día')}</strong>${entry.time ? `<time>${escapeHtml(entry.time)}</time>` : ''}</div><p>${escapeHtml(entry.note)}</p><div class="entry-meta">${mood ? `<span>${mood.emoji} ${mood.label}</span>` : ''}${entry.sleepHours ? `<span>${icon('moon')} ${escapeHtml(entry.sleepHours)} h de sueño</span>` : ''}</div></div></article>`;
}
function renderCheckinRow(checkin) {
  const mood = moodOptions.find((option) => option.label === checkin.mood);
  if (!mood) return '';
  return `<article class="entry-row checkin-row"><span class="entry-symbol checkin-symbol">${mood.emoji}</span><div class="entry-main"><div class="entry-title-line"><strong>Así te sentiste</strong><span class="checkin-mood">${mood.label}</span></div><p>Tu pausa para escucharte, guardada solo para ti.</p></div></article>`;
}
function renderWeekStrip() {
  const today = fromDateKey(todayKey());
  const mondayOffset = (today.getDay() + 6) % 7;
  const monday = new Date(today); monday.setDate(today.getDate() - mondayOffset);
  const shortDays = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  return `<section class="card week-card"><div class="card-heading"><div><span class="eyebrow">TUS PEQUEÑOS MOMENTOS</span><h2>Esta semana</h2></div><button class="small-link" type="button" data-view="timeline">Ver Timeline ${icon('arrow')}</button></div><div class="week-strip">${shortDays.map((label, index) => {
    const day = new Date(monday); day.setDate(monday.getDate() + index); const key = dateKey(day);
    const mood = data.checkins[key]?.mood; const entryCount = data.entries.filter((entry) => entry.date === key).length;
    const selected = mood ? moodOptions.find((option) => option.label === mood)?.emoji : entryCount ? '•' : '—';
    return `<button class="week-day ${key === todayKey() ? 'current' : ''} ${mood || entryCount ? 'has-activity' : ''}" type="button" data-week-date="${key}" aria-label="${label} ${day.getDate()}${mood ? `, ánimo ${escapeHtml(mood)}` : ''}${entryCount ? `, ${entryCount} registros` : ''}"><small>${label}</small><span>${selected}</span><b>${day.getDate()}</b></button>`;
  }).join('')}</div><p class="week-hint">Los días se completan con lo que tú registres.</p></section>`;
}
function renderBreathingCard() {
  return `<section class="card breathing-card"><div class="breathing-copy"><span class="eyebrow">UN RESPIRO</span><h2>Un minuto para volver a ti.</h2><p>Prueba un ritmo tranquilo: inhala, mantén y suelta. Puedes parar cuando quieras.</p><button class="secondary-button" type="button" data-action="start-breath" id="breathButton">Empezar pausa</button></div><div class="breath-guide" id="breathGuide"><div class="breath-orb"><span id="breathPhase">A tu ritmo</span><strong id="breathCount">60</strong></div></div></section>`;
}
function renderHome() {
  const today = todayKey();
  const name = escapeHtml(data.profile?.name || '');
  const greeting = name ? `Buenos días, ${name}` : 'Buenos días';
  const entries = data.entries.filter((entry) => entry.date === today).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  const goals = data.goals.filter((goal) => !goal.completed).slice(0, 3);
  const checkin = data.checkins[today];
  return `<section class="welcome-row"><div class="welcome-copy"><h1>${greeting} <span aria-hidden="true">☀️</span></h1><p>¿Cómo te sientes hoy?</p></div><div class="today-chip">${icon('sun')} <span>${escapeHtml(formatDate(today))}</span></div></section>
    <div class="home-layout">
      <div class="home-main-column">
        <section class="card mood-card"><div class="card-heading"><div><h2>¿Cómo te sientes hoy?</h2><p>Elige lo que más se acerque. Puedes cambiarlo cuando quieras.</p></div><span class="quiet-note">${checkin ? 'Guardado en este dispositivo' : 'Solo para ti'}</span></div><div class="mood-options" role="group" aria-label="Cómo te sientes">${moodButtons(checkin?.mood)}</div></section>
        <section class="quick-actions" aria-label="Accesos rápidos"><button type="button" data-action="add-entry">${icon('plus')}<span><strong>Registrar momento</strong><small>Guarda algo de hoy</small></span></button><button type="button" data-view="goals">${icon('target')}<span><strong>Añadir objetivo</strong><small>Un paso a la vez</small></span></button><button type="button" data-view="chat">${icon('chat')}<span><strong>Hablar con SKY</strong><small>Ordena tus ideas</small></span></button></section>
        <section class="card quote-card"><div class="quote-copy"><span class="eyebrow">UN PASO A LA VEZ</span><h2>Pequeños pasos cada día<br />te acercan a lo que importa.</h2><span class="quote-by">— SKY</span></div><div class="quote-landscape" aria-hidden="true"><span></span><span></span><span></span></div><div class="quote-star">${icon('sparkle')}</div>${mascot('happy', 'quote-mascot')}</section>
        <section class="card day-summary"><div class="card-heading"><div><span class="eyebrow">HOY · ${escapeHtml(formatDate(today, { day: 'numeric', month: 'long' }))}</span><h2>Resumen de hoy</h2></div><button class="icon-button" type="button" data-action="add-entry" aria-label="Añadir registro">${icon('plus')}</button></div>
          ${entries.length ? `<div class="entry-list">${entries.map(renderEntryRow).join('')}</div>` : `<div class="summary-empty"><span class="empty-mini-icon">${icon('book')}</span><div><strong>Tu día todavía está por escribir</strong><p>Registra algo que hiciste o cómo te sentiste; aparecerá aquí y en tu Timeline.</p></div><button class="small-link" type="button" data-action="add-entry">Añadir registro ${icon('arrow')}</button></div>`}
        </section>
        ${renderWeekStrip()}
        ${renderBreathingCard()}
        <div class="home-lower-grid"><section class="card home-goals"><div class="card-heading"><div><span class="eyebrow">A TU RITMO</span><h2>Mis objetivos</h2></div><button class="small-link" type="button" data-view="goals">Ver todos ${icon('arrow')}</button></div>
          ${goals.length ? `<div class="mini-goal-list">${goals.map((goal) => `<div class="mini-goal"><span>${escapeHtml(goal.emoji)}</span><div><strong>${escapeHtml(goal.title)}</strong><small>${goal.progress || 0}% de progreso</small></div></div>`).join('')}</div>` : `<p class="muted-copy">Todavía no has elegido objetivos. Puedes partir de una idea o crear uno propio.</p><button class="small-link" type="button" data-view="goals">Explorar ideas ${icon('arrow')}</button>`}
        </section><section class="card timeline-teaser"><div class="card-heading"><div><span class="eyebrow">TU HISTORIA</span><h2>Timeline</h2></div>${icon('calendar', 'heading-icon')}</div><p class="muted-copy">Cada día puede guardar un pequeño momento que quieras recordar.</p><button class="small-link" type="button" data-view="timeline">Abrir calendario ${icon('arrow')}</button></section></div>
      </div>
      <aside class="home-side-column"><section class="card companion-card"><span class="eyebrow">AQUÍ CONTIGO</span><h2>Un espacio para pensar en voz alta.</h2><p>Cuéntame lo que tienes en mente. Podemos empezar por donde quieras.</p><button class="primary-button" type="button" data-view="chat">Empezar conversación ${icon('arrow')}</button>${mascot('curious')}<span class="bubble" aria-hidden="true"></span></section>
        <section class="card streak-card"><div class="streak-icon">${icon('fire')}</div><div><span class="eyebrow">TU RACHA ACTUAL</span><div class="streak-number">${getStreak()} <small>${getStreak() === 1 ? 'día' : 'días'}</small></div><p>${getStreak() ? '¡Un día más acompañándote!' : 'Vuelve mañana para empezar tu racha.'}</p></div></section>
        <section class="card companion-modes"><div class="card-heading"><div><span class="eyebrow">SKY PUEDE ESTAR</span><h2>Contigo de distintas formas</h2></div></div><div class="mode-list"><div>${mascot('curious')}<span>Curioso</span></div><div>${mascot('happy')}<span>Feliz</span></div><div>${mascot('thinking')}<span>Pensativo</span></div><div>${mascot('supporting')}<span>Apoyando</span></div></div></section>
      </aside>
    </div>`;
}

function monthStart(key) { const date = fromDateKey(key); return new Date(date.getFullYear(), date.getMonth(), 1, 12); }
function renderCalendar() {
  const selected = fromDateKey(selectedDate);
  const month = new Date(selected.getFullYear(), selected.getMonth(), 1, 12);
  const firstWeekday = (month.getDay() + 6) % 7;
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const prevCount = new Date(month.getFullYear(), month.getMonth(), 0).getDate();
  const cells = [];
  for (let i = 0; i < 42; i++) {
    let day, cellMonth = month.getMonth(), year = month.getFullYear(), outside = false;
    if (i < firstWeekday) { day = prevCount - firstWeekday + i + 1; outside = true; cellMonth -= 1; if (cellMonth < 0) { cellMonth = 11; year -= 1; } }
    else if (i >= firstWeekday + count) { day = i - firstWeekday - count + 1; outside = true; cellMonth += 1; if (cellMonth > 11) { cellMonth = 0; year += 1; } }
    else day = i - firstWeekday + 1;
    const key = dateKey(new Date(year, cellMonth, day, 12));
    const hasEntries = data.entries.some((entry) => entry.date === key) || Boolean(data.checkins[key]?.mood);
    cells.push(`<button class="calendar-day ${outside ? 'outside' : ''} ${key === selectedDate ? 'selected' : ''} ${key === todayKey() ? 'today' : ''}" type="button" data-date="${key}" aria-label="${escapeHtml(formatDate(key))}${hasEntries ? ', con registros' : ''}" aria-pressed="${key === selectedDate}"><span>${day}</span>${hasEntries ? '<i></i>' : ''}</button>`);
  }
  const weekdays = ['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day) => `<span>${day}</span>`).join('');
  return `<div class="calendar-month-bar"><button class="icon-button" type="button" data-month="-1" aria-label="Mes anterior">${icon('left')}</button><strong>${escapeHtml(new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(month))}</strong><button class="icon-button" type="button" data-month="1" aria-label="Mes siguiente">${icon('right')}</button></div><div class="calendar-weekdays">${weekdays}</div><div class="calendar-grid">${cells.join('')}</div>`;
}
function renderTimeline() {
  const entries = data.entries.filter((entry) => entry.date === selectedDate).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  const checkin = data.checkins[selectedDate];
  const hasRecords = entries.length || checkin?.mood;
  return `<section class="view-page"><header class="page-intro timeline-intro"><div><span class="eyebrow">TU HISTORIA, DÍA A DÍA</span><h1>Timeline</h1><p>Un calendario de lo que viviste y cómo te sentiste.</p></div><button class="primary-button" type="button" data-action="add-entry">${icon('plus')} Añadir registro</button></header><div class="timeline-layout"><section class="card calendar-card">${renderCalendar()}<div class="calendar-legend"><span><i class="legend-dot today-dot"></i>Hoy</span><span><i class="legend-dot record-dot"></i>Día con registro</span></div></section><section class="card selected-day-card"><div class="selected-day-heading"><div><span class="eyebrow">${escapeHtml(formatDate(selectedDate, { weekday: 'long' }))}</span><h2>${escapeHtml(formatDate(selectedDate, { day: 'numeric', month: 'long' }))}</h2></div><button class="icon-button" type="button" data-action="add-entry" aria-label="Añadir registro">${icon('plus')}</button></div>${hasRecords ? `<div class="entry-list">${renderCheckinRow(checkin)}${entries.map(renderEntryRow).join('')}</div>` : `<div class="selected-day-empty"><span class="empty-mini-icon">${icon('sparkle')}</span><h3>Aún no hay registros este día</h3><p>Puedes anotar algo que hiciste, cómo te sentiste o lo que quieras recordar.</p><button class="text-action" type="button" data-action="add-entry">Añadir un momento ${icon('arrow')}</button></div>`}</section></div><section class="card timeline-sky-card">${mascot('thinking')}<div><span class="eyebrow">UN RECORDATORIO AMABLE</span><h2>No todos los días tienen que ser extraordinarios.</h2><p>Un detalle pequeño también merece un lugar en tu historia.</p></div><button class="small-link" type="button" data-action="add-entry">Guardar un momento ${icon('arrow')}</button></section>${entryDialog()}</section>`;
}
function entryDialog() {
  return `<dialog class="form-dialog" id="entryDialog"><form method="dialog" class="dialog-close-row"><button class="icon-button" value="cancel" aria-label="Cerrar">×</button></form><form id="entryForm" class="dialog-form"><span class="eyebrow">UN MOMENTO PARA RECORDAR</span><h2>Añadir al Timeline</h2><label class="field"><span>¿Qué hiciste o qué te gustaría recordar?</span><textarea name="note" rows="3" maxlength="360" required placeholder="Escribe un momento de tu día…"></textarea></label><div class="form-two-col"><label class="field"><span>Fecha</span><input type="date" name="date" value="${selectedDate}" required /></label><label class="field"><span>Actividad</span><select name="activity"><option>Momento del día</option><option>Estudio</option><option>Trabajo</option><option>Entrenamiento</option><option>Descanso</option><option>Familia y amistades</option><option>Otro</option></select></label></div><label class="field"><span>¿Cómo te sentiste?</span><select name="mood"><option value="">Prefiero no decirlo</option>${moodOptions.map((mood) => `<option>${mood.label}</option>`).join('')}</select></label><details class="optional-details"><summary>Añadir datos para tus Insights <span>(opcional)</span></summary><div class="form-two-col"><label class="field"><span>Horas de sueño</span><input name="sleepHours" type="number" min="0" max="24" step="0.5" placeholder="Ej. 7.5" /></label><label class="field"><span>Motivación (1–5)</span><select name="motivation"><option value="">Omitir</option><option value="1">1 · Muy baja</option><option value="2">2 · Baja</option><option value="3">3 · Media</option><option value="4">4 · Alta</option><option value="5">5 · Muy alta</option></select></label><label class="field"><span>¿Cuándo sentiste esa motivación?</span><select name="motivationMoment"><option value="">Omitir</option><option value="morning">Por la mañana</option><option value="afternoon">Por la tarde</option><option value="evening">Por la noche</option></select></label><label class="field"><span>¿Cuándo te costó más empezar?</span><select name="difficultyMoment"><option value="">Omitir</option><option value="morning">Por la mañana</option><option value="afternoon">Por la tarde</option><option value="evening">Por la noche</option><option value="none">No me pasó</option></select></label></div></details><div class="dialog-actions"><button class="secondary-button" type="button" data-action="close-entry">Cancelar</button><button class="primary-button" type="submit">Guardar momento ${icon('check')}</button></div></form></dialog>`;
}

function goalCard(goal) {
  const progress = Math.min(100, Math.max(0, Number(goal.progress) || 0));
  return `<article class="card goal-card"><div class="goal-card-top"><span class="goal-emoji">${escapeHtml(goal.emoji || '✨')}</span><div class="goal-title"><h3>${escapeHtml(goal.title)}</h3>${goal.deadline ? `<small>Para el ${escapeHtml(formatDate(goal.deadline, { day: 'numeric', month: 'short' }))}</small>` : '<small>A tu ritmo</small>'}</div><div class="goal-ring" style="--progress:${progress}%"><span>${progress}%</span></div></div><label class="progress-control"><span>Mi avance</span><input type="range" min="0" max="100" step="5" value="${progress}" data-progress="${escapeHtml(goal.id)}" aria-label="Progreso de ${escapeHtml(goal.title)}" /><output>${progress}%</output></label><div class="goal-actions"><button class="small-link" type="button" data-complete-goal="${escapeHtml(goal.id)}">${icon('check')} ${goal.completed ? 'Reabrir objetivo' : 'Marcar como completado'}</button></div></article>`;
}
function renderGoalSuggestions() {
  return `<section class="suggestions-section"><div class="section-heading"><div><span class="eyebrow">IDEAS PARA EMPEZAR</span><h2>¿Alguna te inspira?</h2></div><span>Son sugerencias, tú decides.</span></div><div class="suggestion-grid">${suggestionGoals.map((goal) => `<article class="card suggestion-card"><span class="suggestion-emoji">${goal.emoji}</span><div><h3>${goal.title}</h3><p>${goal.description}</p></div><button class="icon-button" type="button" data-add-suggestion="${goal.id}" aria-label="Añadir ${goal.title}">${icon('plus')}</button></article>`).join('')}</div></section>`;
}
function renderGoals() {
  const list = data.goals.filter((goal) => Boolean(goal.completed) === (goalFilter === 'completed'));
  return `<section class="view-page"><header class="page-intro goals-intro"><div><span class="eyebrow">PASOS QUE TE ACERCAN A LO QUE QUIERES</span><h1>Mis objetivos</h1><p>Elige tus propios objetivos y avanza sin compararte.</p></div><button class="primary-button" type="button" data-action="add-goal">${icon('plus')} Nuevo objetivo</button></header><div class="goal-tabs" role="tablist"><button class="${goalFilter === 'active' ? 'active' : ''}" type="button" role="tab" aria-selected="${goalFilter === 'active'}" data-goal-filter="active">Activos <span>${data.goals.filter((goal) => !goal.completed).length}</span></button><button class="${goalFilter === 'completed' ? 'active' : ''}" type="button" role="tab" aria-selected="${goalFilter === 'completed'}" data-goal-filter="completed">Completados <span>${data.goals.filter((goal) => goal.completed).length}</span></button></div><div class="goal-list">${list.length ? list.map(goalCard).join('') : `<section class="card goal-empty"><span class="empty-illustration">${icon(goalFilter === 'active' ? 'target' : 'check')}</span><h2>${goalFilter === 'active' ? 'Todavía no hay objetivos activos' : 'Aún no has completado objetivos'}</h2><p>${goalFilter === 'active' ? 'Puedes crear uno propio o añadir una idea de las sugerencias.' : 'Cuando completes un objetivo, lo encontrarás aquí.'}</p>${goalFilter === 'active' ? '<button class="primary-button" type="button" data-action="add-goal">Crear mi primer objetivo</button>' : ''}</section>`}</div>${goalFilter === 'active' ? `<section class="card goal-sky-guide">${mascot('happy')}<div><span class="eyebrow">SKY TE ACOMPAÑA</span><h2>No hace falta cambiarlo todo hoy.</h2><p>Elige un objetivo que de verdad te importe. Después podrás dividirlo en pasos y ajustar el ritmo.</p></div><button class="small-link" type="button" data-view="chat">Pensarlo con SKY ${icon('arrow')}</button></section>${renderGoalSuggestions()}` : ''}${goalDialog()}</section>`;
}
function goalDialog() {
  return `<dialog class="form-dialog" id="goalDialog"><form method="dialog" class="dialog-close-row"><button class="icon-button" value="cancel" aria-label="Cerrar">×</button></form><form id="goalForm" class="dialog-form"><span class="eyebrow">ALGO QUE TE IMPORTA</span><h2>Crear un objetivo</h2><label class="field"><span>Emoji</span><input name="emoji" maxlength="4" value="✨" aria-label="Emoji del objetivo" /></label><label class="field"><span>¿Qué te gustaría conseguir?</span><input name="title" maxlength="80" required placeholder="Ej. Moverme tres veces por semana" /></label><label class="field"><span>Fecha objetivo <small>(opcional)</small></span><input name="deadline" type="date" /></label><div class="dialog-actions"><button class="secondary-button" type="button" data-action="close-goal">Cancelar</button><button class="primary-button" type="submit">Guardar objetivo ${icon('check')}</button></div></form></dialog>`;
}

const momentNames = { morning: 'la mañana', afternoon: 'la tarde', evening: 'la noche' };
function insightTile({ iconName, tone, title, body, evidence }) {
  return `<article class="insight-tile"><span class="insight-icon ${tone}">${icon(iconName)}</span><div><h3>${title}</h3><p>${body}</p>${evidence ? `<small>${evidence}</small>` : ''}</div></article>`;
}
function hasThreeLoggedDays(rows) { return new Set(rows.map((entry) => entry.date)).size >= 3; }
function buildInsights() {
  const sleepEntries = data.entries.filter((entry) => Number.isFinite(Number(entry.sleepHours)) && entry.sleepHours !== '');
  const motivationEntries = data.entries.filter((entry) => Number(entry.motivation) > 0 && entry.motivationMoment);
  const difficultyEntries = data.entries.filter((entry) => ['morning', 'afternoon', 'evening'].includes(entry.difficultyMoment));
  let sleep = { iconName: 'moon', tone: 'blue', title: 'Tu descanso', body: 'Aún faltan registros de sueño para observar un patrón.', evidence: `${new Set(sleepEntries.map((entry) => entry.date)).size} de 3 días con registros` };
  if (hasThreeLoggedDays(sleepEntries)) {
    const average = sleepEntries.reduce((sum, entry) => sum + Number(entry.sleepHours), 0) / sleepEntries.length;
    const body = average < 6 ? `En tus ${sleepEntries.length} registros dormiste menos de 6 horas de media.` : `En tus ${sleepEntries.length} registros dormiste ${average.toFixed(1).replace('.', ',')} horas de media.`;
    sleep = { ...sleep, body, evidence: 'Basado en las horas de sueño que anotaste.' };
  }
  let motivation = { iconName: 'sun', tone: 'amber', title: 'Tu motivación', body: 'Cuando registres tu motivación, veremos en qué momentos suele ser más alta.', evidence: `${new Set(motivationEntries.map((entry) => entry.date)).size} de 3 días con registros` };
  if (hasThreeLoggedDays(motivationEntries)) {
    const groups = Object.entries(momentNames).map(([moment, label]) => {
      const rows = motivationEntries.filter((entry) => entry.motivationMoment === moment);
      return { moment, label, rows, avg: rows.reduce((sum, entry) => sum + Number(entry.motivation), 0) / (rows.length || 1) };
    }).filter((group) => hasThreeLoggedDays(group.rows)).sort((a, b) => b.avg - a.avg);
    if (groups[0]) {
      const top = groups[0];
      motivation = { ...motivation, body: top.avg >= 4 ? `Tu motivación suele ser más alta por ${top.label}.` : `Has registrado una motivación media de ${top.avg.toFixed(1).replace('.', ',')} por ${top.label}.`, evidence: `Basado en ${top.rows.length} registros.` };
    }
  }
  let difficulty = { iconName: 'chart', tone: 'violet', title: 'Cuándo cuesta empezar', body: 'Si anotas cuándo te cuesta arrancar, buscaremos patrones con cuidado.', evidence: `${new Set(difficultyEntries.map((entry) => entry.date)).size} de 3 días con registros` };
  if (hasThreeLoggedDays(difficultyEntries)) {
    const counts = Object.entries(momentNames).map(([moment, label]) => ({ moment, label, days: new Set(difficultyEntries.filter((entry) => entry.difficultyMoment === moment).map((entry) => entry.date)).size })).sort((a, b) => b.days - a.days);
    const distinctDays = new Set(difficultyEntries.filter((entry) => entry.difficultyMoment === counts[0]?.moment).map((entry) => entry.date)).size;
    if (distinctDays >= 3) difficulty = { ...difficulty, body: `En tus registros, la ${counts[0].label} aparece como el momento más difícil para empezar.`, evidence: `Lo anotaste en ${distinctDays} días diferentes.` };
    else difficulty = { ...difficulty, body: 'Todavía no se repite un momento concreto. Seguiremos observando.', evidence: `Basado en ${difficultyEntries.length} registros.` };
  }
  return [sleep, motivation, difficulty];
}
function renderInsights() {
  const streak = getStreak();
  return `<section class="view-page"><header class="page-intro"><span class="eyebrow">REFLEXIONES BASADAS EN TI</span><h1>Insights</h1><p>Patrones que podrían ayudarte a conocerte mejor.</p></header><section class="card insights-card"><div class="section-heading"><div><span class="eyebrow">POCO A POCO</span><h2>Patrones que estamos observando</h2></div><span>Solo a partir de tus registros</span></div><div class="insight-list">${buildInsights().map(insightTile).join('')}</div></section><section class="card streak-wide"><div class="streak-icon">${icon('fire')}</div><div><span class="eyebrow">TU RACHA ACTUAL</span><h2>${streak} ${streak === 1 ? 'día' : 'días'} <span>${streak ? 'seguidos usando SKY' : 'por ahora'}</span></h2><p>${streak ? 'Cada visita cuenta como un día de tu camino.' : 'Vuelve mañana para empezar tu racha.'} Esta racha se guarda en este dispositivo.</p></div><div class="streak-dots">${Array.from({ length: 7 }, (_, index) => `<i class="${index < Math.min(streak, 7) ? 'filled' : ''}"></i>`).join('')}</div></section><section class="card insight-sky-note">${mascot('thinking')}<div><span class="eyebrow">CON CALMA Y SIN JUICIOS</span><h2>Los patrones son pistas, no etiquetas.</h2><p>SKY te los muestra para que decidas si encajan contigo.</p></div></section><p class="insights-note">SKY no saca conclusiones a partir de un solo día. Puedes revisar o borrar tus registros desde el Timeline.</p></section>`;
}

function renderChat() {
  return `<section class="view-page"><header class="page-intro"><span class="eyebrow">UN ESPACIO SEGURO</span><h1>Chat con SKY</h1><p>Una conversación tranquila, a tu ritmo.</p></header><div class="chat-layout"><section class="card chat-panel"><div class="chat-title"><span class="mascot-mini">${mascot('curious')}</span><div><h2>SKY</h2><small>Tu compañero está aquí</small></div></div><div class="chat-content"><div>${mascot('supporting', 'chat-welcome-mascot')}<h2>¿Qué te gustaría compartir?</h2><p>Cuando conectemos la IA, podrás conversar con SKY aquí. Todavía no hay mensajes en esta conversación.</p></div></div><form class="chat-composer" id="chatForm"><input id="chatInput" type="text" placeholder="Escribe un mensaje…" aria-label="Mensaje para SKY" /><button class="send-button" type="submit" aria-label="Enviar mensaje">${icon('arrow')}</button></form></section><aside class="card chat-aside"><h3>Tu espacio es tuyo</h3><p>Tú decides qué compartir, qué guardar como recuerdo y qué borrar.</p><div class="privacy-note">${icon('lock')}<span>Diseñado para acompañarte con cuidado.</span></div></aside></div></section>`;
}
function renderProfile() {
  const profile = data.profile || {};
  return `<section class="view-page"><header class="page-intro"><span class="eyebrow">TU ESPACIO, TUS DECISIONES</span><h1>Perfil</h1><p>La información de esta primera versión se guarda solo en este navegador.</p></header><div class="profile-layout"><section class="card profile-card"><div class="profile-hero"><span class="profile-avatar large">${icon('user')}</span><div><span class="eyebrow">TE LLAMAMOS</span><h2>${escapeHtml(profile.name || 'Tu nombre')}</h2></div></div><dl class="profile-details"><dt>Lo que te gustaría lograr</dt><dd>${escapeHtml(profile.goal || 'Aún no lo has añadido')}</dd><dt>Lo que puede frenarte</dt><dd>${escapeHtml(profile.blocker || 'Aún no lo has añadido')}</dd><dt>Lo que quieres que SKY recuerde</dt><dd>${escapeHtml(profile.remember || 'Aún no lo has añadido')}</dd></dl><button class="secondary-button" type="button" data-action="edit-profile">Editar mi perfil</button></section><section class="card mascot-profile"><span class="eyebrow">SIEMPRE SKY</span><h2>Curioso, feliz, pensativo y apoyando.</h2><p>La mascota te acompaña con el mismo diseño y cambia su expresión según el momento.</p>${mascot('happy')}</section></div></section>`;
}

function renderView(view) {
  stopBreathing();
  currentView = sectionLabels[view] ? view : 'home';
  if (currentView === 'home') viewRoot.innerHTML = renderHome();
  else if (currentView === 'timeline') viewRoot.innerHTML = renderTimeline();
  else if (currentView === 'goals') viewRoot.innerHTML = renderGoals();
  else if (currentView === 'insights') viewRoot.innerHTML = renderInsights();
  else if (currentView === 'chat') viewRoot.innerHTML = renderChat();
  else viewRoot.innerHTML = renderProfile();
  document.querySelector('#topbarSection').textContent = sectionLabels[currentView];
  document.querySelectorAll('[data-view]').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.view === currentView);
    if (button.matches('.nav-item, .mobile-nav-item')) button.setAttribute('aria-current', button.dataset.view === currentView ? 'page' : 'false');
  });
  sidebar.classList.remove('is-open');
  document.querySelector('#skyBuddyPanel').hidden = true;
  document.querySelector('#skyBuddyToggle').setAttribute('aria-expanded', 'false');
}

function stopBreathing() {
  if (breathInterval) clearInterval(breathInterval);
  breathInterval = null;
}
function startBreathing() {
  const button = document.querySelector('#breathButton');
  const guide = document.querySelector('#breathGuide');
  const phaseLabel = document.querySelector('#breathPhase');
  const countLabel = document.querySelector('#breathCount');
  if (!button || !guide || !phaseLabel || !countLabel) return;
  stopBreathing();
  let elapsed = 0;
  button.textContent = 'Terminar pausa';
  button.dataset.action = 'stop-breath';
  guide.classList.add('is-active');
  const tick = () => {
    const remaining = Math.max(0, 60 - elapsed);
    countLabel.textContent = `${remaining}s`;
    const phase = elapsed % 14;
    if (phase < 4) { phaseLabel.textContent = 'Inhala'; guide.dataset.phase = 'inhale'; }
    else if (phase < 8) { phaseLabel.textContent = 'Mantén'; guide.dataset.phase = 'hold'; }
    else { phaseLabel.textContent = 'Suelta'; guide.dataset.phase = 'exhale'; }
    if (remaining === 0) {
      stopBreathing(); guide.classList.remove('is-active'); delete guide.dataset.phase;
      button.textContent = 'Empezar pausa'; button.dataset.action = 'start-breath';
      phaseLabel.textContent = 'Bien hecho'; countLabel.textContent = '♡';
      showToast('Gracias por regalarte este minuto.');
      return;
    }
    elapsed += 1;
  };
  tick(); breathInterval = setInterval(tick, 1000);
}

function openDialog(id) {
  const dialog = document.getElementById(id);
  if (dialog?.showModal) dialog.showModal();
}
function closeDialog(id) { document.getElementById(id)?.close(); }
function addSuggestion(id) {
  const suggestion = suggestionGoals.find((goal) => goal.id === id);
  if (!suggestion) return;
  if (data.goals.some((goal) => goal.suggestionId === id && !goal.completed)) { showToast('Esa idea ya está entre tus objetivos.'); return; }
  data.goals.push({ id: uid(), suggestionId: id, emoji: suggestion.emoji, title: suggestion.title, progress: 0, completed: false, createdAt: todayKey() });
  saveData(); renderView('goals'); showToast('Idea añadida a tus objetivos.');
}
function moveMonth(delta) {
  const current = fromDateKey(selectedDate);
  const target = new Date(current.getFullYear(), current.getMonth() + delta, Math.min(current.getDate(), new Date(current.getFullYear(), current.getMonth() + delta + 1, 0).getDate()), 12);
  selectedDate = dateKey(target); renderView('timeline');
}

document.addEventListener('click', (event) => {
  const onboardButton = event.target.closest('[data-onboard]');
  if (onboardButton) {
    const action = onboardButton.dataset.onboard;
    if (action === 'next') renderOnboarding(1);
    if (action === 'back') renderOnboarding(0);
    if (action === 'finish') {
      data.profile = { ...onboardingDraft, onboardingComplete: true, createdAt: todayKey() };
      saveData(); enterApp();
    }
    return;
  }
  const viewButton = event.target.closest('[data-view]');
  if (viewButton) { event.preventDefault(); renderView(viewButton.dataset.view); return; }
  if (event.target.closest('#skyBuddyToggle')) {
    const panel = document.querySelector('#skyBuddyPanel');
    const opening = panel.hidden;
    panel.hidden = !opening;
    document.querySelector('#skyBuddyToggle').setAttribute('aria-expanded', String(opening));
    return;
  }
  if (event.target.closest('#skyBuddyClose')) {
    document.querySelector('#skyBuddyPanel').hidden = true;
    document.querySelector('#skyBuddyToggle').setAttribute('aria-expanded', 'false');
    return;
  }
  const actionButton = event.target.closest('[data-action]');
  if (actionButton) {
    const action = actionButton.dataset.action;
    if (action === 'add-entry') { if (currentView !== 'timeline') { selectedDate = todayKey(); renderView('timeline'); } requestAnimationFrame(() => openDialog('entryDialog')); }
    if (action === 'close-entry') closeDialog('entryDialog');
    if (action === 'add-goal') openDialog('goalDialog');
    if (action === 'close-goal') closeDialog('goalDialog');
    if (action === 'edit-profile') { onboardingDraft = { ...data.profile }; renderOnboarding(1); }
    if (action === 'start-breath') startBreathing();
    if (action === 'stop-breath') {
      stopBreathing(); const guide = document.querySelector('#breathGuide');
      guide?.classList.remove('is-active'); if (guide) delete guide.dataset.phase;
      const button = document.querySelector('#breathButton');
      if (button) { button.textContent = 'Empezar pausa'; button.dataset.action = 'start-breath'; }
      const phase = document.querySelector('#breathPhase'); const count = document.querySelector('#breathCount');
      if (phase) phase.textContent = 'A tu ritmo'; if (count) count.textContent = '60';
    }
    return;
  }
  const moodButton = event.target.closest('[data-mood]');
  if (moodButton) {
    data.checkins[todayKey()] = { mood: moodButton.dataset.mood, date: todayKey() };
    saveData(); renderView('home'); showToast('Tu estado de hoy se guardó en este dispositivo.'); return;
  }
  const dayButton = event.target.closest('[data-date]');
  if (dayButton) { selectedDate = dayButton.dataset.date; renderView('timeline'); return; }
  const weekDayButton = event.target.closest('[data-week-date]');
  if (weekDayButton) { selectedDate = weekDayButton.dataset.weekDate; renderView('timeline'); return; }
  const monthButton = event.target.closest('[data-month]');
  if (monthButton) { moveMonth(Number(monthButton.dataset.month)); return; }
  const filterButton = event.target.closest('[data-goal-filter]');
  if (filterButton) { goalFilter = filterButton.dataset.goalFilter; renderView('goals'); return; }
  const suggestionButton = event.target.closest('[data-add-suggestion]');
  if (suggestionButton) { addSuggestion(suggestionButton.dataset.addSuggestion); return; }
  const completeButton = event.target.closest('[data-complete-goal]');
  if (completeButton) {
    const goal = data.goals.find((item) => item.id === completeButton.dataset.completeGoal);
    if (goal) { goal.completed = !goal.completed; if (goal.completed) goal.progress = 100; saveData(); renderView('goals'); showToast(goal.completed ? 'Objetivo completado. ¡Bien hecho!' : 'Objetivo reabierto.'); }
    return;
  }
  if (event.target.closest('#menuButton')) { sidebar.classList.toggle('is-open'); return; }
});

document.addEventListener('input', (event) => {
  const slider = event.target.closest('[data-progress]');
  if (!slider) return;
  const output = slider.parentElement.querySelector('output');
  const ring = slider.closest('.goal-card')?.querySelector('.goal-ring');
  if (output) output.value = `${slider.value}%`;
  if (ring) { ring.style.setProperty('--progress', `${slider.value}%`); ring.querySelector('span').textContent = `${slider.value}%`; }
});
document.addEventListener('change', (event) => {
  const slider = event.target.closest('[data-progress]');
  if (!slider) return;
  const goal = data.goals.find((item) => item.id === slider.dataset.progress);
  if (goal) { goal.progress = Number(slider.value); saveData(); showToast('Progreso actualizado.'); }
});

document.addEventListener('submit', (event) => {
  if (event.target.id === 'onboardingForm') {
    event.preventDefault();
    const form = new FormData(event.target);
    onboardingDraft = { name: String(form.get('name') || '').trim(), goal: String(form.get('goal') || '').trim(), blocker: String(form.get('blocker') || '').trim(), remember: String(form.get('remember') || '').trim() };
    if (!onboardingDraft.name) return;
    renderOnboarding(2); return;
  }
  if (event.target.id === 'entryForm') {
    event.preventDefault();
    const form = new FormData(event.target);
    const date = String(form.get('date') || todayKey());
    const note = String(form.get('note') || '').trim();
    if (!note) return;
    const now = new Date();
    data.entries.push({ id: uid(), date, time: date === todayKey() ? now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '', emoji: ({ Estudio: '📘', Trabajo: '💼', Entrenamiento: '🏃', Descanso: '🌙', 'Familia y amistades': '💛', Otro: '✨' })[String(form.get('activity'))] || '✦', activity: String(form.get('activity') || 'Momento del día'), note, mood: String(form.get('mood') || ''), sleepHours: String(form.get('sleepHours') || ''), motivation: String(form.get('motivation') || ''), motivationMoment: String(form.get('motivationMoment') || ''), difficultyMoment: String(form.get('difficultyMoment') || '') });
    saveData(); closeDialog('entryDialog'); selectedDate = date; renderView(currentView); showToast('Momento guardado en tu Timeline.'); return;
  }
  if (event.target.id === 'goalForm') {
    event.preventDefault();
    const form = new FormData(event.target);
    const title = String(form.get('title') || '').trim();
    if (!title) return;
    data.goals.push({ id: uid(), emoji: String(form.get('emoji') || '✨').trim() || '✨', title, deadline: String(form.get('deadline') || ''), progress: 0, completed: false, createdAt: todayKey() });
    saveData(); closeDialog('goalDialog'); renderView('goals'); showToast('Objetivo creado. Puedes ir actualizando tu avance.'); return;
  }
  if (event.target.id === 'chatForm') {
    event.preventDefault();
    const input = document.querySelector('#chatInput');
    if (input.value.trim()) showToast('La conversación con IA estará disponible al conectar SKY.');
    input.value = ''; return;
  }
});

if (data.profile?.onboardingComplete) enterApp();
else renderOnboarding(0);

