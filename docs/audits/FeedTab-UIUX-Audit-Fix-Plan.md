# FeedTab.tsx — UI/UX Fix Plan

> Generated from full UI/UX Pro Max audit of `src/components/Feed/FeedTab.tsx` (1397 lines)
> 
> **Workflow:** User says "start" → implement batch → verify no build/eslint errors → commit → wait for "next"

---

## Batch 1: Critical Accessibility — ARIA Labels & Roles

### Task 1.1 — A1: Add `aria-label` to post type selector buttons
- **File:** `src/components/Feed/FeedTab.tsx`
- **Lines:** 813-876
- **Issue:** Screen readers announce "button" without context
- **Fix:** Add descriptive `aria-label` to each post type button
  - Text button → `aria-label="Create text post"`
  - Image button → `aria-label="Create image post"`
  - Video button → `aria-label="Create video post"`
  - GIF button → `aria-label="Create GIF post"`
  - Poll button → `aria-label="Create poll"`

### Task 1.2 — A2: Add `aria-label` and `role="group"` to category filter pills
- **File:** `src/components/Feed/FeedTab.tsx`
- **Lines:** 1137-1164
- **Issue:** Category filter buttons have no accessible description
- **Fix:**
  - Wrap pills container in `<div role="group" aria-label="Filter by category">`
  - "All" button → `aria-label="Show all categories"`
  - Each category button → `aria-label="Filter by ${cat.name}"`

### Task 1.3 — A3: Add `aria-expanded` and `aria-haspopup` to sort dropdown button
- **File:** `src/components/Feed/FeedTab.tsx`
- **Lines:** 1169-1180
- **Issue:** Screen readers can't tell this opens a menu
- **Fix:** Add `aria-expanded={showSortDropdown}` and `aria-haspopup="listbox"` to the sort button

### Task 1.4 — A4: Add `role="listbox"` and `role="option"` to sort dropdown menu
- **File:** `src/components/Feed/FeedTab.tsx`
- **Lines:** 1183-1206
- **Issue:** Dropdown items are plain buttons without menu semantics
- **Fix:**
  - Add `role="listbox"` to dropdown container
  - Add `role="option"` and `aria-selected={selectedSort === option.value}` to each item

### Task 1.5 — A6: Add `role="alert"` to error messages
- **File:** `src/components/Feed/FeedTab.tsx`
- **Lines:** 1102-1106
- **Issue:** Form errors appear without screen reader announcement
- **Fix:** Add `role="alert"` to the error message div wrapper

---

## Batch 2: Accessibility + Touch Targets

### Task 2.1 — A5: Add descriptive `alt` text to image previews
- **File:** `src/components/Feed/FeedTab.tsx`
- **Lines:** 952-953
- **Issue:** Image previews use `alt=""` but are meaningful user-selected images
- **Fix:** Change to `alt={`Image preview ${i + 1}`}`

### Task 2.2 — A7: Add `aria-busy` to submit button
- **File:** `src/components/Feed/FeedTab.tsx`
- **Lines:** 1121-1127
- **Issue:** "Posting..." state change is invisible to screen readers
- **Fix:** Add `aria-busy={isLoading}` to the submit button

### Task 2.3 — A8: Replace disabled poll radio buttons with `aria-hidden` spans
- **File:** `src/components/Feed/FeedTab.tsx`
- **Lines:** 1023-1027
- **Issue:** Disabled buttons that look like radio inputs confuse screen readers
- **Fix:** Replace `<button disabled>` with `<span aria-hidden="true">` styled as a circle

### Task 2.4 — A9: Fix upload area keyboard support
- **File:** `src/components/Feed/FeedTab.tsx`
- **Lines:** 927-943
- **Issue:** `role="button"` div with `onKeyDown` is less reliable than a real button
- **Fix:** Replace the `<div role="button">` with a `<button type="button">` element

### Task 2.5 — T1: Increase post type selector touch targets to 44×44px
- **File:** `src/components/Feed/FeedTab.tsx`
- **Lines:** 813-876
- **Issue:** `p-2` padding creates touch targets below 44px minimum on mobile
- **Fix:** Change to `px-4 py-2.5 min-h-[44px]` on all post type buttons

---

## Batch 3: Touch Targets + Performance

