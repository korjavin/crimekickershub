# Task 20: Public Comic Reader (Mobile Friendly)

**Goal:** The frontend view for users to read the stories. It must handle mixed media (images + video) seamlessly.

**UX Pattern:** Vertical Scroll (Webtoon Style). This is superior for mobile engagement compared to horizontal sliders.

## 1. API Integration
* **Endpoint:** `GET /api/public/stories/{slug}`
* **Response:**
    ```json
    {
      "title": "Origins of Windman",
      "items": [
        { "type": "image", "url": "https://r2.../img1.jpg", "aspect_ratio": "1:1" },
        { "type": "video", "youtube_id": "dQw4w9WgXcQ", "aspect_ratio": "16:9" },
        { "type": "image", "url": "https://r2.../img2.jpg" }
      ]
    }
    ```

## 2. The Reader Component
* **File:** `src/components/ComicReader.tsx` (used in `ComicReaderPage.tsx`).
* **Container:** Max-width 600px (Desktop), 100% width (Mobile). Centered.
* **Rendering Loop:**
    * Iterate through `items`.
    * **If Image:** Render `<img />` with `width: 100%`, `display: block`. **Crucial:** Set `margin-bottom: 0` to ensure seamless stitching of panels.
    * **If Video:** Render a responsive YouTube Player wrapper.
        * Auto-pause other videos when one plays? (Nice to have).
        * Default to `muted` if autoplaying.

## 3. Navigation
* **Header:** Sticky header with "Back to Comics" button and Story Title.
* **Footer:** "Next Episode" button at the bottom of the scroll.

## 4. Optimization
* Use `loading="lazy"` on images to save bandwidth.
* Add a Skeleton Loader while the story fetches.