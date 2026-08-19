// Shared Tailwind design tokens. Loaded after the Tailwind CDN script,
// before the DOM is scanned, so every page uses the same palette
// instead of repeating hex values.
if (typeof tailwind === 'undefined') {
  console.warn('Tailwind CDN gagal dimuat — periksa koneksi internet.');
} else {
tailwind.config = {
  theme: {
    extend: {
      colors: {
        forest: '#234233',
        ivory: '#FBFBF9',
        charcoal: '#1E211F',
        muted: '#6E736F',
        line: '#E5E3DE',
        surface: '#F4F3EF',
      },
      fontFamily: {
        serif: ['Playfair Display', 'Georgia', 'serif'],
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
    },
  },
};
}
