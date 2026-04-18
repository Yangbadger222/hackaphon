import { test, expect } from "@playwright/test";

test.describe.configure({ mode: "serial" });
test.setTimeout(120000);

async function dispatchAction(page, action) {
  await page.evaluate((payload) => {
    const root = document.getElementById("root");
    const reactKey = Object.keys(root).find((key) =>
      key.startsWith("__reactContainer"),
    );
    const currentRoot = root[reactKey].stateNode.current;

    function findFiber(fiber, predicate) {
      if (!fiber) return null;
      if (predicate(fiber)) return fiber;
      return (
        findFiber(fiber.child, predicate) ||
        findFiber(fiber.sibling, predicate)
      );
    }

    const providerFiber = findFiber(
      currentRoot,
      (fiber) => fiber.elementType?.name === "GameProvider",
    );
    const dispatch = providerFiber.memoizedState.queue.dispatch;
    dispatch(payload);
  }, action);
}

async function getState(page) {
  return page.evaluate(() => {
    const root = document.getElementById("root");
    const reactKey = Object.keys(root).find((key) =>
      key.startsWith("__reactContainer"),
    );
    const currentRoot = root[reactKey].stateNode.current;

    function findFiber(fiber, predicate) {
      if (!fiber) return null;
      if (predicate(fiber)) return fiber;
      return (
        findFiber(fiber.child, predicate) ||
        findFiber(fiber.sibling, predicate)
      );
    }

    const contextFiber = findFiber(
      currentRoot,
      (fiber) => fiber.tag === 10 && fiber.memoizedProps?.value?.dispatch,
    );
    return contextFiber.memoizedProps.value.state;
  });
}

async function gotoFreshApp(page) {
  await page.goto("http://127.0.0.1:4173", { waitUntil: "networkidle" });
  await expect(page.getByText("H.O.R.S.E._v0.1.exe")).toBeVisible();
  await expect(page.locator("canvas")).toBeVisible();
}

async function dismissVisibleTrapSafely(page) {
  const safeLabels = ["稍后处理", "忽略", "忽略警告"];

  for (const label of safeLabels) {
    const button = page.getByRole("button", { name: label });
    if (await button.count()) {
      const visible = await button.first().isVisible().catch(() => false);
      if (visible) {
        await button.first().click();
        return true;
      }
    }
  }

  return false;
}

test("lose path flow reaches blue screen and restart", async ({ page }) => {
  await gotoFreshApp(page);

  // Simulate post-Phase1 transition after verifying Phase1 UI is present.
  await dispatchAction(page, { type: "SET_PHASE", payload: 2 });
  await expect(page.getByText("AXIOM TERMINAL v0.1")).toBeVisible();

  // Let Phase 2 perform a real fetch, then skip typing and select one response.
  await page.mouse.click(640, 320);
  const firstChoice = page.locator("button").first();
  await expect(firstChoice).toBeVisible({ timeout: 20000 });
  const firstChoiceLabel = await firstChoice.innerText();
  await firstChoice.click();
  await expect(page.getByText(`> 你: ${firstChoiceLabel}`)).toBeVisible({
    timeout: 10000,
  });

  // Move to Phase 3 after verifying Phase 2 interaction and backend response.
  await dispatchAction(page, { type: "SET_PHASE", payload: 3 });
  await expect(page.getByText("STABLE_GATE FIREWALL v2.1")).toBeVisible();
  await dismissVisibleTrapSafely(page);

  await expect(page.getByText("AXIOM COMMS")).toBeVisible({ timeout: 15000 });
  await expect(page.locator("section button").first()).toBeVisible({
    timeout: 15000,
  });

  // Trigger the trap modal through the same browser event used by the app.
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent("show-trap", { detail: "system_alert" }));
  });
  await expect(page.getByText("系统安全警告")).toBeVisible();
  await page.getByRole("button", { name: "立即拦截" }).click();

  await expect(page.getByText("TROJAN_SHELL: BREACHED")).toBeVisible({
    timeout: 10000,
  });
  await expect(page.getByText("Stop code: GALLOP_PAYLOAD_DELIVERED")).toBeVisible({
    timeout: 40000,
  });
  const restartButton = page.getByRole("button", { name: "重新开始" });
  await expect(restartButton).toBeVisible({ timeout: 10000 });
  await restartButton.click({ force: true });

  await expect(page.getByText("H.O.R.S.E._v0.1.exe")).toBeVisible({
    timeout: 10000,
  });
  const state = await getState(page);
  expect(state.phase).toBe(1);
  expect(state.score).toBe(0);
});

test("win ending flow seals the horse and restarts", async ({ page }) => {
  await gotoFreshApp(page);

  // Enter FirewallUI and verify Phase 3 UI before validating the win ending.
  await dispatchAction(page, { type: "SET_PHASE", payload: 3 });
  await expect(page.getByText("STABLE_GATE FIREWALL v2.1")).toBeVisible();
  await dismissVisibleTrapSafely(page);
  await expect(page.locator("section button").first()).toBeVisible({
    timeout: 15000,
  });

  // Jump to the win ending after verifying FirewallUI is mounted.
  await dispatchAction(page, { type: "SET_PHASE", payload: 5 });
  await expect(page.getByText(/AXIOM:/)).toBeVisible({ timeout: 5000 });
  await dismissVisibleTrapSafely(page);
  const sealButton = page.getByRole("button", { name: "封印木马" });
  await expect(sealButton).toBeVisible({ timeout: 10000 });
  await sealButton.click();

  await expect(page.getByText("The horse has been sealed.")).toBeVisible({
    timeout: 5000,
  });
  const restartButton = page.getByRole("button", { name: "重新开始" });
  await expect(restartButton).toBeVisible({ timeout: 10000 });
  await restartButton.click({ force: true });

  await expect(page.getByText("H.O.R.S.E._v0.1.exe")).toBeVisible({
    timeout: 10000,
  });
  const state = await getState(page);
  expect(state.phase).toBe(1);
});
