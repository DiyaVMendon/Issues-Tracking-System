export default function AssetIcon({ src, size = 16, className = "" }) {
  const mask = `url("${src}") center / contain no-repeat`;

  return (
    <span
      aria-hidden="true"
      className={className}
      style={{
        display: "inline-block",
        width: size,
        height: size,
        flex: `0 0 ${size}px`,
        backgroundColor: "currentColor",
        mask,
        WebkitMask: mask,
      }}
    />
  );
}
