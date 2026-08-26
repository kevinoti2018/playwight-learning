import { CheckoutInfoBuilder } from "../factories/CheckoutInfoBuilder";
import { test, expect } from "../fixtures/page-fixtures";

test.describe('checkout page', () => {
  test('user can add product to cart and checkout', async ({
    cartPage,
    checkoutPage,
    inventoryPage
  }) => {

    await inventoryPage.goto()

    await cartPage.addToCart('Sauce Labs Backpack')

    await cartPage.gotoCart()

    await cartPage.checkOutItems()
    const info = new CheckoutInfoBuilder()
       .withFirstName('Kevin')
       .withLastName('Otieno')
       .withZip('00100')
       .build()
     await checkoutPage.checkoutItems(info)

    await expect(checkoutPage.title)
      .toContainText('Checkout: Overview')

    await expect(checkoutPage.paymentInfo)
      .toContainText('Payment Information:')

    await expect(checkoutPage.shippingInfo)
      .toContainText('Shipping Information:')
  })
  test('user can cancel checkout', async ({
    cartPage,
    inventoryPage,
    checkoutPage
  }) => {
    await inventoryPage.goto()

    await cartPage.addToCart('Sauce Labs Backpack')

    await cartPage.gotoCart()

    await cartPage.checkOutItems()

    const info = new CheckoutInfoBuilder()
       .withFirstName('Kevin')
       .withLastName('Otieno')
       .withZip('00100')
       .build()
     await checkoutPage.checkoutItems(info)
    await checkoutPage.cancel.click()
    await expect(checkoutPage.title)
      .toContainText('Products')
    await expect(checkoutPage.page).toHaveURL('/inventory.html')

  })

  test('user can finish checkout', async ({
    cartPage,
    inventoryPage,
    checkoutPage
  }) => {
    await inventoryPage.goto()

    await cartPage.addToCart('Sauce Labs Backpack')

    await cartPage.gotoCart()

    await cartPage.checkOutItems()
    const info = new CheckoutInfoBuilder().build()
     await checkoutPage.checkoutItems(info)
    await checkoutPage.finish.click()
    await expect(cartPage.page).toHaveURL('/checkout-complete.html');
    await expect(checkoutPage.title).toContainText('Checkout: Complete!')
    await expect(checkoutPage.completeHeader).toContainText('Thank you for your order!')
    await expect(checkoutPage.completeText).toContainText('Your order has been dispatched, and will arrive just as fast as the pony can get there!')
  })
})
