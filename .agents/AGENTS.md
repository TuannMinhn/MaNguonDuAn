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
