import { useCallback, useEffect, useRef } from "react";

/**
 * Preloads an audio file and returns a play function.
 * - `interrupt: true` (default): stops previous playback before playing again.
 * - Returns { play, stop }
 */
export default function useSound(src, { volume = 1, interrupt = true } = {}) {
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = new Audio(src);
    audio.volume = volume;
    audio.preload = "auto";
    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.src = "";
    };
  }, [src, volume]);

  const play = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (interrupt) {
      audio.pause();
      audio.currentTime = 0;
    }
    audio.play().catch(() => {});
  }, [interrupt]);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
  }, []);

  return { play, stop };
}
