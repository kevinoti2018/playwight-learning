import { Page, Locator } from '@playwright/test'
import { InventoryPage } from './InventoryPage';
export class CartPage{
  readonly page: Page
  readonly cart: Locator;
  readonly inventoryPage: InventoryPage
  readonly continueShopping: Locator
  readonly cartPageTitle: Locator
  readonly checkout : Locator
  readonly itemTitles:Locator
  constructor(page: Page) {
    this.page = page
    this.cart = page.locator('[data-test="shopping-cart-link"]')
    this.inventoryPage = new InventoryPage(page)
    this.continueShopping = page.locator('[data-test="continue-shopping"]')
    this.cartPageTitle = page.locator('[data-test="title"]')
    this.checkout = page.locator('[data-test="checkout"]')
    // Inside InventoryPage, CartPage, and CheckoutPage constructors:
    this.itemTitles = page.locator('.inventory_item_name');

  }
  async goto() {
    await this.page.goto('/cart.html', {
      waitUntil: 'domcontentloaded',
    });
  }

  async addToCart(itemName:string) {
  await this.inventoryPage.addItemToCart(itemName)
  }

  async gotoCart() {
  await this.cart.click()
  }
  async removeFromCart(itemName:string) {
  await this.inventoryPage.removeItemFromCart(itemName)
}
  async checkOutItems() {
    await this.gotoCart()
    await this.checkout.click()
  }

}
