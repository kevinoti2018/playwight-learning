import { Page, Locator } from '@playwright/test'

export class LoginPage{
  readonly page: Page
  readonly userNameInput: Locator
  readonly passWordInput: Locator
  readonly loginButton: Locator
  readonly error:Locator
  constructor(page: Page) {
    this.page = page
    this.userNameInput = page.locator('[data-test="username"]')
    this.passWordInput = page.locator('[data-test="password"]')
    this.loginButton = page.locator('[data-test="login-button"]')
    this.error = page.locator('[data-test="error"]')

  }

  async goto() {
    await this.page.goto('/')
  }
  async login(username:string, password:string) {
    await this.userNameInput.fill(username)
    await this.passWordInput.fill(password)
    await this.loginButton.click()
  }
}
