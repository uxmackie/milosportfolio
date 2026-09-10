(() => {
  const panel = document.getElementById("tiktok-panel"),
    status = document.getElementById("tiktok-status");
  const refresh = document.getElementById("tiktok-refresh"),
    empty = document.getElementById("tiktok-empty");
  const videoSection = document.getElementById("tiktok-video"),
    player = document.getElementById("tt-player");
  let data = null,
    busy = false,
    lastAttempt = 0,
    timer = 0,
    visible = false,
    videoId = "";
  const compact = new Intl.NumberFormat(undefined, {
    notation: "compact",
    maximumFractionDigits: 1,
  });
  const full = new Intl.NumberFormat();
  function number(id, value) {
    const el = document.getElementById(id);
    el.textContent = Number.isFinite(value) ? compact.format(value) : "—";
    el.title = Number.isFinite(value) ? full.format(value) : "Unavailable";
  }
  function layout() {
    if (visible) window.dispatchEvent(new Event("portfolio:content"));
  }
  function pause() {
    player
      .querySelector("iframe")
      ?.contentWindow.postMessage(
        { "x-tiktok-player": true, type: "pause" },
        "https://www.tiktok.com",
      );
  }
  function render(result) {
    data = result;
    document.getElementById("tiktok-name").textContent =
      result.name || "On TikTok";
    number("tt-followers", result.followers);
    number("tt-likes", result.likes);
    number("tt-videos", result.videos);
    const date = new Date(result.updatedAt);
    status.textContent =
      (result.stale ? "Updates delayed · last fetched " : "Updated ") +
      (Number.isNaN(date.valueOf())
        ? "recently"
        : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    const video = result.video;
    if (video && /^\d{1,30}$/.test(video.id)) {
      videoSection.hidden = false;
      empty.hidden = true;
      if (videoId !== video.id || !player.firstElementChild) {
        videoId = video.id;
        const iframe = document.createElement("iframe");
        iframe.title = "Latest TikTok video";
        iframe.allow = "fullscreen";
        iframe.allowFullscreen = true;
        iframe.loading = "lazy";
        iframe.src = `https://www.tiktok.com/player/v1/${video.id}?autoplay=0&description=0&rel=0`;
        player.replaceChildren(iframe);
      }
      document.getElementById("tt-caption").textContent = video.caption || "";
      const posted = Number.isFinite(video.postedAt)
        ? new Date(video.postedAt * 1000)
        : null;
      document.getElementById("tt-date").textContent =
        posted && !Number.isNaN(posted.valueOf())
          ? posted.toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : "";
      if (posted && !Number.isNaN(posted.valueOf()))
        document.getElementById("tt-date").dateTime = posted.toISOString();
      number("tt-video-likes", video.likes);
      number("tt-comments", video.comments);
      number("tt-views", video.views);
      number("tt-shares", video.shares);
      const link = document.getElementById("tt-open");
      link.href = `https://www.tiktok.com/player/v1/${video.id}`;
      try {
        const url = new URL(video.watchUrl);
        if (
          url.protocol === "https:" &&
          (url.hostname === "tiktok.com" ||
            url.hostname.endsWith(".tiktok.com"))
        )
          link.href = url.href;
      } catch {}
    } else {
      videoSection.hidden = true;
      player.replaceChildren();
      videoId = "";
      empty.hidden = false;
      empty.textContent =
        result.videoStatus === "unavailable"
          ? "The latest video is temporarily unavailable."
          : "No public videos to show yet.";
    }
    layout();
  }
  function failure(code) {
    if (["not_connected", "reconnect_required"].includes(code)) {
      data = null;
      videoId = "";
      player.replaceChildren();
      videoSection.hidden = true;
      for (const id of ["tt-followers", "tt-likes", "tt-videos"])
        number(id, null);
    }
    if (data) {
      status.textContent = "Updates delayed · showing the last fetched counts.";
      return;
    }
    status.textContent =
      code === "not_connected"
        ? "TikTok isn’t connected yet."
        : code === "reconnect_required"
          ? "TikTok needs to be reconnected."
          : "TikTok is temporarily unavailable.";
    empty.hidden = false;
    empty.textContent =
      code === "not_connected"
        ? "Followers, likes, and the latest video will appear here once connected."
        : "Please check back in a little while.";
    layout();
  }
  async function load() {
    if (busy || !visible || document.hidden || Date.now() - lastAttempt < 15000)
      return;
    busy = true;
    refresh.disabled = true;
    lastAttempt = Date.now();
    if (!data) status.textContent = "Fetching TikTok…";
    try {
      const response = await fetch("/api/tiktok", {
        cache: "no-store",
        signal: AbortSignal.timeout(12000),
      });
      // The static Sites preview cannot execute a Vercel Function.
      if (response.status === 404) {
        failure("not_connected");
        return;
      }
      const body = await response.json();
      if (!response.ok || body.status !== "connected") {
        failure(body.status);
        return;
      }
      render(body);
    } catch {
      failure("unavailable");
    } finally {
      busy = false;
      refresh.disabled = false;
    }
  }
  function schedule() {
    clearInterval(timer);
    if (visible && !document.hidden) {
      load();
      timer = setInterval(load, 60000);
    } else pause();
  }
  refresh.addEventListener("click", load);
  document.addEventListener("DOMContentLoaded", () => {
    if (new URLSearchParams(location.search).get("tab") === "tiktok")
      document.getElementById("tiktok-tab").click();
  });
  window.addEventListener("portfolio:tab", (event) => {
    visible = event.detail === "tiktok";
    schedule();
  });
  document.addEventListener("visibilitychange", schedule);
  window.addEventListener("message", (event) => {
    if (
      event.origin !== "https://www.tiktok.com" ||
      event.source !== player.querySelector("iframe")?.contentWindow
    )
      return;
    if (
      event.data?.["x-tiktok-player"] &&
      event.data.type === "onPlayerError"
    ) {
      status.textContent =
        "The embedded player is unavailable. Use “Watch on TikTok” below.";
    }
  });
})();
