import { useEffect, useState } from "react";

export default function useDeviceDetect() {
  const [state, setState] = useState(() => {
    const ua = navigator.userAgent;
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) ||
      navigator.maxTouchPoints > 1 ||
      window.matchMedia("(pointer: coarse)").matches;
    const isLandscape = window.innerWidth > window.innerHeight;
    return {
      isMobile,
      isLandscape,
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
    };
  });

  useEffect(() => {
    const update = () => {
      setState((prev) => {
        const isLandscape = window.innerWidth > window.innerHeight;
        const w = window.innerWidth;
        const h = window.innerHeight;
        if (prev.isLandscape === isLandscape && prev.screenWidth === w && prev.screenHeight === h) return prev;
        return { ...prev, isLandscape, screenWidth: w, screenHeight: h };
      });
    };

    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", () => {
      // Small delay for orientation change to settle
      setTimeout(update, 100);
    });

    // Try to lock landscape on mobile
    if (state.isMobile && screen.orientation?.lock) {
      screen.orientation.lock("landscape").catch(() => {});
    }

    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, [state.isMobile]);

  return state;
}
