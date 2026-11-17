# Design Direction

<!-- ryux-context:start -->

- **UI direction**: The user-selected primary brand color is `#047857`. Other visual direction remains unspecified.
- **Motion direction**: Not specified by the user.

<!-- ryux-context:end -->

Use `--brand-primary` in `src/styles.css` as the canonical brand color. Semantic primary, sidebar-primary, and focus-ring tokens consume it in light and dark themes. Primary-filled controls use white foreground text. Apply semantic utilities instead of hardcoding the brand hex throughout components.

Keep booking availability and payment statuses distinct through text/icons and appropriate semantic status colors; brand color alone must not communicate status. Validate contrast for new surfaces and states. No broader palette, typography, or motion system has been approved by this direction.

## Customer booking direction

The customer portal is mobile-first. Keep the full-screen satellite map, a compact cart bar by default, and slot-code search. Open cart contents only on request in a bottom sheet with an explicit **Tutup** control; do not use a chevron as the only way to dismiss it. Bound the normal portrait sheet to 65% of the dynamic viewport, allow internal item scrolling, and keep its close control and totals/footer visible. Short-height screens may use up to 85% so the fixed header/footer still fit. Respect safe areas and keep touch controls at least 44 px.

Customer booking copy is confirmed as casual Bahasa Indonesia with a restrained Gen Z tone: natural words such as “nih”, “bentar”, “masukin” and “kosongin”, without obscuring actions, errors or reservation/payment state. Use consistent **keranjang**, **slot**, **peta** and **Tutup** labels. Localize accessibility labels and decimal dimensions as well as visible copy. Keep technical documentation in English and preserve provider names/legal map attribution.
