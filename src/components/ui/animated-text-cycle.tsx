import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface AnimatedTextCycleProps {
  words: string[];
  interval?: number;
  className?: string;
}

export default function AnimatedTextCycle({
  words,
  interval = 3600,
  className = "",
}: AnimatedTextCycleProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [width, setWidth] = useState("auto");
  const measureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (measureRef.current) {
      const maxWidth = Array.from(measureRef.current.children).reduce((max, el) => {
        const width = (el as HTMLElement).getBoundingClientRect().width;
        return Math.max(max, width);
      }, 0);
      if (maxWidth > 0) setWidth(`${Math.ceil(maxWidth)}px`);
    }
  }, [words]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % words.length);
    }, interval);
    return () => clearInterval(timer);
  }, [interval, words.length]);

  return (
    <>
      <div
        ref={measureRef}
        aria-hidden="true"
        className="absolute opacity-0 pointer-events-none"
        style={{ visibility: "hidden", whiteSpace: "nowrap" }}
      >
        {words.map((word, i) => (
          <span key={i} className={`font-black ${className}`}>
            {word}
          </span>
        ))}
      </div>

      <span
        className="relative inline-flex items-center justify-start align-baseline overflow-hidden text-left"
        style={{ width, minHeight: "1.25em" }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={currentIndex}
            className={`absolute left-0 top-1/2 inline-block -translate-y-1/2 font-black text-left ${className}`}
            initial={{ rotateX: 90, opacity: 0 }}
            animate={{ rotateX: 0, opacity: 1, transition: { duration: 0.55 } }}
            exit={{ rotateX: -90, opacity: 0, transition: { duration: 0.45 } }}
            style={{ whiteSpace: "nowrap", transformStyle: "preserve-3d", transformOrigin: "center center" }}
          >
            {words[currentIndex]}
          </motion.span>
        </AnimatePresence>
      </span>
    </>
  );
}
