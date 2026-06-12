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
      launchAutoHide: true,
      launchShowDuration: 2000,
      backgroundColor: "#15803d",
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#139847",
      overlaysWebView: false,
    },
    GoogleAuth: {
      scopes: ["email", "profile"],
      clientId: "440549179236-qgufual2ha6galtdnfp0kuqam44hg9kk.apps.googleusercontent.com",
      forceCodeForRefreshToken: true,
    },
    Camera: {
      presentationStyle: "fullscreen",
    },
  },
};

export default config;
