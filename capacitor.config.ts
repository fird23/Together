import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.together.app',
  appName: 'Together',
  webDir: 'www',
  server: {
    url: 'https://together-ten-theta.vercel.app',
    cleartext: false
  }
};

export default config;