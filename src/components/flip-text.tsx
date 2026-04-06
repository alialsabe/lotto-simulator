"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const SCENARIOS = [
  "die in a plane crash",
  "be struck by lightning",
  "be attacked by a shark",
  "be bitten by a venomous spider",
  "die from a vending machine tipping",
  "get hit by an asteroid",
];

export function FlipScenarioText() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % SCENARIOS.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="relative inline-block">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={SCENARIOS[index]}
          className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff2040] to-[#ff6090] inline-block"
          initial={{ rotateX: -90, opacity: 0, position: "absolute", top: 0, left: 0, right: 0 }}
          animate={{ rotateX: 0, opacity: 1, position: "relative" }}
          exit={{ rotateX: 90, opacity: 0, position: "absolute", top: 0, left: 0, right: 0 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          style={{ backfaceVisibility: "hidden", transformPerspective: 400 }}
        >
          {SCENARIOS[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
