# ESLint Fix Tasks

This document lists all actionable ESLint errors and warnings that need to be fixed. Tasks are grouped into batches of 4 for incremental fixing.

---

## Batch 1: Convex Backend (classrooms.ts)
- [ ] **convex/functions/classrooms.ts:17** - `no-explicit-any` - Add proper types for getUserLevel function parameters (ctx, communityId, userId)
- [ ] **convex/functions/classrooms.ts:20** - `no-explicit-any` - Fix index function parameter type
- [ ] **convex/functions/classrooms.ts:21** - `no-explicit-any` - Fix filter function parameter type
- [ ] **convex/functions/classrooms.ts:24** - `no-explicit-any` - Fix reduce callback parameter type

---

## Batch 2: Feed Components - PostCard.tsx
- [ ] **src/components/Feed/PostCard.tsx:90** - `no-explicit-any` - Fix getUserLevel query args types
- [ ] **src/components/Feed/PostCard.tsx:118** - `react-hooks/exhaustive-deps` - Add missing deps (post, userId) or suppress
- [ ] **src/components/Feed/PostCard.tsx:431** - `@next/next/no-img-element` - Replace `<img>` with Next.js `<Image>`
- [ ] **src/components/Feed/PostCard.tsx:457** - `@next/next/no-img-element` - Replace `<img>` with Next.js `<Image>`

---

## Batch 3: Feed Components - PostComposer.tsx
- [ ] **src/components/Feed/PostComposer.tsx:67** - `no-explicit-any` - Fix searchMembers query args
- [ ] **src/components/Feed/PostComposer.tsx:330** - `no-explicit-any` - Fix member type in map callback
- [ ] **src/components/Feed/PostComposer.tsx:376** - `no-explicit-any` - Fix member type in map callback
- [ ] **src/components/Feed/PostComposer.tsx:443** - `no-explicit-any` - Fix member type in map callback

---

## Batch 4: Feed Components - Comment & CommentInput
- [ ] **src/components/Feed/Comment.tsx:84** - `no-explicit-any` - Fix getUserLevel query args
- [ ] **src/components/Feed/Comment.tsx:236** - `@next/next/no-img-element` - Replace `<img>` with Next.js `<Image>`
- [ ] **src/components/Feed/CommentInput.tsx:96** - `no-explicit-any` - Fix searchMembers query args
- [ ] **src/components/Feed/CommentInput.tsx:124** - `no-explicit-any` - Fix createComment postId type

---

## Batch 5: Feed Components - CommentsSection
- [ ] **src/components/Feed/CommentsSection.tsx:42** - `react-hooks/refs` - Fix cursorRef access during render (use state instead)
- [ ] **src/components/Feed/CommentsSection.tsx:49** - `no-explicit-any` - Fix listComments query args
- [ ] **src/components/Feed/CommentsSection.tsx:36** - `no-unused-vars` - Remove unused setIsLoading
- [ ] **src/components/Feed/PostComposer.tsx:411** - `@next/next/no-img-element` - Replace `<img>` with Next.js `<Image>`

---

## Batch 6: Community - OnboardingModal & EditCommunityModal
- [ ] **src/components/community/OnboardingModal.tsx:61** - `no-explicit-any` - Fix checkMemberLimit query args
- [ ] **src/components/community/OnboardingModal.tsx:122** - `no-explicit-any` - Fix grantMembership mutation args
- [ ] **src/components/community/OnboardingModal.tsx:150** - `no-explicit-any` - Fix createCheckout mutation args
- [ ] **src/components/community/EditCommunityModal.tsx:228** - `no-explicit-any` - Fix updateCommunity mutation args

---

## Batch 7: Community - ProfilePanel & LinkInputs
- [ ] **src/components/community/ProfilePanel.tsx:395** - Property doesn't exist - Fix activityData type (remove upvotesCount, lessonsCount)
- [ ] **src/components/community/ProfilePanel.tsx:25** - `no-unused-vars` - Remove or use clerkUser
- [ ] **src/components/community/LinkInputs.tsx:25** - `react-hooks/set-state-in-effect` - Use useState initializer instead of useEffect
- [ ] **src/components/community/LeaderboardTab.tsx:235** - `react/no-unescaped-entities` - Escape apostrophe

---

