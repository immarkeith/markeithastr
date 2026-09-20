import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * A see-through arrow in the bottom-left corner that jumps back to the top of
 * the page. It only appears once there is something to scroll back up to.
 */
export function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 240);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      type="button"
      aria-label="Back to top"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className={`fixed bottom-5 left-4 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-border/40 bg-background/25 text-foreground/70 backdrop-blur-sm transition-opacity duration-200 hover:bg-background/50 hover:text-foreground ${
        visible ? "opacity-60 hover:opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}
