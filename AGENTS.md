<!-- BEGIN:nextjs-agent-rules -->
# Agent Instructions — pnei-menachem-app

This is a Next.js 16 App Router project with TypeScript and Tailwind CSS v4.

## Key conventions
- All data fetching goes through `src/lib/monday.ts` (Monday.com GraphQL API)
- API routes live in `src/app/api/*/route.ts` — all protected by `src/middleware.ts`
- Shared UI components in `src/components/`; page-specific components co-located in the page folder
- Use `apiError()` from `src/lib/api-error.ts` in every route catch block
- Do NOT read from `node_modules/` — use nextjs.org/docs for Next.js reference
<!-- END:nextjs-agent-rules -->
