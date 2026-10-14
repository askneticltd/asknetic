/** Tailwind 3.4.17 config, compiled to assets/css/site.css by `npm run build:css`.
 *  These are the design tokens every page previously passed to the Tailwind Play CDN.
 *  services.html used to declare slightly different values; see DEPLOYMENT.md ("Design tokens").
 */
module.exports = {
  content: ['./*.html', './assets/js/**/*.js'],
  theme: {
    extend: {
      colors: {
        ink: '#181411',
        inksoft: '#645A52',
        paper: '#FFFFFF',
        cream: '#FBF7F1',
        flame: '#E17A2E',
        flame2: '#F4A05C',
        flamedeep: '#B85A18', // button backgrounds under white text (4.65:1) and large orange text
        flameink: '#A4501A',  // small orange text on light backgrounds (at least 4.85:1 on every light background used)
        navy: '#211C18',
        navysoft: '#352D27',
        dark: '#11100F',
      },
      fontFamily: {
        display: ['Outfit', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 20px 50px -20px rgba(24,20,17,0.25)',
        card: '0 10px 30px -10px rgba(24,20,17,0.12)',
      },
    },
  },
};
