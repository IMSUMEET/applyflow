import { defineConfig } from "wxt";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  srcDir: "src",
  manifest: {
    name: "ApplyFlow",
    description:
      "Intelligent job application autofill, self-learning answers, and referral management.",
    version: "0.1.0",
    permissions: ["storage", "activeTab", "alarms", "notifications", "tabs"],
    host_permissions: ["<all_urls>"],
    icons: {
      16: "icons/16.png",
      32: "icons/32.png",
      48: "icons/48.png",
      128: "icons/128.png",
    },
    action: {
      default_popup: "popup.html",
      default_title: "ApplyFlow",
      default_icon: {
        16: "icons/16.png",
        32: "icons/32.png",
        48: "icons/48.png",
        128: "icons/128.png",
      },
    },
  },
});