## Batch 8: Classrooms - ClassroomSidebar
- [ ] **src/components/Classrooms/ClassroomSidebar.tsx:3** - `no-unused-vars` - Remove useCallback import
- [ ] **src/components/Classrooms/ClassroomSidebar.tsx:12** - `no-unused-vars` - Remove DragOverlay import
- [ ] **src/components/Classrooms/ClassroomSidebar.tsx:13** - `no-unused-vars` - Remove closestCorners import
- [ ] **src/components/Classrooms/ClassroomSidebar.tsx:17** - `no-unused-vars` - Remove sortableKeyboardCoordinates import

---

## Batch 9: Classrooms - ClassroomViewer
- [ ] **src/components/Classrooms/ClassroomViewer.tsx:10** - `no-unused-vars` - Remove Card import
- [ ] **src/components/Classrooms/ClassroomViewer.tsx:16** - `no-unused-vars` - Remove CardContent import
- [ ] **src/components/Classrooms/ClassroomViewer.tsx:13** - `no-unused-vars` - Remove VideoEmbed import
- [ ] **src/components/Classrooms/ClassroomViewer.tsx:14** - `no-unused-vars` - Remove LessonDescription import

---

## Batch 10: Classrooms - More issues
- [ ] **src/components/Classrooms/ClassroomViewer.tsx:17** - `no-unused-vars` - Remove DndContext import
- [ ] **src/components/Classrooms/ClassroomViewer.tsx:18** - `no-unused-vars` - Remove closestCenter import
- [ ] **src/components/Classrooms/ClassroomViewer.tsx:27** - `no-unused-vars` - Remove SortableContext import
- [ ] **src/components/Classrooms/ClassroomViewer.tsx:29** - `no-unused-vars` - Remove verticalListSortingStrategy import

---

## Batch 11: Classrooms - More fixes
- [ ] **src/components/Classrooms/ClassroomViewer.tsx:65** - `no-unused-vars` - Remove videoModalOpen state
- [ ] **src/components/Classrooms/ClassroomViewer.tsx:121** - `react-hooks/exhaustive-deps` - Fix ref cleanup
- [ ] **src/components/Classrooms/ClassroomViewer.tsx:173** - `no-unused-vars` - Remove markPageViewed unused mutation
- [ ] **src/components/Classrooms/ClassroomViewer.tsx:198** - `react-hooks/exhaustive-deps` - Memoize modules variable

---

## Batch 12: Classrooms - Error handlers & other
- [ ] **src/components/Classrooms/ClassroomViewer.tsx:305** - `no-unused-vars` - Remove unused err variable
- [ ] **src/components/Classrooms/ClassroomViewer.tsx:327** - `no-unused-vars` - Remove unused err variable
- [ ] **src/components/Classrooms/ClassroomViewer.tsx:350** - `no-unused-vars` - Remove unused err variable
- [ ] **src/components/Classrooms/ClassroomViewer.tsx:387** - `no-unused-vars` - Remove unused err variable

---

## Batch 13: More ClassroomViewer
- [ ] **src/components/Classrooms/ClassroomViewer.tsx:402** - `no-unused-vars` - Remove unused err variable
- [ ] **src/components/Classrooms/ClassroomViewer.tsx:423** - `no-unused-vars` - Remove unused err variable
- [ ] **src/components/Classrooms/ClassroomViewer.tsx:447** - `react-hooks/exhaustive-deps` - Add editingChapterTitle to deps
- [ ] **src/components/Classrooms/ClassroomViewer.tsx:456** - `react-hooks/exhaustive-deps` - Add editingChapterTitle to deps

---

## Batch 14: ChapterItem & LessonContent
- [ ] **src/components/Classrooms/ChapterItem.tsx:63** - `no-unused-vars` - Remove openMenu
- [ ] **src/components/Classrooms/ChapterItem.tsx:64** - `no-unused-vars` - Remove setOpenMenu
- [ ] **src/components/Classrooms/ChapterItem.tsx:65** - `no-unused-vars` - Remove editingChapterId
- [ ] **src/components/Classrooms/ChapterItem.tsx:66** - `no-unused-vars` - Remove setEditingChapterId

---

## Batch 15: ChapterItem & LessonContent continued
- [ ] **src/components/Classrooms/ChapterItem.tsx:67** - `no-unused-vars` - Remove editingChapterTitle
- [ ] **src/components/Classrooms/ChapterItem.tsx:68** - `no-unused-vars` - Remove setEditingChapterTitle
- [ ] **src/components/Classrooms/ChapterItem.tsx:69** - `no-unused-vars` - Remove handleTitleBlur
- [ ] **src/components/Classrooms/ChapterItem.tsx:70** - `no-unused-vars` - Remove handleTitleKeyDown

---

