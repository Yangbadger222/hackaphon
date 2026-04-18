import { useEffect, useState } from "react";

export default function useTypewriter(
  text = "",
  speed = 40,
  startImmediately = true,
) {
  const [displayed, setDisplayed] = useState(startImmediately ? "" : "");
  const [isComplete, setIsComplete] = useState(text.length === 0);

  useEffect(() => {
    if (!startImmediately) {
      setDisplayed("");
      setIsComplete(text.length === 0);
      return undefined;
    }

    if (!text) {
      setDisplayed("");
      setIsComplete(true);
      return undefined;
    }

    const intervalDelay = Math.max(1, speed);
    let index = 0;

    setDisplayed("");
    setIsComplete(false);

    const intervalId = window.setInterval(() => {
      index += 1;
      setDisplayed(text.slice(0, index));

      if (index >= text.length) {
        window.clearInterval(intervalId);
        setIsComplete(true);
      }
    }, intervalDelay);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [speed, startImmediately, text]);

  return { displayed, isComplete };
}
