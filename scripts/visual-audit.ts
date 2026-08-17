import { mkdirSync, writeFileSync } from "node:fs";
import { chromium, type Browser, type Page } from "playwright";

/**
 * Look at Bunchy, and run an accessibility audit while you are there.
 *
 * Not a test. It signs in to a throwaway instance seeded with demo data, walks
 * the pages a member actually sees, writes a PNG of each at phone and desktop
 * width in both themes, and runs axe-core over every one of them.
 *
 *   ./scripts/visual-audit.sh [output-directory]
 *
 * That wrapper is the supported way in: it brings a preview container up with
 * a generated session secret, points this at it, and removes it afterwards.
 * Running this file directly against a long-lived instance is what left one
 * sitting on the host holding database credentials.
 *
 * It exists because the alternative was shipping design changes I could not
 * see. A build that compiles and a test that passes say nothing about whether
 * a page is legible, and three separate visual passes went out on the strength
 * of "the markup looks right".
 *
 * Deliberately pointed at a preview instance rather than production: it signs
 * in, clicks things, and any script that drives a real session against the
 * live database is one bad selector away from being a member's afternoon.
 */

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = process.env.OUT_DIR ?? "/out";
const EMAIL = process.env.DEMO_EMAIL ?? "sarah@example.com";
const PASSWORD = process.env.DEMO_PASSWORD ?? "bunchydemo1234";

/** The pages a member actually passes through, in roughly that order. */
const PAGES: Array<{ path: string; name: string; signedOut?: boolean }> = [
  // The one page a first-time visitor sees before deciding whether to stay, and
  // for a long time the only one this script did not look at.
  { path: "/", name: "landing", signedOut: true },
  { path: "/discover", name: "discover" },
  { path: "/discover/buzz", name: "buzz" },
  { path: "/discover/buzz/co-op-survival-thursday", name: "buzz-post" },
  { path: "/profile", name: "profile-own" },
  { path: "/u/milan", name: "profile-public" },
  { path: "/now", name: "now" },
  { path: "/bunches", name: "bunches" },
  { path: "/activities", name: "activities" },
  { path: "/radar", name: "radar" },
  { path: "/messages", name: "messages" },
  { path: "/notifications", name: "notifications" },
  { path: "/connections", name: "connections" },
  { path: "/do", name: "do" },
  { path: "/surprise", name: "surprise" },
  { path: "/start", name: "start" },
  { path: "/about", name: "about", signedOut: true },
  { path: "/moderators", name: "moderators" },
  { path: "/safety", name: "safety", signedOut: true },
  { path: "/terms", name: "terms", signedOut: true },
  { path: "/privacy", name: "privacy", signedOut: true },
];

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "mobile", width: 390, height: 844 },
];

interface Violation {
  page: string;
  theme: string;
  id: string;
  impact: string;
  help: string;
  nodes: string[];
}

const violations: Violation[] = [];

async function runAxe(page: Page, pageName: string, theme: string) {
  // Injected from the installed package rather than a CDN: this runs inside a
  // container with no reason to have outbound network access.
  await page.addScriptTag({ path: "node_modules/axe-core/axe.min.js" });

  const result = (await page.evaluate(async () => {
    // @ts-expect-error injected on window by the script tag above
    return await window.axe.run(document, {
      resultTypes: ["violations"],
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
    });
  })) as {
    violations: Array<{
      id: string;
      impact: string;
      help: string;
      nodes: Array<{ html: string; target: string[] }>;
    }>;
  };

  for (const v of result.violations) {
    violations.push({
      page: pageName,
      theme,
      id: v.id,
      impact: v.impact,
      help: v.help,
      nodes: v.nodes.slice(0, 4).map((n) => `${n.target.join(" ")} — ${n.html.slice(0, 160)}`),
    });
  }
}

/**
 * Sign in once and hand back the cookies.
 *
 * Once, not once per context. Four sign-ins in a row from one address is
 * enough to trip the login rate limiter (ten per fifteen minutes), and the run
 * then died halfway through with a navigation timeout that looked nothing like
 * its cause. The limiter is right; the audit was the thing behaving oddly.
 */
async function signInOnce(browser: Browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  // Wait on the response, not on a navigation. Signing in is a fetch followed
  // by a client-side `router.push`, and there is no document load for
  // `waitForURL` to hang its default `load` condition on — it resolved
  // sometimes and timed out others, on a sign-in that had already succeeded.
  const [response] = await Promise.all([
    page.waitForResponse((r) => r.url().endsWith("/api/auth/login"), { timeout: 30_000 }),
    page.click('button[type="submit"]'),
  ]);
  if (!response.ok()) {
    throw new Error(`sign-in failed: ${response.status()} ${await response.text()}`);
  }

  const state = await context.storageState();
  if (!state.cookies.some((c) => c.name === "bunchy_session")) {
    throw new Error("signed in, but no session cookie was stored");
  }
  await context.close();
  return state;
}

