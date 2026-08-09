---
version: alpha
name: Anytype
description: "Create notes, tasks, databases, and chats that only you can access. Your data stays on your device — fully owned, secure, and private. Free to start."
sourceUrl: "https://anytype.io/"

colors:
  primary: "#3cd9b3"
  on-primary: "#111111"
  background: "#000000"
  border: "#5b5b5b"
  text: "#ffffff"
  text-muted: "#000000"

typography:
  display:
    fontFamily: "riccionets, Helvetica, sans-serif"
    fontSize: 120px
    fontWeight: 400
    lineHeight: 0.83
    letterSpacing: -3.2px
  heading:
    fontFamily: "inter, Helvetica, sans-serif"
    fontSize: 88px
    fontWeight: 300
    lineHeight: 1.02
    letterSpacing: -5.2px
  body:
    fontFamily: "inter, Helvetica, sans-serif"
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.44
    letterSpacing: -0.28px

spacing:
  base: 4px
  scale: [4, 8, 16, 20, 24, 28, 32, 40, 44, 48]

radius:
  sm: 6px
  md: 16px
  lg: 100px

motion:
  duration-fast: 150ms
  duration-base: 500ms
  duration-slow: 1000ms
  easing: "cubic-bezier(0.4, 0, 0.2, 1)"

breakpoints: [480px, 768px, 1024px]
---

## Rationale

Measured design tokens extracted from https://anytype.io/. The frontmatter above is the design system — real colors, type scale, spacing, radius, shadows, motion, and breakpoints read from the live page. Upgrade to Pro for the full written system (rationale, component guidance, and accessibility notes).
