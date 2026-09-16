# Landing Page UI & Interaction Flow

This document explains the user interface architecture, animations, and interaction flow of the VOS-WEB Landing Page / Command Center (`src/app/(public)/page.tsx`).

## 1. Visual Hierarchy & Concept
The landing page is designed as a **Premium Enterprise Command Center**. It moves away from traditional, static corporate landing pages by utilizing an immersive, app-like experience. The UI leverages **Framer Motion** for micro-interactions and **GSAP (GreenSock)** for complex scroll-driven layouts.

## 2. The Interaction Flow

### A. The Hero Section (Vertical Entry)
When the user first loads the page, they are presented with a full-height Hero Unit.
- **Visuals:** Features a parallax background that reacts to the initial scroll.
- **Components:** Contains the `MissionStatsGrid` which displays high-level, real-time organizational telemetry.
- **Scroll Behavior:** The page starts with a standard vertical scroll. As the user scrolls down past the Hero section, the vertical scroll is "hijacked" and smoothly transitions into a horizontal track.

### B. The Horizontal Subsystem Panels (GSAP Scroll)
Instead of scrolling infinitely downwards, the core content is laid out horizontally via the `HorizontalScrollContainer`. Each major ERP subsystem is given a dedicated, full-screen slide.

The flow through the panels is as follows:
1. **Human Resources (Cyan):** Features the `WorkforcePulse` visualizer inside a `GlassCard`.
2. **Financial Management (Emerald):** Features the `LiquidityMeter` and `AssetLifecycle`.
3. **Supply Chain Management (Amber):** Features the `InventoryTreadmill` and a `GlobalHealthViz` background.
4. **Customer Relationship (Indigo):** Features the `ConnectionNode` and `ReceivablesAging` visualizers.
5. **Business Intelligence (Violet):** Features the `AnalyticsWorkbench`.
6. **Audit & Governance (Rose):** Features the `MatrixAuditLog`.

**Design Language per Panel:**
- Each panel utilizes a large, faded **watermark typography** in the background to establish context.
- **Glassmorphism:** Data is presented inside `GlassCard` components that blur the background, giving a depth-of-field effect.
- **Color Coding:** Each subsystem has a strict, luminous color palette (e.g., HRM is Cyan, Finance is Emerald) that dictates the glows, borders, and typography of that specific panel.

### C. Sidebar Navigation
A floating `CommandSidebar` sits permanently on the edge of the screen.
- It acts as an anchor, allowing the user to bypass the scroll and click to instantly jump to a specific horizontal panel.
- It highlights the active panel based on the user's current scroll position.

### D. Interactive Telemetry Modals
The landing page is not just for reading; it invites interaction. 
- Throughout the horizontal panels, users can click on the `GlassCard` visualizers or action buttons like **"Open Telemetry"** or **"Executive Insights"**.
- **Action:** Clicking these triggers the `ModuleDetailModal`.
- **Animation:** The modal scales up smoothly using Framer Motion, darkening the background and presenting deeper, focused data about the selected module without navigating away from the landing page.

## 3. Technology Stack for the UI
- **Framer Motion:** Handles all layout animations, scale-ins, opacity fades, and the modal pop-ups.
- **GSAP & Lenis:** Provides the buttery-smooth scroll hijacking to convert the user's mouse wheel (vertical movement) into a horizontal panel slider.
- **Tailwind CSS:** Manages the intricate glowing borders (`shadow-[0_0_30px_rgba...]`), gradients, and glassmorphism filters (`backdrop-blur-xl`).
