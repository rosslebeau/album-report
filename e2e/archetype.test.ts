import { test, expect } from '@playwright/test';

test.describe('Archetype Feature E2E', () => {
	test('complete flow: analyze → archetype + quotient visible → expand metrics → share → view shared report', async ({ page }) => {
		test.setTimeout(120000);

		// Navigate to landing page
		await page.goto('/');
		await expect(page.getByText('The Album Report')).toBeVisible();

		// Enter username and submit
		await page.getByPlaceholder('Enter your last.fm username').fill('rj');
		await page.getByRole('button', { name: 'Analyze' }).click();

		// Wait for results — both Album Quotient and Archetype sections should be visible
		await expect(page.getByText('Album Quotient')).toBeVisible({ timeout: 60000 });
		await expect(page.getByText('Listening Archetype')).toBeVisible();

		// Verify archetype section has the expected elements
		// Confidence badge should be visible
		await expect(page.getByText(/confidence/i)).toBeVisible();

		// Expand metrics detail panel
		await page.getByText(/see your metrics/i).click();

		// Assert metric values are displayed with human-readable labels
		await expect(page.getByText('Album Completion Rate')).toBeVisible();
		await expect(page.getByText('Artist Concentration')).toBeVisible();
		await expect(page.getByText('Scrobble Entropy')).toBeVisible();

		// Click share
		await page.getByText('Share your results').click();

		// Assert share link is generated
		const shareInput = page.locator('input[readonly]');
		await expect(shareInput).toBeVisible({ timeout: 10000 });

		const shareUrl = await shareInput.inputValue();
		expect(shareUrl).toContain('/report/');

		// Navigate to share link
		const urlPath = new URL(shareUrl).pathname;
		await page.goto(urlPath);

		// Assert archetype is displayed on the shared report page
		await expect(page.getByText('The Album Report')).toBeVisible();
		await expect(page.getByText('Album Quotient')).toBeVisible();
		await expect(page.getByText('Listening Archetype')).toBeVisible();
		await expect(page.getByText(/confidence/i)).toBeVisible();
	});
});
