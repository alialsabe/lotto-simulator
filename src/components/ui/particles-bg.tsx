"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    particlesJS: (id: string, config: object) => void;
    pJSDom: { pJS: { fn: { vendors: { destroypJS: () => void } } } }[];
  }
}

export function ParticlesBackground() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Load particles.js
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/particles.js/2.0.0/particles.min.js";
    script.async = true;

    script.onload = () => {
      if (!containerRef.current) return;

      // @ts-ignore — particlesJS is loaded dynamically
      if (window.pJSDom?.length > 0) {
        // @ts-ignore
        window.pJSDom.forEach((p: { pJS: { fn: { vendors: { destroypJS: () => void } } } }) =>
          p.pJS.fn.vendors.destroypJS(),
        );
        // @ts-ignore
        window.pJSDom = [];
      }

      // Black and gray — muted, professional
      // @ts-ignore
      window.particlesJS("particles-js", {
        particles: {
          number: { value: 60, density: { enable: true, value_area: 800 } },
          color: { value: "#3a3a5a" },
          shape: { 
            type: ["edge", "circle"],
            stroke: { width: 1, color: "#3a3a5a" } 
          },
          opacity: {
            value: 0.2,
            random: true,
          },
          size: {
            value: 12,
            random: true,
          },
          line_linked: {
            enable: true,
            distance: 150,
            color: "#6b6b8a",
            opacity: 0.2,
            width: 1,
          },
          move: {
            enable: true,
            speed: 0.8,
            random: true,
            out_mode: "bounce",
          },
        },
        interactivity: {
          detect_on: "canvas",
          events: {
            onhover: { enable: true, mode: "grab" },
            onclick: { enable: false, mode: "push" },
            resize: true,
          },
          modes: {
            grab: { distance: 200, line_linked: { opacity: 0.6 } },
            repulse: { distance: 150, duration: 0.4 },
          },
        },
        retina_detect: true,
      });
    };

    document.body.appendChild(script);

    return () => {
      const s = document.body.querySelector("script[src*='particles.js']");
      if (s) document.body.removeChild(s);
      // @ts-ignore
      if (window.pJSDom?.length > 0) {
        // @ts-ignore
        window.pJSDom.forEach((p: { pJS: { fn: { vendors: { destroypJS: () => void } } } }) =>
          p.pJS.fn.vendors.destroypJS(),
        );
        // @ts-ignore
        window.pJSDom = [];
      }
    };
  }, []);

  return (
    <div
      id="particles-js"
      ref={containerRef}
      className="absolute inset-0 z-0 pointer-events-none"
      style={{ background: "#0a0a0a" }}
    />
  );
}
