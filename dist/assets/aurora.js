(() => {
  const background = document.querySelector('.aurora-background');
  const button = document.querySelector('.aurora-toggle');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = false;
  function sync() {
    background.dataset.paused = String(paused || reduced.matches || document.hidden);
    button.disabled = reduced.matches;
    button.setAttribute('aria-pressed', String(paused || reduced.matches));
    button.textContent = reduced.matches ? 'Motion reduced' : paused ? 'Resume aurora' : 'Pause aurora';
    button.setAttribute('aria-label', reduced.matches ? 'Aurora animation disabled by reduced-motion preference' : paused ? 'Resume aurora animation' : 'Pause aurora animation');
  }
  button.addEventListener('click', () => { paused = !paused; sync(); });
  reduced.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  sync();
})();
