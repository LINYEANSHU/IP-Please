import {test,expect} from '@playwright/test';
// This fixture deliberately exercises storage modules directly, outside the game bundle.
test.use({baseURL:'http://127.0.0.1:5173'});
test('事务保存后刷新只入账一次，接管撤销旧窗口写权',async({page,context})=>{
  await page.goto('/tests/fixtures/session.html');
  await page.getByRole('button',{name:'盖允许章'}).click();
  await expect(page.locator('#state')).toContainText('"balance":25');
  await page.reload();await expect(page.locator('#state')).toContainText('"phase":"returning"');
  await page.getByRole('button',{name:'盖允许章'}).click();await expect(page.locator('#state')).toContainText('"balance":25');
  const other=await context.newPage();await other.goto('/tests/fixtures/session.html');
  await expect(other.locator('#state')).toContainText('"writable":false');
  await other.getByRole('button',{name:'接管'}).click();await expect(other.locator('#state')).toContainText('"writable":true');
  await expect(page.locator('#state')).toContainText('"writable":false');
  await page.getByRole('button',{name:'退件'}).click();
  const saved=()=>other.evaluate(()=>JSON.parse(localStorage.getItem('ip-please:run:v1')!));
  expect((await saved()).returned).toHaveLength(0);
  await other.getByRole('button',{name:'退件'}).click();await expect(other.locator('#state')).toContainText('"returned":["D01-S01"]');
});
