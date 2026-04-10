# UI_DESIGN.md — Visual Design Specification

> All visual decisions are defined here. The AI agent must follow these exactly.
> Do NOT use inline hex colors in components. Always reference CSS variables.

---

## Design Philosophy

**Minimal. Dark. Dense. Precise.**

The UI targets professional data engineers who live in dark-themed VS Code. It must feel native to VS Code, not like a consumer web app. Think: Figma's canvas meets a database IDE. No gradients, no shadows for decoration. Every pixel earns its place by communicating information.

---

## CSS Custom Properties (Global Variables)

Inject these into the Webview's `<style>` or Tailwind config. All components use only these tokens.

```css
:root {
  /* Backgrounds */
  --bg-base:       #0d0d0f;   /* canvas background */
  --bg-surface:    #141416;   /* sidebar, panels */
  --bg-elevated:   #1c1c1f;   /* cards, nodes */
  --bg-hover:      #252529;   /* hover states */
  --bg-overlay:    #1a1a1f;   /* popovers, dropdowns */

  /* Borders */
  --border-subtle: #252529;
  --border-default:#313138;
  --border-focus:  #7c6af7;

  /* Text */
  --text-primary:  #e8e8ed;
  --text-secondary:#8a8a9a;
  --text-muted:    #55556a;
  --text-code:     #c9c9d8;

  /* Accent */
  --accent:        #7c6af7;   /* primary purple — buttons, active states */
  --accent-dim:    #3d3660;   /* accent background tint */
  --accent-hover:  #9585f9;

  /* Join type colors */
  --join-inner:    #7c6af7;   /* purple */
  --join-left:     #4da6ff;   /* blue */
  --join-right:    #f97316;   /* orange */
  --join-outer:    #22d3a5;   /* teal */
  --join-cross:    #e879a0;   /* pink */

  /* Status */
  --status-ok:     #22d3a5;
  --status-warn:   #f59e0b;
  --status-error:  #f87171;

  /* Dtype badge colors */
  --dtype-int:     #4da6ff;
  --dtype-float:   #a78bfa;
  --dtype-str:     #22d3a5;
  --dtype-bool:    #f97316;
  --dtype-datetime:#f59e0b;
  --dtype-other:   #8a8a9a;

  /* Typography */
  --font-ui:       'Inter', -apple-system, sans-serif;
  --font-mono:     'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;

  /* Sizes */
  --radius-sm:     4px;
  --radius-md:     6px;
  --radius-lg:     10px;
  --sidebar-width: 240px;
  --toolbar-height: 48px;
  --code-panel-width: 320px;
  --preview-panel-height: 180px;
}
```

---

## Layout Structure

```
┌─────────────────────────────────────────────────────────────────┐
│  TOOLBAR (48px height)                                          │
│  [Output: result_df ▼] [Pandas | DuckDB | PySpark]  [Clear] [Insert ▶]│
├──────────┬────────────────────────────────────┬─────────────────┤
│          │                                    │                 │
│ SIDEBAR  │         CANVAS                     │  CODE PANEL     │
│ (240px)  │    (ReactFlow + nodes/edges)       │  (320px)        │
│          │                                    │                 │
│ Tables ▾ │                                    │  pd.merge(...)  │
│ · df_A   │                                    │                 │
│ · df_B   │                                    │  [Copy ⎘]       │
│          │                                    │                 │
├──────────┴────────────────────────────────────┴─────────────────┤
│  PREVIEW PANEL (collapsed by default, expands to 180px)         │
│  [▶ Preview Result] — click to expand                           │
└─────────────────────────────────────────────────────────────────┘
```

All panels are resizable by the user (via drag handles). Store sizes in `vscode.setState()`.

---

## Toolbar Specification

- Height: `var(--toolbar-height)` = 48px
- Background: `var(--bg-surface)`, bottom border: `1px solid var(--border-subtle)`
- Left group: Output name input + dialect segmented control
- Right group: Refresh icon button, Clear button, Copy button, **Insert** CTA button
- The **Insert** button: background `var(--accent)`, text white, border-radius `var(--radius-md)`, font-weight 600, disabled state: opacity 0.4

**Output name input:**
- Inline editable field, no box border until focused
- Prefix label: `→` in muted color
- Monospace font
- Placeholder: `result_df`

**Dialect segmented control:**
- Three segments: `Pandas` | `DuckDB` | `PySpark`
- Active segment: background `var(--accent-dim)`, text `var(--accent)`, border `1px solid var(--border-focus)`
- Inactive: transparent background, `var(--text-secondary)`

---

## Sidebar Specification

- Width: `var(--sidebar-width)` = 240px
- Background: `var(--bg-surface)`
- Right border: `1px solid var(--border-subtle)`
- Section header: "DATAFRAMES" in uppercase, 10px, `var(--text-muted)`, letter-spacing 0.1em

**Table list item (draggable):**
```
┌─────────────────────────────┐
│ ● df_users         8 cols   │  ← colored dot, table name, col count
│   int · str · datetime      │  ← dtype summary (muted, small)
└─────────────────────────────┘
```
- Background: transparent, hover: `var(--bg-hover)`
- Drag cursor: `grab`
- The colored dot is unique per table (cycle through accent colors in order)
- While dragging, the item gets 50% opacity

