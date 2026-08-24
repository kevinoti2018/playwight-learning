import { Page, Locator ,expect} from "@playwright/test";

export class InventoryPage {
  readonly page: Page;
  readonly sortDropdown: Locator;
  readonly inventoryItems: Locator;
  readonly cartBadge: Locator;
  readonly footer: Locator;
  readonly itemTitles:Locator
  constructor(page: Page) {
    this.page = page;
    this.sortDropdown = page.locator('[data-test="product-sort-container"]');
    this.footer = page.locator('[data-test="footer"]');
    this.inventoryItems = page.locator('[data-test="inventory-item"]');
    this.cartBadge = page.locator('[data-test="shopping-cart-badge"]');
    // Inside InventoryPage, CartPage, and CheckoutPage constructors:
    this.itemTitles = page.locator('.inventory_item_name');
  }

  async goto() {
    await this.page.goto('/inventory.html', {
      waitUntil: 'load'
    });
  }

  private getItemCardByName(itemName: string): Locator {
    return this.inventoryItems.filter({ hasText: itemName });
  }

  async addItemToCart(itemName: string) {
    const card = this.getItemCardByName(itemName);

    await card.getByRole("button", { name: /Add to cart/i }).click();
  }

  async removeItemFromCart(itemName: string) {
    const card = this.getItemCardByName(itemName);

    await card
      .getByRole('button', { name: /remove/i })
      .click();
  }

  async sortProductsBy(option: "az" | "za" | "lohi" | "hilo") {
    await expect(this.sortDropdown).toBeVisible();
    await this.sortDropdown.selectOption(option);
  }
}
