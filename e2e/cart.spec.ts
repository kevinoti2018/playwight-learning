import { test, expect } from "../fixtures/page-fixtures";

test.describe('Cart page tescases', () => {
  test('users can go to cart page', async ({ cartPage,inventoryPage }) => {
    await inventoryPage.goto()
    await cartPage.addToCart('Sauce Labs Backpack')
    await cartPage.gotoCart()
    await expect(cartPage.page).toHaveURL('/cart.html');
    await expect(inventoryPage.cartBadge).toHaveText('1')
    await expect(cartPage.cartPageTitle).toContainText('Your Cart')
  })
  test('users can remove item from cart', async ({ cartPage ,inventoryPage}) => {
    await inventoryPage.goto()
    await cartPage.addToCart('Sauce Labs Backpack')
    await cartPage.gotoCart()
    await cartPage.removeFromCart('Sauce Labs Backpack')
    await expect(inventoryPage.cartBadge).not.toBeVisible()

  })
  test('users can click continue shopping from cart page', async ({ cartPage ,inventoryPage}) => {
    await inventoryPage.goto()
    await cartPage.addToCart('Sauce Labs Backpack')
    await cartPage.gotoCart()
    await cartPage.continueShopping.click()
    await expect(inventoryPage.page).toHaveURL('/inventory.html');
  })

  test('verifies selected items proceed to checkout', async ({ inventoryPage, cartPage }) => {
    const targetItems = ['Sauce Labs Backpack', 'Sauce Labs Onesie'];

    await inventoryPage.goto();
    for (const item of targetItems) {
      await inventoryPage.addItemToCart(item);
    }

    // Verify Cart Page matches our data array exactly
    await cartPage.goto();
    await expect(cartPage.itemTitles).toHaveText(targetItems);
  });
})
