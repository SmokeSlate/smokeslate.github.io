const path = require('node:path');
require('esbuild').buildSync({
  entryPoints: ['shortcuts/spotify/actionGen/intent-source.js'],
  outfile: 'shortcuts/spotify/actionGen/intent-bundle.js',
  bundle: true, platform: 'browser', format: 'iife', target: 'es2020', minify: true,
  inject: ['scripts/buffer-global.js'],
  alias: { 'node:util': path.resolve('scripts/browser-util.js'), 'stream-buffers': path.resolve('scripts/browser-stream-buffer.js') },
  banner: { js: '/* Generated from intent-source.js. Includes MIT-licensed bplist-creator and buffer; see THIRD_PARTY_LICENSES.txt. */' },
});
