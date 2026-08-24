import { test, expect } from '../fixtures/page-fixtures'

test.describe('Inventory page testcases', () => {
  test('adds item to cart and updates badge', async ({inventoryPage}) => {
    await inventoryPage.goto()
    await inventoryPage.addItemToCart('Sauce Labs Backpack')
    await expect(inventoryPage.cartBadge).toHaveText('1')
  })
  test('removes item from cart and updates badge', async ({ inventoryPage }) => {
    await inventoryPage.goto()
    await inventoryPage.addItemToCart('Sauce Labs Backpack')
    await inventoryPage.removeItemFromCart('Sauce Labs Backpack')
    await expect(inventoryPage.cartBadge).not.toBeVisible()
  })
  test('user can sort items', async ({ inventoryPage }) => {
    const allInventoryItems = [
      'Sauce Labs Backpack',
      'Sauce Labs Bike Light',
      'Sauce Labs Bolt T-Shirt',
      'Sauce Labs Fleece Jacket',
      'Sauce Labs Onesie',
      'Test.allTheThings() T-Shirt (Red)'
    ];
    const expectedReverseOrder = [...allInventoryItems].reverse();
    await inventoryPage.goto()
    await inventoryPage.sortProductsBy('za')
    await expect(inventoryPage.itemTitles).toHaveText(expectedReverseOrder);
  })
  test('validate all items are present', async ({ inventoryPage }) => {
    const allInventoryItems = [
      'Sauce Labs Backpack',
      'Sauce Labs Bike Light',
      'Sauce Labs Bolt T-Shirt',
      'Sauce Labs Fleece Jacket',
      'Sauce Labs Onesie',
      'Test.allTheThings() T-Shirt (Red)'
    ];
    await inventoryPage.goto()
    await expect(inventoryPage.cartBadge).not.toBeVisible()
    await expect(inventoryPage.itemTitles).toHaveText(allInventoryItems);
  })

})
