import { test, expect } from 'playwright/test';

test.describe('Auth Dialog', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Close any welcome dialogs
    const closeBtn = page.locator('button:has-text("Close")').first();
    if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeBtn.click();
    }
  });

  const openAuthDialog = async (page: import('playwright/test').Page) => {
    await page.locator('button:has-text("Log in")').click();
    await expect(page.locator('h2:has-text("Log in")')).toBeVisible();
  };

  test('opens login dialog with all expected elements', async ({ page }) => {
    await openAuthDialog(page);
    // Logo
    await expect(page.locator('img[alt="My Volley"]')).toBeVisible();
    // Google button
    await expect(page.locator('button:has-text("Google")')).toBeVisible();
    // Email / Password fields
    await expect(page.getByPlaceholder('Email address')).toBeVisible();
    await expect(page.getByPlaceholder('Password')).toBeVisible();
    // Actions
    await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Forgot password?' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in without password' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'No account? Create one' })).toBeVisible();
  });

  test('shows email required validation on empty submit', async ({ page }) => {
    await openAuthDialog(page);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.locator('[data-sonner-toast]')).toBeVisible({ timeout: 3000 });
  });

  test('shows password required validation when email filled but no password', async ({ page }) => {
    await openAuthDialog(page);
    await page.getByPlaceholder('Email address').fill('test@example.com');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.locator('[data-sonner-toast]')).toBeVisible({ timeout: 3000 });
  });

  test('switches to signup mode', async ({ page }) => {
    await openAuthDialog(page);
    await page.locator('button:has-text("No account? Create one")').click();
    await expect(page.locator('h2:has-text("Create account")')).toBeVisible();
    await expect(page.getByPlaceholder('Password (min. 6 chars)')).toBeVisible();
    // "Create account" submit button exists
    await expect(page.locator('.space-y-3 button:has-text("Create account")')).toBeVisible();
    // Back link
    await expect(page.locator('button:has-text("Already have an account? Sign in")')).toBeVisible();
  });

  test('switches to forgot password mode', async ({ page }) => {
    await openAuthDialog(page);
    await page.locator('button:has-text("Forgot password?")').click();
    await expect(page.locator('h2:has-text("Forgot password")')).toBeVisible();
    await expect(page.getByPlaceholder('Email address')).toBeVisible();
    // No password field
    await expect(page.getByPlaceholder('Password')).not.toBeVisible();
    await expect(page.locator('button:has-text("Send link")')).toBeVisible();
    await expect(page.locator('button:has-text("Back to login")')).toBeVisible();
  });

  test('navigates: login -> signup -> login -> forgot -> login', async ({ page }) => {
    await openAuthDialog(page);
    // Login -> Signup
    await page.locator('button:has-text("No account? Create one")').click();
    await expect(page.locator('h2:has-text("Create account")')).toBeVisible();
    // Signup -> Login
    await page.locator('button:has-text("Already have an account? Sign in")').click();
    await expect(page.locator('h2:has-text("Log in")')).toBeVisible();
    // Login -> Forgot
    await page.locator('button:has-text("Forgot password?")').click();
    await expect(page.locator('h2:has-text("Forgot password")')).toBeVisible();
    // Forgot -> Login
    await page.locator('button:has-text("Back to login")').click();
    await expect(page.locator('h2:has-text("Log in")')).toBeVisible();
  });

  test('toggles password visibility', async ({ page }) => {
    await openAuthDialog(page);
    const pwdInput = page.getByPlaceholder('Password');
    await expect(pwdInput).toHaveAttribute('type', 'password');
    // Click the eye toggle (button inside the password wrapper)
    await page.locator('input[placeholder="Password"] + button').click();
    await expect(pwdInput).toHaveAttribute('type', 'text');
    await page.locator('input[placeholder="Password"] + button').click();
    await expect(pwdInput).toHaveAttribute('type', 'password');
  });

  test('clears password when switching between login and signup', async ({ page }) => {
    await openAuthDialog(page);
    await page.getByPlaceholder('Password').fill('mysecret');
    await page.locator('button:has-text("No account? Create one")').click();
    await expect(page.getByPlaceholder('Password (min. 6 chars)')).toHaveValue('');
  });

  test('validates short password on signup', async ({ page }) => {
    await openAuthDialog(page);
    await page.locator('button:has-text("No account? Create one")').click();
    await page.getByPlaceholder('Email address').fill('test@test.com');
    await page.getByPlaceholder('Password (min. 6 chars)').fill('123');
    await page.locator('.space-y-3 button:has-text("Create account")').click();
    await expect(page.locator('[data-sonner-toast]')).toBeVisible({ timeout: 3000 });
  });

  test('closes dialog and resets to login mode', async ({ page }) => {
    await openAuthDialog(page);
    await page.locator('button:has-text("No account? Create one")').click();
    await expect(page.locator('h2:has-text("Create account")')).toBeVisible();
    // Close dialog
    await page.locator('button:has-text("Close")').click();
    await expect(page.locator('h2:has-text("Create account")')).not.toBeVisible();
    // Reopen should be back to login
    await page.locator('button:has-text("Log in")').click();
    await expect(page.locator('h2:has-text("Log in")')).toBeVisible();
  });
});

test.describe('Reset Password Page', () => {
  test('redirects to home without recovery hash or session', async ({ page }) => {
    await page.goto('/reset-password');
    // Should redirect to home since there's no recovery hash and no session
    await page.waitForURL('/', { timeout: 5000 });
    expect(page.url()).toContain('/');
  });
});