### Task 3.1 — T2: Increase remove image button hit area to 44×44px
- **File:** `src/components/Feed/FeedTab.tsx`
- **Lines:** 958-964
- **Issue:** `p-1` creates ~20px target, well below 44px minimum
- **Fix:** Use `min-h-[44px] min-w-[44px] flex items-center justify-center p-1` with negative margin for positioning

### Task 3.2 — T3: Increase poll option remove button hit area
- **File:** `src/components/Feed/FeedTab.tsx`
- **Lines:** 1035-1043
- **Issue:** Icon-only remove button may not meet 44px on all devices
- **Fix:** Add `min-h-[44px] min-w-[44px]` to the remove button

### Task 3.3 — T4: Disable upload area during image upload
- **File:** `src/components/Feed/FeedTab.tsx`
- **Lines:** 927-943
- **Issue:** Upload area remains clickable while images are processing
- **Fix:** Add `disabled` state or `pointer-events-none` class when `isUploadingImages` is true

### Task 3.4 — P1: Add `width`/`height`/`aspect-ratio` to all images
- **File:** `src/components/Feed/FeedTab.tsx`
- **Lines:** 772-776, 792-796, 952-953
- **Issue:** Causes Cumulative Layout Shift (CLS) when images load
- **Fix:**
  - Avatars: add `width="40" height="40"` attributes
  - Previews: add `className="... aspect-square"` (already has fixed w-20 h-20)

### Task 3.5 — P5: Memoize `pinnedPosts` and `regularPosts` filters
- **File:** `src/components/Feed/FeedTab.tsx`
- **Lines:** 734-735
- **Issue:** `.filter()` runs twice on every render cycle
- **Fix:** Wrap in `useMemo(() => allPosts.filter(...), [allPosts])`

---

## Batch 4: Performance + Code Quality

### Task 4.1 — P2: Add `loading="lazy"` to image previews
- **File:** `src/components/Feed/FeedTab.tsx`
- **Lines:** 952-953
- **Issue:** All preview thumbnails load immediately even when off-screen
- **Fix:** Add `loading="lazy"` attribute to preview `<img>` tags

### Task 4.2 — P3: Add `loading="lazy"` to avatar images
- **File:** `src/components/Feed/FeedTab.tsx`
- **Lines:** 772, 792
- **Issue:** Avatar images load eagerly
- **Fix:** Add `loading="lazy"` to avatar `<img>` tags

### Task 4.3 — P6: Consolidate draft save effect dependencies
- **File:** `src/components/Feed/FeedTab.tsx`
- **Lines:** 386
- **Issue:** Effect has 9 dependencies, triggers on every field change
- **Fix:** Create a single `draftState` object with `useMemo` and use it as the sole dependency

### Task 4.4 — P7: Consolidate ref-sync `useEffect` hooks
- **File:** `src/components/Feed/FeedTab.tsx`
- **Lines:** 220-227
- **Issue:** Nine separate `useEffect` hooks each create subscriptions
- **Fix:** Consolidate into a single effect that syncs all refs at once

### Task 4.5 — S7: Extract duplicate avatar rendering to component
- **File:** `src/components/Feed/FeedTab.tsx`
- **Lines:** 770-783, 790-803
- **Issue:** Same avatar block rendered in both collapsed and expanded states
- **Fix:** Create inline `ComposerAvatar` helper component or extract the JSX into a variable

---

## Batch 5: Style Consistency

### Task 5.1 — S1: Standardize button border-radius tokens
- **File:** `src/components/Feed/FeedTab.tsx`
- **Lines:** 813-876, 1138-1164, 1169-1180
- **Issue:** Mixed `rounded-md`, `rounded-full`, `rounded-lg` across similar button types
- **Fix:** Standardize: pill filters → `rounded-full`, action buttons → `rounded-lg`, type selectors → `rounded-lg`

### Task 5.2 — S2: Replace hardcoded `bg-blue-500` with `bg-primary`
- **File:** `src/components/Feed/FeedTab.tsx`
- **Lines:** 1173
- **Issue:** Sort button active state uses raw hex color, breaks semantic color system
- **Fix:** Replace `bg-blue-500` with `bg-primary` for theme consistency

