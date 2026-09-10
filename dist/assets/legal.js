(() => {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  // Each glass surface receives the same wallpaper crop as the scene behind it.
  // Blur is applied to that actual canvas element, independently of backdrop-filter.
  const background = document.getElementById("wallpaper");
  const surfaces = [...document.querySelectorAll(".glass-texture")];
  const ctx = background.getContext("2d", { alpha: false });
  const layers = surfaces.map((canvas) => ({
    canvas,
    ctx: canvas.getContext("2d", { alpha: false }),
  }));
  const button = document.getElementById("motion");
  if (!ctx || layers.some((layer) => !layer.ctx)) {
    button.hidden = true;
    return;
  }
  const picture = new Image();
  let loaded = false,
    paused = reduced.matches,
    clock = 0,
    last = 0,
    frame = 0,
    lastPaint = 0,
    geometry = [];
  function measure() {
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    const bw = Math.round(innerWidth * dpr),
      bh = Math.round(innerHeight * dpr);
    if (background.width !== bw) background.width = bw;
    if (background.height !== bh) background.height = bh;
    geometry = layers.map((layer) => {
      const box = layer.canvas.getBoundingClientRect();
      // Low-resolution glass textures make the frosting soft and inexpensive.
      const cw = Math.ceil(box.width * 0.75),
        ch = Math.ceil(box.height * 0.75);
      if (layer.canvas.width !== cw) layer.canvas.width = cw;
      if (layer.canvas.height !== ch) layer.canvas.height = ch;
      return {
        left: box.left,
        top: box.top,
        width: box.width,
        height: box.height,
      };
    });
    // Repaint in this same task: setting canvas dimensions clears its bitmap.
    if (loaded) {
      cancelAnimationFrame(frame);
      frame = 0;
      paint(performance.now(), true);
    }
  }
  function drawImage(context, width, height, left, top, viewWidth, viewHeight) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = "#0b192b";
    context.fillRect(0, 0, width, height);
    context.setTransform(
      width / viewWidth,
      0,
      0,
      height / viewHeight,
      (-left * width) / viewWidth,
      (-top * height) / viewHeight,
    );
    const scale =
      Math.max(
        innerWidth / picture.naturalWidth,
        innerHeight / picture.naturalHeight,
      ) * 1.1;
    const w = picture.naturalWidth * scale,
      h = picture.naturalHeight * scale;
    const dx = Math.sin(clock * 0.12) * innerWidth * 0.015,
      dy = Math.sin(clock * 0.09) * innerHeight * 0.012;
    context.drawImage(
      picture,
      (innerWidth - w) * 0.5 + dx,
      (innerHeight - h) * 0.5 + dy,
      w,
      h,
    );
  }
  function paint(now, force = false) {
    frame = 0;
    if (!loaded || document.hidden) return;
    if (!force && !paused && now - lastPaint < 32) {
      frame = requestAnimationFrame(paint);
      return;
    }
    if (!paused && last) clock += Math.min((now - last) / 1000, 0.1);
    last = now;
    lastPaint = now;
    drawImage(
      ctx,
      background.width,
      background.height,
      0,
      0,
      innerWidth,
      innerHeight,
    );
    layers.forEach((layer, i) => {
      const g = geometry[i];
      if (g)
        drawImage(
          layer.ctx,
          layer.canvas.width,
          layer.canvas.height,
          g.left,
          g.top,
          g.width,
          g.height,
        );
    });
    if (!paused) frame = requestAnimationFrame(paint);
  }
  function refresh() {
    if (!frame) frame = requestAnimationFrame(paint);
  }
  function label() {
    button.querySelector(".motion-label").textContent = paused
      ? "Play motion"
      : "Pause motion";
    button.querySelector(".motion-icon").textContent = paused ? "▷" : "Ⅱ";
    button.setAttribute(
      "aria-label",
      paused ? "Play background animation" : "Pause background animation",
    );
    button.setAttribute("aria-pressed", String(paused));
  }
  button.addEventListener("click", () => {
    paused = !paused;
    last = 0;
    label();
    refresh();
  });
  reduced.addEventListener("change", () => {
    paused = reduced.matches;
    last = 0;
    label();
    refresh();
  });
  document.addEventListener("visibilitychange", () => {
    last = 0;
    if (document.hidden) {
      cancelAnimationFrame(frame);
      frame = 0;
    } else refresh();
  });
  addEventListener("resize", measure);
  addEventListener("scroll", measure, { passive: true });
  new ResizeObserver(measure).observe(document.querySelector("main"));
  if (document.fonts) document.fonts.ready.then(measure);
  picture.onload = () => {
    loaded = true;
    measure();
    label();
  };
  picture.onerror = () => {
    background.hidden = true;
    surfaces.forEach((canvas) => (canvas.hidden = true));
    button.hidden = true;
  };
  picture.src = "/assets/background.jpg";
  label();
})();
