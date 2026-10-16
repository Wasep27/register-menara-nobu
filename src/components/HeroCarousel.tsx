import { useEffect, useState } from "react";

type Slide = { src: string; alt: string };

export function HeroCarousel({ slides, interval = 5000 }: { slides: Slide[]; interval?: number }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (paused || reduce) return;
    const t = setInterval(() => setI((v) => (v + 1) % slides.length), interval);
    return () => clearInterval(t);
  }, [paused, interval, slides.length]);

  return (
    <div
      className="relative aspect-[4/3] w-full overflow-hidden rounded-[2rem] shadow-soft"
      role="region"
      aria-roledescription="carousel"
      aria-label="Foto Menara Nobu"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {slides.map((s, idx) => (
        <img
          key={s.src}
          src={s.src}
          alt={s.alt}
          aria-hidden={idx !== i}
          loading={idx === 0 ? "eager" : "lazy"}
          width={1200}
          height={900}
          className={`absolute inset-0 h-full w-full object-cover transition-all duration-[1200ms] ease-out ${idx === i ? "scale-100 opacity-100" : "scale-110 opacity-0"}`}
        />
      ))}
      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-foreground/40 to-transparent" />
      <div className="absolute bottom-4 right-4 flex gap-2">
        {slides.map((s, idx) => (
          <button
            key={s.src}
            type="button"
            onClick={() => setI(idx)}
            aria-label={`Tampilkan foto ${idx + 1}`}
            aria-current={idx === i}
            className={`h-2.5 rounded-full bg-card transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${idx === i ? "w-7 opacity-100" : "w-2.5 opacity-60 hover:opacity-90"}`}
          />
        ))}
      </div>
    </div>
  );
}