### Task 5.3 — S3: Replace hardcoded error colors with semantic tokens
- **File:** `src/components/Feed/FeedTab.tsx`
- **Lines:** 1103
- **Issue:** `bg-red-50 border-red-200` not dark-mode safe
- **Fix:** Use semantic tokens like `bg-error/10 border-error/20` or `bg-destructive/10`

### Task 5.4 — S4: Replace hardcoded poll remove button colors
- **File:** `src/components/Feed/FeedTab.tsx`
- **Lines:** 1039
- **Issue:** `text-red-500 hover:bg-red-50` not dark-mode safe
- **Fix:** Use `text-destructive hover:bg-destructive/10` or equivalent semantic tokens

### Task 5.5 — S5: Style "Add option" button consistently
- **File:** `src/components/Feed/FeedTab.tsx`
- **Lines:** 1047-1054
- **Issue:** `text-primary hover:underline` inconsistent with other composer buttons
- **Fix:** Style as a secondary button or icon button matching the design system

---

## Batch 6: Layout & Responsive

### Task 6.1 — L1: Add scroll indicator to category pills
- **File:** `src/components/Feed/FeedTab.tsx`
- **Lines:** 1137
- **Issue:** `overflow-x-auto` with no visual indicator that more categories exist
- **Fix:** Add a right-edge fade gradient mask using `mask-image` or a pseudo-element overlay

### Task 6.2 — L2: Deduplicate sidebar rendering
- **File:** `src/components/Feed/FeedTab.tsx`
- **Lines:** 1270-1370
- **Issue:** Two separate `<div>` blocks with identical `QuickInfoCard` props for mobile/desktop
- **Fix:** Render once with responsive classes: `<div className="w-full lg:w-80 shrink-0 order-first lg:order-none">` and remove the duplicate `lg:hidden`/`hidden lg:block` blocks

### Task 6.3 — L3: Add `mx-auto` to center main column
- **File:** `src/components/Feed/FeedTab.tsx`
- **Lines:** 760
- **Issue:** On very wide screens, content may not be centered
- **Fix:** Add `mx-auto` to the main column div

### Task 6.4 — L4: Fix sort dropdown overflow on narrow screens
- **File:** `src/components/Feed/FeedTab.tsx`
- **Lines:** 1184
- **Issue:** `absolute right-0` dropdown may overflow viewport on narrow screens
- **Fix:** Add `max-w-[calc(100vw-2rem)]` and `right-0` with overflow handling

### Task 6.5 — L5: Add `min-h-dvh` to outer container
- **File:** `src/components/Feed/FeedTab.tsx`
- **Lines:** 758
- **Issue:** Page may not fill viewport on mobile with short content
- **Fix:** Add `min-h-dvh` to the outer flex container

---

## Batch 7: Forms & Feedback

### Task 7.1 — F1: Add visible labels to all form inputs
- **File:** `src/components/Feed/FeedTab.tsx`
- **Lines:** 981-986, 1002-1006, 1014-1018, 1028-1031
- **Issue:** Placeholder-only inputs for video URL, GIF URL, poll question, poll options
- **Fix:** Add visible `<label>` elements above each input, or use the component's label prop if available

### Task 7.2 — F2: Add inline validation for GIF URL
- **File:** `src/components/Feed/FeedTab.tsx`
- **Lines:** 1002-1006
- **Issue:** GIF URL input has no inline validation feedback (unlike video URL)
- **Fix:** Add red border and error text below the input when `gifUrl && !isValidGifUrl(gifUrl)`

### Task 7.3 — F3: Fix poll end date `min` attribute timezone issue
- **File:** `src/components/Feed/FeedTab.tsx`
- **Lines:** 1064
- **Issue:** `toISOString().slice(0, 16)` may produce invalid values in some timezones
- **Fix:** Use a timezone-aware local datetime string: construct from `new Date()` components

### Task 7.4 — F4: Add confirmation before discarding draft
- **File:** `src/components/Feed/FeedTab.tsx`
- **Lines:** 314-328, 1113-1117
- **Issue:** Clicking outside composer or Cancel silently discards unsaved content
- **Fix:** Check if draft has content before closing, show a toast or inline warning if so

### Task 7.5 — F5: Add `maxLength={5000}` to text area
- **File:** `src/components/Feed/FeedTab.tsx`
- **Lines:** 884-894
- **Issue:** Character counter shows `/5000` but no actual limit enforced
- **Fix:** Add `maxLength={5000}` prop to the TextArea component

