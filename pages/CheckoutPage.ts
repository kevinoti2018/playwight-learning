import { Page, Locator } from "@playwright/test";
import { CartPage } from "./CartPage";
export class CheckoutPage{
  readonly page: Page
  readonly cartPage: CartPage
  readonly cancel: Locator
  readonly continue
  readonly firstName
  readonly lastName
  readonly zip
  readonly title
  readonly paymentInfo
  readonly shippingInfo
  readonly priceTotal
  readonly total
  readonly finish
  readonly completeHeader
  readonly completeText
  readonly itemTitles:Locator
  constructor(page: Page) {
    this.page = page
    this.cartPage = new CartPage(page)
    this.cancel = page.locator('[data-test="cancel"]')
    this.continue= page.locator('[data-test="continue"]')
    this.firstName = page.locator('[data-test="firstName"]')
    this.lastName = page.locator('[data-test="lastName"]')
    this.zip = page.locator('[data-test="postalCode"]')
    this.title = page.locator('[data-test="title"]')
    this.paymentInfo = page.locator('[data-test="payment-info-label"]')
    this.shippingInfo = page.locator('[data-test="shipping-info-label"]')
    this.priceTotal = page.locator('[data-test="total-info-label"]')
    this.total = page.locator('[data-test="total-label"]')
    this.finish = page.locator('[data-test="finish"]')
    this.completeHeader = page.locator('[data-test="complete-header"]')
    this.completeText = page.locator('[data-test="complete-text"]')
    // Inside InventoryPage, CartPage, and CheckoutPage constructors:
    this.itemTitles = page.locator('.inventory_item_name');

  }

  async checkoutItems(firstName:string, lastName:string,zip:string) {
    await this.firstName.fill(firstName)
    await this.lastName.fill(lastName)
    await this.zip.fill(zip)
    await this.continue.click()
  }

  async confirmOrder() {
    await this.finish.click()
  }

}
