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
  { path: "/whats-new", name: "whats-new" },
  { path: "/whats-new/privacy-policy-update", name: "whats-new-item" },
  { path: "/supporter", name: "supporter" },
  { path: "/settings/supporter", name: "supporter-settings" },
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
  { path: "/feedback", name: "feedback" },
  { path: "/about", name: "about", signedOut: true },
  { path: "/moderators", name: "moderators" },
  { path: "/safety", name: "safety", signedOut: true },
  { path: "/terms", name: "terms", signedOut: true },
  { path: "/privacy", name: "privacy", signedOut: true },

  /*
    The staff area, which had never been in here.

    It is the part of the product least likely to get looked at and most likely
    to drift: nobody arrives at it by accident, so a broken layout or an
    unreadable contrast pair can sit there for months. It is also the densest
    thing in the codebase, tables and filter rows and status chips, which is
    exactly the shape that breaks first at 390px.

    The demo seed makes sarah@example.com an admin, so the session the audit
    already holds reaches all of it with no second sign-in.
  */
  { path: "/admin", name: "admin-overview" },
  { path: "/admin/analytics", name: "admin-analytics" },
  { path: "/admin/feedback", name: "admin-feedback" },
  { path: "/admin/audit", name: "admin-audit" },
  { path: "/admin/reports", name: "admin-reports" },
  { path: "/admin/moderators", name: "admin-moderators" },
  { path: "/admin/guidelines", name: "admin-guidelines" },
  { path: "/admin/users", name: "admin-users" },
  { path: "/admin/waitlist", name: "admin-waitlist" },
  { path: "/admin/bunches", name: "admin-bunches" },
  { path: "/admin/activities", name: "admin-activities" },
  { path: "/admin/formation", name: "admin-formation" },
  { path: "/admin/interests", name: "admin-interests" },
  { path: "/admin/announcements", name: "admin-announcements" },
  { path: "/admin/site", name: "admin-site" },
  { path: "/admin/discord", name: "admin-discord" },
  { path: "/admin/brand", name: "admin-brand" },
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
      // Best practice as well as the WCAG tags. The conformance rules catch
      // contrast and names; the best-practice set is what catches a heading
      // level skipped, content outside a landmark, and an id used twice,
      // the things that make a page hard to navigate without ever failing an
      // audit.
      runOnly: {
        type: "tag",
        values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"],
      },
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
      nodes: v.nodes.slice(0, 4).map((n) => `${n.target.join(" ")}, ${n.html.slice(0, 160)}`),
    });
  }
}

interface Overflow {
  page: string;
  viewport: string;
  documentWidth: number;
  /**
   * The widest right edge any element actually reaches.
   *
   * Separate from `documentWidth` because an `overflow-x: hidden` anywhere up
   * the tree clamps `scrollWidth` to the viewport while the element still
   * sticks out and still gets cut off. The page then does not scroll sideways,
   * which looks like the problem is solved, and the content is simply missing
   * instead. Playwright's full-page capture uses the CSS content size and
   * ignores the clip, which is why the screenshots were coming out wider than
   * the viewport while `scrollWidth` insisted everything was fine.
   */
  contentWidth: number;
  viewportWidth: number;
  /** The outermost elements that overflow: where the fix usually goes. */
  containers: Array<{ tag: string; className: string; width: number; right: number; text: string }>;
  culprits: Array<{ tag: string; className: string; width: number; right: number; text: string }>;
}

const overflows: Overflow[] = [];

/** Pages the audit could not finish checking. Never silently empty. */
const probeFailures: string[] = [];

