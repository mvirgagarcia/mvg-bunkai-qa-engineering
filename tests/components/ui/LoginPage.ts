/**
 * KATA Architecture - Layer 3: Login Page Component
 *
 * UI component for authentication via the email-first login page.
 * The form asks for the email, checks whether the account exists, then shows
 * the password step (existing confirmed account) or the create-account step.
 *
 * Page: /login (Bunkai TMS)
 * Locators (data-testid):
 * - Email: [data-testid="login-email"]
 * - Continue: [data-testid="login-continue"]
 * - Password: [data-testid="login-password"]
 * - Sign in: [data-testid="login-signin"]
 * - Error: [data-testid="login-error"]
 */

import type { TestContextOptions } from '@TestContext';

import { expect } from '@playwright/test';
import { UiBase } from '@ui/UiBase';
import { atc, step } from '@utils/decorators';

// ============================================
// Types - Login data structures
// ============================================

/**
 * Login credentials for UI authentication (email-first + password step).
 */
export interface LoginCredentials {
  email: string
  password: string
}

// ============================================
// Login Page Component
// ============================================

export class LoginPage extends UiBase {
  constructor(options: TestContextOptions) {
    super(options);
  }

  // ============================================
  // Helpers (Private)
  // ============================================

  /**
   * Email step, then password step, then submit.
   * Only valid for an EXISTING account: an unknown email leads to the
   * create-account step instead of the password step.
   */
  private async fillAndSubmitLoginForm(credentials: LoginCredentials): Promise<void> {
    await this.page.getByTestId('login-email').fill(credentials.email);
    await this.page.getByTestId('login-continue').click();
    await this.page.getByTestId('login-password').fill(credentials.password);
    await this.page.getByTestId('login-signin').click();
  }

  // ============================================
  // Navigation (Public)
  // ============================================

  /**
   * Navigate to the login page
   * Call this BEFORE using login ATCs
   */
  @step
  async goto(): Promise<void> {
    await this.page.goto(this.buildUrl('/login'));
  }

  // ============================================
  // ATCs - Complete Test Cases
  // ============================================

  /**
   * ATC: Login with valid credentials - expects success
   *
   * IMPORTANT: Call goto() before this ATC.
   * Completes the email and password steps and verifies the redirect away from /login.
   *
   * @param credentials - Email and password of an existing confirmed account
   */
  @atc('BK-ATC-AUTH-3')
  async loginSuccessfully(credentials: LoginCredentials): Promise<void> {
    await this.fillAndSubmitLoginForm(credentials);

    // Wait for authentication to complete and redirect
    await this.page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 });
    await expect(this.page).not.toHaveURL(/.*\/login.*/);
    await expect(this.page.getByTestId('login-email')).toBeHidden();
  }

  /**
   * ATC: Login with a wrong password - expects error
   *
   * IMPORTANT: Call goto() before this ATC, and pass an EXISTING email with a
   * wrong password (an unknown email goes to the create-account step).
   *
   * @param credentials - Existing email + wrong password
   */
  @atc('BK-ATC-AUTH-4')
  async loginWithInvalidCredentials(credentials: LoginCredentials): Promise<void> {
    await this.fillAndSubmitLoginForm(credentials);

    const errorIndicator = this.page.getByTestId('login-error');
    await expect(errorIndicator).toBeVisible({ timeout: 5000 });
    await expect(errorIndicator).toHaveText('That email or password is incorrect.');
    await expect(this.page).toHaveURL(/.*\/login.*/);
  }
}
