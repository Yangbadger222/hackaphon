import { useEffect, useState } from "react";

const FALLBACK_ENV = {
  battery: "ERR_BUS_READ_FAILURE",
  charging: "UNKNOWN_POWER_STATE",
  timezone: "UTC_OFFSET_UNRESOLVED",
  language: "LOCALE_ACCESS_DENIED",
  platform: "PLATFORM_OBFUSCATED",
  connectionType: "NET_INTERFACE_CLOAKED",
};

function buildInitialSnapshot() {
  const now = new Date();

  return {
    battery: FALLBACK_ENV.battery,
    charging: FALLBACK_ENV.charging,
    localTime: now.toLocaleTimeString("en-GB", { hour12: false }),
    timezone: FALLBACK_ENV.timezone,
    hour: now.getHours(),
    screenWidth: typeof window !== "undefined" ? window.screen?.width ?? 0 : 0,
    screenHeight:
      typeof window !== "undefined" ? window.screen?.height ?? 0 : 0,
    language:
      typeof navigator !== "undefined"
        ? navigator.language || FALLBACK_ENV.language
        : FALLBACK_ENV.language,
    platform:
      typeof navigator !== "undefined"
        ? navigator.platform || FALLBACK_ENV.platform
        : FALLBACK_ENV.platform,
    userAgent:
      typeof navigator !== "undefined" ? navigator.userAgent : "UNKNOWN_AGENT",
    connectionType: FALLBACK_ENV.connectionType,
  };
}

export default function useEnvSensor() {
  const [env, setEnv] = useState(() => buildInitialSnapshot());

  useEffect(() => {
    let isMounted = true;

    async function collectEnv() {
      const nextEnv = buildInitialSnapshot();

      try {
        if (typeof navigator?.getBattery === "function") {
          const batteryManager = await navigator.getBattery();
          nextEnv.battery = Math.round(batteryManager.level * 100);
          nextEnv.charging = batteryManager.charging;
        }
      } catch {
        nextEnv.battery = FALLBACK_ENV.battery;
        nextEnv.charging = FALLBACK_ENV.charging;
      }

      try {
        nextEnv.localTime = new Date().toLocaleTimeString("en-GB", {
          hour12: false,
        });
      } catch {
        nextEnv.localTime = buildInitialSnapshot().localTime;
      }

      try {
        nextEnv.timezone =
          Intl.DateTimeFormat().resolvedOptions().timeZone ||
          FALLBACK_ENV.timezone;
      } catch {
        nextEnv.timezone = FALLBACK_ENV.timezone;
      }

      try {
        nextEnv.hour = new Date().getHours();
      } catch {
        nextEnv.hour = 0;
      }

      try {
        nextEnv.screenWidth = window.screen.width;
        nextEnv.screenHeight = window.screen.height;
      } catch {
        nextEnv.screenWidth = 0;
        nextEnv.screenHeight = 0;
      }

      try {
        nextEnv.userAgent = navigator.userAgent;
      } catch {
        nextEnv.userAgent = "UNKNOWN_AGENT";
      }

      try {
        nextEnv.language = navigator.language || FALLBACK_ENV.language;
      } catch {
        nextEnv.language = FALLBACK_ENV.language;
      }

      try {
        nextEnv.platform = navigator.platform || FALLBACK_ENV.platform;
      } catch {
        nextEnv.platform = FALLBACK_ENV.platform;
      }

      try {
        nextEnv.connectionType =
          navigator.connection?.effectiveType || FALLBACK_ENV.connectionType;
      } catch {
        nextEnv.connectionType = FALLBACK_ENV.connectionType;
      }

      if (isMounted) {
        setEnv(nextEnv);
      }
    }

    collectEnv();

    return () => {
      isMounted = false;
    };
  }, []);

  return env;
}
