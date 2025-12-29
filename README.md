
# Crime Kickers Hub 🦸‍♂️🍜⚡

**Crime Kickers Hub** is a dual-purpose platform designed for the "Crime Kickers" universe. It serves simultaneously as a **public showcase** for fans to explore the lore, comics, and videos, and as a sophisticated **Creative Studio (Admin Panel)** for the creators to engineer prompts, manage assets, and build stories.

[cite_start]The project is built around the adventures of specific heroes: **Windman, Pho-boman, Primm, and Tiebe**. 

---

## 🌟 Project Goals

1.  **Public Presentation:** A mobile-friendly website to read comics, watch videos, and explore character bios (Wiki).
2.  **Prompt Engineering Studio:** An advanced tool to store, mix, and version-control generative AI prompts (Midjourney, Sora, Runway).
3.  **Asset Management:** A structured system to link generated media (Images/Videos) back to the specific prompt versions that created them.

---

## 🛠 Features

### 1. The Creative Studio (Admin)
*Access restricted via Google OAuth whitelist.*

#### 🧠 Advanced Prompt Matrix
* **Entity Management:** Define Heroes, Villains, and Locations with their core attributes.
* **Prompt Construction:**
    * **Dynamic Mixer:** Select actors (e.g., *Windman + Pho-boman*) and a location (*Sky Isles*) to auto-compile a base prompt.
    * **Technical/Common Layers:** Append reusable technical parameter blocks (e.g., "Seed: 123, Aspect Ratio 16:9, Photorealistic") to the narrative prompt automatically.
    * **Result Editor:** Manually tweak the compiled prompt in a textarea.
* **Versioning & Diffs:**
    * Every save creates a new immutable version.
    * **Diff Viewer:** visually compare changes between prompt versions to see what was tweaked.

#### 📂 Media & Asset Management
* **Traceability:** Uploaded media is linked to the specific prompt version used to generate it. This allows creators to "trace back" a successful image to its exact text and parameters.
* **Storage:**
    * **Images:** Uploaded directly to Cloudflare R2.
    * **Videos:** Manually uploaded to YouTube; links are stored in the system.

#### 📖 Story Builder
* **Mixed Media Episodes:** Create "Issues" or "Stories" that combine static images and video clips in a single sequence.
* **Mobile-First Layout:** content is organized for seamless vertical scrolling (Webtoon style) or swipe-viewing.

### 2. Public Portal
* [cite_start]**Hero Wiki:** Interactive cards for characters showing powers (Wind, Pho-soup, Gravity, Size-shifting) and origin stories [cite: 52-59].
* **Comic Reader:** Optimized viewer for reading visual stories on mobile and desktop.
* **Cinema:** A tagged gallery of video clips and short films.

---

## 🏗 Tech Stack

* **Backend:** Go (Golang)
* **Database:** SQLite (embedded, efficient, easy backup)
* **Frontend:** React / Next.js
* **Styling:** Tailwind CSS (Dark/Light mode support)
* **Storage:** Cloudflare R2 (Object Storage)
* **Auth:** Google OAuth 2.0

---

## 🔄 Core Workflow

1.  **Define:** Update character descriptions in the **Entity Editor**.
2.  **Engineer:** Use the **Prompt Mixer** to combine a Character + Location + Technical Params.
3.  **Refine:** Edit the output, save a new version, and copy it to the external AI generator.
4.  **Upload:** Upload the result (Image/Video) to the Hub.
5.  **Link:** The system links the Media Asset to the Prompt Version.
6.  **Publish:** Add the asset to a "Story" timeline and publish to the main site.