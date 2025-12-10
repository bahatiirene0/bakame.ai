# Bakame AI - Design System

## Core Philosophy

**Minimal. Professional. Lit.**

The Bakame AI interface follows a clean, modern design language inspired by premium AI products like Grok and ChatGPT. Every element serves a purpose.

---

## Design Principles

### 1. Less is More
- No unnecessary elements or clutter
- Every component must earn its place
- White space is a feature, not wasted space

### 2. Subtle Elegance
- Soft shadows over hard borders
- Gradient accents, not gradient overload
- Animations that feel natural, not flashy

### 3. Focus-Driven
- One clear primary action per view
- Guide the user's eye naturally
- Input/action areas are always prominent

### 4. Dark Mode First
- Design for dark mode, adapt for light
- Both themes should feel premium
- Consistent experience across modes

---

## Color Palette

### Brand Gradient
```
Green → Yellow → Blue
#22C55E → #EAB308 → #3B82F6
```
*Subtle nod to Rwanda's vibrant spirit*

### Backgrounds
- **Light:** `#FFFFFF` (primary), `#F9FAFB` (secondary)
- **Dark:** `#0A0A0A` (primary), `#111111` (secondary)

### Text
- **Light mode:** `#111827` (primary), `#4B5563` (secondary)
- **Dark mode:** `#F9FAFB` (primary), `#D1D5DB` (secondary)

### Accents
- **Green:** `#22C55E` - Primary actions, success states
- **Yellow:** `#EAB308` - Highlights, warnings
- **Blue:** `#3B82F6` - Links, info states
- **Red:** `#EF4444` - Destructive actions, errors

---

## Typography

### Font Family
- **Primary:** Inter (UI text)
- **Monospace:** JetBrains Mono (code blocks)

### Font Weights
- `400` - Body text
- `500` - Labels, buttons
- `600` - Headings, emphasis

### Sizing
- Base: `15px`
- Mobile: `14px`
- Line height: `1.6` (body), `1.75` (markdown content)

---

## Spacing & Layout

### Container Widths
- **Chat/Input:** `max-w-2xl` (672px)
- **Consistency:** All main content uses the same max-width

### Padding
- **Container:** `px-4` (16px)
- **Components:** `p-2` to `p-4` based on size
- **Gaps:** `gap-2` to `gap-4`

### Border Radius
- **Small:** `rounded-lg` (8px) - Buttons, chips
- **Medium:** `rounded-xl` (12px) - Cards, inputs
- **Large:** `rounded-2xl` (16px) - Main containers

---

## Component Patterns

### Input Fields
```
- Gradient border glow (1px)
- Soft shadow: shadow-lg shadow-green-500/20
- Clean interior: bg-white dark:bg-[#0a0a0a]
- No focus ring, custom styling
```

### Buttons
```
Primary (filled):
- bg-green-600 hover:bg-green-700
- text-white
- rounded-xl

Secondary (outlined):
- border border-gray-300 dark:border-white/20
- hover:border-green-500
- text-gray-700 dark:text-gray-200
```

### Cards & Containers
```
- Glassmorphism: backdrop-blur-xl bg-white/80 dark:bg-[#0a0a0a]/80
- Subtle borders: border-gray-200/50 dark:border-white/5
- Soft shadows: shadow-sm to shadow-lg
```

---

## Animations

### Allowed
- `fadeIn` - Content appearing (0.3s ease-out)
- `float` - Logo breathing (4s ease-in-out)
- `pulse` - Status indicators
- Hover transitions (0.2s-0.3s)

### Avoid
- Bouncing or jarring movements
- Long animation durations
- Animations that block interaction
- Excessive particle effects

---

## Do's and Don'ts

### DO
- Keep interfaces clean and scannable
- Use the brand gradient sparingly
- Maintain consistent spacing
- Test in both light and dark modes
- Prioritize readability

### DON'T
- Add elements "just because"
- Use multiple competing focal points
- Override the established color palette
- Add heavy borders or outlines
- Use pure black (#000) or pure white (#FFF) as backgrounds

---

## Reference: Guest Landing Page

The guest landing page is the gold standard:

```
┌─────────────────────────────────────┐
│           [Header - minimal]         │
├─────────────────────────────────────┤
│                                     │
│              🐰 Logo                │
│         (floating animation)        │
│                                     │
│        "Murakaza neza kuri"         │
│            **Bakame**               │
│                                     │
│     ┌───────────────────────┐      │
│     │ Input with gradient   │      │
│     │ glow border + shadow  │ [➤]  │
│     └───────────────────────┘      │
│                                     │
└─────────────────────────────────────┘
```

**This is the benchmark. All new features should match this level of polish.**

---

## Version

- **v1.0** - December 2025
- **Maintainer:** Bahati Irene, Kigali AI Labs

---

*"Simplicity is the ultimate sophistication." - Leonardo da Vinci*
