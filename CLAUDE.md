# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Blake's Shoes is a fantasy football league website built with Next.js 16, React 19, TypeScript, and Tailwind CSS v4. The site features a countdown timer to the trade deadline, league information, owner profiles, championship history, and upcoming events.

## Development Commands

**Start development server:**
```bash
npm run dev
```
The app runs at http://localhost:3000 with hot reload enabled.

**Build for production:**
```bash
npm run build
```

**Start production server:**
```bash
npm start
```

**Lint code:**
```bash
npm run lint
```
Uses ESLint with Next.js configuration for both JavaScript and TypeScript.

## Architecture

**Framework:** Next.js 16 with App Router (not Pages Router)
- All routes live in the `app/` directory
- Uses React Server Components by default
- Client components must be marked with `"use client"` directive

**Styling:** Tailwind CSS v4
- Configured via PostCSS (`postcss.config.mjs`)
- Global styles in `app/globals.css` using the new `@import "tailwindcss"` syntax
- Uses `@theme inline` blocks for CSS variables
- Custom fonts: Geist Sans and Geist Mono loaded via `next/font/google`

**TypeScript Configuration:**
- Path alias `@/*` maps to root directory (e.g., `@/app/page.tsx`)
- Strict mode enabled
- Target: ES2017
- JSX mode: `react-jsx` (modern JSX transform)

**Current Page Structure:**
- `app/layout.tsx` - Root layout with font configuration and metadata
- `app/page.tsx` - Main landing page (client component with countdown timer)
- `app/globals.css` - Global styles and CSS variables
- `public/` - Static assets (currently contains placeholder SVG)

**Key Features in `app/page.tsx`:**
- Client-side countdown timer to November 22, 2026 (trade deadline)
- Static data arrays for owners, championships, and league stats
- Sections: Header, League Stats, Trade Deadline Countdown, Calendar, Owners Grid, Hall of Champions, High Rollers
- Some sections are commented out (League Records, Photo Gallery)

## Design Principles

**MOBILE-FIRST DESIGN:**
- **ALWAYS optimize for mobile view first** - this is the primary viewing experience
- Use mobile breakpoints as the default, then enhance for larger screens
- Test all changes on mobile viewport (375px width minimum)
- Ensure touch targets are large enough (minimum 44px)
- Stack layouts vertically on mobile, use grid/flex for larger screens
- Optimize font sizes for readability on small screens
- Ensure all interactive elements are easily tappable on mobile devices

**Responsive Breakpoints (Tailwind):**
- Default: Mobile (< 640px)
- `sm:` Small devices (≥ 640px)
- `md:` Medium devices (≥ 768px)
- `lg:` Large devices (≥ 1024px)
- `xl:` Extra large (≥ 1280px)

## Important Notes

- This uses **Tailwind CSS v4**, which has a different configuration approach than v3 (no `tailwind.config.js`, uses `@import` and `@theme`)
- The countdown timer updates every second using `useEffect` and `setInterval`
- All hardcoded data is currently in `app/page.tsx` - consider extracting to separate data files if the site grows
- Several UI sections are hidden or commented out for future implementation
