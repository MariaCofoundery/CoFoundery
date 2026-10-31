const GRADIENTS = [
  "linear-gradient(135deg, #6d49e0, #0a80b8)",
  "linear-gradient(135deg, #0a80b8, #2a9d6f)",
  "linear-gradient(135deg, #d9622b, #c8438b)",
  "linear-gradient(135deg, #7a4fe0, #c8438b)",
  "linear-gradient(135deg, #2a9d6f, #0a80b8)",
];

/** Initial des Teams oder der Person auf einer ruhigen Farbflaeche. Die Farbe folgt dem Namen, sie sagt nichts ueber das Team. */
export function TeamAvatar({ name, size = 40 }: { name: string; size?: number }) {
  const label = name.trim() || "?";
  const index = [...label].reduce((sum, char) => sum + char.charCodeAt(0), 0) % GRADIENTS.length;
  return (
    <span
      aria-hidden="true"
      className="grid shrink-0 place-items-center rounded-xl font-bold text-white"
      style={{ width: size, height: size, background: GRADIENTS[index], fontSize: size * 0.4 }}
    >
      {label.slice(0, 1).toUpperCase()}
    </span>
  );
}
