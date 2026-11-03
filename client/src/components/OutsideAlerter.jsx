import { useEffect, useRef } from "react";

export default function OutsideAlerter({
  children,
  className,
  enabled,
  ignoreSelector,
  onOutsideClick,
}) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!enabled) return undefined;

    const handlePointerDown = (event) => {
      const container = containerRef.current;
      if (!container || container.contains(event.target)) return;
      if (
        ignoreSelector &&
        event.target instanceof Element &&
        event.target.closest(ignoreSelector)
      ) {
        return;
      }
      onOutsideClick();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [enabled, ignoreSelector, onOutsideClick]);

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}
