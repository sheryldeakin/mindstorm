import { useEffect, useState } from "react";
import { motion } from "framer-motion";

type MindfulAvatarProps = {
  state: "idle" | "listening" | "focused";
  scale?: number;
};

const MindfulAvatar = ({ state, scale = 1 }: MindfulAvatarProps) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMove = (event: MouseEvent) => {
      const x = (event.clientX / window.innerWidth) * 2 - 1;
      const y = (event.clientY / window.innerHeight) * 2 - 1;
      setMousePos({ x, y });
    };
    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  const eyeX = mousePos.x * 3;
  const eyeY = mousePos.y * 3;

  return (
    <motion.div
      className="relative flex items-center justify-center"
      animate={{ scale }}
      transition={{ type: "spring", stiffness: 200, damping: 18 }}
    >
      <motion.div
        className="absolute inset-0 rounded-full bg-brandLight/30 blur-xl"
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      <svg width="120" height="120" viewBox="0 0 120 120" className="drop-shadow-xl">
        <motion.circle
          cx="60"
          cy="60"
          r="58"
          fill="white"
          stroke="#e2e8f0"
          strokeWidth="2"
          animate={{
            fill: state === "focused" ? "#f8fafc" : "#ffffff",
            stroke: state === "focused" ? "#cbd5e1" : "#e2e8f0",
          }}
        />
        <g transform="translate(60, 50)">
          <motion.circle
            cx={-20 + eyeX}
            cy={eyeY}
            r="6"
            fill="#1e293b"
            animate={{ scaleY: [1, 0.1, 1, 1, 1] }}
            transition={{ duration: 3, times: [0, 0.05, 0.1, 0.8, 1], repeat: Infinity }}
          />
          <motion.circle
            cx={20 + eyeX}
            cy={eyeY}
            r="6"
            fill="#1e293b"
            animate={{ scaleY: [1, 0.1, 1, 1, 1] }}
            transition={{ duration: 3, times: [0, 0.05, 0.1, 0.8, 1], repeat: Infinity }}
          />
        </g>
        <motion.path
          d="M 50 75 Q 60 70 70 75"
          fill="none"
          stroke="#475569"
          strokeWidth="3"
          strokeLinecap="round"
          animate={{
            d:
              state === "listening"
                ? "M 45 75 Q 60 85 75 75"
                : "M 50 75 Q 60 70 70 75",
          }}
          transition={{ type: "spring", stiffness: 140, damping: 16 }}
        />
      </svg>
    </motion.div>
  );
};

export default MindfulAvatar;
