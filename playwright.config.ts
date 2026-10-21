import {defineConfig} from '@playwright/test';
const production=process.env.IP_PLEASE_PRODUCTION==='1';
const baseURL=production?'http://127.0.0.1:4173':'http://127.0.0.1:5173';
export default defineConfig({
  testDir:'./tests/e2e',fullyParallel:false,workers:1,timeout:30000,
  use:{baseURL,viewport:{width:1280,height:720},headless:true,
    launchOptions:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{},
    screenshot:'only-on-failure',trace:'retain-on-failure'},
  webServer:{command:production?'npm run preview -- --port 4173 --strictPort':'npm run dev -- --port 5173 --strictPort',url:baseURL,reuseExistingServer:!process.env.CI},
});
