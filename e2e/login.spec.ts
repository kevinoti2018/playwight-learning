import { test, expect } from "../fixtures/page-fixtures";

test('user receives an error when using incorrect login creds', async ({loginPage}) => {
  await loginPage.goto()
  await loginPage.login('username', 'password')
  await expect(loginPage.error).toHaveText('Epic sadface: Username and password do not match any user in this service')
})
