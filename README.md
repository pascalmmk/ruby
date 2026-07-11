# 💎 Ruby

**Real-time shared lists for web, iOS & Android — one codebase.**

Create a list, share it with someone by email, and every change syncs live across
everyone's devices in under a second. Built with Expo (React Native) and Supabase.

### 🔗 [Live demo → ruby-lists.vercel.app](https://ruby-lists.vercel.app)

> **Try it instantly:** sign in with **`demo@ruby.app`** / **`rubydemo123`**, or create
> your own account. Open it on your phone and your laptop at the same time and watch a
> checkbox tick on both.

---

## Screenshots

<p align="center">
  <img src="docs/screenshots/lists.png" width="30%" alt="My Lists screen" />
  &nbsp;
  <img src="docs/screenshots/list-detail.png" width="30%" alt="A shared list with items" />
  &nbsp;
  <img src="docs/screenshots/completed.png" width="30%" alt="Completed list with celebration" />
</p>

---

## Features

- **⚡ Real-time sync** — adding, checking off, and deleting items propagate live to every
  member of a list via Supabase Realtime. No refresh, no polling.
- **🤝 Sharing** — invite anyone by email; they get read/write access to the shared list.
  Access is enforced at the database level with Postgres Row-Level Security.
- **📱 Truly cross-platform** — the same code runs on the web, iOS, and Android from a single
  Expo / React Native codebase.
- **🔔 Live notifications** — when a collaborator adds an item, you get an in-app toast, driven
  by the same realtime connection.
- **🎉 Polished, animated UI** — a cohesive "ruby" design system, light & dark themes, spring
  animations on every list change, tactile press feedback, and a confetti burst when you
  finish a list.

## Tech stack

| Layer | Choice |
| --- | --- |
| App | **Expo SDK 54** · React Native + React Native Web · **Expo Router** (file-based routing) |
| Language | **TypeScript** |
| Backend | **Supabase** — Postgres, Auth, Realtime, Row-Level Security |
| Animation | **react-native-reanimated** (UI-thread animations & layout transitions) |
| Hosting | Static web export deployed to **Vercel** |

## How it works

```
┌────────────┐        Realtime (WebSocket)        ┌────────────┐
│  Device A  │◀──────────────────────────────────▶│  Device B  │
│ (phone)    │                                     │  (web)     │
└─────┬──────┘                                     └──────┬─────┘
      │            REST + Realtime + Auth                 │
      └───────────────────┬──────────────────────────────┘
                          ▼
                 ┌──────────────────┐
                 │     Supabase     │
                 │  Postgres + RLS  │
                 └──────────────────┘
```

Every client subscribes to Postgres change events for the lists it can see. Row-Level
Security policies (not client code) decide what each user is allowed to read and write, so
the rules hold no matter which device or platform the request comes from.

**Data model** (`supabase/schema.sql`): `profiles`, `lists`, `list_members`, `items`, guarded
by RLS policies plus a `is_list_member()` helper and an `add_list_member()` invite function.

## A few problems worth calling out

Building this surfaced some genuinely tricky edges — the fixes are documented in
[`supabase/schema.sql`](supabase/schema.sql) and the source:

- **RLS + `INSERT … RETURNING`** — a `SELECT` policy that re-scans the same table can't see the
  row being inserted within the same statement, so `insert().select()` failed. Fixed by
  checking `owner_id = auth.uid()` directly on the row.
- **Realtime deletes** — delete events only carry the primary key, so a subscription filtered by
  `list_id` silently drops them. Fixed by filtering client-side (and documenting `REPLICA
  IDENTITY FULL`).
- **Inviting by email without leaking emails** — clients can't read `auth.users`, so invites go
  through a `SECURITY DEFINER` function that looks up the user server-side and only lets the
  list owner add members.

## Run it locally

**Prerequisites:** Node 18+, and a free [Supabase](https://supabase.com) project.

```bash
# 1. Install
npm install

# 2. Configure Supabase
cp .env.example .env         # then fill in your project URL + anon/publishable key

# 3. Create the database schema
#    Supabase dashboard → SQL Editor → paste supabase/schema.sql → Run

# 4. Start
npm run web        # open in the browser
npx expo start     # then scan the QR with Expo Go for iOS/Android
```

## Deployment

The web app is a static export (`npx expo export -p web` → `dist/`) hosted on Vercel. Client
routing is handled by a catch-all rewrite to `index.html`.

## Roadmap

- Push notifications when the app is closed (requires an EAS development build)
- "Who checked this off" member avatars on items
- Offline support with local-first sync
- Drag-to-reorder items

---

Built by [Mustafa](https://github.com/) as a portfolio project. 💎