/**
 * Every context asks for reduced motion, and that is load-bearing rather than
 * polite.
 *
 * The scroll reveals in globals.css are driven by `animation-timeline: view()`,
 * so an element's opacity is a function of where the page is scrolled. A
 * full-page screenshot does not scroll: it resizes and captures, which left the
 * About page as a correct hero above eight thousand pixels of blank cream, and
 * had axe reporting contrast failures against text that was mid-fade rather
 * than against any colour anybody chose.
 *
 * `prefers-reduced-motion: reduce` is the switch those rules are already
 * guarded by, so asking for it gives the settled page — which is the state a
 * reader does their reading in, and the only state in which "is this legible"
 * is a meaningful question. It is also a real user preference, so this is the
 * page as some people always see it.
 */
async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const storageState = await signInOnce(browser);

  for (const viewport of VIEWPORTS) {
    for (const theme of ["light", "dark"] as const) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        colorScheme: theme,
        deviceScaleFactor: 1,
        storageState,
        reducedMotion: "reduce",
      });
      // A second, signed-out window at the same size and theme. The public
      // pages are marked `signedOut` because that is who reads them, and
      // shooting them through a member's session hides exactly what a visitor
      // sees: the marketing header instead of the app nav.
      const anonContext = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        colorScheme: theme,
        deviceScaleFactor: 1,
        reducedMotion: "reduce",
      });

      // Surface anything the app logs as broken; a console error is often the
      // first sign that a page rendered but did not work.
      const onError = (e: Error) => console.error(`  ! pageerror: ${e.message}`);
      const signedInPage = await context.newPage();
      const anonPage = await anonContext.newPage();
      signedInPage.on("pageerror", onError);
      anonPage.on("pageerror", onError);

      for (const target of PAGES) {
        const page = target.signedOut ? anonPage : signedInPage;
        try {
          // `networkidle` is the right wait for a screenshot — it means the
          // images and fonts have arrived — but it must not be able to fail a
          // page on its own. One hanging request (a link prefetch that never
          // resolves) left /now with no screenshot at all, which is the exact
          // blind spot this script exists to close. The page is rendered by
          // `load`; idle is a bonus, so a timeout waiting for it is not fatal.
          await page.goto(`${BASE}${target.path}`, {
            waitUntil: "load",
            timeout: 30_000,
          });
          await page
            .waitForLoadState("networkidle", { timeout: 10_000 })
            .catch(() => console.warn(`    (network never went idle on ${target.path})`));
          // Let the reveal animations settle so screenshots are not caught
          // mid-transition, which reads as a broken layout.
          await page.waitForTimeout(700);

          const file = `${OUT}/${target.name}-${viewport.name}-${theme}.png`;
          await page.screenshot({ path: file, fullPage: true });
          console.log(`  ✓ ${target.name} ${viewport.name} ${theme}`);

          // Once per page is enough for axe; the violations are the same at
          // both widths except for genuinely responsive ones, and running it
          // four times a page just makes the report harder to read.
          if (viewport.name === "desktop") {
            await runAxe(page, target.name, theme);
          }
        } catch (error) {
          console.error(`  ✗ ${target.name} ${viewport.name} ${theme}: ${String(error).slice(0, 120)}`);
        }
      }

      await context.close();
      await anonContext.close();
    }
  }

  await browser.close();

  // Deduplicated: the same violation on the same page in both themes is one
  // problem, not two, unless it is a contrast one — those genuinely differ.
  const seen = new Set<string>();
  const unique = violations.filter((v) => {
    const key = `${v.page}|${v.id}|${v.id === "color-contrast" ? v.theme : ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  writeFileSync(`${OUT}/axe.json`, JSON.stringify(unique, null, 2));

  const bySeverity = { critical: 0, serious: 0, moderate: 0, minor: 0 } as Record<string, number>;
  for (const v of unique) bySeverity[v.impact] = (bySeverity[v.impact] ?? 0) + 1;

  console.log("\n=== accessibility ===");
  console.log(
    `critical ${bySeverity.critical ?? 0} · serious ${bySeverity.serious ?? 0} · moderate ${bySeverity.moderate ?? 0} · minor ${bySeverity.minor ?? 0}`,
  );
  for (const v of unique.sort((a, b) => a.page.localeCompare(b.page))) {
    console.log(`\n[${v.impact}] ${v.page} (${v.theme}) — ${v.id}`);
    console.log(`  ${v.help}`);
    for (const node of v.nodes) console.log(`    ${node}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
