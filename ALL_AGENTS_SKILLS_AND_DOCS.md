# TỔNG HỢP TOÀN BỘ QUY TẮC AGENT, SKILLS VÀ TÀI LIỆU DỰ ÁN (ARCHIVE BUNDLE)

> File này lưu trữ toàn bộ các chỉ dẫn Agent (AGENTS.md), Skills (code-review, diagnosing-bugs, implement, improve-codebase-architecture, prototype) và toàn bộ Tài liệu kiến trúc dự án (docs/core/*.md) để tái sử dụng sau này.

## MỤC LỤC TỔNG HỢP

1. **.agents/AGENTS.md**
2. **.agents/skills/code-review/SKILL.md**
3. **.agents/skills/diagnosing-bugs/SKILL.md**
4. **.agents/skills/diagnosing-bugs/scripts/hitl-loop.template.sh**
5. **.agents/skills/implement/SKILL.md**
6. **.agents/skills/improve-codebase-architecture/HTML-REPORT.md**
7. **.agents/skills/improve-codebase-architecture/SKILL.md**
8. **.agents/skills/prototype/LOGIC.md**
9. **.agents/skills/prototype/SKILL.md**
10. **.agents/skills/prototype/UI.md**
11. **docs/core/BUG_FIXES_SUMMARY.md**
12. **docs/core/EXCEL_IMPORT_SYSTEM.md**
13. **docs/core/RFID_IMPLEMENTATION.md**
14. **docs/core/RFID_KEYBOARD_VERSION.md**
15. **docs/core/RFID_PROGRESS_SUMMARY.md**
16. **docs/core/RFID_VISUAL_GUIDE.md**
17. **docs/core/SQLITE_DATABASE_MIGRATION.md**
18. **docs/core/TABLE_CONSISTENCY.md**
19. **docs/core/UX_TABLE_GUIDELINES.md**
20. **docs/core/WAITLIST_SYSTEM.md**
21. **docs/core/design-system.md**
22. **docs/images/hinh_4_11_kiosk.png**
23. **docs/images/hinh_4_12_usage_analytics.png**
24. **docs/images/hinh_4_13_settings.png**
25. **docs/images/hinh_4_1_dashboard.png**
26. **docs/images/hinh_4_2_members.png**
27. **docs/images/hinh_4_4_equipment.png**
28. **docs/images/hinh_4_6_maintenance.png**
29. **docs/images/hinh_4_7_replacement_forecast.png**
30. **docs/images/hinh_4_8_schedule.png**
31. **docs/images/hinh_4_9_room_history.png**

---



# ========================================================
## TỆP TIN: .agents/AGENTS.md
# ========================================================

# Frontend Performance & Rendering Rules

## 1. CSS Backdrop-Filter Warning
Do NOT use `backdrop-filter: blur(...)` on large scrollable containers or frequently re-rendered elements (like `.glass-card` or large data tables).
- **Reason:** In Chromium-based browsers, applying a blur filter to a large scrolling element positioned over a dynamic or gradient background forces the GPU to recalculate the blur for every pixel on every frame, causing massive frame drops and scroll lag (Drop FPS).
- **Solution:** 
  - For large scrolling containers, use solid or slightly transparent backgrounds without `backdrop-filter`.
  - Use `backdrop-filter` ONLY on small, static overlays like Fixed Headers or Modal Overlays (`.modal-overlay`).
  - Always enforce Hardware Acceleration on heavy layers using `transform: translateZ(0); will-change: transform;`.

## 2. React Rendering Optimization (O(1) Lookups)
- **Reason:** Rendering massive tables or lists (e.g. 36-slot schedules) inside React forces `.map()` loops. If a lookup function inside `.map()` uses an Array `.find()`, the complexity becomes O(N*M), dropping UI frames drastically.
- **Solution:** Always transform fetched array data into a `Map` or a `Record<string, Object>` dictionary before passing it into state, so lookup becomes an O(1) direct access. Wrap lookup functions in `useCallback`.

## 3. CSS Spacing Management (Margin, Padding, Gap)
To maintain a robust, scalable, and accessible UI, adhere to the following spacing rules:

**Margin (Outer Space)**
- Use for creating vertical rhythm (e.g., Lobotomized Owl selector `* + *` for `margin-block-start`).
- Use to override specific spaces in the document flow.
- Use `margin-block-start` to separate large semantic blocks like `site-main` and `site-footer`.
- **CRITICAL RULE (Encapsulation):** NEVER apply margins directly to highly reusable components (like Buttons or Cards). A component should not dictate its outer spacing; the parent layout should dictate the spacing.

**Padding (Inner Space & UX)**
- Use `padding-inline` with variables for site gutters to keep consistent edges.
- Use `padding-block` for Header/Footer vertical spacing.
- **CRITICAL RULE (UX Rule 44x44):** Use padding to increase the clickable area of interactive elements (like Navigation Links) instead of using margins. Interactive elements should have a minimum target size of 44x44 pixels.
- Use padding inside Card components so the layout doesn't break when inner elements are removed.

**Gap (Grid & Flexbox)**
- Use `gap` exclusively for Flexbox and Grid containers to create perfectly even spacing between children (e.g., Card Grids).
- Do not abuse `gap` for normal text flow as it forces identical spacing everywhere, ruining typographic hierarchy.

**Decision Framework:**
- **Padding:** Element has a background, border, or needs a larger clickable area.
- **Gap:** Need identical spacing between items in a Grid or Flex container.
- **Margin:** Need precise control or overrides between elements in the normal document flow.

## 4. Button Design System (Carbon Specs)
**Variants & Colors:**
- **Primary:** Background `$button-primary`, Text `$text-on-color`. Hover: `$button-primary-hover`.
- **Secondary:** Background `$button-secondary`, Text `$text-on-color`.
- **Tertiary:** Transparent background, Border `$button-tertiary`, Text `$button-tertiary`. Hover/Active: Background `$button-tertiary-hover`, Text/Icon `$text-inverse`.
- **Ghost:** Transparent background, Text `$link-primary`. Hover: Background `$background-hover`.
- **Danger (Primary/Tertiary/Ghost):** Red based themes for destructive actions.
- **Focus State:** Always use `$focus` border and 1px inset padding.

**Structure & Spacing:**
- **Rule of 16px (1rem):** Elements inside a button must not be closer than 16px to the edge.
- **Padding (No Icon):** Left `1rem` (16px), Right `4rem` (64px).
- **Padding (With Icon):** Left `1rem`, Right `1rem`. Gap between label and icon `≥ 1rem` (16px).
- **Ghost Button Spacing:** Padding L/R `1rem`. Gap between label and icon `0.5rem` (8px).
- **Button Groups:** Gap between buttons should be fixed at `1rem` (16px).

**Sizes (Heights):**
- XS (24px), S (32px), M (40px), L (48px), XL (64px), 2XL (80px).
- Standard Icon Size: 16x16px. Expressive: 20x20px.

**Typography:**
- Use Sentence case (e.g. "Submit form").
- Standard: 14px, weight 400. Expressive: 16px, weight 400.

**Implementation Strategy:**
- Use React Props (`variant`, `size`, `hasIcon`) in a reusable `<Button>` component to calculate classes automatically rather than scattering CSS classes.

## 5. Global Design Tokens (Variables)
To maintain absolute consistency across the UI, ALWAYS use CSS variables (tokens) from `App.css` instead of hardcoding pixel or rem values:
- **Spacing:** `--space-xs` (4px), `--space-sm` (8px), `--space-md` (16px), `--space-lg` (24px), `--space-xl` (32px).
- **Border Radius:** `--radius-sm` (4px), `--radius-md` (8px), `--radius-lg` (12px), `--radius-xl` (16px).
- **Cards (`.glass-card`):** Do NOT apply inline paddings (e.g. `style={{ padding: '1rem' }}`). The `.glass-card` class inherently includes `padding: var(--space-lg)` and `gap: var(--space-md)` via Flexbox.
- **Inputs:** Use standard `.checkin-input`, `.search-input`, or `.form-group input` for all text inputs. They are globally standardized to a height of 40px and `border-radius: var(--radius-md)`.

## 6. UI/UX Pro Max - Pre-Delivery Guidelines

These are canonical Pre-Delivery checks based on the UI/UX Pro Max Skill. Always verify these before delivering UI code.

### 6.1 Icons & Visuals
| Rule | Do | Don't | Why |
|------|----|-------|-----|
| **Correct Brand Logos** | Use official brand assets and follow their usage guidelines (spacing, color, clear space). | Guessing logo paths, recoloring unofficially, or modifying proportions. | Prevents brand misuse and ensures legal/platform compliance. |
| **Consistent Icon Sizing** | Define icon sizes as design tokens (e.g., icon-sm, icon-md = 24pt, icon-lg). | Mixing arbitrary values like 20pt / 24pt / 28pt randomly. | Maintains rhythm and visual hierarchy across the interface. |
| **Stroke Consistency** | Use a consistent stroke width within the same visual layer (e.g., 1.5px or 2px). | Mixing thick and thin stroke styles arbitrarily. | Inconsistent strokes reduce perceived polish and cohesion. |
| **Filled vs Outline Discipline** | Use one icon style per hierarchy level. | Mixing filled and outline icons at the same hierarchy level. | Maintains semantic clarity and stylistic coherence. |
| **Touch Target Minimum** | Minimum 44x44pt interactive area (use hitSlop if icon is smaller). | Small icons without expanded tap area. | Meets accessibility and platform usability standards. |
| **Icon Alignment** | Align icons to text baseline and maintain consistent padding. | Misaligned icons or inconsistent spacing around them. | Prevents subtle visual imbalance that reduces perceived quality. |
| **Icon Contrast** | Follow WCAG contrast standards: 4.5:1 for small elements, 3:1 minimum for larger UI glyphs. | Low-contrast icons that blend into the background. | Ensures accessibility in both light and dark modes. |

### 6.2 Interaction & Accessibility
| Rule | Do | Don't |
|------|----|----- |
| **Tap feedback** | Provide clear pressed feedback (ripple/opacity/elevation) within 80-150ms | No visual response on tap |
| **Animation timing** | Keep micro-interactions around 150-300ms with platform-native easing | Instant transitions or slow animations (>500ms) |
| **Accessibility focus** | Ensure screen reader focus order matches visual order and labels are descriptive | Unlabeled controls or confusing focus traversal |
| **Disabled state clarity** | Use disabled semantics (`disabled`/native disabled props), reduced emphasis, and no tap action | Controls that look tappable but do nothing |

### 6.3 Light/Dark Mode Contrast
| Rule | Do | Don't |
|------|----|----- |
| **Surface readability (light)** | Keep cards/surfaces clearly separated from background with sufficient opacity/elevation | Overly transparent surfaces that blur hierarchy |
| **Text contrast (light)** | Maintain body text contrast >=4.5:1 against light surfaces | Low-contrast gray body text |
| **Text contrast (dark)** | Maintain primary text contrast >=4.5:1 and secondary text >=3:1 on dark surfaces | Dark mode text that blends into background |
| **Border and divider visibility** | Ensure separators are visible in both themes (not just light mode) | Theme-specific borders disappearing in one mode |
| **State contrast parity** | Keep pressed/focused/disabled states equally distinguishable in light and dark themes | Defining interaction states for one theme only |
| **Scrim and modal legibility** | Use a modal scrim strong enough to isolate foreground content (typically 40-60% black) | Weak scrim that leaves background visually competing |

### 6.4 Layout & Spacing
| Rule | Do | Don't |
|------|----|----- |
| **Safe-area compliance** | Respect top/bottom safe areas for all fixed headers, tab bars, and CTA bars | Placing fixed UI under notch, status bar, or gesture area |
| **Consistent content width** | Keep predictable content width per device class (phone/tablet) | Mixing arbitrary widths between screens |
| **8dp spacing rhythm** | Use a consistent 4/8dp spacing system for padding/gaps/section spacing | Random spacing increments with no rhythm |
| **Readable text measure** | Keep long-form text readable on large devices (avoid edge-to-edge paragraphs on tablets) | Full-width long text that hurts readability |
| **Section spacing hierarchy** | Define clear vertical rhythm tiers (e.g., 16/24/32/48) by hierarchy | Similar UI levels with inconsistent spacing |
| **Scroll and fixed element coexistence** | Add bottom/top content insets so lists are not hidden behind fixed bars | Scroll content obscured by sticky headers/footers |


---


# ========================================================
## TỆP TIN: .agents/skills/code-review/SKILL.md
# ========================================================

---
name: code-review
description: Review the changes since a fixed point (commit, branch, tag, or merge-base) along two axes — Standards (does the code follow this repo's documented coding standards?) and Spec (does the code match what the originating issue/PRD asked for?). Runs both reviews in parallel sub-agents and reports them side by side. Use when the user wants to review a branch, a PR, work-in-progress changes, or asks to "review since X".
---

Two-axis review of the diff between `HEAD` and a fixed point the user supplies:

- **Standards** — does the code conform to this repo's documented coding standards?
- **Spec** — does the code faithfully implement the originating issue / PRD / spec?

Both axes run as **parallel sub-agents** so they don't pollute each other's context, then this skill aggregates their findings.

The issue tracker should have been provided to you — run `/setup-matt-pocock-skills` if `docs/agents/issue-tracker.md` is missing.

## Process

### 1. Pin the fixed point

Whatever the user said is the fixed point — a commit SHA, branch name, tag, `main`, `HEAD~5`, etc. If they didn't specify one, ask for it.

Capture the diff command once: `git diff <fixed-point>...HEAD` (three-dot, so the comparison is against the merge-base). Also note the list of commits via `git log <fixed-point>..HEAD --oneline`.

Before going further, confirm the fixed point resolves (`git rev-parse <fixed-point>`) and the diff is non-empty. A bad ref or empty diff should fail here — not inside two parallel sub-agents.

### 2. Identify the spec source

Look for the originating spec, in this order:

1. Issue references in the commit messages (`#123`, `Closes #45`, GitLab `!67`, etc.) — fetch via the workflow in `docs/agents/issue-tracker.md`.
2. A path the user passed as an argument.
3. A PRD/spec file under `docs/`, `specs/`, or `.scratch/` matching the branch name or feature.
4. If nothing is found, ask the user where the spec is. If they say there isn't one, the **Spec** sub-agent will skip and report "no spec available".

### 3. Identify the standards sources

Anything in the repo that documents how code should be written, such as `CODING_STANDARDS.md` or `CONTRIBUTING.md`.

On top of whatever the repo documents, the Standards axis always carries the **smell baseline** below — a fixed set of Fowler code smells (_Refactoring_, ch.3) that applies even when a repo documents nothing. Two rules bind it:

- **The repo overrides.** A documented repo standard always wins; where it endorses something the baseline would flag, suppress the smell.
- **Always a judgement call.** Each smell is a labelled heuristic ("possible Feature Envy"), never a hard violation — and, like any standard here, skip anything tooling already enforces.

Each smell reads *what it is* → *how to fix*; match it against the diff:

- **Mysterious Name** — a function, variable, or type whose name doesn't reveal what it does or holds. → rename it; if no honest name comes, the design's murky.
- **Duplicated Code** — the same logic shape appears in more than one hunk or file in the change. → extract the shared shape, call it from both.
- **Feature Envy** — a method that reaches into another object's data more than its own. → move the method onto the data it envies.
- **Data Clumps** — the same few fields or params keep travelling together (a type wanting to be born). → bundle them into one type, pass that.
- **Primitive Obsession** — a primitive or string standing in for a domain concept that deserves its own type. → give the concept its own small type.
- **Repeated Switches** — the same `switch`/`if`-cascade on the same type recurs across the change. → replace with polymorphism, or one map both sites share.
- **Shotgun Surgery** — one logical change forces scattered edits across many files in the diff. → gather what changes together into one module.
- **Divergent Change** — one file or module is edited for several unrelated reasons. → split so each module changes for one reason.
- **Speculative Generality** — abstraction, parameters, or hooks added for needs the spec doesn't have. → delete it; inline back until a real need shows.
- **Message Chains** — long `a.b().c().d()` navigation the caller shouldn't depend on. → hide the walk behind one method on the first object.
- **Middle Man** — a class or function that mostly just delegates onward. → cut it, call the real target direct.
- **Refused Bequest** — a subclass or implementer that ignores or overrides most of what it inherits. → drop the inheritance, use composition.

### 4. Spawn both sub-agents in parallel

Send a single message with two `Agent` tool calls. Use the `general-purpose` subagent for both.

**Standards sub-agent prompt** — include:

- The full diff command and commit list.
- The list of standards-source files you found in step 3, **plus the smell baseline from step 3** pasted in full — the sub-agent has no other access to it.
- The brief: "Report — per file/hunk where relevant — (a) every place the diff violates a documented standard: cite the standard (file + the rule); and (b) any baseline smell you spot: name it and quote the hunk. Distinguish hard violations from judgement calls — documented-standard breaches can be hard, but baseline smells are always judgement calls, and a documented repo standard overrides the baseline. Skip anything tooling enforces. Under 400 words."

**Spec sub-agent prompt** — include:

- The diff command and commit list.
- The path or fetched contents of the spec.
- The brief: "Report: (a) requirements the spec asked for that are missing or partial; (b) behaviour in the diff that wasn't asked for (scope creep); (c) requirements that look implemented but where the implementation looks wrong. Quote the spec line for each finding. Under 400 words."

If the spec is missing, skip the Spec sub-agent and note this in the final report.

### 5. Aggregate

Present the two reports under `## Standards` and `## Spec` headings, verbatim or lightly cleaned. Do **not** merge or rerank findings — the two axes are deliberately separate (see _Why two axes_).

End with a one-line summary: total findings per axis, and the worst issue _within each axis_ (if any). Don't pick a single winner across axes — that's the reranking the separation exists to prevent.

## Why two axes

A change can pass one axis and fail the other:

- Code that follows every standard but implements the wrong thing → **Standards pass, Spec fail.**
- Code that does exactly what the issue asked but breaks the project's conventions → **Spec pass, Standards fail.**

Reporting them separately stops one axis from masking the other.


---


# ========================================================
## TỆP TIN: .agents/skills/diagnosing-bugs/SKILL.md
# ========================================================

---
name: diagnosing-bugs
description: Diagnosis loop for hard bugs and performance regressions. Use when the user says "diagnose"/"debug this", or reports something broken/throwing/failing/slow.
---

# Diagnosing Bugs

A discipline for hard bugs. Skip phases only when explicitly justified.

When exploring the codebase, read `CONTEXT.md` (if it exists) to get a clear mental model of the relevant modules, and check ADRs in the area you're touching.

## Phase 1 — Build a feedback loop

**This is the skill.** Everything else is mechanical. If you have a **tight** pass/fail signal for the bug — one that goes red on _this_ bug — you will find the cause; bisection, hypothesis-testing, and instrumentation all just consume it. If you don't have one, no amount of staring at code will save you.

Spend disproportionate effort here. **Be aggressive. Be creative. Refuse to give up.**

### Ways to construct one — try them in roughly this order

1. **Failing test** at whatever seam reaches the bug — unit, integration, e2e.
2. **Curl / HTTP script** against a running dev server.
3. **CLI invocation** with a fixture input, diffing stdout against a known-good snapshot.
4. **Headless browser script** (Playwright / Puppeteer) — drives the UI, asserts on DOM/console/network.
5. **Replay a captured trace.** Save a real network request / payload / event log to disk; replay it through the code path in isolation.
6. **Throwaway harness.** Spin up a minimal subset of the system (one service, mocked deps) that exercises the bug code path with a single function call.
7. **Property / fuzz loop.** If the bug is "sometimes wrong output", run 1000 random inputs and look for the failure mode.
8. **Bisection harness.** If the bug appeared between two known states (commit, dataset, version), automate "boot at state X, check, repeat" so you can `git bisect run` it.
9. **Differential loop.** Run the same input through old-version vs new-version (or two configs) and diff outputs.
10. **HITL bash script.** Last resort. If a human must click, drive _them_ with `scripts/hitl-loop.template.sh` so the loop is still structured. Captured output feeds back to you.

Build the right feedback loop, and the bug is 90% fixed.

### Tighten the loop

Treat the loop as a product. Once you have _a_ loop, **tighten** it:

- Can I make it faster? (Cache setup, skip unrelated init, narrow the test scope.)
- Can I make the signal sharper? (Assert on the specific symptom, not "didn't crash".)
- Can I make it more deterministic? (Pin time, seed RNG, isolate filesystem, freeze network.)

A 30-second flaky loop is barely better than no loop; a 2-second deterministic one is tight — a debugging superpower.

### Non-deterministic bugs

The goal is not a clean repro but a **higher reproduction rate**. Loop the trigger 100×, parallelise, add stress, narrow timing windows, inject sleeps. A 50%-flake bug is debuggable; 1% is not — keep raising the rate until it's debuggable.

### When you genuinely cannot build a loop

Stop and say so explicitly. List what you tried. Ask the user for: (a) access to whatever environment reproduces it, (b) a captured artifact (HAR file, log dump, core dump, screen recording with timestamps), or (c) permission to add temporary production instrumentation. Do **not** proceed to hypothesise without a loop.

### Completion criterion — a tight loop that goes red

Phase 1 is done when the loop is **tight** and **red-capable**: you can name **one command** — a script path, a test invocation, a curl — that you have **already run at least once** (paste the invocation and its output), and that is:

- [ ] **Red-capable** — it drives the actual bug code path and asserts the **user's exact symptom**, so it can go red on this bug and green once fixed. Not "runs without erroring" — it must be able to _catch this specific bug_.
- [ ] **Deterministic** — same verdict every run (flaky bugs: a pinned, high reproduction rate, per above).
- [ ] **Fast** — seconds, not minutes.
- [ ] **Agent-runnable** — you can run it unattended; a human in the loop only via `scripts/hitl-loop.template.sh`.

If you catch yourself reading code to build a theory before this command exists, **stop — jumping straight to a hypothesis is the exact failure this skill prevents.** No red-capable command, no Phase 2.

## Phase 2 — Reproduce + minimise

Run the loop. Watch it go red — the bug appears.

Confirm:

- [ ] The loop produces the failure mode the **user** described — not a different failure that happens to be nearby. Wrong bug = wrong fix.
- [ ] The failure is reproducible across multiple runs (or, for non-deterministic bugs, reproducible at a high enough rate to debug against).
- [ ] You have captured the exact symptom (error message, wrong output, slow timing) so later phases can verify the fix actually addresses it.

### Minimise

Once it's red, shrink the repro to the **smallest scenario that still goes red**. Cut inputs, callers, config, data, and steps **one at a time**, re-running the loop after each cut — keep only what's load-bearing for the failure.

Why bother: a minimal repro shrinks the hypothesis space in Phase 3 (fewer moving parts left to suspect) and becomes the clean regression test in Phase 5.

Done when **every remaining element is load-bearing** — removing any one of them makes the loop go green.

Do not proceed until you have reproduced **and** minimised.

## Phase 3 — Hypothesise

Generate **3–5 ranked hypotheses** before testing any of them. Single-hypothesis generation anchors on the first plausible idea.

Each hypothesis must be **falsifiable**: state the prediction it makes.

> Format: "If <X> is the cause, then <changing Y> will make the bug disappear / <changing Z> will make it worse."

If you cannot state the prediction, the hypothesis is a vibe — discard or sharpen it.

**Show the ranked list to the user before testing.** They often have domain knowledge that re-ranks instantly ("we just deployed a change to #3"), or know hypotheses they've already ruled out. Cheap checkpoint, big time saver. Don't block on it — proceed with your ranking if the user is AFK.

## Phase 4 — Instrument

Each probe must map to a specific prediction from Phase 3. **Change one variable at a time.**

Tool preference:

1. **Debugger / REPL inspection** if the env supports it. One breakpoint beats ten logs.
2. **Targeted logs** at the boundaries that distinguish hypotheses.
3. Never "log everything and grep".

**Tag every debug log** with a unique prefix, e.g. `[DEBUG-a4f2]`. Cleanup at the end becomes a single grep. Untagged logs survive; tagged logs die.

**Perf branch.** For performance regressions, logs are usually wrong. Instead: establish a baseline measurement (timing harness, `performance.now()`, profiler, query plan), then bisect. Measure first, fix second.

## Phase 5 — Fix + regression test

Write the regression test **before the fix** — but only if there is a **correct seam** for it.

A correct seam is one where the test exercises the **real bug pattern** as it occurs at the call site. If the only available seam is too shallow (single-caller test when the bug needs multiple callers, unit test that can't replicate the chain that triggered the bug), a regression test there gives false confidence.

**If no correct seam exists, that itself is the finding.** Note it. The codebase architecture is preventing the bug from being locked down. Flag this for the next phase.

If a correct seam exists:

1. Turn the minimised repro into a failing test at that seam.
2. Watch it fail.
3. Apply the fix.
4. Watch it pass.
5. Re-run the Phase 1 feedback loop against the original (un-minimised) scenario.

## Phase 6 — Cleanup + post-mortem

Required before declaring done:

- [ ] Original repro no longer reproduces (re-run the Phase 1 loop)
- [ ] Regression test passes (or absence of seam is documented)
- [ ] All `[DEBUG-...]` instrumentation removed (`grep` the prefix)
- [ ] Throwaway prototypes deleted (or moved to a clearly-marked debug location)
- [ ] The hypothesis that turned out correct is stated in the commit / PR message — so the next debugger learns

**Then ask: what would have prevented this bug?** If the answer involves architectural change (no good test seam, tangled callers, hidden coupling) hand off to the `/improve-codebase-architecture` skill with the specifics. Make the recommendation **after** the fix is in, not before — you have more information now than when you started.


---


# ========================================================
## TỆP TIN: .agents/skills/diagnosing-bugs/scripts/hitl-loop.template.sh
# ========================================================

#!/usr/bin/env bash
# Human-in-the-loop reproduction loop.
# Copy this file, edit the steps below, and run it.
# The agent runs the script; the user follows prompts in their terminal.
#
# Usage:
#   bash hitl-loop.template.sh
#
# Two helpers:
#   step "<instruction>"          → show instruction, wait for Enter
#   capture VAR "<question>"      → show question, read response into VAR
#
# At the end, captured values are printed as KEY=VALUE for the agent to parse.

set -euo pipefail

step() {
  printf '\n>>> %s\n' "$1"
  read -r -p "    [Enter when done] " _
}

capture() {
  local var="$1" question="$2" answer
  printf '\n>>> %s\n' "$question"
  read -r -p "    > " answer
  printf -v "$var" '%s' "$answer"
}

# --- edit below ---------------------------------------------------------

step "Open the app at http://localhost:3000 and sign in."

capture ERRORED "Click the 'Export' button. Did it throw an error? (y/n)"

capture ERROR_MSG "Paste the error message (or 'none'):"

# --- edit above ---------------------------------------------------------

printf '\n--- Captured ---\n'
printf 'ERRORED=%s\n' "$ERRORED"
printf 'ERROR_MSG=%s\n' "$ERROR_MSG"


---


# ========================================================
## TỆP TIN: .agents/skills/implement/SKILL.md
# ========================================================

---
name: implement
description: "Implement a piece of work based on a spec or set of tickets."
disable-model-invocation: true
---

Implement the work described by the user in the spec or tickets.

Use /tdd where possible, at pre-agreed seams.

Run typechecking regularly, single test files regularly, and the full test suite once at the end.

Once done, use /code-review to review the work.

Commit your work to the current branch.


---


# ========================================================
## TỆP TIN: .agents/skills/improve-codebase-architecture/HTML-REPORT.md
# ========================================================

# HTML Report Format

The architectural review is rendered as a single self-contained HTML file in the OS temp directory. Tailwind and Mermaid both come from CDNs. Mermaid handles graph-shaped diagrams reliably; hand-built divs and inline SVG handle the more editorial visuals (mass diagrams, cross-sections). Mix the two — don't lean on Mermaid for everything, it'll start to look generic.

## Scaffold

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Architecture review — {{repo name}}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script type="module">
      import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
      mermaid.initialize({ startOnLoad: true, theme: "neutral", securityLevel: "loose" });
    </script>
    <style>
      /* small custom layer for things Tailwind doesn't cover cleanly:
         dashed seam lines, hand-drawn-feeling arrow heads, etc. */
      .seam { stroke-dasharray: 4 4; }
      .leak { stroke: #dc2626; }
      .deep { background: linear-gradient(135deg, #0f172a, #1e293b); }
    </style>
  </head>
  <body class="bg-stone-50 text-slate-900 font-sans">
    <main class="max-w-5xl mx-auto px-6 py-12 space-y-12">
      <header>...</header>
      <section id="candidates" class="space-y-10">...</section>
      <section id="top-recommendation">...</section>
    </main>
  </body>
</html>
```

## Header

Repo name, date, and a compact legend: solid box = module, dashed line = seam, red arrow = leakage, thick dark box = deep module. No introduction paragraph — straight into the candidates.

## Candidate card

The diagrams carry the weight. Prose is sparse, plain, and uses the glossary terms (from the `/codebase-design` skill) without ceremony.

Each candidate is one `<article>`:

- **Title** — short, names the deepening (e.g. "Collapse the Order intake pipeline").
- **Badge row** — recommendation strength (`Strong` = emerald, `Worth exploring` = amber, `Speculative` = slate), plus a tag for the dependency category (`in-process`, `local-substitutable`, `ports & adapters`, `mock`).
- **Files** — monospaced list, `font-mono text-sm`.
- **Before / After diagram** — the centrepiece. Two columns, side by side. See patterns below.
- **Problem** — one sentence. What hurts.
- **Solution** — one sentence. What changes.
- **Wins** — bullets, ≤6 words each. e.g. "Tests hit one interface", "Pricing logic stops leaking", "Delete 4 shallow wrappers".
- **ADR callout** (if applicable) — one line in an amber-tinted box.

No paragraphs of explanation. If the diagram needs a paragraph to be understood, redraw the diagram.

## Diagram patterns

Pick the pattern that fits the candidate. Mix them. Don't make every diagram look the same — variety is part of the point.

### Mermaid graph (the workhorse for dependencies / call flow)

Use a Mermaid `flowchart` or `graph` when the point is "X calls Y calls Z, and look at the mess." Wrap it in a Tailwind-styled card so it doesn't feel parachuted in. Style with classDef to colour leakage edges red and the deep module dark. Sequence diagrams work well for "before: 6 round-trips; after: 1."

```html
<div class="rounded-lg border border-slate-200 bg-white p-4">
  <pre class="mermaid">
    flowchart LR
      A[OrderHandler] --> B[OrderValidator]
      B --> C[OrderRepo]
      C -.leak.-> D[PricingClient]
      classDef leak stroke:#dc2626,stroke-width:2px;
      class C,D leak
  </pre>
</div>
```

### Hand-built boxes-and-arrows (when Mermaid's layout fights you)

Modules as `<div>`s with borders and labels. Arrows as inline SVG `<line>` or `<path>` elements positioned absolutely over a relative container. Reach for this when you want the "after" diagram to feel like one thick-bordered deep module with greyed-out internals — Mermaid won't render that with the right weight.

### Cross-section (good for layered shallowness)

Stack horizontal bands (`h-12 border-l-4`) to show layers a call passes through. Before: 6 thin layers each doing nothing. After: 1 thick band labelled with the consolidated responsibility.

### Mass diagram (good for "interface as wide as implementation")

Two rectangles per module — one for interface surface area, one for implementation. Before: interface rectangle is nearly as tall as the implementation rectangle (shallow). After: interface rectangle is short, implementation rectangle is tall (deep).

### Call-graph collapse

Before: a tree of function calls rendered as nested boxes. After: the same tree collapsed into one box, with the now-internal calls shown faded inside it.

## Style guidance

- Lean editorial, not corporate-dashboard. Generous whitespace. Serif optional for headings (`font-serif` works well with stone/slate).
- Colour sparingly: one accent (emerald or indigo) plus red for leakage and amber for warnings.
- Keep diagrams ~320px tall so before/after sits comfortably side by side without scrolling.
- Use `text-xs uppercase tracking-wider` for module labels inside diagrams — they should read as schematic, not as UI.
- The only scripts are the Tailwind CDN and the Mermaid ESM import. The report is otherwise static — no app code, no interactivity beyond Mermaid's own rendering.

## Top recommendation section

One larger card. Candidate name, one sentence on why, anchor link to its card. That's it.

## Tone

Plain English, concise — but the architectural nouns and verbs come straight from the `/codebase-design` skill. Concision is not an excuse to drift.

**Use exactly:** module, interface, implementation, depth, deep, shallow, seam, adapter, leverage, locality.

**Never substitute:** component, service, unit (for module) · API, signature (for interface) · boundary (for seam) · layer, wrapper (for module, when you mean module).

**Phrasings that fit the style:**

- "Order intake module is shallow — interface nearly matches the implementation."
- "Pricing leaks across the seam."
- "Deepen: one interface, one place to test."
- "Two adapters justify the seam: HTTP in prod, in-memory in tests."

**Wins bullets** name the gain in glossary terms: *"locality: bugs concentrate in one module"*, *"leverage: one interface, N call sites"*, *"interface shrinks; implementation absorbs the wrappers"*. Don't write *"easier to maintain"* or *"cleaner code"* — those terms aren't in the glossary and don't earn their place.

No hedging, no throat-clearing, no "it's worth noting that…". If a sentence could be a bullet, make it a bullet. If a bullet could be cut, cut it. If a term isn't in the `/codebase-design` glossary, reach for one that is before inventing a new one.


---


# ========================================================
## TỆP TIN: .agents/skills/improve-codebase-architecture/SKILL.md
# ========================================================

---
name: improve-codebase-architecture
description: Scan a codebase for deepening opportunities, present them as a visual HTML report, then grill through whichever one you pick.
disable-model-invocation: true
---

# Improve Codebase Architecture

Surface architectural friction and propose **deepening opportunities** — refactors that turn shallow modules into deep ones. The aim is testability and AI-navigability.

This command is _informed_ by the project's domain model and built on a shared design vocabulary:

- Run the `/codebase-design` skill for the architecture vocabulary (**module**, **interface**, **depth**, **seam**, **adapter**, **leverage**, **locality**) and its principles (the deletion test, "the interface is the test surface", "one adapter = hypothetical seam, two = real"). Use these terms exactly in every suggestion — don't drift into "component," "service," "API," or "boundary."
- The domain language in `CONTEXT.md` gives names to good seams; ADRs in `docs/adr/` record decisions this command should not re-litigate.

## Process

### 1. Explore

Read the project's domain glossary (`CONTEXT.md`) and any ADRs in the area you're touching first.

Then use the Agent tool with `subagent_type=Explore` to walk the codebase. Don't follow rigid heuristics — explore organically and note where you experience friction:

- Where does understanding one concept require bouncing between many small modules?
- Where are modules **shallow** — interface nearly as complex as the implementation?
- Where have pure functions been extracted just for testability, but the real bugs hide in how they're called (no **locality**)?
- Where do tightly-coupled modules leak across their seams?
- Which parts of the codebase are untested, or hard to test through their current interface?

Apply the **deletion test** to anything you suspect is shallow: would deleting it concentrate complexity, or just move it? A "yes, concentrates" is the signal you want.

### 2. Present candidates as an HTML report

Write a self-contained HTML file to the OS temp directory so nothing lands in the repo. Resolve the temp dir from `$TMPDIR`, falling back to `/tmp` (or `%TEMP%` on Windows), and write to `<tmpdir>/architecture-review-<timestamp>.html` so each run gets a fresh file. Open it for the user — `xdg-open <path>` on Linux, `open <path>` on macOS, `start <path>` on Windows — and tell them the absolute path.

The report uses **Tailwind via CDN** for layout and styling, and **Mermaid via CDN** for diagrams where a graph/flow/sequence reliably communicates the structure. Mix Mermaid with hand-crafted CSS/SVG visuals — use Mermaid when relationships are graph-shaped (call graphs, dependencies, sequences), and hand-built divs/SVG when you want something more editorial (mass diagrams, cross-sections, collapse animations). Each candidate gets a **before/after visualisation**. Be visual.

For each candidate, render a card with:

- **Files** — which files/modules are involved
- **Problem** — why the current architecture is causing friction
- **Solution** — plain English description of what would change
- **Benefits** — explained in terms of locality and leverage, and how tests would improve
- **Before / After diagram** — side-by-side, custom-drawn, illustrating the shallowness and the deepening
- **Recommendation strength** — one of `Strong`, `Worth exploring`, `Speculative`, rendered as a badge

End the report with a **Top recommendation** section: which candidate you'd tackle first and why.

**Use CONTEXT.md vocabulary for the domain, and the `/codebase-design` vocabulary for the architecture.** If `CONTEXT.md` defines "Order," talk about "the Order intake module" — not "the FooBarHandler," and not "the Order service."

**ADR conflicts**: if a candidate contradicts an existing ADR, only surface it when the friction is real enough to warrant revisiting the ADR. Mark it clearly in the card (e.g. a warning callout: _"contradicts ADR-0007 — but worth reopening because…"_). Don't list every theoretical refactor an ADR forbids.

See [HTML-REPORT.md](HTML-REPORT.md) for the full HTML scaffold, diagram patterns, and styling guidance.

Do NOT propose interfaces yet. After the file is written, ask the user: "Which of these would you like to explore?"

### 3. Grilling loop

Once the user picks a candidate, run the `/grilling` skill to walk the design tree with them — constraints, dependencies, the shape of the deepened module, what sits behind the seam, what tests survive.

Side effects happen inline as decisions crystallize — run the `/domain-modeling` skill to keep the domain model current as you go:

- **Naming a deepened module after a concept not in `CONTEXT.md`?** Add the term to `CONTEXT.md`. Create the file lazily if it doesn't exist.
- **Sharpening a fuzzy term during the conversation?** Update `CONTEXT.md` right there.
- **User rejects the candidate with a load-bearing reason?** Offer an ADR, framed as: _"Want me to record this as an ADR so future architecture reviews don't re-suggest it?"_ Only offer when the reason would actually be needed by a future explorer to avoid re-suggesting the same thing — skip ephemeral reasons ("not worth it right now") and self-evident ones.
- **Want to explore alternative interfaces for the deepened module?** Run the `/codebase-design` skill and use its design-it-twice parallel sub-agent pattern.


---


# ========================================================
## TỆP TIN: .agents/skills/prototype/LOGIC.md
# ========================================================

# Logic Prototype

A tiny interactive terminal app that lets the user drive a state model by hand. Use this when the question is about **business logic, state transitions, or data shape** — the kind of thing that looks reasonable on paper but only feels wrong once you push it through real cases.

## When this is the right shape

- "I'm not sure if this state machine handles the edge case where X then Y."
- "Does this data model actually let me represent the case where..."
- "I want to feel out what the API should look like before writing it."
- Anything where the user wants to **press buttons and watch state change**.

If the question is "what should this look like" — wrong branch. Use [UI.md](UI.md).

## Process

### 1. State the question

Before writing code, write down what state model and what question you're prototyping. One paragraph, in the prototype's README or a comment at the top of the file. A logic prototype that answers the wrong question is pure waste — make the question explicit so it can be checked later, whether the user is watching now or returning to it AFK.

### 2. Pick the language

Use whatever the host project uses. If the project has no obvious runtime (e.g. a docs repo), ask.

Match the project's existing conventions for tooling — don't add a new package manager or runtime just for the prototype.

### 3. Isolate the logic in a portable module

Put the actual logic — the bit that's answering the question — behind a small, pure interface that could be lifted out and dropped into the real codebase later. The TUI around it is throwaway; the logic module shouldn't be.

The right shape depends on the question:

- **A pure reducer** — `(state, action) => state`. Good when actions are discrete events and state is a single value.
- **A state machine** — explicit states and transitions. Good when "which actions are even legal right now" is part of the question.
- **A small set of pure functions** over a plain data type. Good when there's no implicit current state — just transformations.
- **A class or module with a clear method surface** when the logic genuinely owns ongoing internal state.

Pick whichever shape best fits the question being asked, *not* whichever is easiest to wire to a TUI. Keep it pure: no I/O, no terminal code, no `console.log` for control flow. The TUI imports it and calls into it; nothing flows the other direction.

This is what makes the prototype useful past its own lifetime. When the question's been answered, the validated reducer / machine / function set can be lifted into the real module — the TUI shell gets deleted.

### 4. Build the smallest TUI that exposes the state

Build it as a **lightweight TUI** — on every tick, clear the screen (`console.clear()` / `print("\033[2J\033[H")` / equivalent) and re-render the whole frame. The user should always see one stable view, not an ever-growing scrollback.

Each frame has two parts, in this order:

1. **Current state**, pretty-printed and diff-friendly (one field per line, or formatted JSON). Use **bold** for field names or section headers and **dim** for less important context (timestamps, IDs, derived values). Native ANSI escape codes are fine — `\x1b[1m` bold, `\x1b[2m` dim, `\x1b[0m` reset. No need to pull in a styling library unless one is already in the project.
2. **Keyboard shortcuts**, listed at the bottom: `[a] add user  [d] delete user  [t] tick clock  [q] quit`. Bold the key, dim the description, or vice-versa — whatever reads cleanly.

Behaviour:

1. **Initialise state** — a single in-memory object/struct. Render the first frame on start.
2. **Read one keystroke (or one line)** at a time, dispatch to a handler that mutates state.
3. **Re-render** the full frame after every action — don't append, replace.
4. **Loop until quit.**

The whole frame should fit on one screen.

### 5. Make it runnable in one command

Add a script to the project's existing task runner (`package.json` scripts, `Makefile`, `justfile`, `pyproject.toml`). The user should run `pnpm run <prototype-name>` or equivalent — never need to remember a path.

If the host project has no task runner, just put the command at the top of the prototype's README.

### 6. Hand it over

Give the user the run command. They'll drive it themselves; the interesting moments are when they say "wait, that shouldn't be possible" or "huh, I assumed X would be different" — those are the bugs in the _idea_, which is the whole point. If they want new actions added, add them. Prototypes evolve.

### 7. Capture the answer

When the prototype has done its job, the answer to the question is the only thing worth keeping. If the user is around, ask what it taught them. If not, leave a `NOTES.md` next to the prototype so the answer can be filled in (or filled in by you, if you've watched the session) before the prototype gets deleted.

## Anti-patterns

- **Don't add tests.** A prototype that needs tests is no longer a prototype.
- **Don't wire it to the real database.** Use an in-memory store unless the question is specifically about persistence.
- **Don't generalise.** No "what if we wanted to support X later." The prototype answers one question.
- **Don't blur the logic and the TUI together.** If the reducer / state machine references `console.log`, prompts, or terminal escape codes, it's no longer portable. Keep the TUI as a thin shell over a pure module.
- **Don't ship the TUI shell into production.** The shell is optimised for being driven by hand from a terminal. The logic module behind it is the bit worth keeping.


---


# ========================================================
## TỆP TIN: .agents/skills/prototype/SKILL.md
# ========================================================

---
name: prototype
description: Build a throwaway prototype to answer a design question. Use when the user wants to sanity-check whether a state model or logic feels right, or explore what a UI should look like.
---

# Prototype

A prototype is **throwaway code that answers a question**. The question decides the shape.

## Pick a branch

Identify which question is being answered — from the user's prompt, the surrounding code, or by asking if the user is around:

- **"Does this logic / state model feel right?"** → [LOGIC.md](LOGIC.md). Build a tiny interactive terminal app that pushes the state machine through cases that are hard to reason about on paper.
- **"What should this look like?"** → [UI.md](UI.md). Generate several radically different UI variations on a single route, switchable via a URL search param and a floating bottom bar.

The two branches produce very different artifacts — getting this wrong wastes the whole prototype. If the question is genuinely ambiguous and the user isn't reachable, default to whichever branch better matches the surrounding code (a backend module → logic; a page or component → UI) and state the assumption at the top of the prototype.

## Rules that apply to both

1. **Throwaway from day one, and clearly marked as such.** Locate the prototype code close to where it will actually be used (next to the module or page it's prototyping for) so context is obvious — but name it so a casual reader can see it's a prototype, not production. For throwaway UI routes, obey whatever routing convention the project already uses; don't invent a new top-level structure.
2. **One command to run.** Whatever the project's existing task runner supports — `pnpm <name>`, `python <path>`, `bun <path>`, etc. The user must be able to start it without thinking.
3. **No persistence by default.** State lives in memory. Persistence is the thing the prototype is _checking_, not something it should depend on. If the question explicitly involves a database, hit a scratch DB or a local file with a clear "PROTOTYPE — wipe me" name.
4. **Skip the polish.** No tests, no error handling beyond what makes the prototype _runnable_, no abstractions. The point is to learn something fast and then delete it.
5. **Surface the state.** After every action (logic) or on every variant switch (UI), print or render the full relevant state so the user can see what changed.
6. **Delete or absorb when done.** When the prototype has answered its question, either delete it or fold the validated decision into the real code — don't leave it rotting in the repo.

## When done

The _answer_ is the only thing worth keeping from a prototype. Capture it somewhere durable (commit message, ADR, issue, or a `NOTES.md` next to the prototype) along with the question it was answering. If the user is around, that capture is a quick conversation; if not, leave the placeholder so they (or you, on the next pass) can fill in the verdict before deleting the prototype.


---


# ========================================================
## TỆP TIN: .agents/skills/prototype/UI.md
# ========================================================

# UI Prototype

Generate **several radically different UI variations** on a single route, switchable from a floating bottom bar. The user flips between variants in the browser, picks one (or steals bits from each), then throws the rest away.

If the question is about logic/state rather than what something looks like — wrong branch. Use [LOGIC.md](LOGIC.md).

## When this is the right shape

- "What should this page look like?"
- "I want to see a few options for this dashboard before committing."
- "Try a different layout for the settings screen."
- Any time the user would otherwise spend a day picking between three vague mockups in their head.

## Two sub-shapes — strongly prefer sub-shape A

A UI prototype is much easier to judge when it's **butting up against the rest of the app** — real header, real sidebar, real data, real density. A throwaway route on its own is a vacuum: every variant looks fine in isolation. Default to sub-shape A whenever there's a plausible existing page to host the variants. Only reach for sub-shape B if the prototype genuinely has no nearby home.

### Sub-shape A — adjustment to an existing page (preferred)

The route already exists. Variants are rendered **on the same route**, gated by a `?variant=` URL search param. The existing data fetching, params, and auth all stay — only the rendering swaps. This is the default; pick it unless there's a specific reason not to.

If the prototype is for something that doesn't yet have a page but *would naturally live inside one* (a new section of the dashboard, a new card on the settings screen, a new step in an existing flow) — that's still sub-shape A. Mount the variants inside the host page.

### Sub-shape B — a new page (last resort)

Only use this when the thing being prototyped genuinely has no existing page to live inside — e.g. an entirely new top-level surface, or a flow that can't be embedded anywhere sensible.

Create a **throwaway route** following whatever routing convention the project already uses — don't invent a new top-level structure. Name it so it's obviously a prototype (e.g. include the word `prototype` in the path or filename). Same `?variant=` pattern.

Before committing to sub-shape B, sanity-check: is there really no existing page this could be embedded in? An empty route hides design problems that a populated one would expose.

In both sub-shapes the floating bottom bar is identical.

## Process

### 1. State the question and pick N

Default to **3 variants**. More than 5 stops being radically different and starts being noise — cap there.

Write down the plan in one line, in the prototype's location or a top-of-file comment:

> "Three variants of the settings page, switchable via `?variant=`, on the existing `/settings` route."

This works whether the user is here to push back or not.

### 2. Generate radically different variants

Draft each variant. Hold each one to:

- The page's purpose and the data it has access to.
- The project's component library / styling system (TailwindCSS, shadcn, MUI, plain CSS, whatever).
- A clear exported component name, e.g. `VariantA`, `VariantB`, `VariantC`.

Variants must be **structurally different** — different layout, different information hierarchy, different primary affordance, not just different colours. Three slightly-tweaked card grids isn't a UI prototype, it's wallpaper. If two drafts come out too similar, redo one with explicit "do not use a card grid" guidance.

### 3. Wire them together

Create a single switcher component on the route:

```tsx
// pseudo-code — adapt to the project's framework
const variant = searchParams.get('variant') ?? 'A';
return (
  <>
    {variant === 'A' && <VariantA {...data} />}
    {variant === 'B' && <VariantB {...data} />}
    {variant === 'C' && <VariantC {...data} />}
    <PrototypeSwitcher variants={['A','B','C']} current={variant} />
  </>
);
```

For sub-shape A (existing page): keep all the existing data fetching above the switcher; only the rendered subtree changes per variant.

For sub-shape B (new page): the throwaway route under `/prototype/<name>` mounts the same switcher.

### 4. Build the floating switcher

A small fixed-position bar at the bottom-centre of the screen with three pieces:

- **Left arrow** — cycles to the previous variant (wraps around).
- **Variant label** — shows the current variant key and, if the variant exports a name, that name too. e.g. `B — Sidebar layout`.
- **Right arrow** — cycles forward (wraps around).

Behaviour:

- Clicking an arrow updates the URL search param (use the framework's router — `router.replace` on Next, `navigate` on React Router, etc) so the variant is shareable and reload-stable.
- Keyboard: `←` and `→` arrow keys also cycle. Don't intercept arrow keys when an `<input>`, `<textarea>`, or `[contenteditable]` is focused.
- Visually distinct from the page (e.g. high-contrast pill, subtle shadow) so it's obviously not part of the design being evaluated.
- Hidden in production builds — gate on `process.env.NODE_ENV !== 'production'` or an equivalent check, so a stray prototype merge can't ship the bar to users.

Put the switcher in a single shared component so both sub-shapes can reuse it. Locate it wherever shared UI lives in the project.

### 5. Hand it over

Surface the URL (and the `?variant=` keys). The user will flip through whenever they get to it. The interesting feedback is usually **"I want the header from B with the sidebar from C"** — that's the actual design they want.

### 6. Capture the answer and clean up

Once a variant has won, write down which one and why (commit message, ADR, issue, or a `NOTES.md` next to the prototype if running AFK and the user hasn't responded yet). Then:

- **Sub-shape A** — delete the losing variants and the switcher; fold the winner into the existing page.
- **Sub-shape B** — promote the winning variant to a real route, delete the throwaway route and the switcher.

Don't leave variant components or the switcher lying around. They rot fast and confuse the next reader.

## Anti-patterns

- **Variants that differ only in colour or copy.** That's a tweak, not a prototype. Real variants disagree about structure.
- **Sharing too much code between variants.** A shared `<Header>` is fine; a shared `<Layout>` defeats the point. Each variant should be free to throw out the layout.
- **Wiring variants to real mutations.** Read-only prototypes are fine. If a variant needs to mutate, point it at a stub — the question is "what should this look like", not "does the backend work".
- **Promoting the prototype directly to production.** The variant code was written under prototype constraints (no tests, minimal error handling). Rewrite it properly when you fold it in.


---


# ========================================================
## TỆP TIN: docs/core/BUG_FIXES_SUMMARY.md
# ========================================================

# 🐛 Tổng hợp lỗi đã fix - Lab Management System

## ✅ Đã khắc phục các lỗi sau:

### 1. **Lỗi borrowedQty undefined khi mượn thiết bị**
- **Vấn đề**: Khi thiết bị mới chưa từng được mượn, `borrowedQty` có thể là `undefined` gây lỗi tính toán
- **Fix**: Thêm check `if (!eq.borrowedQty) eq.borrowedQty = 0;` trước khi xử lý
- **File**: `backend/src/server.js` - line ~417

### 2. **Thiếu validate ngày hẹn trả ở backend**
- **Vấn đề**: Frontend đã chặn chọn ngày quá khứ, nhưng backend chưa validate
- **Fix**: Thêm validation kiểm tra `expectedReturnDate` không được nhỏ hơn ngày hôm nay
- **File**: `backend/src/server.js` - line ~398

### 3. **Dữ liệu ngày tháng sai trong database**
- **Vấn đề**: Có bản ghi mượn với hạn trả `2026-05-07` (tháng 5) trước ngày mượn `2026-06-28` (tháng 6)
- **Fix**: Sửa lại thành `2026-07-05` (tháng 7) cho logic đúng
- **File**: `backend/data/borrows.json`

### 4. **Format hiển thị ngày không đúng chuẩn Việt Nam**
- **Vấn đề**: Hiển thị MM/DD/YYYY (kiểu Mỹ)
- **Fix**: 
  - Tạo các hàm format custom: `formatTime()`, `formatDateOnly()`, `formatDateWithTime()`
  - Hiển thị DD/MM/YYYY và 12h với AM/PM
- **File**: `frontend/src/pages/Equipment.jsx`

### 5. **Thiếu thuộc tính `min` cho input date**
- **Vấn đề**: Người dùng có thể chọn ngày trong quá khứ
- **Fix**: Thêm `min={getTodayDateString()}` vào input type="date"
- **File**: `frontend/src/pages/Equipment.jsx`

### 6. **Hiển thị "Tổng / Khả dụng" gây nhầm lẫn**
- **Vấn đề**: Cột hiển thị `2 / 2` không rõ nghĩa
- **Fix**: Đổi thành "Còn lại / Tổng" và đảo thứ tự hiển thị
- **File**: `frontend/src/pages/Equipment.jsx`

### 7. **Không có xác thực RFID khi mượn/trả**
- **Vấn đề**: Chỉ nhập MSSV thủ công, dễ gian lận
- **Fix**: 
  - Thêm API `/api/rfid-scan` và `/api/rfid-cards`
  - Tích hợp popup quét thẻ RFID khi click "Xác nhận"
  - Validate MSSV khớp với thẻ quét
- **Files**: `backend/src/server.js`, `frontend/src/pages/Equipment.jsx`

---

## 🔍 Lỗi đã kiểm tra và xác nhận OK:

✅ **Import API_BASE_URL**: Đã có trong tất cả các page  
✅ **Case-insensitive check mã thiết bị**: Đã có validation  
✅ **Error handling**: Đầy đủ try-catch cho tất cả API calls  
✅ **Build successful**: Không có warning hay error  
✅ **Console.log/error**: Chỉ dùng cho debug, không ảnh hưởng production  

---

## 📊 Thống kê code quality:

- **Total API endpoints**: 24
- **Frontend pages**: 7
- **Backend collections**: 8
- **Build time**: ~200ms
- **Bundle size**: 303KB (83KB gzipped)

---

## 🚀 Hệ thống hiện đã sẵn sàng production!

### Các tính năng đầy đủ:
1. ✅ Quản lý thành viên + điểm tích lũy
2. ✅ Quản lý thiết bị + mượn/trả với RFID
3. ✅ Điểm danh check-in/out
4. ✅ Lịch trực lab
5. ✅ Quản lý dự án (Kanban board)
6. ✅ Đặt phòng theo khung giờ
7. ✅ Dashboard tổng quan

### Bảo mật:
- ✅ Xác thực RFID khi mượn/trả
- ✅ Validate input ở cả frontend và backend
- ✅ Chặn chọn ngày quá khứ
- ✅ Check trùng lặp dữ liệu

---

**Ngày fix**: 02/07/2026  
**Tổng số lỗi đã fix**: 7  
**Status**: ✅ All tests passed


---


# ========================================================
## TỆP TIN: docs/core/EXCEL_IMPORT_SYSTEM.md
# ========================================================

# ✅ Excel Import System - Hệ thống Nhập dữ liệu từ Excel (Hoàn thành)

> **Cập nhật ngày:** 24/08/2026 lúc 13:15  
> **Trạng thái:** Hoàn thành & Tích hợp 100%

## 🎯 TỔNG QUAN

Tính năng cho phép quản trị viên nhập nhanh danh sách thiết bị và linh kiện từ file Excel (.xlsx, .xls) vào hệ thống bằng cách tải file mẫu, điền dữ liệu, và kéo thả để tải lên. Quá trình xử lý và kiểm tra định dạng dữ liệu (validation) được thực hiện trực tiếp ở frontend trước khi đẩy vào database.

---

## 🛠️ CHI TIẾT CÁC COMPONENT ĐÃ THÊM

### 1. Component Giao diện: [`ImportExcelModal.jsx`](file:///c:/Users/tungm/Downloads/ThucTap_New/frontend/src/components/ImportExcelModal.jsx) & [`ImportExcelModal.css`](file:///c:/Users/tungm/Downloads/ThucTap_New/frontend/src/components/ImportExcelModal.css)
* **Chức năng:**
  * Hộp thoại (Modal) kéo thả file Excel.
  * Nút tải file Excel mẫu chuẩn (`template_import.xlsx`) với các tiêu đề cột đúng định dạng.
  * Phân tích (parse) file Excel thành dữ liệu JSON ngay trên trình duyệt (dùng thư viện `xlsx`).
  * Kiểm tra lỗi dữ liệu (Validation): Phát hiện nếu thiếu cột bắt buộc, hoặc sai kiểu dữ liệu (vd: số lượng nhập bằng chữ) và hiển thị cảnh báo chi tiết từng dòng.
  * Xem trước dữ liệu (Preview) tối đa 10 dòng trước khi import.
  * Hiển thị kết quả import (bao nhiêu dòng thành công, bao nhiêu dòng lỗi).

### 2. Tích hợp màn hình:
* **Trang Thiết bị ([`Equipment.jsx`](file:///c:/Users/tungm/Downloads/ThucTap_New/frontend/src/pages/Equipment.jsx))**:
  * Thêm nút **Import Excel** trên header.
  * Khai báo sơ đồ cột (`equipmentFieldMap`): Tên thiết bị, Mã thiết bị, Số lượng, Vị trí, Danh mục, Đơn vị, Ngưỡng tối thiểu.
  * Gọi API `POST /api/equipment/import` với `assetType = 'Thiết bị'`.
* **Trang Linh kiện ([`ComponentsInventory.jsx`](file:///c:/Users/tungm/Downloads/ThucTap_New/frontend/src/pages/ComponentsInventory.jsx))**:
  * Thêm nút **Import Excel** trên header.
  * Khai báo sơ đồ cột (`componentFieldMap`): Tên linh kiện, Mã linh kiện, Số lượng tồn, Vị trí, Danh mục, Đơn vị tính, Ngưỡng cảnh báo.
  * Gọi API `POST /api/equipment/import` với `assetType = 'Linh kiện tiêu hao'`.

### 3. API Backend: [`server.js`](file:///c:/Users/tungm/Downloads/ThucTap_New/backend/src/server.js)
* **Endpoint:** `POST /api/equipment/import`
* **Logic xử lý:**
  * Nhận danh sách các dòng thiết bị/linh kiện.
  * Kiểm tra trùng lặp: Nếu mã thiết bị đã tồn tại trong database, ghi nhận lỗi dòng đó và bỏ qua để bảo vệ dữ liệu cũ.
  * Lưu toàn bộ các bản ghi hợp lệ vào database và trả về số lượng thành công/thất bại.

---

## 📋 HƯỚNG DẪN KIỂM TRA & SỬ DỤNG
1. Vào trang **Quản lý thiết bị** hoặc **Quản lý Linh kiện**.
2. Click nút **Import Excel**.
3. Bấm **Tải file mẫu (.xlsx)**.
4. Điền dữ liệu thật/test vào file mẫu và lưu lại.
5. Kéo thả file Excel vào modal hoặc click chọn file.
6. Xem trước bảng dữ liệu và nhấn nút **Import**.
7. Tắt modal và kiểm tra danh sách đã được tự động cập nhật.


---


# ========================================================
## TỆP TIN: docs/core/RFID_IMPLEMENTATION.md
# ========================================================

# ✅ RFID Card Authentication System - Implementation Complete

## 📋 Overview
Hệ thống xác thực thẻ RFID đã được tích hợp hoàn chỉnh vào module **Equipment (Quản lý thiết bị)** để xác minh danh tính người mượn và trả thiết bị.

---

## 🎯 Features Implemented

### 1. **Backend API (server.js)**
- ✅ RFID card mapping với 4 thẻ test:
  - `CARD-001` → Nguyễn Văn A (20210001)
  - `CARD-002` → Trần Thị B (20210002)
  - `CARD-003` → Lê Văn C (20220003)
  - `CARD-004` → Phạm Minh D (20220004)

- ✅ API Endpoints:
  - `POST /api/rfid-scan` - Xác thực thẻ RFID và trả về thông tin sinh viên
  - `GET /api/rfid-cards` - Lấy danh sách thẻ đã đăng ký (để test)

### 2. **Frontend UI (Equipment.jsx)**

#### 🔐 RFID Modal Component
- **Thiết kế popup hiện đại** với gradient background xanh đậm
- **Bàn phím số (Number Pad)**: 4 nút lớn (1, 2, 3, 4)
- **Mapping ẩn**: Người dùng chỉ thấy số, không thấy mã thẻ thực (CARD-00X)
- **Hướng dẫn rõ ràng**: 
  - "Đang chờ quét thẻ RFID..."
  - Hiển thị hành động đang thực hiện (mượn/trả)
  - Thông báo test mode

#### 🔄 Workflow Xác Thực

**KHI MƯỢN THIẾT BỊ:**
1. Người dùng điền form mượn thiết bị (MSSV, số lượng, ngày trả...)
2. Nhấn nút **"Xác nhận"**
3. ⚡ Modal RFID xuất hiện
4. Chọn số (1-4) tương ứng với thẻ
5. Hệ thống kiểm tra:
   - ❌ Thẻ không hợp lệ → Báo lỗi
   - ❌ MSSV không khớp → Báo lỗi "Thẻ không khớp!"
   - ✅ Xác thực thành công → Tạo phiếu mượn

**KHI TRẢ THIẾT BỊ:**
1. Người dùng chọn phiếu mượn cần trả
2. Điền form trả thiết bị (MSSV người trả, tình trạng...)
3. Nhấn nút **"Xác nhận duyệt trả"**
4. ⚡ Modal RFID xuất hiện
5. Chọn số (1-4) tương ứng với thẻ
6. Hệ thống kiểm tra tương tự
7. ✅ Xác thực thành công → Hoàn tất trả thiết bị

---

## 🧪 Testing Instructions

### Test Mượn Thiết Bị:
1. Vào tab **"Danh sách thiết bị"**
2. Chọn 1 thiết bị, nhấn **"Mượn"**
3. Điền MSSV: `20210001` (Nguyễn Văn A)
4. Nhấn **"Xác nhận"**
5. Trong modal RFID, nhấn số **"1"** (tương ứng CARD-001)
6. ✅ Kết quả: "✅ Xác thực thành công: Nguyễn Văn A"

### Test Sai MSSV:
1. Làm tương tự nhưng điền MSSV: `20210002` (Trần Thị B)
2. Trong modal RFID, nhấn số **"1"** (CARD-001 của Nguyễn Văn A)
3. ❌ Kết quả: "❌ Thẻ không khớp! Thẻ quét: Nguyễn Văn A (20210001), Đã điền: 20210002"

### Test Trả Thiết Bị:
1. Vào tab **"Phiếu mượn & Hoạt động trả"**
2. Chọn phiếu đang mượn, nhấn **"Trả thiết bị"**
3. MSSV mặc định đã điền người mượn ban đầu
4. Nhấn **"Xác nhận duyệt trả"**
5. Trong modal RFID, chọn số tương ứng
6. ✅ Hoàn tất trả thiết bị

---

## 🎨 UI/UX Highlights

### RFID Modal Design:
- **Màu chủ đạo**: Xanh dương (#3b82f6, #60a5fa)
- **Background**: Gradient tối với hiệu ứng glass
- **Buttons**: 
  - 2x2 grid layout
  - Hover effect: Scale lên 1.05x + tăng độ sáng
  - Box shadow động khi hover
  - Font size lớn (2rem) cho số
- **Info box**: Thông báo test mode với viền dashed
- **zIndex**: 10000 (cao nhất để đè lên mọi modal khác)

### Error/Success Messages:
- ✅ Success: Màu xanh lá (#10b981)
- ❌ Error: Màu đỏ (#ef4444)
- Hiển thị rõ ràng thông tin:
  - Tên người được xác thực
  - MSSV
  - Thông tin thẻ không khớp (nếu có)

---

## 🚀 Future Enhancements (Khi có thiết bị thật)

Khi có RFID hardware reader:

1. **Thay thế bàn phím số** bằng giao tiếp USB/Serial với đầu đọc thẻ
2. **Auto-scan**: Tự động đọc mã thẻ khi đặt gần reader
3. **Loading state**: Hiển thị "Đang quét..." trong lúc chờ
4. **Sound effects**: Tiếng beep khi quét thành công/thất bại
5. **LED indicators**: Đèn xanh/đỏ trên hardware

### Code Changes Needed:
```javascript
// Thay đổi handleRfidSuccess để nhận input từ RFID reader
const handleRfidSuccess = async (cardId) => {
  // cardId sẽ được gửi từ hardware qua WebSerial API hoặc WebUSB
  setShowRfidModal(false);
  
  if (rfidAction === 'borrow') {
    await processBorrow(cardId);
  } else if (rfidAction === 'return') {
    await processReturn(cardId);
  }
};
```

---

## 📝 Technical Details

### Functions:
- `handleBorrowSubmit()` - Trigger RFID modal khi xác nhận mượn
- `handleReturnSubmit()` - Trigger RFID modal khi xác nhận trả
- `processBorrow(cardId)` - Xử lý mượn sau khi xác thực RFID thành công
- `processReturn(cardId)` - Xử lý trả sau khi xác thực RFID thành công
- `handleRfidSuccess(cardId)` - Xử lý khi chọn thẻ từ number pad

### State Variables:
- `showRfidModal` - Hiển thị/ẩn modal RFID
- `rfidAction` - Phân biệt action: 'borrow' hoặc 'return'
- `rfidCards` - Danh sách thẻ đã đăng ký (từ API)

---

## ✅ Testing Checklist

- [x] Modal RFID hiển thị đúng khi nhấn "Xác nhận mượn"
- [x] Modal RFID hiển thị đúng khi nhấn "Xác nhận trả"
- [x] Number pad 1-4 hoạt động đúng
- [x] Mapping CARD-001 đến CARD-004 chính xác
- [x] Xác thực thành công khi MSSV khớp với thẻ
- [x] Báo lỗi khi MSSV không khớp với thẻ
- [x] Báo lỗi khi thẻ không tồn tại
- [x] UI responsive và đẹp mắt
- [x] Hover effects hoạt động mượt
- [x] Close modal bằng nút X hoặc nút Hủy
- [x] Success/Error messages hiển thị rõ ràng

---

## 🎓 Demo Accounts

Để test, sử dụng các tài khoản sau:

| Số | Tên | MSSV | Thẻ RFID |
|---|---|---|---|
| 1 | Nguyễn Văn A | 20210001 | CARD-001 |
| 2 | Trần Thị B | 20210002 | CARD-002 |
| 3 | Lê Văn C | 20220003 | CARD-003 |
| 4 | Phạm Minh D | 20220004 | CARD-004 |

---

## 🔒 Security Notes

- ✅ MSSV validation trên cả frontend và backend
- ✅ Không hiển thị mã thẻ thực cho người dùng
- ✅ API kiểm tra thẻ có đăng ký trong hệ thống
- ✅ API kiểm tra người dùng tồn tại trước khi xác thực
- ⚠️ **Production**: Cần mã hóa communication giữa RFID reader và server

---

**Status**: ✅ HOÀN THÀNH
**Tested**: ✅ No syntax errors
**Ready for**: Testing với real RFID hardware

---

*Cập nhật lần cuối: 02/07/2026*


---


# ========================================================
## TỆP TIN: docs/core/RFID_KEYBOARD_VERSION.md
# ========================================================

# ✅ RFID System - Keyboard Version (Hoàn thành)

## 🎯 Yêu cầu đã thực hiện

### ❌ ĐÃ XÓA:
- ~~4 nút số (1, 2, 3, 4) trên giao diện~~
- ~~Box "Chế độ Test" với viền dashed~~
- ~~Tất cả UI buttons~~

### ✅ ĐÃ THÊM:
- **Bắt sự kiện bàn phím** (keydown) khi modal mở
- **Hiển thị thông tin sinh viên** sau khi nhấn phím
- **Nút "Xác nhận hoàn tất"** để lưu sau khi xem thông tin

---

## 🎹 CÁCH HOẠT ĐỘNG

### 1. **Khi nhấn "Xác nhận mượn/trả":**
```
Modal RFID xuất hiện
    ↓
Hiển thị: "Đang chờ quét thẻ RFID..."
Hướng dẫn: "Nhấn phím 1, 2, 3, hoặc 4 để quét thẻ test"
```

### 2. **Nhấn phím số trên bàn phím:**
```
Phím 1 → CARD-001 (Nguyễn Văn A)
Phím 2 → CARD-002 (Trần Thị B)
Phím 3 → CARD-003 (Lê Văn C)
Phím 4 → CARD-004 (Phạm Minh D)
```

### 3. **Sau khi nhấn phím:**
```
✅ Gọi API /rfid-scan với CARD-00X
    ↓
✅ Kiểm tra MSSV có khớp với form
    ↓
✅ Hiển thị thông tin sinh viên trên modal:
    
    ┌────────────────────────────────┐
    │ THÔNG TIN SINH VIÊN            │
    │                                │
    │ 👤 Họ và tên                   │
    │    Nguyễn Văn A                │
    │                                │
    │ 🎓 Mã số sinh viên             │
    │    20210001                    │
    │                                │
    │ ✅ Vai trò                      │
    │    Chủ nhiệm                   │
    └────────────────────────────────┘
```

### 4. **Nhấn "Xác nhận hoàn tất":**
```
✅ Đóng modal
    ↓
✅ Xử lý mượn/trả thiết bị
    ↓
✅ Lưu vào database
    ↓
✅ Hiển thị thông báo thành công
```

---

## 💻 TECHNICAL IMPLEMENTATION

### State Variables:
```javascript
const [showRfidModal, setShowRfidModal] = useState(false);
const [rfidAction, setRfidAction] = useState(''); // 'borrow' hoặc 'return'
const [scannedUserInfo, setScannedUserInfo] = useState(null); // Thông tin sau khi quét
```

### Event Listener:
```javascript
useEffect(() => {
  if (!showRfidModal) return;

  const handleKeyPress = (e) => {
    // Chỉ bắt phím số 1, 2, 3, 4
    if (['1', '2', '3', '4'].includes(e.key)) {
      const cardId = `CARD-00${e.key}`;
      handleRfidScan(cardId);
    }
  };

  window.addEventListener('keydown', handleKeyPress);
  
  // Cleanup khi modal đóng
  return () => {
    window.removeEventListener('keydown', handleKeyPress);
  };
}, [showRfidModal, rfidAction, borrowForm.mssv, returnForm.returnMssv]);
```

### Functions:
- `handleRfidScan(cardId)` - Gọi API và hiển thị thông tin
- `handleRfidComplete()` - Xác nhận hoàn tất và xử lý mượn/trả

---

## 🎨 UI DESIGN

### Modal Layout:
```
┌────────────────────────────────────────┐
│ 🔐 Xác thực RFID               ✕      │
├────────────────────────────────────────┤
│                                        │
│ ┌────────────────────────────────────┐ │
│ │ 🎯 Xác nhận mượn thiết bị          │ │
│ │                                    │ │
│ │ Đang chờ quét thẻ RFID...          │ │
│ │                                    │ │
│ │ Nhấn phím 1, 2, 3, hoặc 4          │ │
│ │ để quét thẻ test                   │ │
│ └────────────────────────────────────┘ │
│                                        │
│ [Sau khi nhấn phím:]                   │
│                                        │
│ ┌────────────────────────────────────┐ │
│ │ ✅ Đã quét thẻ thành công!         │ │
│ └────────────────────────────────────┘ │
│                                        │
│ ┌────────────────────────────────────┐ │
│ │ THÔNG TIN SINH VIÊN                │ │
│ │                                    │ │
│ │ 👤 Họ và tên                       │ │
│ │    Nguyễn Văn A                    │ │
│ │                                    │ │
│ │ 🎓 MSSV: 20210001                  │ │
│ │                                    │ │
│ │ ✅ Vai trò: Chủ nhiệm               │ │
│ └────────────────────────────────────┘ │
│                                        │
├────────────────────────────────────────┤
│     [Hủy]    [✅ Xác nhận hoàn tất]    │
└────────────────────────────────────────┘
```

### Color Scheme:
- **Info box**: `rgba(59, 130, 246, 0.1)` - Xanh dương nhạt
- **Success box**: `rgba(16, 185, 129, 0.1)` - Xanh lá nhạt
- **Border**: `rgba(16, 185, 129, 0.3)` - Xanh lá đậm hơn
- **Text**: `#fff` - Trắng
- **Label**: `#94a3b8` - Xám nhạt

---

## 🧪 TESTING

### Test Case 1: Mượn thiết bị
1. Nhập MSSV: `20210001` trong form mượn
2. Nhấn "Xác nhận"
3. Modal RFID xuất hiện
4. **Nhấn phím `1` trên bàn phím**
5. ✅ Thông tin Nguyễn Văn A hiển thị
6. Nhấn "Xác nhận hoàn tất"
7. ✅ Phiếu mượn được tạo

### Test Case 2: MSSV không khớp
1. Nhập MSSV: `20210002` (Trần Thị B)
2. Nhấn "Xác nhận"
3. Modal RFID xuất hiện
4. **Nhấn phím `1`** (Nguyễn Văn A)
5. ❌ Hiển thị lỗi: "Thẻ không khớp!"

### Test Case 3: Trả thiết bị
1. Chọn phiếu mượn cần trả
2. Nhấn "Trả thiết bị"
3. Nhấn "Xác nhận duyệt trả"
4. Modal RFID xuất hiện
5. **Nhấn phím tương ứng với MSSV**
6. ✅ Thông tin hiển thị
7. Nhấn "Xác nhận hoàn tất"
8. ✅ Thiết bị được trả

---

## 🚀 KHI CÓ RFID HARDWARE THẬT

### Thay đổi cần thiết:

1. **Thay event listener:**
```javascript
// Thay vì bắt keydown
window.addEventListener('keydown', handleKeyPress);

// Sẽ kết nối với RFID reader qua WebSerial/WebUSB
const port = await navigator.serial.requestPort();
await port.open({ baudRate: 9600 });

const reader = port.readable.getReader();
while (true) {
  const { value, done } = await reader.read();
  if (done) break;
  
  // Đọc cardId từ RFID reader
  const cardId = decodeCardId(value);
  handleRfidScan(cardId);
}
```

2. **Xóa text hướng dẫn "Nhấn phím 1-4"**

3. **Thêm animation "Scanning..."**

4. **Thêm sound effects**

---

## 📋 CHECKLIST

- [x] Xóa 4 nút số khỏi giao diện
- [x] Xóa box "Chế độ Test"
- [x] Bắt sự kiện keydown (1, 2, 3, 4)
- [x] Mapping phím → CARD-00X
- [x] Gọi API /rfid-scan
- [x] Kiểm tra MSSV khớp
- [x] Hiển thị thông tin sinh viên
- [x] Nút "Xác nhận hoàn tất"
- [x] Xử lý mượn/trả sau khi xác nhận
- [x] Cleanup event listener khi modal đóng
- [x] Build thành công
- [x] No syntax errors

---

## 🎓 DEMO ACCOUNTS

| Phím | MSSV | Tên | Vai trò |
|:---:|:---:|:---:|:---:|
| 1 | 20210001 | Nguyễn Văn A | Chủ nhiệm |
| 2 | 20210002 | Trần Thị B | Trưởng ban Kỹ thuật |
| 3 | 20220003 | Lê Văn C | Thành viên |
| 4 | 20220004 | Phạm Minh D | Thành viên |

---

**Status**: ✅ HOÀN THÀNH  
**Build**: ✅ Successful  
**Ready for**: Production testing

*Cập nhật: 02/07/2026*


---


# ========================================================
## TỆP TIN: docs/core/RFID_PROGRESS_SUMMARY.md
# ========================================================

# 📊 TỔNG HỢP TIẾN ĐỘ TÍCH HỢP RFID - LAB MANAGEMENT SYSTEM

> **Ngày cập nhật:** 02/07/2026  
> **Trạng thái:** TẤT CẢ CÁC TASK HOÀN THÀNH (100%)

---

## 📋 MỤC LỤC

1. [Tổng quan ABCD Tasks](#tổng-quan-abcd-tasks)
2. [✅ Task A: RFID Attendance - HOÀN THÀNH](#task-a-rfid-attendance)
3. [✅ Task B: Dashboard Improvements - HOÀN THÀNH](#task-b-dashboard-improvements)
4. [✅ Task C: RFID Room Booking - HOÀN THÀNH](#task-c-rfid-room-booking)
5. [✅ Task D: RFID Management - HOÀN THÀNH](#task-d-rfid-management)
6. [Thông tin kỹ thuật](#thông-tin-kỹ-thuật)

---

## 🎯 TỔNG QUAN ABCD TASKS

### Thứ tự ưu tiên:
1. ✅ **Task A** - RFID Attendance (HOÀN THÀNH)
2. ✅ **Task D** - RFID Management (HOÀN THÀNH)
3. ### v1.4.0 (02/07/2026) - Role-Based Access Control & Online Booking (O2O)
- Hoàn thành **Task E** (Phân quyền bảo mật).
- Hoàn thành **Task F** (Đặt đồ Online & Bàn giao bằng RFID). Tách biệt hoàn toàn giao diện giữa Sinh viên và Quản lý. Sinh viên có thể xem Catalog đồ và đặt trước ở nhà. Màn hình bàn giao tại Lab tích hợp chặt chẽ với đầu đọc RFID.

### v1.3.0 (02/07/2026) - Dashboard Improvements (Bản hoàn thiện)
- Hoàn thành **Task B**.
- Tích hợp biểu đồ Recharts cho Dashboard (Thống kê thiết bị, Lượt quét thẻ, Top thành viên).
- Cảnh báo thiết bị quá hạn mượn.
- Đồng bộ bảng tin hoạt động (Recent Activity) sử dụng lịch sử RFID.

### v1.2.0 (02/07/2026) - RFID Room Booking (HOÀN THÀNH)
4. ✅ **Task B** - Dashboard Improvements (HOÀN THÀNH)

### Tóm tắt trạng thái:

| Task | Tên năng chính | File liên quan | Trạng thái |
|------|----------------|----------------|------------|
| **A** | RFID Điểm danh | `Attendance.jsx`, `server.js` | ✅ Xong |
| **B** | Dashboard | `Dashboard.jsx`, `server.js` | ✅ Xong |
| **C** | RFID Đặt phòng | `RoomBooking.jsx`, `server.js` | ✅ Xong |
| **D** | Quản lý thẻ RFID| `RfidManagement.jsx`, `server.js` | ✅ Xong |
| **E** | Phân quyền | `Login.jsx`, `App.jsx`, `Sidebar.jsx` | ✅ Xong |
| **F** | Đặt mượn Online | `StudentEquipment.jsx`, `server.js`, `Equipment.jsx` | ✅ Xong |

---

## ✅ TASK A: RFID ATTENDANCE

### 📝 Mô tả
Tích hợp quét thẻ RFID cho hệ thống điểm danh (Check-in/Check-out) tại Lab.

### 🎯 Yêu cầu đã hoàn thành

#### Backend (server.js):

1. **Endpoint `/api/attendance/check` (POST)**
   - Hỗ trợ cả 2 cách: `mssv` (thủ công) hoặc `cardId` (RFID)
   - Tự động phát hiện Check-in hay Check-out dựa trên `user.active`
   - Tính thời gian trực Lab (giờ) khi Check-out
   - Cộng điểm tự động:
     - ≥ 1 giờ: +5 điểm
     - < 1 giờ: +2 điểm
   - Lưu method (RFID/Manual) vào attendance record
   - Trả về đầy đủ thông tin user (name, mssv, role, points)

2. **Response format:**
   ```json
   {
     "message": "Check-in/out thành công...",
     "type": "in" | "out",
     "record": { /* attendance record */ },
     "user": {
       "mssv": "20210001",
       "name": "Nguyễn Văn A",
       "role": "Chủ nhiệm",
       "points": 150
     },
     "duration": 3.5,  // Chỉ khi check-out
     "pointsEarned": 5  // Chỉ khi check-out
   }
   ```

#### Frontend (Attendance.jsx):

1. **Nút "🔐 Quét thẻ điểm danh"** ở header
   - Mở modal RFID khi click

2. **Modal RFID với 3 trạng thái:**

   **Trạng thái 1: Đang chờ quét thẻ**
   ```
   🔐 Điểm danh RFID
   ┌─────────────────────────────┐
   │  Đang chờ quét thẻ RFID...  │
   │  Đặt thẻ vào đầu đọc       │
   └─────────────────────────────┘
   ```

   **Trạng thái 2: Đã quét thẻ thành công**
   ```
   ✅ Đã quét thẻ thành công!
   ┌─────────────────────────────┐
   │ 👤 Họ và tên                │
   │    Nguyễn Văn A             │
   │                             │
   │ 🏷️ MSSV                     │
   │    20210001                 │
   │                             │
   │ ⏳ Đang xử lý điểm danh...  │
   └─────────────────────────────┘
   ```

   **Trạng thái 3: Kết quả điểm danh**
   ```
   ✅ Check-in thành công!
   (hoặc Check-out thành công!)
   
   ┌─────────────────────────────┐
   │ Nguyễn Văn A (20210001)     │
   │                             │
   │ ⏱️ Thời gian trực: 3.5 giờ  │
   │ 🏆 Điểm nhận được: +5 điểm  │
   │ 💰 Tổng điểm: 155 điểm      │
   │                             │
   │ Tự động đóng sau 3 giây...  │
   └─────────────────────────────┘
   ```

3. **Keyboard Event Listener**
   - Phím 1 → CARD-001 (Nguyễn Văn A)
   - Phím 2 → CARD-002 (Trần Thị B)
   - Phím 3 → CARD-003 (Lê Văn C)
   - Phím 4 → CARD-004 (Phạm Minh D)
   - **Lưu ý:** KHÔNG có nút test hay chú thích trên UI

4. **Auto-close modal:**
   - Đóng tự động sau 3 giây khi thành công
   - Refresh danh sách attendance sau khi đóng

### 📂 Files đã chỉnh sửa:

- ✅ `backend/src/server.js` - Endpoint `/api/attendance/check`
- ✅ `frontend/src/pages/Attendance.jsx` - UI RFID Modal

### 🧪 Test cases đã hoạt động:

1. ✅ Mở modal và quét thẻ (phím 1-4)
2. ✅ Hiển thị thông tin user sau quét
3. ✅ Check-in thành công
4. ✅ Check-out thành công với tính thời gian và điểm
5. ✅ Auto-close sau 3 giây
6. ✅ Refresh danh sách attendance

---

## ✅ TASK B: DASHBOARD IMPROVEMENTS

### 📝 Mô tả
Cải thiện trang Dashboard với biểu đồ, cảnh báo, và hoạt động gần đây.

### 🎯 Yêu cầu cần làm:

1. **Thêm biểu đồ thống kê (Charts)**
   - Cài đặt thư viện: Chart.js hoặc Recharts
   - Biểu đồ số lượng thiết bị theo danh mục
   - Biểu đồ điểm danh theo tuần/tháng
   - Biểu đồ thành viên top điểm tích lũy

2. **Thêm cảnh báo thiết bị trễ hạn**
   - Danh sách thiết bị chưa trả quá hạn
   - Highlight màu đỏ cho các phiếu mượn overdue
   - Số ngày trễ hạn

3. **Hiển thị hoạt động gần đây**
   - Recent activity feed (10-20 hoạt động gần nhất)
   - Bao gồm: Check-in/out, mượn/trả thiết bị, đặt phòng
   - Timestamp với format DD/MM/YYYY HH:mm

### 📂 Files cần chỉnh sửa:

- `frontend/src/pages/Dashboard.jsx` - Main dashboard page
- `frontend/package.json` - Thêm chart library

### 💡 Gợi ý kỹ thuật:

```bash
# Cài đặt Chart.js
npm install chart.js react-chartjs-2

# Hoặc Recharts
npm install recharts
```

---

## ✅ TASK C: RFID ROOM BOOKING

### 📝 Mô tả
Thêm xác thực RFID cho người đại diện và thành viên khi đặt phòng.

### 🎯 Yêu cầu cần làm:

#### Backend:

1. **Endpoint `/api/bookings` (POST) - Cập nhật**
   - Thêm field `representativeCardId` (optional)
   - Thêm array `memberCardIds` (optional)
   - Validate cardId nếu có

#### Frontend (RoomBooking.jsx):

1. **Xác thực người đại diện**
   - Nút "🔐 Quét thẻ người đại diện"
   - Modal RFID giống Attendance
   - Auto-fill thông tin sau quét thẻ

2. **Xác thực thành viên tham gia**
   - Nút "🔐 Quét thẻ thành viên" cho mỗi người
   - Modal RFID với danh sách thành viên
   - Check ✅ khi đã quét thẻ

3. **Validation:**
   - Người đại diện phải quét thẻ trước khi submit
   - Tất cả thành viên phải quét thẻ (hoặc có option skip)

### 📂 Files cần chỉnh sửa:

- `backend/src/server.js` - Update `/api/bookings` endpoint
- `frontend/src/pages/RoomBooking.jsx` - Add RFID modals

### 💡 Gợi ý UI flow:

```
1. Chọn ngày + khung giờ
2. Click "🔐 Quét thẻ người đại diện"
   → Modal RFID → Quét thẻ → Auto-fill MSSV + Tên
3. Click "Thêm thành viên"
   → Chọn MSSV hoặc quét thẻ RFID
4. Xác nhận đặt phòng
```

---

## ✅ TASK D: RFID MANAGEMENT

### 📝 Mô tả
Tạo trang quản lý thẻ RFID (admin-only) với đầy đủ CRUD và lịch sử.

### 🎯 Yêu cầu cần làm:

#### Backend:

1. **Tạo collection `rfid_cards.json`**
   ```json
   [
     {
       "id": "uuid",
       "cardId": "CARD-001",
       "mssv": "20210001",
       "userName": "Nguyễn Văn A",
       "status": "active",
       "registeredDate": "2026-07-02T10:00:00.000Z",
       "lastUsed": "2026-07-02T14:30:00.000Z",
       "usageCount": 25
     }
   ]
   ```

2. **Tạo collection `rfid_history.json`**
   ```json
   [
     {
       "id": "uuid",
       "cardId": "CARD-001",
       "mssv": "20210001",
       "action": "check-in",
       "module": "attendance",
       "timestamp": "2026-07-02T08:15:00.000Z",
       "success": true
     }
   ]
   ```

3. **API Endpoints:**
   - `GET /api/rfid-cards` - Danh sách thẻ
   - `POST /api/rfid-cards` - Đăng ký thẻ mới
   - `PUT /api/rfid-cards/:id` - Sửa thông tin thẻ
   - `DELETE /api/rfid-cards/:id` - Xóa/vô hiệu hóa thẻ
   - `GET /api/rfid-cards/:cardId/history` - Lịch sử quét thẻ
   - `GET /api/rfid-history` - Toàn bộ lịch sử

4. **Logging system:**
   - Mỗi lần quét thẻ (attendance, equipment, booking) → log vào `rfid_history`
   - Update `lastUsed` và `usageCount` trong `rfid_cards`

#### Frontend:

1. **Tạo page mới: `RfidManagement.jsx`**

2. **Tab 1: Danh sách thẻ**
   - Table hiển thị: CardID, MSSV, Tên, Trạng thái, Lần quét cuối, Tổng lượt
   - Nút: Thêm thẻ, Sửa, Xóa

3. **Tab 2: Đăng ký thẻ mới**
   - Input: CardID (hoặc quét thẻ)
   - Dropdown: Chọn MSSV
   - Nút: Đăng ký

4. **Tab 3: Lịch sử quét thẻ**
   - Filter: CardID, MSSV, Module, Ngày
   - Table: Timestamp, CardID, MSSV, Tên, Module, Action, Success

5. **Modal quét thẻ mới:**
   ```
   🔐 Đăng ký thẻ RFID mới
   ┌─────────────────────────────┐
   │  Đặt thẻ mới vào đầu đọc   │
   │  để đọc mã thẻ...           │
   │                             │
   │  Mã thẻ: CARD-005           │
   │                             │
   │  Chọn thành viên:           │
   │  [Dropdown MSSV]            │
   │                             │
   │  [Xác nhận] [Hủy]           │
   └─────────────────────────────┘
   ```

6. **Route trong App.jsx:**
   ```jsx
   <Route path="/rfid-management" element={<RfidManagement />} />
   ```

7. **Sidebar link:**
   ```jsx
   <NavLink to="/rfid-management">
     🔐 Quản lý thẻ RFID
   </NavLink>
   ```

### 📂 Files cần tạo/chỉnh sửa:

- ✅ Tạo: `backend/data/rfid_cards.json`
- ✅ Tạo: `backend/data/rfid_history.json`
- ✅ Tạo: `frontend/src/pages/RfidManagement.jsx`
- ✅ Sửa: `backend/src/server.js` - Thêm RFID endpoints
- ✅ Sửa: `frontend/src/App.jsx` - Thêm route
- ✅ Sửa: `frontend/src/components/Sidebar.jsx` - Thêm link

### 🔒 Admin-only access:

```jsx
// Check admin role
const currentUser = getCurrentUser(); // From localStorage/context
if (currentUser.role !== 'Chủ nhiệm' && currentUser.role !== 'Admin') {
  return <div>Bạn không có quyền truy cập trang này</div>;
}
```

---

## 🔧 THÔNG TIN KỸ THUẬT

### 📡 RFID Card Mapping (Hiện tại)

```javascript
const rfidCards = {
  'CARD-001': '20210001', // Nguyễn Văn A - Chủ nhiệm
  'CARD-002': '20210002', // Trần Thị B - Trưởng ban Kỹ thuật
  'CARD-003': '20220003', // Lê Văn C - Thành viên
  'CARD-004': '20220004'  // Phạm Minh D - Thành viên
};
```

### ⌨️ Keyboard Test Mode

- **Phím 1** → CARD-001
- **Phím 2** → CARD-002
- **Phím 3** → CARD-003
- **Phím 4** → CARD-004

**Lưu ý:** Chỉ hoạt động khi modal RFID đang mở.

### 🔄 Migration Plan (Real RFID Hardware)

Khi có thiết bị RFID thật:

1. **Thay thế keyboard event:**
   ```javascript
   // Cũ (Test mode)
   window.addEventListener('keydown', handleKeyPress);
   
   // Mới (Real RFID)
   // RFID reader sẽ gửi data qua Serial/USB
   // Hoặc qua WebSocket/HTTP từ RFID middleware
   ```

2. **Card format:**
   - Hiện tại: `CARD-001` (string test)
   - Thực tế: `1A2B3C4D5E` (hex UID từ RFID tag)

3. **Backend không cần sửa:**
   - API `/api/rfid-scan` đã hỗ trợ bất kỳ cardId nào
   - Chỉ cần update mapping trong `rfidCards` object

### 📊 Data Flow

```
User quét thẻ
    ↓
Keyboard event (1-4) hoặc RFID reader
    ↓
Frontend: POST /api/rfid-scan { cardId }
    ↓
Backend: Validate cardId → Return user info
    ↓
Frontend: Display user info
    ↓
Frontend: POST /api/attendance/check { cardId }
    ↓
Backend: Check-in/out + Update points
    ↓
Frontend: Show result + Auto-close
```

### 🎨 UI Design Principles

1. **Clean UI:** Không có test mode labels, instructions
2. **Auto-close:** Modal đóng sau 3 giây khi thành công
3. **Visual feedback:** 3 trạng thái rõ ràng (waiting → scanned → result)
4. **Color coding:**
   - Blue: Scanning state
   - Green: Success
   - Red: Error
5. **Icons:** Sử dụng emoji và Lucide icons

### 🔐 Security Considerations

1. **Card validation:** Luôn validate cardId với server
2. **User verification:** Không tin client-side data
3. **Admin-only pages:** Check role before rendering
4. **Audit log:** Lưu lịch sử mọi thao tác RFID

---

## 📝 CHANGELOG

### v1.0.0 - 02/07/2026

#### ✅ Added:
- RFID scanning for attendance (check-in/check-out)
- Keyboard test mode (keys 1-4)
- Auto-calculate duration and points
- RFID modal with 3-state UI
- Auto-close modal after success

#### 🔄 Modified:
- Backend: Enhanced `/api/attendance/check` endpoint
- Frontend: Complete rewrite of Attendance page

#### 🐛 Fixed:
- Duration calculation accuracy (rounded to 1 decimal)
- Points auto-reward system
- Modal state management

### v1.1.0 - 02/07/2026

#### ✅ Added:
- RFID card management page (admin-only)
- CRUD operations for RFID cards (register, edit, delete)
- RFID scan history with filters (cardId, mssv, module)
- Logging system for all RFID operations
- Dynamic card mapping from rfid_cards.json collection
- Status toggle (active/inactive) for cards
- Tab-based UI: Card List + Scan History

#### 🔄 Modified:
- Backend: Replaced hardcoded rfidCards mapping with dynamic getRfidMapping()
- Backend: Added logRfidAction() integrated into /api/rfid-scan and /api/attendance/check
- Backend: New collections rfid_cards.json and rfid_history.json
- Frontend: App.jsx added rfid-management route
- Frontend: Sidebar.jsx added 'Quản lý thẻ RFID' menu item

#### 📂 Files:
- ✅ Tạo: `backend/data/rfid_cards.json`
- ✅ Tạo: `backend/data/rfid_history.json`
- ✅ Tạo: `frontend/src/pages/RfidManagement.jsx`
- ✅ Sửa: `backend/src/server.js` - RFID CRUD + logging
- ✅ Sửa: `frontend/src/App.jsx` - Thêm route
- ✅ Sửa: `frontend/src/components/Sidebar.jsx` - Thêm link

---

## 🚀 NEXT STEPS

1. **Ngay lập tức:**
   - Làm Task C: RFID Room Booking

2. **Sau đó:**
   - Làm Task B: Dashboard Improvements

3. **Tương lai:**
   - Migrate sang real RFID hardware
   - Email/SMS notification cho waitlist
   - Mobile app integration

---

## 📞 SUPPORT

**Lưu ý quan trọng:**
- File này tổng hợp toàn bộ progress đã làm và kế hoạch tương lai
- Sử dụng file này làm tài liệu tham khảo khi tiếp tục development
- Mọi thay đổi nên được cập nhật vào file này

**Tạo bởi:** Kiro AI Assistant  
**Dự án:** Lab Management System - RFID Integration  
**Version:** 1.0.0


---


# ========================================================
## TỆP TIN: docs/core/RFID_VISUAL_GUIDE.md
# ========================================================

# 🎨 RFID Modal - Visual Guide

## 📱 Modal Appearance

```
┌───────────────────────────────────────────┐
│  🔐 Xác thực RFID                    ✕   │
├───────────────────────────────────────────┤
│                                           │
│  ┌─────────────────────────────────────┐ │
│  │ 🎯 Xác nhận mượn thiết bị          │ │
│  │                                     │ │
│  │   Đang chờ quét thẻ RFID...        │ │
│  │                                     │ │
│  │ Chọn số tương ứng với thẻ của bạn  │ │
│  └─────────────────────────────────────┘ │
│                                           │
│     ┌─────────┐      ┌─────────┐         │
│     │         │      │         │         │
│     │    1    │      │    2    │         │
│     │         │      │         │         │
│     └─────────┘      └─────────┘         │
│                                           │
│     ┌─────────┐      ┌─────────┐         │
│     │         │      │         │         │
│     │    3    │      │    4    │         │
│     │         │      │         │         │
│     └─────────┘      └─────────┘         │
│                                           │
│  ┌─────────────────────────────────────┐ │
│  │ 🧪 Chế độ Test                      │ │
│  │ Số 1-4 tương ứng với thẻ sinh viên │ │
│  │ đã đăng ký                          │ │
│  │                                     │ │
│  │ Khi có thiết bị RFID thật, sẽ tự   │ │
│  │ động quét thẻ                       │ │
│  └─────────────────────────────────────┘ │
│                                           │
├───────────────────────────────────────────┤
│                [ Hủy ]                    │
└───────────────────────────────────────────┘
```

## 🎨 Color Scheme

### Background
- Modal overlay: `rgba(0, 0, 0, 0.75)` - Tối mờ
- Modal content: `linear-gradient(135deg, #1e293b 0%, #0f172a 100%)`

### Header
- Border: `rgba(59, 130, 246, 0.3)` - Xanh nhạt
- Title color: `#60a5fa` - Xanh sáng

### Info Box
- Background: `rgba(59, 130, 246, 0.1)`
- Border: `rgba(59, 130, 246, 0.3)`
- Title: `#94a3b8` - Xám nhạt
- Main text: `#fff` - Trắng
- Sub text: `#64748b` - Xám tối

### Number Buttons
- Background: `linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(37, 99, 235, 0.2) 100%)`
- Border: `2px solid rgba(59, 130, 246, 0.4)`
- Text color: `#60a5fa`
- Font size: `2rem` (32px)
- **Hover state:**
  - Background opacity tăng lên 0.35
  - Transform: `scale(1.05)`
  - Box shadow: `0 6px 20px rgba(59, 130, 246, 0.4)`

### Test Info Box
- Background: `rgba(100, 116, 139, 0.1)`
- Border: `1px dashed rgba(100, 116, 139, 0.3)`
- Text color: `#64748b`

## 🔄 User Flow

### Mượn Thiết Bị:
```
[Form mượn]
    ↓
[Nhập MSSV: 20210001]
    ↓
[Nhập số lượng, ngày trả...]
    ↓
[Nhấn "Xác nhận"] ←───────────────┐
    ↓                              │
[RFID Modal xuất hiện]             │
    ↓                              │
[Chọn số 1] ← Mapping ẩn: CARD-001 │
    ↓                              │
[API: /rfid-scan]                  │
    ↓                              │
[Kiểm tra MSSV]                    │
    ├─ ✅ Khớp                      │
    │   ↓                          │
    │   [Tạo phiếu mượn]           │
    │   ↓                          │
    │   [✅ Thành công]             │
    │                              │
    └─ ❌ Không khớp               │
        ↓                          │
        [Hiển thị lỗi]             │
        ↓                          │
        [Quay lại form] ───────────┘
```

### Trả Thiết Bị:
```
[Danh sách phiếu mượn]
    ↓
[Chọn phiếu cần trả]
    ↓
[Nhấn "Trả thiết bị"]
    ↓
[Form trả (MSSV mặc định)]
    ↓
[Nhập tình trạng, ghi chú...]
    ↓
[Nhấn "Xác nhận duyệt trả"]
    ↓
[RFID Modal xuất hiện]
    ↓
[Chọn số tương ứng]
    ↓
[Xác thực RFID]
    ↓
[✅ Hoàn tất trả thiết bị]
```

## 🎯 Button States

### Normal State
```css
padding: 1.5rem
fontSize: 2rem
color: #60a5fa
background: linear-gradient(...)
border: 2px solid rgba(59, 130, 246, 0.4)
borderRadius: 12px
boxShadow: 0 4px 12px rgba(59, 130, 246, 0.2)
```

### Hover State
```css
transform: scale(1.05)
background: [opacity tăng lên 0.35]
boxShadow: 0 6px 20px rgba(59, 130, 246, 0.4)
cursor: pointer
transition: all 0.2s ease
```

### Active/Click State
```css
transform: scale(0.98)
```

## 📊 Success/Error Messages

### ✅ Success Message
```
╔═══════════════════════════════════════╗
║ ✅ Xác thực thành công: Nguyễn Văn A ║
╚═══════════════════════════════════════╝
```
- Background: `rgba(16, 185, 129, 0.15)`
- Color: `#10b981`
- Border: `1px solid rgba(16, 185, 129, 0.3)`

### ❌ Error Message - Thẻ không khớp
```
╔════════════════════════════════════════════╗
║ ❌ Thẻ không khớp!                         ║
║ Thẻ quét: Nguyễn Văn A (20210001)        ║
║ Đã điền: 20210002                         ║
╚════════════════════════════════════════════╝
```
- Background: `rgba(239, 68, 68, 0.15)`
- Color: `#ef4444`
- Border: `1px solid rgba(239, 68, 68, 0.3)`

### ❌ Error Message - Thẻ không hợp lệ
```
╔═══════════════════════════════════════════╗
║ ❌ Thẻ RFID không được đăng ký trong      ║
║    hệ thống                               ║
╚═══════════════════════════════════════════╝
```

## 🔢 Number to Card Mapping (Hidden from User)

| Nút hiển thị | Mã thẻ thực | Sinh viên | MSSV |
|:---:|:---:|:---:|:---:|
| **1** | CARD-001 | Nguyễn Văn A | 20210001 |
| **2** | CARD-002 | Trần Thị B | 20210002 |
| **3** | CARD-003 | Lê Văn C | 20220003 |
| **4** | CARD-004 | Phạm Minh D | 20220004 |

## 📐 Layout Specifications

### Modal Dimensions
- Max width: `420px`
- Border radius: `12px`
- Padding: `1.5rem`
- z-index: `10000`

### Grid Layout (Number Pad)
```css
display: grid
gridTemplateColumns: repeat(2, 1fr)
gap: 1rem
```

### Button Dimensions
- Padding: `1.5rem` (24px)
- Border radius: `12px`
- Font size: `2rem` (32px)
- Font weight: `bold`

### Spacing
- Modal body padding: `1.5rem`
- Info box margin bottom: `1.5rem`
- Test info margin top: `1rem`
- Footer button width: `100%`

## 🌐 Responsive Behavior

- Modal tự động center trên màn hình
- Overlay phủ toàn bộ viewport
- Close bằng:
  - Nút X (góc trên bên phải)
  - Nút "Hủy" (footer)
  - ❌ Không close khi click overlay (để tránh mất dữ liệu)

## 🔊 Future: Sound Effects (Khi có hardware)

```
BEEP_SUCCESS = 📢 "beep-success.mp3" (pitch: high, duration: 200ms)
BEEP_ERROR   = 📢 "beep-error.mp3" (pitch: low, duration: 500ms)
BEEP_SCAN    = 📢 "beep-scan.mp3" (pitch: mid, duration: 100ms)
```

---

**Ghi chú thiết kế:**
- Sử dụng gradient để tạo chiều sâu
- Hover effects mượt mà với transition 0.2s
- Box shadow tạo cảm giác nổi 3D
- Color scheme đồng nhất với theme tổng thể (xanh dương)
- Typography rõ ràng, dễ đọc (2rem cho số)


---


# ========================================================
## TỆP TIN: docs/core/SQLITE_DATABASE_MIGRATION.md
# ========================================================

# ✅ SQLite Database Migration - Di chuyển Cơ sở dữ liệu sang SQLite (Hoàn thành)

> **Cập nhật ngày:** 24/08/2026 lúc 13:15  
> **Trạng thái:** Hoàn thành & Tích hợp 100%

## 🎯 TỔNG QUAN

Để chuẩn bị cho hệ thống sẵn sàng hoạt động với dữ liệu thực tế ổn định, Backend đã được nâng cấp từ lưu trữ file JSON tĩnh (`backend/data/*.json`) sang cơ sở dữ liệu SQL thực tế là **SQLite** sử dụng **Sequelize ORM** để quản lý cấu trúc bảng (schema).

---

## 🛠️ CHI TIẾT TRIỂN KHAI

### 1. Thư viện tích hợp
* Cài đặt `sequelize` (phiên bản `^6.37.1`) và `sqlite3` (phiên bản `^5.1.7`) vào dự án thông qua `backend/package.json`.

### 2. Thiết lập cấu trúc & Models: [`backend/src/db.js`](file:///c:/Users/tungm/Downloads/ThucTap_New/backend/src/db.js)
* **File database vật lý:** Tạo tự động tại `backend/data/lab.db`.
* **Sequelize Models (Khung bảng):** Định nghĩa **13 bảng SQL** tương ứng với các thực thể trong hệ thống:
  1. `users` (Thành viên)
  2. `equipment` (Thiết bị & Linh kiện)
  3. `borrows` (Lịch mượn trả)
  4. `schedules` (Lịch trực Lab)
  5. `tasks` (Nhiệm vụ & Điểm thưởng)
  6. `attendance` (Lịch sử check-in Lab)
  7. `bookings` (Đặt phòng Lab)
  8. `rfid_cards` (Quản lý thẻ RFID)
  9. `rfid_history` (Lịch sử quét thẻ)
  10. `notifications` (Thông báo hệ thống)
  11. `sessions` (Phiên trực thực tế)
  12. `equipment_catalog` (Danh mục gốc)
  13. `maintenance` (Lịch sửa chữa thiết bị)
* **Đồng bộ tự động & Seeding:**
  * Khi server chạy lần đầu, `syncDatabase()` sẽ tự động đồng bộ hóa cấu trúc SQL với database.
  * Nếu bảng rỗng, hệ thống sẽ tự động đọc dữ liệu mẫu cũ từ các file JSON để nạp (seed) vào SQLite, giúp giao diện không bị trống dữ liệu chạy thử.

### 3. Cơ chế hoạt động đặc biệt (Transparent Drop-in)
* Nhằm giảm thiểu rủi ro lỗi logic nghiệp vụ phức tạp của backend (gần 2300 dòng code), `db.js` cung cấp hai hàm wrapper là `readCollection` và `writeCollection` có signature giống hệt phiên bản cũ:
  * **Đọc:** `readCollection()` trả về dữ liệu nhanh chóng từ bộ nhớ đệm (Cache) trong RAM (O(1)).
  * **Ghi:** `writeCollection()` cập nhật cache lập tức và tự động ghi xuống file SQLite `lab.db` bất đồng bộ ở background.
* Nhờ cơ chế này, backend vẫn chạy cực nhanh, không làm nghẽn thread xử lý, và không phải sửa đổi cấu trúc logic của 100 API endpoints có sẵn trong `server.js`.

---

## 📋 CÁCH QUẢN LÝ DATABASE VẬT LÝ

* Cơ sở dữ liệu được lưu trữ tại file: **`backend/data/lab.db`**.
* Để kiểm tra cấu trúc bảng hoặc sửa đổi dữ liệu trực tiếp, bạn nên cài phần mềm miễn phí: **[DB Browser for SQLite](https://sqlitebrowser.org/)**.


---


# ========================================================
## TỆP TIN: docs/core/TABLE_CONSISTENCY.md
# ========================================================

# ✅ Table Consistency - Đồng bộ giao diện Bảng Thiết bị & Linh kiện (Hoàn thành)

> **Cập nhật ngày:** 24/08/2026 lúc 13:20  
> **Trạng thái:** Hoàn thành & Tích hợp 100%

## 🎯 TỔNG QUAN

Khắc phục sự bất đồng bộ về mặt thiết kế (Visual Discrepancies) giữa bảng **Quản lý Linh kiện** và **Quản lý Thiết bị** để đảm bảo giao diện đồng bộ 100% theo đúng chuẩn Design System của CLB.

---

## 🛠️ CHI TIẾT CÁC ĐIỂM BẤT ĐỒNG BỘ & CÁCH SỬA

| Hạng mục | Bảng Quản lý Thiết bị | Bảng Quản lý Linh kiện (Cũ) | Giải pháp Đồng bộ (Mới) |
|---|---|---|---|
| **Cột Mã (Code)** | Chữ màu tím đậm (`var(--accent-purple)`), bold (`700`), có hiện icon cảnh báo `AlertTriangle` nếu hết hoặc sắp hết hàng. | Chữ font monospace màu xám mảnh (`var(--text-secondary)`). | Chuyển cột Mã bên Linh kiện sang kiểu chữ tím đậm bold 700 và thêm icon cảnh báo hết/sắp hết hàng đồng bộ. |
| **Cột Tên (Name)** | Chữ bold (`600`). | Chữ bold thường (`500`). | Nâng font-weight của tên linh kiện lên `600`. |
| **Cột Số lượng / Tồn kho** | Căn phải, dùng font `tabular-nums` và tự động đổi màu: Màu xanh (`var(--accent-green)`) khi đủ hàng, màu đỏ (`var(--accent-red)`) khi chạm ngưỡng cảnh báo tối thiểu. | Chữ bold đen/trắng thường (`var(--text-primary)`), căn phải. | Áp dụng cách đổi màu xanh/đỏ theo ngưỡng cảnh báo và font `tabular-nums` sang bên cột Tồn kho của linh kiện. |
| **Tiêu đề Cột (Headers)** | Viết thường chữ đầu (Sentence case): `Mã`, `Tên thiết bị`, `Vị trí`, `SL`, `Thao tác`. | Viết HOA các cột cuối: `TRẠNG THÁI`, `THAO TÁC`. | Chuẩn hóa tất cả các tiêu đề cột về dạng Sentence case (viết thường chữ đầu). |
| **Độ rộng Cột (Widths)** | Cột Tên rộng (`40%`), cột Mã (`15%`) chứa tên/mã dài hoàn hảo, các cột khác vừa vặn. | Dùng phần trăm (%) làm cột bị bóp nhỏ trên laptop nhỏ, gây cắt chữ Mã LK và chồng chéo nút Thao tác. | Chuyển sang kích thước pixel cố định cho các cột phụ (`code: 110px`, `category: 130px`, `totalQty: 90px`, `location: 110px`, `actions: 210px`) và để cột Tên co giãn tự do (`width: 'auto'`) nhằm tối ưu diện tích. |
| **Cột Trạng thái (Status)** | Không hiển thị cột trạng thái (Thông tin đã tích hợp vào màu số lượng). | Có cột Trạng thái riêng hiển thị badge: `Đầy đủ`, `Hết hàng`, `Sắp hết`. | Loại bỏ hoàn toàn cột Trạng thái do bị trùng lặp thông tin với màu sắc cột Tồn kho và các icon cảnh báo ở cột Mã LK, giúp bảng cực kỳ thông thoáng. |

---

## 📱 ĐỒNG BỘ RESPONSIVE & KHOẢNG CÁCH (PADDING)
* Để triệt tiêu thanh cuộn ngang (horizontal scrollbar) trên các màn hình laptop và tablet (dưới 1200px), file **[`DataTable.css`](file:///c:/Users/tungm/Downloads/ThucTap_New/frontend/src/components/DataTable.css)** đã được thêm Media Query tự động thu hẹp padding trong mỗi ô `td/th` từ `16px` (`1rem`) xuống còn `8px` (`0.5rem`).
* Điều này giúp tiết kiệm thêm **`112px`** không gian hiển thị, giữ bảng luôn gọn gàng và vừa vặn.

---

## 📂 CÁC FILE CHỈNH SỬA
* **[`ComponentsInventory.jsx`](file:///c:/Users/tungm/Downloads/ThucTap_New/frontend/src/pages/ComponentsInventory.jsx)**: Sửa cấu hình `componentsColumns` sang pixel và `auto`.
* **[`DataTable.css`](file:///c:/Users/tungm/Downloads/ThucTap_New/frontend/src/components/DataTable.css)**: Thêm CSS Responsive padding cho table.



---


# ========================================================
## TỆP TIN: docs/core/UX_TABLE_GUIDELINES.md
# ========================================================

# Hướng Dẫn Tối Ưu UX Bảng Dữ Liệu (13 Nguyên Tắc)

Tài liệu này lưu trữ 13 nguyên tắc thiết kế Bảng dữ liệu (Data Table UX) chuẩn mực và cách triển khai code CSS/React tương ứng để bạn có thể tái sử dụng cho bất kỳ dự án nào sau này.

## 13 Nguyên Tắc Cốt Lõi

1. **Thanh điều hướng tối giản:** Dùng tab chữ hoặc dropdown thay cho các khối nút lớn cồng kềnh.
2. **Làm nổi bật Tiêu đề:** Phủ một lớp màu nhạt (tint) lên `<th>` để phân biệt hoàn toàn với thân bảng.
3. **Làm rõ chức năng sắp xếp:** Biểu tượng mũi tên sắp xếp (Sort) cần đổi màu (Accent) khi di chuột hoặc khi đang kích hoạt.
4. **Làm nhạt đường viền hàng:** Hạ opacity của `border-bottom` xuống thấp nhất có thể, chỉ để giữ cấu trúc chứ không cản trở việc đọc chữ.
5. **Tăng chiều cao hàng:** Thêm Padding (khoảng 1.15rem) để dữ liệu có "không gian thở".
6. **Sử dụng nút biểu tượng (Hybrid):** Dùng Icon cho các hành động phụ (Sửa, Xóa, Chi tiết) để giảm nhiễu văn bản. Các hành động chính vẫn dùng chữ.
7. **Căn lề phải cho các con số:** Tất cả cột số lượng, tài chính, phần trăm đều phải căn phải (`text-align: right`) và dùng font số đều (`tabular-nums`).
8. **Sử dụng thẻ trạng thái (Chips):** Dùng các khối màu bo tròn (Badges) để báo hiệu mức độ ưu tiên/tình trạng khẩn cấp.
9. **Viết tắt tên tháng:** Dùng định dạng ngày tháng dễ đọc bằng chữ (VD: `06 Thg 08, 2026`) thay vì toàn số.
10. **In đậm tên bản ghi:** Cột chứa tên thực thể chính (Tên thiết bị, Tên người dùng) phải được in đậm (`font-weight: 600`) để định hình cột mốc thị giác.
11. **Nhấn mạnh ô tìm kiếm:** Khung tìm kiếm cần rộng hơn và có bóng đổ (box-shadow) để thu hút tương tác.
12. **Phản hồi khi chọn hàng:** Dòng nào đang được thao tác hoặc chọn (checkbox) phải được đổi màu nền (Highlight).
13. **Kết hợp Icon cho hành động hàng loạt:** Các nút như Xuất Excel, Import phải có icon đi kèm chữ.

---

## Mẫu CSS Tái Sử Dụng (Boilerplate)

Bạn có thể copy đoạn CSS này vào bất kỳ dự án nào để áp dụng tự động các nguyên tắc trên:

```css
/* 1. Tối ưu Zoom và Font Size toàn cầu */
html { font-size: 90%; } /* Thu nhỏ giao diện tương đương zoom 90% */
body { font-size: 1rem; }

/* 2. Tiêu đề Bảng (Sticky, Tint màu) */
th {
  padding: 1.15rem 1rem; /* Không gian thở */
  color: #94a3b8;
  font-weight: 600;
  text-transform: uppercase;
  border-bottom: 1px solid rgba(255,255,255,0.025); /* Viền cực nhạt */
  
  /* Sticky */
  position: sticky; top: 0; z-index: 10;
  
  /* Tint màu xanh siêu mờ (Dành cho Dark Mode) */
  background: #0d1222;
  background-image: linear-gradient(rgba(59, 130, 246, 0.04), rgba(59, 130, 246, 0.04));
  backdrop-filter: blur(8px);
}

/* 3. Icon Sắp xếp tương tác */
th svg { color: #64748b; transition: color 0.2s ease; margin-left: 4px; }
th:hover svg { color: #3b82f6; }

/* 4. Dòng Dữ liệu */
td {
  padding: 1.15rem 1rem;
  border-bottom: 1px solid rgba(255,255,255,0.025); /* Viền cực nhạt */
}
tbody tr { transition: background-color 0.2s ease; }
tbody tr:hover { background-color: rgba(255, 255, 255, 0.1); }

/* 5. Dòng Đang Chọn / Thao Tác */
.row-selected { background-color: rgba(59, 130, 246, 0.08) !important; }

/* 6. Form Tìm Kiếm Tương Tác Cấp Cao */
.search-input {
  padding: 0.85rem 1rem 0.85rem 3rem;
  border-radius: 10px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15); /* Bóng đổ thu hút */
}
```

## Các Class/Style Cần Thêm Bằng Tay (Tailwind/React)

1. **Cột Số liệu:** Luôn luôn thêm thuộc tính:
   `style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}`
2. **Cột Tên Thực Thể:** Luôn luôn in đậm:
   `style={{ fontWeight: '600' }}`
3. **Format Ngày Tháng (JS):**
   ```javascript
   const formatDate = (isoString) => {
     const date = new Date(isoString);
     const day = String(date.getDate()).padStart(2, '0');
     const month = String(date.getMonth() + 1).padStart(2, '0');
     const year = date.getFullYear();
     return `${day} Thg ${month}, ${year}`;
   };
   ```


---


# ========================================================
## TỆP TIN: docs/core/WAITLIST_SYSTEM.md
# ========================================================

# ✅ Waitlist System - Full Package (Hoàn thành)

## 🎯 TỔNG QUAN

Hệ thống đăng ký chờ mượn thiết bị khi hết hàng, với thông báo tự động và quản lý danh sách chờ đầy đủ.

---

## 📦 PHASE 1: VISUAL - HIỂN THỊ THIẾT BỊ HẾT

### ✅ Đã implement:

#### 1. **Row màu đỏ nhạt**
```css
backgroundColor: rgba(239, 68, 68, 0.08)
opacity: 0.9
```

#### 2. **Icon cảnh báo ⚠️**
- Hiển thị `AlertTriangle` icon màu đỏ trước mã thiết bị
- Chỉ xuất hiện khi `available <= 0`

#### 3. **Badge "Hết hàng"**
- Text: `❌ Hết hàng`
- Màu đỏ `#ef4444`
- Hiển thị dưới số lượng

#### 4. **Số lượng màu đỏ**
- `0 / X` với số 0 màu đỏ `#ef4444`

---

## 📋 PHASE 2: WAITLIST SYSTEM

### Backend APIs:

#### 1. **GET `/api/equipment/:id/waitlist`**
Lấy danh sách chờ của thiết bị
```json
Response: [
  {
    "id": "w1",
    "equipmentId": "eq1",
    "equipmentName": "Máy hiện sóng...",
    "equipmentCode": "RIG-01",
    "mssv": "20210001",
    "userName": "Nguyễn Văn A",
    "qty": 1,
    "notes": "Cần gấp cho dự án",
    "registeredDate": "2026-07-02T10:00:00.000Z",
    "status": "waiting"
  }
]
```

#### 2. **POST `/api/equipment/:id/waitlist`**
Đăng ký chờ mượn
```json
Request: {
  "mssv": "20210001",
  "qty": 1,
  "notes": "Cần gấp"
}

Response: {
  "message": "Đăng ký chờ mượn thành công...",
  "waitlist": { ... }
}
```

#### 3. **DELETE `/api/waitlist/:waitlistId`**
Hủy đăng ký chờ
```json
Request: {
  "mssv": "20210001"
}

Response: {
  "message": "Đã hủy đăng ký chờ mượn"
}
```

#### 4. **GET `/api/waitlist/user/:mssv`**
Lấy danh sách chờ của user
```json
Response: [
  {
    "id": "w1",
    "equipmentName": "Máy hiện sóng...",
    "qty": 1,
    "registeredDate": "2026-07-02T10:00:00.000Z",
    "status": "waiting"
  }
]
```

### Frontend Components:

#### 1. **Nút "Đăng ký chờ"**
- Thay thế nút "Mượn" khi `isOutOfStock = true`
- Màu cam `#f59e0b`
- Icon 🔔

#### 2. **Hiển thị số người chờ**
- Hiển thị trên nút/dưới số lượng
- "👤 X người đang chờ"
- Màu cam `#f59e0b`

#### 3. **Modal đăng ký chờ**
```
┌────────────────────────────────────┐
│ 🔔 Đăng ký chờ mượn thiết bị   ✕  │
├────────────────────────────────────┤
│                                    │
│ ┌────────────────────────────────┐ │
│ │ Máy hiện sóng Rigol DS1054Z    │ │
│ │ Mã: RIG-01 · ❌ Đang hết hàng  │ │
│ │ 📊 Đã có 2 người đăng ký chờ   │ │
│ └────────────────────────────────┘ │
│                                    │
│ 💡 Lưu ý: Bạn sẽ được thông báo   │
│ qua email khi có thiết bị trả về  │
│                                    │
│ MSSV: [_________________]          │
│       (có gợi ý dropdown)          │
│                                    │
│ Số lượng: [___]                    │
│                                    │
│ Ghi chú: [___________________]     │
│                                    │
├────────────────────────────────────┤
│    [Hủy]     [🔔 Đăng ký chờ]      │
└────────────────────────────────────┘
```

---

## 🔔 PHASE 3: AUTO NOTIFICATION

### Khi nào thông báo?
- **Trigger:** Khi có người trả thiết bị
- **Function:** `notifyWaitlist(equipmentId)`
- **Logic:**
  1. Check số lượng còn lại > 0
  2. Lấy người đầu tiên trong waitlist (FIFO)
  3. Đổi status → `notified`
  4. Ghi log console (TODO: gửi email thật)

### Return Equipment Response:
```json
{
  "message": "Trả thiết bị thành công",
  "borrow": { ... },
  "waitlistNotified": {
    "name": "Nguyễn Văn A",
    "mssv": "20210001"
  }
}
```

### Console Log:
```
[NOTIFICATION] Nguyễn Văn A (20210001): Thiết bị Máy hiện sóng... đã có sẵn!
```

---

## 🎨 UI/UX DESIGN

### Color Scheme:

| Element | Color | Usage |
|---------|-------|-------|
| Hết hàng row | `rgba(239, 68, 68, 0.08)` | Background đỏ nhạt |
| Warning icon | `#ef4444` | AlertTriangle |
| Số lượng 0 | `#ef4444` | Text đỏ đậm |
| Badge hết hàng | `#ef4444` | Text + icon |
| Nút đăng ký chờ | `#f59e0b` | Cam nổi bật |
| Số người chờ | `#f59e0b` | Info text |

### Icons:
- ⚠️ `<AlertTriangle>` - Cảnh báo hết hàng
- ❌ `<X>` - Icon hết hàng
- 🔔 - Nút đăng ký chờ
- 👤 `<User>` - Số người chờ
- 📊 - Stats trong modal

---

## 📊 DATABASE STRUCTURE

### Collection: `waitlist.json`

```json
[
  {
    "id": "uuid",
    "equipmentId": "eq1",
    "equipmentName": "Máy hiện sóng...",
    "equipmentCode": "RIG-01",
    "mssv": "20210001",
    "userName": "Nguyễn Văn A",
    "qty": 1,
    "notes": "Cần gấp cho dự án",
    "registeredDate": "2026-07-02T10:00:00.000Z",
    "status": "waiting | notified | cancelled | fulfilled",
    "notifiedDate": null | "ISO date",
    "fulfilledDate": null | "ISO date",
    "cancelledDate": null | "ISO date"
  }
]
```

### Status Flow:
```
waiting → notified → fulfilled
   ↓
cancelled
```

---

## 🧪 TESTING SCENARIOS

### Test Case 1: Đăng ký chờ khi hết hàng
1. Mượn hết thiết bị (available = 0)
2. ✅ Row chuyển màu đỏ nhạt
3. ✅ Hiển thị icon ⚠️
4. ✅ Badge "❌ Hết hàng"
5. ✅ Nút "Mượn" → "🔔 Đăng ký chờ"
6. Click "Đăng ký chờ"
7. ✅ Modal xuất hiện
8. Điền MSSV, số lượng
9. Submit
10. ✅ Thông báo "Đăng ký thành công"
11. ✅ Hiển thị "👤 1 người đang chờ"

### Test Case 2: Auto-notify khi trả
1. Có người trong waitlist
2. Trả thiết bị (available > 0)
3. ✅ Console log notification
4. ✅ Status → `notified`
5. ✅ Response có `waitlistNotified`

### Test Case 3: Nhiều người chờ
1. User A đăng ký chờ (10:00)
2. User B đăng ký chờ (10:05)
3. User C đăng ký chờ (10:10)
4. ✅ Hiển thị "👤 3 người đang chờ"
5. Có người trả thiết bị
6. ✅ User A được notify (FIFO)
7. ✅ Status A → `notified`
8. User B, C vẫn `waiting`

### Test Case 4: Đăng ký trùng
1. User A đã đăng ký chờ
2. User A đăng ký chờ lần 2
3. ✅ Error: "Bạn đã đăng ký chờ rồi"

---

## 🚀 FUTURE ENHANCEMENTS

### 1. Email Notification (TODO)
```javascript
// Trong notifyWaitlist()
await sendEmail({
  to: user.email,
  subject: `[Lab CLB] Thiết bị ${eq.name} đã có sẵn!`,
  body: `
    Xin chào ${user.name},
    
    Thiết bị "${eq.name}" mà bạn đăng ký chờ đã có sẵn.
    Bạn có 24h để đến Lab mượn trước khi chuyển sang người tiếp theo.
    
    Thông tin:
    - Thiết bị: ${eq.name} (${eq.code})
    - Số lượng: ${waitlistEntry.qty}
    - Vị trí: ${eq.location}
    
    Trân trọng,
    Lab CLB Manager
  `
});
```

### 2. Push Notification
- Web Push API
- Mobile app notification

### 3. Dashboard Stats Widget
```
┌─────────────────────────────┐
│ 📊 THỐNG KÊ WAITLIST        │
├─────────────────────────────┤
│ 🔔 5 thiết bị đang hết      │
│ 👥 12 người đang chờ        │
│ ⚡ 3 thông báo hôm nay      │
└─────────────────────────────┘
```

### 4. Priority Queue
- VIP members get notified first
- Urgent requests jump queue

### 5. Expiration Time
- 24h để mượn sau khi được notify
- Auto move to next person nếu hết hạn

### 6. Waitlist Management Page
- Admin xem tất cả waitlist
- Reorder queue
- Manually notify/cancel

---

## 📁 FILES MODIFIED

### Backend:
- ✅ `backend/src/server.js` - Added waitlist APIs
- ✅ `backend/data/waitlist.json` - New collection

### Frontend:
- ✅ `frontend/src/pages/Equipment.jsx` - Full waitlist integration

---

## ✅ CHECKLIST

- [x] Visual: Row màu đỏ khi hết
- [x] Visual: Icon warning
- [x] Visual: Badge "Hết hàng"
- [x] Visual: Số lượng màu đỏ
- [x] Backend: Waitlist collection
- [x] Backend: POST `/api/equipment/:id/waitlist`
- [x] Backend: GET `/api/equipment/:id/waitlist`
- [x] Backend: DELETE `/api/waitlist/:id`
- [x] Backend: GET `/api/waitlist/user/:mssv`
- [x] Backend: `notifyWaitlist()` function
- [x] Backend: Integration with return equipment
- [x] Frontend: Nút "Đăng ký chờ"
- [x] Frontend: Hiển thị số người chờ
- [x] Frontend: Waitlist modal
- [x] Frontend: Form validation
- [x] Frontend: Member search dropdown
- [x] Frontend: Fetch waitlist counts
- [x] Frontend: Success/Error messages
- [x] Build successful
- [x] No syntax errors

---

## 🎓 DEMO DATA

Test với các thiết bị sau:

| Thiết bị | Tổng | Đang mượn | Available | Status |
|----------|------|-----------|-----------|---------|
| RIG-01 | 2 | 2 | 0 | ❌ Hết hàng |
| MOH-01 | 5 | 1 | 4 | ✅ Còn hàng |
| ARD-01 | 15 | 4 | 11 | ✅ Còn hàng |

---

**Status**: ✅ HOÀN THÀNH FULL PACKAGE  
**Phase 1**: ✅ Visual  
**Phase 2**: ✅ Waitlist System  
**Phase 3**: ✅ Auto Notification  
**Build**: ✅ Successful  
**Ready for**: Production Testing

*Cập nhật: 02/07/2026*


---


# ========================================================
## TỆP TIN: docs/core/design-system.md
# ========================================================

# Frontend Performance & Rendering Rules

## 1. CSS Backdrop-Filter Warning
Do NOT use `backdrop-filter: blur(...)` on large scrollable containers or frequently re-rendered elements (like `.glass-card` or large data tables).
- **Reason:** In Chromium-based browsers, applying a blur filter to a large scrolling element positioned over a dynamic or gradient background forces the GPU to recalculate the blur for every pixel on every frame, causing massive frame drops and scroll lag (Drop FPS).
- **Solution:** 
  - For large scrolling containers, use solid or slightly transparent backgrounds without `backdrop-filter`.
  - Use `backdrop-filter` ONLY on small, static overlays like Fixed Headers or Modal Overlays (`.modal-overlay`).
  - Always enforce Hardware Acceleration on heavy layers using `transform: translateZ(0); will-change: transform;`.

## 2. React Rendering Optimization (O(1) Lookups)
- **Reason:** Rendering massive tables or lists (e.g. 36-slot schedules) inside React forces `.map()` loops. If a lookup function inside `.map()` uses an Array `.find()`, the complexity becomes O(N*M), dropping UI frames drastically.
- **Solution:** Always transform fetched array data into a `Map` or a `Record<string, Object>` dictionary before passing it into state, so lookup becomes an O(1) direct access. Wrap lookup functions in `useCallback`.

## 3. CSS Spacing Management (Margin, Padding, Gap)
To maintain a robust, scalable, and accessible UI, adhere to the following spacing rules:

**Margin (Outer Space)**
- Use for creating vertical rhythm (e.g., Lobotomized Owl selector `* + *` for `margin-block-start`).
- Use to override specific spaces in the document flow.
- Use `margin-block-start` to separate large semantic blocks like `site-main` and `site-footer`.
- **CRITICAL RULE (Encapsulation):** NEVER apply margins directly to highly reusable components (like Buttons or Cards). A component should not dictate its outer spacing; the parent layout should dictate the spacing.

**Padding (Inner Space & UX)**
- Use `padding-inline` with variables for site gutters to keep consistent edges.
- Use `padding-block` for Header/Footer vertical spacing.
- **CRITICAL RULE (UX Rule 44x44):** Use padding to increase the clickable area of interactive elements (like Navigation Links) instead of using margins. Interactive elements should have a minimum target size of 44x44 pixels.
- Use padding inside Card components so the layout doesn't break when inner elements are removed.

**Gap (Grid & Flexbox)**
- Use `gap` exclusively for Flexbox and Grid containers to create perfectly even spacing between children (e.g., Card Grids).
- Do not abuse `gap` for normal text flow as it forces identical spacing everywhere, ruining typographic hierarchy.

**Decision Framework:**
- **Padding:** Element has a background, border, or needs a larger clickable area.
- **Gap:** Need identical spacing between items in a Grid or Flex container.
- **Margin:** Need precise control or overrides between elements in the normal document flow.

## 4. Button Design System (Carbon Specs)
**Variants & Colors:**
- **Primary:** Background `$button-primary`, Text `$text-on-color`. Hover: `$button-primary-hover`.
- **Secondary:** Background `$button-secondary`, Text `$text-on-color`.
- **Tertiary:** Transparent background, Border `$button-tertiary`, Text `$button-tertiary`. Hover/Active: Background `$button-tertiary-hover`, Text/Icon `$text-inverse`.
- **Ghost:** Transparent background, Text `$link-primary`. Hover: Background `$background-hover`.
- **Danger (Primary/Tertiary/Ghost):** Red based themes for destructive actions.
- **Focus State:** Always use `$focus` border and 1px inset padding.

**Structure & Spacing:**
- **Rule of 16px (1rem):** Elements inside a button must not be closer than 16px to the edge.
- **Padding (No Icon):** Left `1rem` (16px), Right `4rem` (64px).
- **Padding (With Icon):** Left `1rem`, Right `1rem`. Gap between label and icon `≥ 1rem` (16px).
- **Ghost Button Spacing:** Padding L/R `1rem`. Gap between label and icon `0.5rem` (8px).
- **Button Groups:** Gap between buttons should be fixed at `1rem` (16px).

**Sizes (Heights):**
- XS (24px), S (32px), M (40px), L (48px), XL (64px), 2XL (80px).
- Standard Icon Size: 16x16px. Expressive: 20x20px.

**Typography:**
- Use Sentence case (e.g. "Submit form").
- Standard: 14px, weight 400. Expressive: 16px, weight 400.

**Implementation Strategy:**
- Use React Props (`variant`, `size`, `hasIcon`) in a reusable `<Button>` component to calculate classes automatically rather than scattering CSS classes.

## 5. Global Design Tokens (Variables)
To maintain absolute consistency across the UI, ALWAYS use CSS variables (tokens) from `App.css` instead of hardcoding pixel or rem values:
- **Spacing:** `--space-xs` (4px), `--space-sm` (8px), `--space-md` (16px), `--space-lg` (24px), `--space-xl` (32px).
- **Border Radius:** `--radius-sm` (4px), `--radius-md` (8px), `--radius-lg` (12px), `--radius-xl` (16px).
- **Cards (`.glass-card`):** Do NOT apply inline paddings (e.g. `style={{ padding: '1rem' }}`). The `.glass-card` class inherently includes `padding: var(--space-lg)` and `gap: var(--space-md)` via Flexbox.
- **Inputs:** Use standard `.checkin-input`, `.search-input`, or `.form-group input` for all text inputs. They are globally standardized to a height of 40px and `border-radius: var(--radius-md)`.


---
