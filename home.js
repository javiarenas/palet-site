// Las capturas cambian cuando tú quieres: se pueden leer con calma.
const slides = document.querySelectorAll("#carousel .slide");
const dots = document.querySelectorAll("#dots .dot");
const dotControls = document.querySelector("#dots");

if (slides.length && dotControls) {
  dotControls.hidden = false;
  dots.forEach((dot) => {
    dot.addEventListener("click", () => {
      const selected = Number(dot.dataset.i);
      slides.forEach((slide, index) => {
        slide.classList.toggle("active", index === selected);
        slide.setAttribute("aria-hidden", String(index !== selected));
      });
      dots.forEach((control, index) => {
        control.classList.toggle("active", index === selected);
        control.setAttribute("aria-pressed", String(index === selected));
      });
    });
  });
}

const video = document.querySelector(".reel video");
const videoToggle = document.querySelector(".reel-toggle");

if (video && videoToggle) {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let userPaused = false;
  let inView = false;

  const updateLabel = () => {
    videoToggle.textContent = video.paused ? "Reproducir vídeo" : "Pausar vídeo";
  };
  const play = () => video.play().catch(updateLabel);
  const syncPlayback = () => {
    if (inView && !document.hidden && !reducedMotion.matches && !userPaused) {
      play();
    } else {
      video.pause();
    }
  };

  videoToggle.hidden = false;
  video.controls = false;
  video.addEventListener("play", updateLabel);
  video.addEventListener("pause", updateLabel);
  videoToggle.addEventListener("click", () => {
    if (video.paused) {
      userPaused = false;
      play();
    } else {
      userPaused = true;
      video.pause();
    }
  });
  reducedMotion.addEventListener("change", syncPlayback);
  document.addEventListener("visibilitychange", syncPlayback);

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      syncPlayback();
    }, { threshold: 0.1 }).observe(video);
  }
  updateLabel();
}
