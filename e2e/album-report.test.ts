import { test, expect } from '@playwright/test';

test.describe('The Album Report', () => {
	test('landing page renders with title, vinyl record, and input', async ({ page }) => {
		await page.goto('/');

		await expect(page.getByText('The Album Report')).toBeVisible();
		await expect(page.locator('svg')).toBeVisible();
		await expect(page.getByPlaceholder('Enter your last.fm username')).toBeVisible();
		await expect(page.getByRole('button', { name: 'Analyze' })).toBeVisible();
	});

	test('shows validation error for empty username', async ({ page }) => {
		await page.goto('/');

		await page.getByRole('button', { name: 'Analyze' }).click();

		await expect(page.getByText('Please enter a last.fm username')).toBeVisible();
	});

	test('shows loading state after submitting username', async ({ page }) => {
		await page.goto('/');

		await page.getByPlaceholder('Enter your last.fm username').fill('rj');
		await page.getByRole('button', { name: 'Analyze' }).click();

		await expect(page.getByText('Analyzing your listening history')).toBeVisible({ timeout: 3000 });
	});

	test('full flow: analyze, view results, share, and view shared report', async ({ page }) => {
		test.setTimeout(120000);

		await page.goto('/');

		// Submit username
		await page.getByPlaceholder('Enter your last.fm username').fill('rj');
		await page.getByRole('button', { name: 'Analyze' }).click();

		// Wait for results (may take up to 60s due to last.fm API rate limits)
		await expect(page.getByText('Album Quotient')).toBeVisible({ timeout: 60000 });
		await expect(page.getByText('Albums as a unit')).toBeVisible();
		await expect(page.getByText('Results for')).toBeVisible();
		await expect(page.getByText('rj')).toBeVisible();

		// Share button should be visible
		await expect(page.getByText('Share your results')).toBeVisible();

		// Click share
		await page.getByText('Share your results').click();

		// Wait for share URL to appear
		const shareInput = page.locator('input[readonly]');
		await expect(shareInput).toBeVisible({ timeout: 10000 });

		const shareUrl = await shareInput.inputValue();
		expect(shareUrl).toContain('/report/');

		// Navigate to share URL
		const urlPath = new URL(shareUrl).pathname;
		await page.goto(urlPath);

		// Verify shared results page
		await expect(page.getByText('The Album Report')).toBeVisible();
		await expect(page.getByText('Album Quotient')).toBeVisible();
		await expect(page.getByText('rj')).toBeVisible();
		await expect(page.getByText('Generate your own Album Report')).toBeVisible();
	});

	test('shows error for nonexistent username', async ({ page }) => {
		await page.goto('/');

		await page.getByPlaceholder('Enter your last.fm username').fill('thisuserdoesnotexist999xyz');
		await page.getByRole('button', { name: 'Analyze' }).click();

		// Should show error state
		await expect(page.getByText('Something went wrong')).toBeVisible({ timeout: 15000 });
		await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
	});

	test('error page for invalid share ID shows 404', async ({ page }) => {
		const response = await page.goto('/report/nonexistent1');

		expect(response?.status()).toBe(404);
		await expect(page.getByText('Go back home')).toBeVisible();
	});

	test('responsive: mobile viewport renders correctly', async ({ page }) => {
		await page.setViewportSize({ width: 375, height: 812 });
		await page.goto('/');

		await expect(page.getByText('The Album Report')).toBeVisible();
		await expect(page.getByPlaceholder('Enter your last.fm username')).toBeVisible();
		await expect(page.getByRole('button', { name: 'Analyze' })).toBeVisible();

		// Verify button is at least 44px tall (touch target)
		const button = page.getByRole('button', { name: 'Analyze' });
		const box = await button.boundingBox();
		expect(box).not.toBeNull();
		expect(box!.height).toBeGreaterThanOrEqual(44);
	});
});
