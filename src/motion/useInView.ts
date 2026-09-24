import { useEffect, useState, type RefObject } from 'react';

/**
 * True once the element has entered the viewport (and, with `once: false`,
 * whenever it is in it). A single IntersectionObserver per element; nothing
 * listens to scroll.
 */
export function useInView(
  ref: RefObject<Element | null>,
  { rootMargin = '0px 0px -12% 0px', once = true, threshold = 0 } = {},
): boolean {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) io.disconnect();
        } else if (!once) setInView(false);
      },
      { rootMargin, threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, rootMargin, once, threshold]);
  return inView;
}
