import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "jp.waggly.app",
  appName: "Waggly",
  webDir: "out",
  server: {
    androidScheme: "https",
  },
  plugins: {
    CapacitorHttp: {
      enabled: true, // Proxy all fetch() through native HTTP — bypasses CORS
    },
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: "#15803d",
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#15803d",
    },
  },
};

export default config;
