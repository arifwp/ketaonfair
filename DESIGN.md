# Design Direction

<!-- ryux-context:start -->

- **UI direction**: The user-selected primary brand color is `#047857`. Other visual direction remains unspecified.
- **Motion direction**: Not specified by the user.

<!-- ryux-context:end -->

Use `--brand-primary` in `src/styles.css` as the canonical brand color. Semantic primary, sidebar-primary, and focus-ring tokens consume it in light and dark themes. Primary-filled controls use white foreground text. Apply semantic utilities instead of hardcoding the brand hex throughout components.

Keep booking availability and payment statuses distinct through text/icons and appropriate semantic status colors; brand color alone must not communicate status. Validate contrast for new surfaces and states. No broader palette, typography, or motion system has been approved by this direction.
