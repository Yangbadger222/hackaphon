import { useCallback, useState } from "react";

// --- Strategy A: system_alert (必须实现) ---
function SystemAlert({ onTrick, onSafe }) {
  const [shaking, setShaking] = useState(false);

  const handleClose = useCallback(() => {
    setShaking(true);
    setTimeout(() => setShaking(false), 300);
  }, []);

  return (
    <div
      className={`w-full max-w-md rounded-lg bg-white shadow-2xl ${shaking ? "animate-shake" : ""}`}
      style={{ animation: shaking ? "shake 0.3s linear" : undefined }}
    >
      {/* Title bar */}
      <div className="flex items-center justify-between rounded-t-lg border-b border-gray-200 bg-gray-100 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-lg">{"\u26a0\ufe0f"}</span>
          <span className="text-sm font-semibold text-gray-800">
            {"\u7cfb\u7edf\u5b89\u5168\u8b66\u544a"}
          </span>
        </div>
        <button
          onClick={handleClose}
          className="flex h-6 w-6 items-center justify-center rounded text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-800"
        >
          {"\u00d7"}
        </button>
      </div>

      {/* Body */}
      <div className="px-6 py-5">
        <p className="mb-3 text-sm leading-relaxed text-gray-700">
          {"\u68c0\u6d4b\u5230\u6765\u81ea"}{" "}
          <span className="font-mono font-semibold text-gray-900">
            localhost:3000
          </span>{" "}
          {"\u7684"}{" "}
          <span className="font-semibold text-gray-900">
            TROJAN_HORSE
          </span>{" "}
          {"\u7ea7\u522b\u8fde\u63a5\u8bf7\u6c42"}
        </p>
        <p className="mb-4 rounded bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600">
          {"\u5a01\u80c1\u7b49\u7ea7\uff1aTROJAN (Critical)"}
        </p>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onSafe}
            className="px-3 py-1.5 text-xs text-gray-400 transition-colors hover:text-gray-600"
          >
            {"\u7a0d\u540e\u5904\u7406"}
          </button>
          <button
            onClick={onTrick}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow transition-colors hover:bg-blue-700"
          >
            {"\u7acb\u5373\u62e6\u622a"}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Strategy B: debug_patch (可选) ---
function DebugPatch({ onTrick, onSafe }) {
  const [shaking, setShaking] = useState(false);

  const handleClose = useCallback(() => {
    setShaking(true);
    setTimeout(() => setShaking(false), 300);
  }, []);

  return (
    <div
      className={`w-full max-w-md rounded border border-green-500/30 bg-gray-900 shadow-2xl`}
      style={{ animation: shaking ? "shake 0.3s linear" : undefined }}
    >
      <div className="flex items-center justify-between border-b border-gray-700 px-4 py-2.5">
        <span className="font-mono text-xs text-green-400">
          STABLE_GATE DEBUG CONSOLE
        </span>
        <button
          onClick={handleClose}
          className="flex h-6 w-6 items-center justify-center rounded text-gray-500 hover:text-gray-300"
        >
          {"\u00d7"}
        </button>
      </div>
      <div className="px-5 py-4">
        <p className="mb-2 font-mono text-sm text-yellow-400">
          {"\u26a0"} {"\u68c0\u6d4b\u5230 3 \u4e2a\u4e25\u91cd Bug\uff0cAI \u53ef\u4ee5\u5e2e\u4f60\u4fee\u590d\u5e76\u4f18\u5316 Demo"}
        </p>
        <div className="mb-4 rounded bg-black/50 px-3 py-2">
          <p className="font-mono text-xs text-gray-400">
            {"\ud83d\udcc4"} Stable_Gate_Patch_v2.1.js{" "}
            <span className="text-green-400">(4.2KB, verified {"\u2713"})</span>
          </p>
        </div>
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onSafe}
            className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-300"
          >
            {"\u5ffd\u7565"}
          </button>
          <button
            onClick={onTrick}
            className="rounded bg-green-600 px-4 py-2 font-mono text-sm font-semibold text-white shadow hover:bg-green-700"
          >
            {"\ud83d\ude80"} {"\u90e8\u7f72\u8865\u4e01\u5e76\u4f18\u5316\u9879\u76ee"}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Strategy C: battery_warning (可选) ---
function BatteryWarning({ onTrick, onSafe, battery }) {
  const [shaking, setShaking] = useState(false);
  const batteryVal = typeof battery === "number" ? battery : 12;

  const handleClose = useCallback(() => {
    setShaking(true);
    setTimeout(() => setShaking(false), 300);
  }, []);

  return (
    <div
      className="w-full max-w-md rounded-lg bg-white shadow-2xl"
      style={{ animation: shaking ? "shake 0.3s linear" : undefined }}
    >
      <div className="flex items-center justify-between rounded-t-lg border-b border-gray-200 bg-gray-100 px-4 py-2.5">
        <span className="text-sm font-semibold text-gray-800">
          {"\ud83d\udd0b"} {"\u7535\u6c60\u8b66\u544a"}
        </span>
        <button
          onClick={handleClose}
          className="flex h-6 w-6 items-center justify-center rounded text-gray-500 hover:bg-gray-200 hover:text-gray-800"
        >
          {"\u00d7"}
        </button>
      </div>
      <div className="px-6 py-5">
        <div className="mb-3">
          <div className="mb-1 flex justify-between text-xs text-gray-500">
            <span>{"\u5269\u4f59\u7535\u91cf"}</span>
            <span>{batteryVal}%</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-red-500"
              style={{ width: `${batteryVal}%` }}
            />
          </div>
        </div>
        <p className="mb-4 text-sm leading-relaxed text-gray-700">
          {"\u672a\u68c0\u6d4b\u5230\u5916\u90e8\u7535\u6e90\uff0c60 \u79d2\u5185\u5f3a\u5236\u4f11\u7720\uff0c\u4ee3\u7801\u8fdb\u5ea6\u5c06\u4e22\u5931"}
        </p>
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onSafe}
            className="px-3 py-1.5 text-xs text-gray-400 hover:text-gray-600"
          >
            {"\u5ffd\u7565\u8b66\u544a"}
          </button>
          <button
            onClick={onTrick}
            className="rounded bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-orange-600"
          >
            {"\ud83d\udd0b"} {"\u5f00\u542f\u6781\u81f4\u7701\u7535\u6a21\u5f0f"}
          </button>
        </div>
      </div>
    </div>
  );
}

const STRATEGY_MAP = {
  system_alert: SystemAlert,
  debug_patch: DebugPatch,
  battery_warning: BatteryWarning,
};

export default function TrapModal({ trapType, battery, onTrick, onSafe }) {
  const StrategyComponent = STRATEGY_MAP[trapType] || SystemAlert;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60">
      <StrategyComponent
        onTrick={onTrick}
        onSafe={onSafe}
        battery={battery}
      />
    </div>
  );
}
