# CMS Integration & Architecture Guide

This document explains the setup, architecture, and integration of the Content Management System (CMS) with the Next.js frontend (including the landing page). 

## 1. The Headless CMS Architecture
The project utilizes **Directus** as a Headless CMS. Instead of a traditional CMS (like WordPress) where the frontend and backend are tightly coupled, Directus acts strictly as a data engine. It provides a RESTful API and GraphQL endpoints that our Next.js frontend consumes.

**Key Benefits of this approach:**
- **Decoupled Architecture:** The Next.js frontend can be deployed independently of the CMS backend.
- **Performance:** Next.js can server-side render (SSR) or statically generate (SSG) pages using the data from Directus, leading to extremely fast load times.
- **Flexibility:** The schema can be updated dynamically in Directus without needing to rebuild the entire frontend.

## 2. Environment Setup
To connect the Next.js frontend to the Directus CMS, we use environment variables. These are defined in the `.env.local` file:

```env
# The base URL of the Directus instance
NEXT_PUBLIC_API_BASE_URL=http://your-directus-instance.com

# A static authentication token generated inside Directus for secure API access
DIRECTUS_STATIC_TOKEN=your_secure_static_token_here
```

## 3. Data Fetching Strategy (Frontend & Landing Page)
Data for the landing page (and other modules) is typically fetched either directly from client-side components using React Server Actions / API Routes, or directly inside Server Components.

### Example: API Route Proxying
To prevent exposing the `DIRECTUS_STATIC_TOKEN` to the browser, the frontend routes requests through Next.js API Routes (located in `src/app/api/...`). 

Here is how a standard API request to Directus is handled:

```typescript
// src/app/api/crm/customer-prospect/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
    const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;
    
    // Fetch data from the Directus Collection
    const res = await fetch(`${DIRECTUS_URL}/items/customer_prospect`, {
        cache: "no-store", // Ensure real-time data
        headers: { Authorization: `Bearer ${DIRECTUS_TOKEN}` }
    });

    const json = await res.json();
    
    // Return sanitized data to the frontend
    return NextResponse.json(json.data);
}
```

## 4. Subsystems & Content (The Landing Page)
On the Landing Page (`src/app/(public)/page.tsx`), the content architecture is divided into major **Subsystems** (HRM, Finance, SCM, CRM, BI, Audit). 

While the core layout is hardcoded in the Next.js application for maximum animation performance (using Framer Motion and GSAP), the **data** driving the dynamic modules (like `ModuleDetailModal`) and the telemetry components can be fed directly from the CMS.

**Data Flow:**
1. **Directus:** Stores the active modules, descriptions, and statistical numbers.
2. **Next.js Server:** Fetches the data upon request.
3. **Framer Motion / UI:** Takes the JSON payload and renders the premium "GlassCard" visualizations.

## 5. Security & Validation
- **Type-Safety:** All data fetched from the CMS is parsed and typed using TypeScript interfaces (e.g., `CustomerProspect`, `StoreType`) to ensure runtime safety.
- **Authentication:** Only authenticated requests (using the Static Token) are permitted to read or write data to the CMS, acting as a secure bridge between the public frontend and the private database.
