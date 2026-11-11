import { useEffect, useState } from "react";

const images = [
  "/wp/piqsels.com-id-zogvt.jpg",
  "/wp/wallpaperflare.com_wallpaper.jpg",
  "/wp/wallpaperflare.com_wallpaper%20(1).jpg",
  "/wp/wallpaperflare.com_wallpaper%20(2).jpg",
];

export function StageBackdrop() {
  const [active, setActive] = useState(0);
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (reducedMotion?.matches) return;
    let timer: number | undefined;
    let next = 0;
    const rotate = () => {
      if (document.hidden) return;
      next = (next + 1) % images.length;
      const image = new Image();
      image.src = images[next]!;
      void image.decode().then(() => {
        setVisible((current) => 1 - current);
        setActive(next);
      }).catch(() => {});
    };
    const schedule = () => {
      window.clearInterval(timer);
      if (!document.hidden) timer = window.setInterval(rotate, 14_000);
    };
    document.addEventListener("visibilitychange", schedule);
    schedule();
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", schedule);
    };
  }, []);

  return <div className="cress-backdrop" aria-hidden="true">
    {[0, 1].map((slot) => <img key={slot} src={images[slot === visible ? active : (active + images.length - 1) % images.length]} data-active={slot === visible ? "true" : "false"} alt="" />)}
  </div>;
}
