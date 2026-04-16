# Ticgle Design System v1.0

This document summarizes the brand identity and design tokens for **Ticgle (티끌)**. Use these values to maintain consistency across design tools (Figma) and development.

---

## 1. Brand Identity
- **Name**: Ticgle (티끌)
- **Slogan**: "티끌 모아 반짝이는, 일상 매거진"
- **Concept**: Premium, High-density, Editorial Magazine
- **Current Logo Asset**: `public/logo.png` (derived from `newlogo2.png`)

---

## 2. Color Palette

### Core Brand Colors (Revised)
| Token | Hex | Usage |
| :--- | :--- | :--- |
| `Primary` | `#121212` | Monochromatic Black (Buttons, Text, UI) |
| `Primary Hover` | `#2c2c2c` | Dark gray for hover states |
| `Accent Line` | `#ff4804` | Point Orange (Title underlines, specific accents) |

### Functional Colors (Light Theme)
| Token | Hex | Usage |
| :--- | :--- | :--- |
| `BG Primary` | `#ffffff` | Page background |
| `BG Secondary` | `#f8f9fa` | Cards, Sidebar, Background variants |
| `Text Primary` | `#1a1a1a` | Main body text, Headings |
| `Text Secondary` | `#495057` | Subheadings, Metadata |
| `Border Light` | `#f1f3f5` | Subtle separators |

---

## 3. Typography
Ticgle uses a combination of modern sans-serif and luxury serif fonts.

- **Primary Sans**: `Outfit` (Heading/UI) & `Noto Sans KR` (Body)
- **Serif Accents**: `Nanum Myeongjo`

### Typographic Tokens (Design)
- **H1 (Large Heading)**: 700-900 Weight, -0.04em tracking
- **UI Labels**: 700 Weight (Outfit)
- **Body Text**: 400 Weight, 1.6 line-height (Noto Sans KR)

---

## 4. Layout & Spacing
Systematic dimensions for a consistent grid.

| Token | Value | Description |
| :--- | :--- | :--- |
| `Max Container` | `1200px` | Main content area width |
| `Header Height (PC)` | `62px` | Top navbar height |
| `Header Height (MB)`| `54px` | Mobile navbar height |
| `Radius (Standard)` | `16px` | Card corner radius |
| `Radius (Large)` | `24px` | Hero / Drawer corner radius |

---

## 5. UI Components Guidelines

### Logo Scaling
- **Desktop**: Height `41px`, Top Margin `2px`, Left Padding `28px`
- **Mobile**: Height `32px`, Top Margin `2px`, Centered

### Navigation Buttons
- **Shape**: Capsule-style (`border-radius: 30px`)
- **Transitions**: `0.2s cubic-bezier(0.2, 0, 0, 1)`

---

## 6. CSS Token Reference (for Devs)
```css
:root {
  /* Core Brand Tokens */
  --brand-primary: #121212;
  --brand-accent-line: #ff4804;

  /* Layout Tokens */
  --header-height: 62px;
  --container-max-width: 1200px;
  
  /* Radius Tokens */
  --radius-md: 16px;
  --radius-lg: 24px;
  
  /* ... see globals.css for full list */
}
```

---

## 7. Standard Card Design (Ticgle Card v2)
The universal layout for high-importance information cards (Author Profile, Place Reviews, etc.).

- **Structure**: 2-column Grid (Fixed 220px Left / Fluid Right)
- **Header**: High-contrast background, White bold text
  - *Author Profile*: Business Blue (`#0a467d`)
  - *Place Reviews*: Point Orange (`--brand-accent-line`)
- **Left Column**: Media Area (Avatar, Map, Image) filling full height/width
- **Right Column**: Information Area (Bio, Score, Details) with `24px` padding
- **Dimensions**: Max-width `700px`, fixed height `220px` (PC)
- **Responsiveness**: Stacks vertically on mobile (Media 180px height top / Text bottom)
