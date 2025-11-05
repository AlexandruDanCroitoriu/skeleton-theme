// Vite config to bundle src/app.js into assets/app.js for Shopify theme
// Uses CJS format for compatibility with package.json type: commonjs
const { resolve } = require('path');

module.exports = {
  root: process.cwd(),
  define: {
    __VUE_OPTIONS_API__: true,
    __VUE_PROD_DEVTOOLS__: true, // Enable devtools in production builds
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
  },
  build: {
    outDir: 'assets',
    emptyOutDir: false, // don't wipe existing theme assets
    sourcemap: true, // Enable sourcemaps for debugging
    minify: false, // Disable minification for better debugging
    target: 'modules',
    rollupOptions: {
      input: resolve(__dirname, 'src/app.js'),
      output: {
        entryFileNames: 'app.js', // overwrite assets/app.js
        chunkFileNames: '[name]-[hash].js', // keep flat structure
        assetFileNames: '[name]-[hash][extname]', // keep flat structure
        manualChunks: undefined, // avoid multiple chunks to keep simple
      },
    },
  },
};
