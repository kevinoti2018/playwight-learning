import { test as setup, expect } from "@playwright/test";
import { LoginPage } from "../pages/LoginPage";
import { ENV } from "../config/env.schema";
const authfile = 'playwright/.auth/user.json'
setup('user is able to login and we save the state', async ({ page }) => {
  const loginPage = new LoginPage(page)
  await loginPage.goto()
  await loginPage.login(ENV.TEST_USER, ENV.TEST_PWD)
  // Fix: Relative path matching your baseURL
  await expect(page).toHaveURL('/inventory.html');

  await page.context().storageState({path:authfile})
})
