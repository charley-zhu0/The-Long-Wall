export const isTouchDevice = () =>
  typeof window !== 'undefined' &&
  (navigator.maxTouchPoints > 0 || 'ontouchstart' in window)