## Batch 16: More ChapterItem & LessonContent
- [ ] **src/components/Classrooms/ChapterItem.tsx:71** - `no-unused-vars` - Remove setDeleteConfirm
- [ ] **src/components/Classrooms/ChapterItem.tsx:72** - `no-unused-vars` - Remove lessonsSortableId
- [ ] **src/components/Classrooms/ChapterItem.tsx:73** - `no-unused-vars` - Remove onLessonDragEnd
- [ ] **src/components/Classrooms/LessonContent.tsx:64** - `no-unused-vars` - Remove selectedPageId

---

## Batch 17: LessonContent & LessonItem
- [ ] **src/components/Classrooms/LessonContent.tsx:66** - `no-unused-vars` - Remove isSidebarOpen
- [ ] **src/components/Classrooms/LessonContent.tsx:82** - `no-unused-vars` - Remove editingLessonId
- [ ] **src/components/Classrooms/LessonContent.tsx:83** - `no-unused-vars` - Remove setEditingLessonId
- [ ] **src/components/Classrooms/LessonContent.tsx:84** - `no-unused-vars` - Remove editingLessonTitle

---

## Batch 18: More LessonContent & LessonItem
- [ ] **src/components/Classrooms/LessonContent.tsx:85** - `no-unused-vars` - Remove setEditingLessonTitle
- [ ] **src/components/Classrooms/LessonContent.tsx:86** - `no-unused-vars` - Remove deleteConfirmLesson
- [ ] **src/components/Classrooms/LessonContent.tsx:87** - `no-unused-vars` - Remove setDeleteConfirmLesson
- [ ] **src/components/Classrooms/LessonContent.tsx:88** - `no-unused-vars` - Remove handleDeleteLesson

---

## Batch 19: LessonItem & ClassroomsTab
- [ ] **src/components/Classrooms/LessonItem.tsx:23** - `no-unused-vars` - Remove moduleId
- [ ] **src/components/Classrooms/LessonItem.tsx:51** - `@next/next/no-img-element` - Replace `<img>` with `<Image>`
- [ ] **src/components/Classrooms/ClassroomsTab.tsx:16** - `no-unused-vars` - Remove ThumbnailUpload
- [ ] **src/components/Classrooms/ClassroomsTab.tsx:19** - `no-unused-vars` - Remove accessTypeLabels

---

## Batch 20: ClassroomsTab & ClassroomCard
- [ ] **src/components/Classrooms/ClassroomsTab.tsx:193** - `no-unused-vars` - Remove handleCloseViewer
- [ ] **src/components/Classrooms/ClassroomCard.tsx:79** - `@next/next/no-img-element` - Replace `<img>` with `<Image>`
- [ ] **src/components/Classrooms/AddChapterButton.tsx:3** - `no-unused-vars` - Remove Text import
- [ ] **src/components/Classrooms/ClassroomSidebar.tsx:284** - `@next/next/no-img-element` - Replace `<img>` with `<Image>`

---

## Batch 21: FeedTab & AboutTab
- [ ] **src/components/Feed/FeedTab.tsx:338** - `react-hooks/exhaustive-deps` - Add setShowComposer to deps
- [ ] **src/components/Feed/FeedTab.tsx:771** - `@next/next/no-img-element` - Replace `<img>` with `<Image>`
- [ ] **src/components/Feed/FeedTab.tsx:790** - `@next/next/no-img-element` - Replace `<img>` with `<Image>`
- [ ] **src/components/Feed/FeedTab.tsx:949** - `@next/next/no-img-element` - Replace `<img>` with `<Image>`

---

## Batch 22: AboutTab & ClassroomsTab
- [ ] **src/components/community/AboutTab.tsx:12** - `no-unused-vars` - Remove Badge import
- [ ] **src/components/community/AboutTab.tsx:472** - `@next/next/no-img-element` - Replace `<img>` with `<Image>`
- [ ] **src/components/community/ClassroomsTab.tsx:7** - `no-unused-vars` - Remove useAuth import
- [ ] **src/components/community/ClassroomsTab.tsx:12** - `no-unused-vars` - Remove Heading import

---

## Batch 23: More ClassroomsTab
- [ ] **src/components/community/ClassroomsTab.tsx:13** - `no-unused-vars` - Remove CardHeader import
- [ ] **src/components/community/ClassroomsTab.tsx:13** - `no-unused-vars` - Remove CardTitle import
- [ ] **src/components/community/ClassroomsTab.tsx:21** - `no-unused-vars` - Remove accessTypeLabels
- [ ] **src/components/community/ClassroomsTab.tsx:195** - `no-unused-vars` - Remove handleCloseViewer

---

