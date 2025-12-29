# Task 9: Public Presentation Layer

**Goal:** Build the immersive public pages. Focus on mobile responsiveness and "Dark Mode" aesthetic.

## Steps:

1.  **Home Page:**
    * Create `src/pages/public/HomePage.tsx`.
    * Full-width "Hero" banner (Heroes Unite).
    * "Latest Updates" grid fetching from `/api/stories`.

2.  **Character Wiki:**
    * Create `src/pages/public/WikiPage.tsx`.
    * Fetch heroes from `/api/heroes`.
    * **UI:** Interactive Cards using the 3D/Parallax effect descriptions if possible (or just clean cards).
    * **Detail View:** Modal or page showing Origin, Powers, and Stats.

3.  **Comic Reader (The Core Feature):**
    * Create `src/pages/public/ComicReaderPage.tsx`.
    * **Logic:** Fetch a specific Story and its Items.
    * **Layout:**
        * **Mobile:** Vertical stack (Webtoon style). Zero padding between images.
        * **Desktop:** Centered column, max-width 800px.
    * **Mixed Media:** If a story item is a video, render a YouTube player component in the flow.

4.  **Cinema/Gallery:**
    * Create `src/pages/public/CinemaPage.tsx`.
    * Grid of video thumbnails + Tags filter.