/**
 * Does the page scroll sideways, and if so, what is sticking out.
 *
 * axe does not check this and it is one of the few layout faults that is
 * unambiguously a bug rather than a matter of taste: a body that scrolls
 * horizontally on a phone makes every vertical swipe feel broken and pushes
 * half the design off the edge.
 *
 * It was found here by accident. Playwright captures a full-page screenshot at
 * the document width rather than the viewport width, so an overflowing page
 * silently produces a wider PNG, and the landing page had been coming out at
 * 672px instead of 390px without anybody noticing. Detecting it on purpose is
 * better than noticing an odd image size.
 *
 * Only the innermost offender is reported. An element that is too wide makes
 * every ancestor too wide as well, so listing all of them buries the one line
 * that matters under its own parents.
 *
 * Anything inside a container that scrolls on its own is skipped: a wide table
 * in an `overflow-x: auto` wrapper is the fix for this problem, not an
 * instance of it.
 */
async function checkOverflow(page: Page, pageName: string, viewportName: string, viewportWidth: number) {
  const found = await page.evaluate((vw) => {
    const CLIPPING = ["auto", "scroll", "hidden", "clip"];

    /*
      Everything here is written without a named inner function on purpose.
      This body is serialised and run in the browser, and tsx compiles with
      esbuild's keepNames, which wraps anything that gets an inferred name in a
      __name() helper that exists in the bundle and not in the page. A single
      `const isThing = (el) => ...` is enough to throw ReferenceError on every
      page, which is how this probe came to report a clean result while never
      running at all.
    */
    const offenders = Array.from(document.querySelectorAll("body *")).filter((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return false;
      if (getComputedStyle(el).position === "fixed") return false;
      if (rect.right + window.scrollX <= vw + 1) return false;
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        if (CLIPPING.includes(getComputedStyle(p).overflowX)) return false;
      }
      return true;
    });

    const offenderSet = new Set(offenders);
    /*
      Both ends of the chain, because they answer different questions.

      The innermost offender is the content that is too wide. The outermost is
      the container that let it happen, and that is usually where the fix goes:
      a flex row missing `flex-wrap`, or a grid item without `min-w-0`. Reporting
      only the innermost pointed at four footer links and hid the row holding
      them, which is the thing that actually needed changing.
    */
    const innermost = offenders.filter(
      (el) => !Array.from(el.children).some((c) => offenderSet.has(c)),
    );
    const outermost = offenders.filter(
      (el) => !(el.parentElement && offenderSet.has(el.parentElement)),
    );

    const widest = offenders.reduce(
      (max, el) => Math.max(max, Math.round(el.getBoundingClientRect().right + window.scrollX)),
      0,
    );

    return {
      documentWidth: Math.max(
        document.documentElement.scrollWidth,
        document.body.scrollWidth,
      ),
      contentWidth: widest,
      containers: outermost.slice(0, 4).map((el) => {
        const rect = el.getBoundingClientRect();
        return {
          tag: el.tagName.toLowerCase(),
          className: String(el.className ?? "").slice(0, 140),
          width: Math.round(rect.width),
          right: Math.round(rect.right + window.scrollX),
          text: "",
        };
      }),
      culprits: innermost.slice(0, 8).map((el) => {
        const rect = el.getBoundingClientRect();
        return {
          tag: el.tagName.toLowerCase(),
          className: String(el.className ?? "").slice(0, 140),
          width: Math.round(rect.width),
          right: Math.round(rect.right + window.scrollX),
          text: (el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 70),
        };
      }),
    };
  }, viewportWidth);

  if (found.contentWidth > viewportWidth + 1 || found.documentWidth > viewportWidth + 1) {
    overflows.push({
      page: pageName,
      viewport: viewportName,
      documentWidth: found.documentWidth,
      contentWidth: found.contentWidth,
      viewportWidth,
      containers: found.containers,
      culprits: found.culprits,
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
  // `waitForURL` to hang its default `load` condition on, it resolved
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
 * guarded by, so asking for it gives the settled page, which is the state a
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
          // `networkidle` is the right wait for a screenshot, it means the
          // images and fonts have arrived, but it must not be able to fail a
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
          // Force the lazy images in. `next/image` defers anything below the
          // fold, and a full-page screenshot resizes rather than scrolls, so
          // an image far down the page never enters a viewport, never loads,
          // and is captured as its blur placeholder. That is exactly how the
          // founder photograph on About first appeared to be broken when it was
          // serving perfectly well. Same shape of blind spot as the scroll
          // reveals above, same fix: render the page as a reader eventually
          // sees it, not as it looks in the first instant.
          await page.evaluate(async () => {
            for (const img of Array.from(document.images)) {
              if (img.loading === "lazy") img.loading = "eager";
            }
            await Promise.all(
              Array.from(document.images)
                .filter((img) => !img.complete)
                .map((img) => img.decode().catch(() => undefined)),
            );
          });

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

          // Once per width, in one theme: a page either scrolls sideways or it
          // does not, and that does not depend on the palette.
          if (theme === "light") {
            await checkOverflow(page, target.name, viewport.name, viewport.width);
          }
        } catch (error) {
          // Recorded, not just printed. A crashed probe used to leave the
          // summary saying "None", which is the most expensive kind of wrong:
          // a report that looks like a pass. The run now says what it failed
          // to check and exits non-zero.
          const message = String(error).slice(0, 200);
          probeFailures.push(`${target.name} ${viewport.name} ${theme}: ${message}`);
          console.error(`  ✗ ${target.name} ${viewport.name} ${theme}: ${message}`);
        }
      }

      await context.close();
      await anonContext.close();
    }
  }

  await browser.close();

  // Deduplicated: the same violation on the same page in both themes is one
  // problem, not two, unless it is a contrast one, those genuinely differ.
  const seen = new Set<string>();
  const unique = violations.filter((v) => {
    const key = `${v.page}|${v.id}|${v.id === "color-contrast" ? v.theme : ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  writeFileSync(`${OUT}/axe.json`, JSON.stringify(unique, null, 2));
  writeFileSync(`${OUT}/overflow.json`, JSON.stringify(overflows, null, 2));

  console.log("\n=== horizontal overflow ===");
  if (overflows.length === 0) {
    console.log("None. Nothing reaches past the viewport at either width.");
  } else {
    for (const o of overflows) {
      console.log(
        `\n[${o.viewport}] ${o.page}: content reaches ${o.contentWidth}px, document ${o.documentWidth}px, viewport ${o.viewportWidth}px`,
      );
      console.log("  outermost container:");
      for (const c of o.containers) {
        console.log(`    <${c.tag} class="${c.className}"> ${c.width}px wide, right edge ${c.right}`);
      }
      console.log("  innermost content:");
      for (const c of o.culprits) {
        console.log(`    <${c.tag} class="${c.className}"> ${c.width}px wide, right edge ${c.right}`);
        if (c.text) console.log(`      ${c.text}`);
      }
    }
  }

  const bySeverity = { critical: 0, serious: 0, moderate: 0, minor: 0 } as Record<string, number>;
  for (const v of unique) bySeverity[v.impact] = (bySeverity[v.impact] ?? 0) + 1;

  console.log("\n=== probe health ===");
  if (probeFailures.length === 0) {
    console.log(`Every page was checked at both widths in both themes.`);
  } else {
    console.log(`${probeFailures.length} checks did not complete:`);
    for (const failure of probeFailures) console.log(`  ! ${failure}`);
  }

  console.log("\n=== accessibility ===");
  console.log(
    `critical ${bySeverity.critical ?? 0} · serious ${bySeverity.serious ?? 0} · moderate ${bySeverity.moderate ?? 0} · minor ${bySeverity.minor ?? 0}`,
  );
  for (const v of unique.sort((a, b) => a.page.localeCompare(b.page))) {
    console.log(`\n[${v.impact}] ${v.page} (${v.theme}), ${v.id}`);
    console.log(`  ${v.help}`);
    for (const node of v.nodes) console.log(`    ${node}`);
  }

  // Non-zero when the run found something or could not look. The wrapper does
  // not swallow this, so it is usable from CI without reading the output.
  if (probeFailures.length > 0 || overflows.length > 0 || unique.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
