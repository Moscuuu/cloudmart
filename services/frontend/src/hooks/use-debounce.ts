import { useState, useEffect } from 'react';

/**
 * Returns a debounced version of the provided value.
 * Updates after the specified delay (default 300ms).
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