## Batch 24: API Routes & Convex functions
- [ ] **src/app/api/webhooks/chargily/route.ts:108** - `no-unused-vars` - Remove unused error variable
- [ ] **src/app/api/webhooks/clerk/route.ts:15** - `no-unused-vars` - Remove unused verifySignature
- [ ] **src/app/[communitySlug]/page.tsx:6** - `no-unused-vars` - Remove SignInButton
- [ ] **src/app/[communitySlug]/page.tsx:6** - `no-unused-vars` - Remove SignUpButton

---

## Batch 25: More API & explore page
- [ ] **src/app/explore/page.tsx:9** - `no-unused-vars` - Remove Button import
- [ ] **convex/functions/feed.ts:182** - `no-unused-vars` - Remove unused mentionMatches
- [ ] **convex/functions/leaderboard.ts:284** - `no-unused-vars` - Fix unused ctx and args
- [ ] **convex/functions/leaderboard.ts:301** - `no-unused-vars` - Fix unused ctx and args

---

## Batch 26: Leaderboard & seed
- [ ] **convex/functions/leaderboard.ts:516** - `no-unused-vars` - Fix unused ctx and args
- [ ] **convex/seed.ts:7** - `no-unused-vars` - Remove SeedArgs
- [ ] **src/components/community/SettingsModal.tsx:15** - `no-unused-vars` - Remove Smartphone import
- [ ] **src/components/community/SettingsModal.tsx:63** - `react-hooks/exhaustive-deps` - Fix deps

---

## Batch 27: More SettingsModal
- [ ] **src/components/community/SettingsModal.tsx:117** - `no-unused-vars` - Remove error variable
- [ ] **src/components/community/SettingsModal.tsx:126** - `no-unused-vars` - Remove error variable
- [ ] **src/components/community/ExploreModal.tsx:10** - `no-unused-vars` - Remove Button import
- [ ] **src/components/community/CreateCommunityModal.tsx:16** - `no-unused-vars` - Remove DialogClose

---

## Batch 28: More Community modals
- [ ] **src/components/community/CreateCommunityModal.tsx:18** - `no-unused-vars` - Remove Heading import
- [ ] **src/components/community/EditCommunityModal.tsx:136** - `react-hooks/exhaustive-deps` - Add slug to deps
- [ ] **src/components/community/EditCommunityModal.tsx:181** - `no-unused-vars` - Remove err variable
- [ ] **src/components/community/OnboardingModal.tsx:117** - `no-unused-vars` - Remove err variable (use catch block without param)

---

## Batch 29: More OnboardingModal
- [ ] **src/components/community/OnboardingModal.tsx:161** - `no-unused-vars` - Remove err variable
- [ ] **src/components/community/ProfilePanel.tsx:73** - `react-hooks/exhaustive-deps` - Add targetUser to deps
- [ ] **src/components/community/ProfilePanel.tsx:97** - `react-hooks/exhaustive-deps` - Add doSave to deps
- [ ] **src/components/community/ProfilePanel.tsx:154** - `react-hooks/exhaustive-deps` - Add handleClose to deps

---

## Batch 30: Unused eslint-disable directives (cleanup)
- [ ] Remove unused eslint-disable in: convex/_generated/api.js
- [ ] Remove unused eslint-disable in: convex/_generated/dataModel.d.ts
- [ ] Remove unused eslint-disable in: convex/_generated/server.d.ts
- [ ] Remove unused eslint-disable in: convex/_generated/server.js

---

## Batch 31: More unused eslint-disable
- [ ] Remove unused eslint-disable in: src/components/Feed/Comment.tsx (line 80)
- [ ] Remove unused eslint-disable in: src/components/Feed/CommentInput.tsx (line 92)
- [ ] Remove unused eslint-disable in: src/components/Feed/CommentInput.tsx (line 124)
- [ ] Remove unused eslint-disable in: src/components/Feed/CommentsSection.tsx (line 45)

---

## Batch 32: More unused eslint-disable
- [ ] Remove unused eslint-disable in: src/components/Feed/PostCard.tsx (line 86)
- [ ] Remove unused eslint-disable in: src/components/Feed/PostCard.tsx (line 103)
- [ ] Remove unused eslint-disable in: src/components/Feed/PostComposer.tsx (line 63)
- [ ] Remove unused eslint-disable in: src/components/Classrooms/ClassroomViewer.tsx (line 543)

---

## Summary
- **Total Tasks**: 128
- **Errors** (must fix): 48
- **Warnings** (should fix): ~148
- **Unused directives** (cleanup): ~12