---

## Batch 8: Animation & Motion

### Task 8.1 — AN1: Add enter/exit animation to sort dropdown
- **File:** `src/components/Feed/FeedTab.tsx`
- **Lines:** 1183-1206
- **Issue:** Dropdown appears/disappears instantly with no transition
- **Fix:** Add `transition-all duration-200 ease-out` with opacity and scale transform. Use conditional rendering with animation state or CSS transitions.

### Task 8.2 — AN2: Add expand/collapse animation to composer
- **File:** `src/components/Feed/FeedTab.tsx`
- **Lines:** 764, 787
- **Issue:** Composer snaps open/closed with no animation
- **Fix:** Add a fade-in + slide-up transition using `transition-all duration-200` on the expanded content

### Task 8.3 — AN3: Add fade-out transition to image preview removal
- **File:** `src/components/Feed/FeedTab.tsx`
- **Lines:** 958-964
- **Issue:** Image previews disappear instantly on remove
- **Fix:** Add a brief fade-out animation before removing from state (use CSS transition + setTimeout)

### Task 8.4 — AN5: Add `prefers-reduced-motion` support
- **File:** `src/components/Feed/FeedTab.tsx`
- **Lines:** throughout
- **Issue:** All transitions run regardless of user's motion preference
- **Fix:** Add CSS `@media (prefers-reduced-motion: reduce)` to disable animations, or use a `useReducedMotion` hook

### Task 8.5 — N1: Add focus management to profile panel
- **File:** `src/components/Feed/FeedTab.tsx`
- **Lines:** 1390-1394
- **Issue:** When profile panel opens, focus isn't moved to the panel
- **Fix:** Auto-focus the panel's close button or first interactive element when `profileUserId` is set

---

## Batch 9: Navigation + Remaining Polish

### Task 9.1 — N2: Sync sort/category state to URL params
- **File:** `src/components/Feed/FeedTab.tsx`
- **Lines:** 160-161
- **Issue:** Changing sort/category doesn't update URL, so sharing/bookmarking loses preferences
- **Fix:** Use `useSearchParams` / `useRouter` to sync `selectedSort` and `selectedCategoryId` to URL query params

### Task 9.2 — A10: Add landmark regions
- **File:** `src/components/Feed/FeedTab.tsx`
- **Lines:** 758
- **Issue:** Page has no `<main>`, `<nav>`, or `<aside>` landmarks
- **Fix:** Wrap main feed in `<main>`, category filter bar in `<nav aria-label="Feed filters">`, sidebar in `<aside>`

### Task 9.3 — TY2: Add line-length control to text areas
- **File:** `src/components/Feed/FeedTab.tsx`
- **Lines:** 884
- **Issue:** Long text posts could stretch to full container width, reducing readability
- **Fix:** Add `max-w-prose` or `max-w-[65ch]` to the TextArea component

### Task 9.4 — TY3: Standardize text size tokens
- **File:** `src/components/Feed/FeedTab.tsx`
- **Lines:** 891, 942, 1067
- **Issue:** Mixed `size="sm"`, `size="2"`, and raw Tailwind classes used interchangeably
- **Fix:** Standardize on the `Text` component's size system throughout

### Task 9.5 — S6: Fix category selector inline style for dark mode
- **File:** `src/components/Feed/FeedTab.tsx`
- **Lines:** 1089-1091
- **Issue:** Inline `style={{ backgroundColor }}` overrides theme system
- **Fix:** Use opacity overlay approach or ensure category colors have dark-mode variants

---

## Execution Rules

1. **Wait for "start"** before beginning Batch 1
2. **Implement all 5 tasks** in the current batch
3. **Run build and lint** — fix any errors before proceeding
4. **Commit** with descriptive message referencing the batch number
5. **Wait for "next"** before starting the next batch
6. **Repeat** until all 9 batches are complete

## Verification Commands (after each batch)

```bash
npm run build
npm run lint
```

Both must pass with zero errors before committing.

## Commit Message Format

```
fix(FeedTab): batch N — [brief description]

- Task N.1: [description]
- Task N.2: [description]
- Task N.3: [description]
- Task N.4: [description]
- Task N.5: [description]
```
