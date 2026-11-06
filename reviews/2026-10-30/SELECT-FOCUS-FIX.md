# Dropdown focus accessibility fix

Native select form mirror previously used sr-only + aria-hidden with tabindex -1. It could still receive programmatic/label focus (including Sheet autofocus) while hidden from accessibility APIs. Mirror now uses hidden/display:none without aria-hidden; original control ID belongs to visible combobox so label activation targets the visible button. Native invalid events prevent focusing the hidden mirror and route focus to visible control. Form name/value and controlled onChange remain intact.

Verification: Worker typecheck, 92/92 tests, Web build pass. Browser keyboard ArrowDown / End / Enter changes sort to az and confirms focus remains BUTTON role combobox outside hidden/aria-hidden ancestors; mirror retains az and display:none. No aria-hidden warning observed. Local fixture session restoration returned HTTP 500 separately; backend availability not established by this frontend check. No auth or redirect changes.
