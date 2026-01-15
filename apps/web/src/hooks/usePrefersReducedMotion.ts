import { useEffect, useState } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

const usePrefersReducedMotion = () => {
  const [prefers, setPrefers] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(QUERY);
    setPrefers(mediaQuery.matches);

    const handler = () => setPrefers(mediaQuery.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  return prefers;
};

export default usePrefersReducedMotion;
