module.exports = {
  content: ['./*.html', './kelola/*.html', './js/**/*.js'],
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
