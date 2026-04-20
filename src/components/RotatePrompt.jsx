export default function RotatePrompt() {
  return (
    <section className="fixed inset-0 z-[99999] flex min-h-screen flex-col items-center justify-center bg-black">
      <div className="mb-6 text-6xl" style={{
        animation: "rotatePhone 2s ease-in-out infinite",
      }}>
        <span role="img" aria-label="rotate phone">
          {"📱"}
        </span>
      </div>
      <p className="font-mono text-lg text-green-400 mb-2">
        {"\u8bf7\u65cb\u8f6c\u624b\u673a"}
      </p>
      <p className="font-mono text-sm text-green-400/60">
        {"\u6a2a\u5c4f\u4ee5\u5f00\u59cb\u6e38\u620f"}
      </p>
      <style>{`
        @keyframes rotatePhone {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(90deg); }
        }
      `}</style>
    </section>
  );
}
