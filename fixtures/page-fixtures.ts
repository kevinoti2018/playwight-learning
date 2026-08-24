import { test as base } from "@playwright/test";
import { LoginPage } from "../pages/LoginPage"
import { InventoryPage } from "../pages/InventoryPage";
import { CheckoutPage } from "../pages/CheckoutPage";
import { CartPage } from "../pages/CartPage";

type PageObjects={
  loginPage: LoginPage
  inventoryPage: InventoryPage
  checkoutPage: CheckoutPage
  cartPage:CartPage
}

export const test = base.extend<PageObjects>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page))
  },
  inventoryPage: async ({ page }, use) => {
    await use (new InventoryPage(page))
  },
  checkoutPage: async ({ page }, use) => {
    await use (new CheckoutPage(page))
  },
  cartPage: async ({ page }, use) => {
    await use(new CartPage(page))
  }
})

export {expect} from '@playwright/test'
