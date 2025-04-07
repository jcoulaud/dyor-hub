import { RefObject, useEffect } from 'react';

interface UseIntersectionObserverProps {
  target: RefObject<Element | null>;
  onIntersect: () => void;
  threshold?: number;
  rootMargin?: string;
  enabled?: boolean;
}

export function useIntersectionObserver({
  target,
  onIntersect,
  threshold = 1.0,
  rootMargin = '0px',
  enabled = true,
}: UseIntersectionObserverProps): void {
  useEffect(() => {
    if (!enabled || !target.current) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        // Check if the target element is intersecting
        if (entries[0]?.isIntersecting) {
          onIntersect();
        }
      },
      {
        rootMargin,
        threshold,
      },
    );

    const currentTarget = target.current;

    if (currentTarget) {
      observer.observe(currentTarget);
    }

    // Cleanup function
    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [target, onIntersect, threshold, rootMargin, enabled]);
}
