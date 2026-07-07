import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 6003,
    allowedHosts: true,
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'demo/index.html'),
        flower: resolve(__dirname, 'flower/index.html'),
        'qr-code': resolve(__dirname, 'qr-code/index.html'),
        rps: resolve(__dirname, 'rock-paper-scissors/index.html'),
        temp: resolve(__dirname, 'temp/index.html'),
        ultrasound: resolve(__dirname, 'ultrasound/index.html')
      }
    }
  }
});
