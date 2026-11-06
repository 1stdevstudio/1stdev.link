# Design controls repair

Root cause: BUSINESS_CSS hid wallpaper, dim, aurora and grain layers; business avatar CSS overrode all selected radii. Removed these overrides while preserving business sizing/layout. Canonical profile.avatar_shape now precedes legacy style.av_shape. Aurora uses color-mix for valid short/long hex accents and clearer glow. Atmospheric buttons expose aria-pressed.

Worker native typecheck and 94/94 tests pass; Web build passes. Added designControls regression tests across paper/ink and all three avatar shapes, legacy fallback, effects on/off, wallpaper blur and dim. Browser computed style verifies circle 50%, rounded 12px, visible aurora/grain, and wallpaper display:block with blur(8px) and rgba black 0.3 dim. Screenshot release-evidence/design-wallpaper-fixed.png is a synthetic local fixture, not the user's profile. Live @1stnear confirms old hiding rule absent. No user's design settings modified during verification.

Production Worker 73c04898-a71d-4d03-b38e-fda531fa1dda. Frontend https://64c44598.edgelink-afl.pages.dev. No commit/push.
