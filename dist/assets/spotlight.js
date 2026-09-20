// Vanilla adaptation of Preet Suthar's Spotlight Card, retrieved via 21st MCP.
// https://21st.dev/@preetsuthar17/components/spotlight-card
(() => {
  const card = document.querySelector('.profile-card');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = matchMedia('(hover: hover) and (pointer: fine)');
  card.addEventListener('pointermove', event => {
    if (reduced.matches || !pointer.matches) return;
    const rect = card.getBoundingClientRect();
    card.style.setProperty('--spot-x', `${event.clientX - rect.left}px`);
    card.style.setProperty('--spot-y', `${event.clientY - rect.top}px`);
  });
  card.addEventListener('pointerleave', () => {
    card.style.removeProperty('--spot-x');
    card.style.removeProperty('--spot-y');
  });
})();
