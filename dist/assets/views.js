(() => {
  const label = document.getElementById('view-count');
  // One request per document load. Tab changes and backgrounding do not add views.
  fetch('/api/views', { method: 'POST', signal: AbortSignal.timeout(8000) })
    .then(async response => {
      if (!response.ok) throw new Error('unavailable');
      const { views } = await response.json();
      if (!Number.isSafeInteger(views) || views < 0) throw new Error('invalid_count');
      label.textContent = `${new Intl.NumberFormat().format(views)} ${views === 1 ? 'view' : 'views'}`;
    })
    .catch(() => { label.textContent = 'Views unavailable'; });
})();
