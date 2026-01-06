# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ceraflow is a revenue tracking application for a ceramics studio ("Céramique Studio"). It displays transaction data from multiple payment sources (Stripe, SumUp, cash) with stats and filtering capabilities.

## Commands

```bash
npm run dev      # Start dev server on port 8080
npm run build    # Production build
npm run lint     # Run ESLint
```

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui components
- **State**: TanStack Query for server state
- **Backend**: Supabase (database + edge functions)
- **Routing**: React Router DOM

## Architecture

### Path Alias
Use `@/` to import from `src/` (e.g., `import { Button } from "@/components/ui/button"`)

### Key Directories
- `src/components/ui/` - shadcn/ui components (do not modify directly)
- `src/components/` - App-specific components (StatCard, TransactionList, SyncButton, etc.)
- `src/hooks/` - Custom hooks including `useTransactions` for data fetching
- `src/integrations/supabase/` - Supabase client and auto-generated types
- `src/pages/` - Route components
- `supabase/functions/` - Deno edge functions for external API integrations

### Data Flow
1. Transactions are stored in Supabase `transactions` table
2. `useTransactions` and `useTransactionStats` hooks fetch data via TanStack Query
3. `SyncButton` triggers Supabase edge functions (e.g., `sync-sumup`) to import transactions from external payment providers
4. Query invalidation refreshes the UI after sync

### Database Schema
Single `transactions` table with:
- `source`: enum ("stripe" | "sumup" | "cash" | "other")
- `external_id`: ID from payment provider (for deduplication)
- `amount`, `description`, `customer_name`, `customer_email`, `transaction_date`

### Environment Variables
Required in `.env`:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Edge functions need `SUMUP_API_KEY` configured in Supabase secrets.

## TypeScript Config
The project uses relaxed TypeScript settings: `noImplicitAny: false`, `strictNullChecks: false`. Follow existing patterns when adding code.
