const labels = { home: 'Inicio', journal: 'Diario', goals: 'Objetivos', insights: 'Insights', chat: 'Chat con SKY', profile: 'Perfil' };
const viewRoot = document.querySelector('#viewRoot');
const sidebar = document.querySelector('#sidebar');
const toast = document.querySelector('#toast');
let toastTimer;

const icon = (name, extra = '') => `<svg class="icon ${extra}" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
const mascot = () => document.querySelector('#mascotTemplate').innerHTML;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2800);
}

function dashboard() {
  return `
    <section class="welcome-row" aria-labelledby="welcomeTitle">
      <div class="welcome-copy"><h1 id="welcomeTitle">Buenos días <span aria-hidden="true">☀️</span></h1><p>¿Qué te gustaría cuidar hoy?</p></div>
      <div class="today-chip">${icon('sun')} <span id="todayLabel"></span></div>
    </section>
    <div class="dashboard-grid">
      <div class="primary-column">
        <section class="card mood-card" aria-labelledby="moodTitle">
          <div class="card-heading"><div><h2 id="moodTitle">¿Cómo te sientes hoy?</h2><p>Haz una pausa. No hay respuesta correcta.</p></div><span class="quiet-note">Solo para ti</span></div>
          <div class="mood-options" role="group" aria-label="Elige cómo te sientes">
            <button class="mood-option" type="button" aria-pressed="false" data-mood="Bien"><span class="mood-face">${icon('face')}</span><span>Bien</span></button>
            <button class="mood-option" type="button" aria-pressed="false" data-mood="Con energía"><span class="mood-face">${icon('sparkle')}</span><span>Con energía</span></button>
            <button class="mood-option" type="button" aria-pressed="false" data-mood="En calma"><span class="mood-face">${icon('sun')}</span><span>En calma</span></button>
            <button class="mood-option" type="button" aria-pressed="false" data-mood="Necesito apoyo"><span class="mood-face">${icon('chat')}</span><span>Necesito apoyo</span></button>
          </div>
        </section>

        <section class="card daily-card" aria-labelledby="dailyTitle">
          <div class="daily-copy"><span class="eyebrow">UN PASO A LA VEZ</span><h2 id="dailyTitle">Tu camino empieza con lo que importa hoy.</h2><p>Escribe, conversa o define una meta pequeña. SKY te acompaña sin juzgar.</p><button class="text-action" type="button" data-view="chat">Hablar con SKY ${icon('arrow')}</button></div>
          ${mascot()}
        </section>

        <div class="section-heading"><h2>Tu espacio, a tu ritmo</h2><span>Sin presión. Sin prisa.</span></div>
        <div class="quick-grid">
          <article class="card quick-card"><div class="quick-card-head"><span class="quick-icon">${icon('book')}</span><h3>Diario</h3></div><p class="empty-copy">Todavía no hay entradas. Cuando quieras, puedes empezar por cómo ha sido tu día.</p><button class="small-link" type="button" data-view="journal">Escribir la primera ${icon('arrow')}</button></article>
          <article class="card quick-card"><div class="quick-card-head"><span class="quick-icon">${icon('target')}</span><h3>Objetivos</h3></div><p class="empty-copy">Aún no has creado objetivos. Elige algo pequeño que te gustaría conseguir.</p><button class="small-link" type="button" data-view="goals">Ver mis objetivos ${icon('arrow')}</button></article>
        </div>
      </div>

      <aside class="secondary-column" aria-label="Acompañamiento">
        <section class="card companion-card"><span class="eyebrow">AQUÍ CONTIGO</span><h2>Un espacio para pensar en voz alta.</h2><p>Cuéntame lo que tienes en mente. Podemos empezar por donde quieras.</p><button class="primary-button" type="button" data-view="chat">Empezar conversación ${icon('arrow')}</button><span class="bubble" aria-hidden="true"></span>${mascot()}</section>
        <section class="card next-step"><div class="card-heading"><span class="step-kicker">${icon('sparkle')} Tu primer paso</span></div><h3>¿Qué te gustaría cambiar?</h3><p>No hace falta tenerlo todo claro. Podemos descubrirlo juntos.</p><button class="small-link" type="button" data-view="goals">Explorar objetivos ${icon('arrow')}</button></section>
      </aside>
    </div>`;
}

const emptyViews = {
  journal: { eyebrow: 'TU DIARIO', title: 'Un lugar para escucharte.', copy: 'Tus entradas aparecerán aquí cuando decidas escribir. Puedes empezar con una frase, una idea o simplemente cómo te sientes.', icon: 'book', action: 'Empezar a escribir' },
  goals: { eyebrow: 'TUS OBJETIVOS', title: 'Lo importante empieza pequeño.', copy: 'Todavía no has añadido objetivos. Cuando tengas uno en mente, SKY te ayudará a convertirlo en pasos que encajen contigo.', icon: 'target', action: 'Pensar en un objetivo' },
  insights: { eyebrow: 'TUS INSIGHTS', title: 'Primero, te escuchamos.', copy: 'Aquí aparecerán reflexiones basadas en tus propias conversaciones y entradas. No mostraremos patrones hasta tener datos reales.', icon: 'chart', action: 'Volver a tu espacio' },
  profile: { eyebrow: 'TU PERFIL', title: 'Tu espacio, tus decisiones.', copy: 'Más adelante podrás gestionar tus preferencias, privacidad y datos desde aquí.', icon: 'user', action: 'Volver a tu espacio' },
};

function emptyPage(view) {
  const item = emptyViews[view];
  const actionView = view === 'insights' || view === 'profile' ? 'home' : 'chat';
  return `<section class="view-page"><header class="page-intro"><span class="eyebrow">${item.eyebrow}</span><h1>${item.title}</h1><p>${labels[view]} está aquí para ti, cuando lo necesites.</p></header><div class="card empty-page-card"><div><span class="empty-illustration">${icon(item.icon)}</span><h2>Este espacio está empezando</h2><p>${item.copy}</p><button class="primary-button" type="button" data-view="${actionView}">${item.action} ${icon('arrow')}</button></div>${mascot()}</div></section>`;
}

function chatPage() {
  return `<section class="view-page"><header class="page-intro"><span class="eyebrow">CONVERSACIÓN</span><h1>Hola, soy SKY.</h1><p>Estoy aquí para escucharte y ayudarte a ordenar tus ideas.</p></header><div class="chat-layout"><section class="card chat-panel" aria-label="Conversación con SKY"><div class="chat-title"><span class="mascot-mini">${mascot()}</span><div><h2>Chat con SKY</h2><small>Un espacio tranquilo y sin juicios</small></div></div><div class="chat-content"><div><span class="empty-illustration">${icon('sparkle')}</span><h2>¿Por dónde te gustaría empezar?</h2><p>La conversación estará disponible cuando conectemos el servicio de IA. Tu espacio aún no tiene mensajes.</p></div></div><form class="chat-composer" id="chatForm"><input id="chatInput" type="text" placeholder="Escribe aquí cuando SKY esté conectado…" aria-label="Mensaje para SKY" /><button class="send-button" type="submit" aria-label="Enviar mensaje">${icon('arrow')}</button></form></section><aside class="card chat-aside"><h3>Tu espacio es tuyo</h3><p>Las conversaciones y recuerdos deberían estar siempre bajo tu control.</p><div class="privacy-note">${icon('lock')}<span>Diseñado para acompañarte con cuidado.</span></div></aside></div></section>`;
}

function setDate() {
  const target = document.querySelector('#todayLabel');
  if (!target) return;
  target.textContent = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
}

function setActiveView(view) {
  const known = ['home', ...Object.keys(emptyViews), 'chat'];
  const next = known.includes(view) ? view : 'home';
  viewRoot.innerHTML = next === 'home' ? dashboard() : next === 'chat' ? chatPage() : emptyPage(next);
  document.querySelector('#topbarSection').textContent = labels[next];
  document.querySelectorAll('[data-view]').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.view === next);
    if (button.matches('[role="tab"], .nav-item, .mobile-nav-item')) button.setAttribute('aria-current', button.dataset.view === next ? 'page' : 'false');
  });
  sidebar.classList.remove('is-open');
  setDate();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.addEventListener('click', (event) => {
  const viewButton = event.target.closest('[data-view]');
  if (viewButton) {
    event.preventDefault();
    setActiveView(viewButton.dataset.view);
    return;
  }
  const moodButton = event.target.closest('[data-mood]');
  if (moodButton) {
    document.querySelectorAll('[data-mood]').forEach((button) => button.setAttribute('aria-pressed', String(button === moodButton)));
    showToast(`Anotado para este momento: ${moodButton.dataset.mood.toLowerCase()}.`);
  }
});

document.querySelector('#menuButton').addEventListener('click', () => sidebar.classList.toggle('is-open'));
document.addEventListener('submit', (event) => {
  if (event.target.id !== 'chatForm') return;
  event.preventDefault();
  showToast('La conexión de SKY todavía no está activada.');
  document.querySelector('#chatInput').value = '';
});

setActiveView('home');