**Kernel status indicator** (bottom of sidebar):
- Green dot + "Kernel active" OR grey dot + "No kernel · Manual mode"
- "＋ Add Table" button in Manual mode (dashed border style)
- Refresh button: circular arrow icon, top-right of sidebar

---

## Table Node Specification

```
┌─────────────────────────────────────────┐
│  ● df_users                    [×]      │  ← header
├─────────────────────────────────────────┤
│  [☑] ○ id           int64     [handle] │
│  [☑] ○ name         object    [handle] │
│  [☐] ○ email        object?   [handle] │  ← nullable shown as `type?`
│  [☑] ○ created_at   datetime  [handle] │
├─────────────────────────────────────────┤
│  [All] [None]                           │  ← footer toggles
└─────────────────────────────────────────┘
```

- Width: 220px, min-height: auto
- Background: `var(--bg-elevated)`, border: `1px solid var(--border-default)`
- Border-radius: `var(--radius-lg)`
- Header: table color dot + bold monospace table name + `×` close button
- Column rows: 28px height each
  - Checkbox: custom styled, checked color `var(--accent)`
  - Small circle handle (4px): appears on hover of row, changes to filled on active connection
  - dtype badge: right-aligned, 10px font, background tinted by dtype color (see `--dtype-*` tokens), border-radius `var(--radius-sm)`
  - Nullable column: dtype shows with `?` suffix and `--status-warn` tint
- ReactFlow `<Handle>` positioned on left edge (target) and right edge (source) of each column row
- Selected node: border-color changes to `var(--border-focus)` with a subtle glow: `box-shadow: 0 0 0 2px var(--accent-dim)`

---

## Join Edge Specification

- Edge style: animated dashed stroke, 2px width, color matches join type (`--join-left`, `--join-inner`, etc.)
- Animation: CSS `stroke-dashoffset` animation flowing in the join direction
- Center label pill:
  ```
  ╭─────────────╮
  │  LEFT JOIN  │
  ╰─────────────╯
  ```
  Background `var(--bg-overlay)`, border `1px solid` matching join color, text 11px monospace
  Clicking opens the `JoinTypePopover`

---

## Join Type Popover (Venn Diagram Selector)

Floating card, 280px wide. Renders a 3×2 grid of join type options (INNER, LEFT, RIGHT, OUTER, CROSS, + blank).

Each option:
- Label below the Venn SVG (12px, monospace)
- Venn diagram SVGs are simple: two overlapping circles, shaded region filled with the join's color at 60% opacity
- Active option: full color fill, border `2px solid var(--border-focus)`
- Inactive: `var(--bg-elevated)` background, grey circle outlines

**Venn SVG shading per type:**
| Type | Shaded region |
|---|---|
| INNER | Intersection only |
| LEFT | Entire left circle |
| RIGHT | Entire right circle |
| FULL OUTER | Both circles |
| CROSS | Both circles fully filled, different pattern |

---

## Code Panel Specification

- Width: `var(--code-panel-width)` = 320px
- Background: `var(--bg-surface)`, left border: `1px solid var(--border-subtle)`
- Header: "GENERATED CODE" label (muted uppercase) + Copy button
- Code block: `<pre>` with `var(--font-mono)`, 13px, line-height 1.6
- Syntax highlighting colors:
  - Keywords (`pd`, `merge`, `SELECT`, `JOIN`, `FROM`, `AS`, etc.): `var(--accent)`
  - Strings (`'left'`, `'user_id'`, etc.): `var(--status-ok)`
  - Variable names (first word on each line): `var(--text-primary)`
  - Comments (`#`): `var(--text-muted)` + italic
  - Numbers: `var(--dtype-float)`
- Copy button: shows "Copied ✓" for 1.5s then resets

---

## Preview Panel Specification

- Collapsed state: 32px tall bar showing "▶ Preview · Click to expand"
- Expanded state: `var(--preview-panel-height)` = 180px
- Horizontal scroll for wide result tables
- Row count badge: "5 of {N} rows" in top-right corner
- Loading state: skeleton shimmer animation on table cells
- Error state: `var(--status-error)` colored message with the Python error text

---

## Canvas Background

```tsx
<Background
  variant={BackgroundVariant.Dots}
  gap={[20, 20]}
  size={1.5}
  color="var(--color-border-subtle)" 
/>
```

No grid lines. Dot pattern only. Very subtle.

---

## Empty State (Canvas with no tables)

Center of canvas shows:
```
     ┌───┐   ┌───┐
     │ A │───│ B │
     └───┘   └───┘

  Drag tables from the sidebar
  to start building your join
```

Muted grey illustration + instructional text. Disappears the moment the first node is dropped.

---

## Animations & Transitions

| Element | Animation |
|---|---|
| Sidebar table item hover | `background` 80ms ease |
| Node drop onto canvas | Scale from 0.95 to 1.0, 120ms ease-out |
| Edge connection | Draw from source to target, 150ms |
| Popover open | Fade + scale from 0.95, 100ms |
| Code panel update | Content fades in 80ms (prevents jarring repaints) |
| Insert button success | Background flash to `var(--status-ok)` for 1.5s |
| Dialect switch | Code panel content cross-fades 100ms |

No animation should exceed 200ms. This is a productivity tool, not a landing page.
