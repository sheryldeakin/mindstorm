import { motion } from "framer-motion";

type MindstormFigureProps = {
  layoutId?: string;
};

const MindstormFigure = ({ layoutId = "brain-container" }: MindstormFigureProps) => {
  return (
    <svg width="220" height="360" viewBox="0 0 220 360" className="drop-shadow-sm">
      <motion.circle
        layoutId={layoutId}
        cx="110"
        cy="72"
        r="40"
        className="fill-white stroke-slate-200 stroke-2"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.path
        d="M 110 120 C 95 140 90 175 90 215 C 90 260 130 260 130 215 C 130 175 125 140 110 120 Z"
        fill="#e2e8f0"
        className="fill-slate-200/80"
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.path
        d="M 110 160 C 70 185 52 220 46 250"
        fill="none"
        stroke="#cbd5e1"
        strokeWidth="6"
        strokeLinecap="round"
        animate={{ rotate: [-2, 2, -2] }}
        style={{ transformOrigin: "110px 180px" }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.path
        d="M 110 160 C 150 185 168 220 174 250"
        fill="none"
        stroke="#cbd5e1"
        strokeWidth="6"
        strokeLinecap="round"
        animate={{ rotate: [2, -2, 2] }}
        style={{ transformOrigin: "110px 180px" }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.path
        d="M 78 250 C 90 285 120 305 150 308"
        fill="none"
        stroke="#cbd5e1"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <motion.path
        d="M 142 250 C 130 285 100 305 70 308"
        fill="none"
        stroke="#cbd5e1"
        strokeWidth="6"
        strokeLinecap="round"
      />

      <motion.ellipse
        cx="110"
        cy="314"
        rx="70"
        ry="16"
        fill="#e2e8f0"
        animate={{ scaleX: [1, 1.03, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
    </svg>
  );
};

export default MindstormFigure;
