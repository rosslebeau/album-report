import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
	webServer: {
		command: 'npm run build && node build',
		port: 3000,
		reuseExistingServer: !process.env.CI,
		timeout: 30000,
		env: {
			PORT: '3000',
			HOST: '0.0.0.0',
			ORIGIN: 'http://localhost:3000',
			DATABASE_URL: process.env.DATABASE_URL ?? '',
			LASTFM_API_KEY: process.env.LASTFM_API_KEY ?? ''
		}
	},
	testDir: 'e2e',
	testMatch: /(.+\.)?(test|spec)\.[jt]s/,
	timeout: 60000,
	use: {
		baseURL: 'http://localhost:3000'
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] }
		}
	]
});
