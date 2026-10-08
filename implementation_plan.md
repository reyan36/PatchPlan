# Upgrade Idea Board & UI Modals

This plan outlines the steps to transform the Idea Board into a fully-featured workspace for game studios, complete with rich text, drawing capabilities, and custom UI to replace the native browser prompts.

## User Review Required
> [!IMPORTANT]
> Please review the technical choices below, specifically regarding the drawing library and export format, before we proceed with the execution.

## Open Questions
> [!WARNING]
> 1. **Drawing Library:** I am proposing we use `tldraw`, which is a highly professional whiteboard tool for React (great for game design diagrams and freehand). Does that sound good, or do you want a simpler basic sketch canvas?
> 2. **Export Format:** You mentioned downloading as ".doc". When combining text and freehand drawings, **PDF** usually preserves the formatting and drawings much better. Is PDF acceptable, or do you strictly need a Microsoft Word `.docx` file?

## Proposed Changes

### 1. UI Upgrades (Replacing `prompt()`)
We will completely remove the ugly native browser prompts shown in your screenshot.
#### [NEW] `src/components/ui/Modal.tsx`
- A reusable, custom Tailwind-styled modal component matching the black-and-white theme.
#### [MODIFY] `src/features/project-management/ProjectList.tsx`
- Replace `prompt()` with the new custom `<Modal>`.
#### [MODIFY] `src/features/team-management/TeamOverview.tsx`
- Replace `prompt()` with the new custom `<Modal>`.

### 2. Dedicated Idea Routing
We will create a dedicated page system so Ideas aren't just tiny cards on the dashboard, but full pages where you can write and draw.
#### [NEW] `src/app/ideas/page.tsx`
- A dedicated list/grid of all ideas.
#### [NEW] `src/app/ideas/[id]/page.tsx`
- A dynamic route for individual ideas (e.g., `/ideas/123`). This will house the rich text editor and drawing canvas.

### 3. Rich Text & Drawing Integration
#### [NEW] `src/features/idea-management/IdeaEditor.tsx`
- **Rich Text:** Integrate `tiptap` (a modern, clean text editor) to allow bold, italics, headers, and lists.
- **Drawing:** Integrate `tldraw` (or similar) into the page so users can quickly switch between typing and sketching out level designs or character concepts.
- **Export:** Add an "Export" button that converts the page content into a downloadable document.

## Verification Plan
1. Start the dev server and verify the native browser `prompt()` is completely gone, replaced by beautiful dark-mode modals.
2. Navigate to the new `/ideas` page, click an idea, and verify the rich-text editor and drawing canvas load correctly.
3. Draw a sketch, write some text, and test the "Export" button to ensure the downloaded file works.
