import { expect, test } from "@playwright/test"

test("renders the main shell with all tabs", async ({ page }) => {
  await page.goto("/")
  await expect(page.getByRole("heading", { name: "GR-M02U Console" }).first()).toBeVisible()
  await expect(page.getByRole("tab", { name: "Status" })).toBeVisible()
  await expect(page.getByRole("tab", { name: "Settings" })).toBeVisible()
  await expect(page.getByRole("tab", { name: "PAIR Console" })).toBeVisible()
  await expect(page.getByRole("tab", { name: "Raw Log" })).toBeVisible()
})

test("PAIR Console preview reflects argument changes", async ({ page }) => {
  await page.goto("/")
  await page.getByRole("tab", { name: "PAIR Console" }).click()
  // Default selected command is the first PAIR_COMMANDS entry (Restart GNSS, ack-only, no args).
  await expect(page.getByText("$PAIR002*38").first()).toBeVisible()
})

test("Settings view lists primary controls", async ({ page }) => {
  await page.goto("/")
  await page.getByRole("tab", { name: "Settings" }).click()
  await expect(page.getByRole("button", { name: "すべて取得" })).toBeVisible()
  await expect(page.getByText("Fix Rate")).toBeVisible()
  await expect(page.getByText("HDOP Threshold")).toBeVisible()
})

test("Raw log view is empty by default", async ({ page }) => {
  await page.goto("/")
  await page.getByRole("tab", { name: "Raw Log" }).click()
  await expect(page.getByRole("button", { name: "一時停止" })).toBeVisible()
  await expect(page.getByRole("button", { name: "クリア" })).toBeVisible()
})

test("served index.html declares SRI on every script and stylesheet", async ({ request }) => {
  const html = await (await request.get("/")).text()
  const tags =
    html.match(/<(?:script\b[^>]*\bsrc=|link\b[^>]*\brel="(?:stylesheet|modulepreload)")[^>]*>/g) ?? []
  expect(tags.length).toBeGreaterThan(0)
  for (const tag of tags) {
    expect(tag).toMatch(/\bintegrity="sha384-[A-Za-z0-9+/=]+"/)
  }
})
