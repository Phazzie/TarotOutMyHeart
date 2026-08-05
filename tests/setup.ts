/**
 * Vitest setup file for global browser mocks (URL.createObjectURL, URL.revokeObjectURL).
 */
if (typeof window !== 'undefined') {
  if (!window.URL.createObjectURL) {
    window.URL.createObjectURL = () => `blob:mock-url-${Math.random()}`;
  }
  if (!window.URL.revokeObjectURL) {
    window.URL.revokeObjectURL = () => {};
  }
}
