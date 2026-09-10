import "@testing-library/jest-dom";

// jsdom has no ResizeObserver. Components that measure their own layout
// (e.g. TabGroup's canvas-height measurement) construct one unconditionally;
// without this stub every such test throws `ResizeObserver is not defined`
// at render time. The stub is inert — jsdom never fires resize callbacks —
// so effects relying on a live callback should also react to `window`
// "resize" or measure synchronously on mount, not depend on this firing.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).ResizeObserver = ResizeObserverStub;

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
