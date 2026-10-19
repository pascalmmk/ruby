# Ruby

A shared-list app for web, iOS, and Android. Create shopping or to-do lists, share them with existing Ruby users, and see item changes arrive through Supabase Realtime.

The interface is built with Expo, React Native, and TypeScript. Supabase handles accounts, database storage, access rules, and live updates. Native push-notification registration and a database notification trigger are included; delivery requires a configured native build and push credentials.

## Run

Use **Node.js 22 or later**, npm, and a Supabase project. The repository does not declare a root Node engine, but the locked `@supabase/supabase-js` version requires Node 22+, while React Native requires at least 20.19.4. The older README's Node 18 requirement is insufficient for this dependency lock.

```sh
git clone https://github.com/pascalmmk/ruby.git
cd ruby
npm ci
```

Copy `.env.example` to `.env`. In PowerShell:

```powershell
Copy-Item .env.example .env
```

On macOS or Linux:

```sh
cp .env.example .env
```

Fill in the two variables actually read by the application:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-or-publishable-key
```

Use your Supabase project URL and client-safe anon/publishable key. These values are bundled into the client. A service-role key does not belong here; database access is controlled by authenticated sessions and Row-Level Security.

### Set up the database

For a new Supabase project, open its SQL Editor and run `supabase/schema.sql`. It creates the tables, access policies, account/list triggers, sharing function, Realtime publication entries, and push-notification trigger. It also enables the `pg_net` extension used to send push requests.

Run the schema before creating application users so the new-user trigger can create their profiles. The script does not backfill profile rows for accounts that already existed.

The file is **not fully safe to rerun unchanged**. Although many statements use `IF NOT EXISTS` or replace policies/functions, its three `ALTER PUBLICATION ... ADD TABLE` statements are unconditional. On an existing database, check whether `items`, `lists`, and `list_members` already belong to `supabase_realtime`, and skip the additions that are already present. An error at that point can prevent the later push setup from completing. `CREATE TABLE IF NOT EXISTS` also does not upgrade an older table's columns.

Email/password sign-in must be available in the Supabase project's Auth settings. If email confirmation is enabled, users must complete that flow before signing in; configure the project's Site URL and allowed redirect URLs for the web origin you use. The app does not include a dedicated native confirmation callback screen.

### Set up avatar storage

The profile screen expects a Supabase Storage bucket named **`avatars`**, but the checked-in SQL does not create this bucket or its object-access policies.

To enable photo uploads, configure these separately in Supabase:

- A public `avatars` bucket, because the client uses `getPublicUrl()` to display photos.
- Object policies permitting authenticated users to upload and replace files only inside their own user-ID folder. The upload path is `<user-id>/avatar.<extension>`.
- The object read/update permissions required for an upsert, scoped to that same owner folder.

Public avatar URLs are publicly retrievable. Profile photos are not protected by the private-list membership rules. The application does not set a custom upload-size limit; any configured bucket limits still apply.

### Open the web app

```sh
npm run web
```

Open the address printed by Expo. Create an account or sign in with an account in **your configured Supabase project**. Accounts in another deployment are not automatically available in yours.

Restart the development server after changing the environment file.

### Run on a phone

The default start command targets an installed development client:

```sh
npm start
```

`npm run android` and `npm run ios` ask Expo to open the corresponding platform. They do not create a standalone app binary. A matching Expo Go client can be used for compatible development workflows with `npx expo start --go`, but native remote push should be tested on a physical device using a configured development or standalone build.

The repository's EAS and Firebase settings belong to the existing app. For your own native build, first configure your Expo project association, application identifiers, Firebase/APNs credentials as appropriate, and the Supabase values in `eas.json`. Changing `.env` alone does not replace the values explicitly embedded in the EAS build profiles.

## Workflow

1. Create an account or sign in with email and password.
2. Choose an emoji, enter a list name, and press **Create**.
3. Enter an item and press **Add**, or submit from the keyboard.
4. Check items off as you finish them. Press the checkbox again to reopen an item.
5. Open **Share** and enter an existing Ruby user's email to give them editing access.
6. Open the same list on another signed-in device to see live additions, completion changes, and deletions.
7. Open your profile from the header avatar to change your display name or photo, or sign out.

Edits are sent to Supabase as you make them; there is no separate Save button for a list. The app needs a network connection for its data operations and does not have an offline edit queue.

## Controls and features

### Accounts

The sign-in form switches between **Sign in** and **Create account**. It checks that an email and password were entered, then delegates authentication and password requirements to Supabase. Authentication errors appear in the form.

The session is persisted using AsyncStorage on native platforms and Supabase's default browser storage on web. Automatic token refresh is enabled. The application restores the saved session before showing its main screens.

There is no password-reset form, social-login button, account-deletion screen, or magic-link request interface in this version. Web URL-session detection is enabled in the Supabase client, but that setting alone is not a complete magic-link feature.

### Creating and opening lists

The home screen offers eight emoji choices and a list-name field. Empty or whitespace-only names are ignored. After a successful create request, the new list opens automatically. Lists are displayed newest first by creation time.

Users see lists they own and lists shared with them, subject to database policies. A list's name and emoji are chosen at creation; the current interface does not provide rename or emoji-edit controls afterward.

### Adding, completing, and removing items

The item composer trims surrounding whitespace and ignores empty input. New items receive `position: Date.now()` and are sorted by position, then creation time. There is no drag-to-reorder interaction even though the data model has a position field.

Checking an item updates `is_done` and stores the current user's ID in `done_by`. Unchecking it sets `done_by` back to `null`. The screen displays a checkmark and struck-through text; it does not display the completing user's avatar or name.

Press **✕** beside an item to delete it. Item deletion is immediate, without a confirmation dialog or undo. All list members can add, toggle, and delete items. Completed items remain in their original sort position rather than moving to a separate section.

The interface is not optimistically inserting or toggling rows in local item state. It sends the write, then normally receives the visible row change through Realtime. If adding fails, the composer restores the submitted text; several other failures are only logged to the console.

### Sharing

Open **Share** inside a list to see its members, display names, profile images, and owner label. Only the owner sees the invitation field.

Enter an email address belonging to an existing account in the same Supabase project. The `add_list_member()` database function looks up the account and grants the `editor` role. Matching is case-insensitive and ignores surrounding whitespace.

The possible results are:

| Result | Meaning |
| --- | --- |
| `added` | The account now has access, or already had a membership row. |
| `not_found` | No account with that email was found. |
| `self` | The owner entered their own email. |

Despite the **Invite** label, this action does not send an invitation email, create a pending invitation, or require recipient acceptance. It adds an existing account directly. The interface has no member-removal or leave-list control, although the database has membership-deletion policies.

The members panel loads when opened and reloads after the owner's invite succeeds. It does not subscribe to live profile or membership updates itself.

### Deleting a list

Only an owner gets list-delete controls:

- On web, use **✕** on the list row.
- On native, swipe right to reveal the left-side **Delete** button, then tap it.

A confirmation explains that deleting the list removes it and its items for everyone sharing it. Database foreign keys also remove its membership rows. Shared editors cannot delete the whole list through the UI or the list-delete policy.

There is no recycle bin or restore history.

### Completion celebration

The header shows the number of remaining items. When a nonempty list has no unfinished items, the screen displays **All done**, a completion banner, and an animated confetti burst.

A ref prevents the burst from replaying on every render while the list stays complete. Reopening an item resets that guard, allowing another celebration when the list becomes complete again. Loading an already-complete list also meets the completion condition.

### Profiles

Tap the home-screen avatar to open Profile. **Username** edits `profiles.display_name`; it is a display label, not a unique login name. It must be nonempty in the UI, but the database does not declare it unique. Sign-in continues to use email.

Tap the photo to select an image. The picker requests media-library permission and asks for square editing, quality `0.6`, and base64 data; editing support varies by platform. The client uploads the image and immediately saves its URL to the profile. Photo changes do not wait for the separate name **Save** button.

Avatars appear in the home header and members panel. When no URL is present, the avatar displays the first two characters of the supplied name in uppercase. The app has no remove-photo action and does not clean up old files when a photo's extension changes.

### In-app notifications

While signed in, an app-wide listener watches item insertions. It ignores your own additions and additions without a creator ID. For another user's addition, it fetches the list name and creator's display name, then shows a toast naming the list and item.

The toast disappears after **3.8 seconds**, or immediately when tapped. A newer toast replaces the previous one. It does not open the list when tapped and is not a persistent notification inbox.

This listener does not notify for item toggles, deletions, invitations, or profile changes. It does not schedule a local device notification; native push delivery is a separate path.

### Native push notifications

On a physical native device, `registerPushToken()` requests notification permission, obtains an Expo push token using the configured EAS project ID, and upserts that token into `push_tokens`. Web and simulators are skipped. Unsupported registration attempts are caught and logged; the function does not contain an explicit Expo Go check despite its comment.

After an item insert, a Postgres trigger builds messages for other members of that list who have registered tokens. It sends them to the Expo Push API using `pg_net`. No custom Node server or Supabase Edge Function is included for this step.

This implements the sending path, but successful delivery still depends on permissions, Expo project configuration, platform push credentials, and the installed native build. The code does not process Expo delivery receipts, remove invalid tokens, or navigate to a list after a notification tap. Sign-out does not delete the device's saved push-token row, so token cleanup is an outstanding limitation, particularly on shared devices.

### Theme and layout

Ruby follows the system light/dark preference using shared color tokens. There is no manual theme switch or saved in-app theme preference.

Safe-area padding keeps content clear of device insets. Keyboard-avoiding containers adjust forms and the item composer. Main list screens use a centered maximum width of 640 pixels; the profile screen uses 480 pixels.

Buttons animate their scale while pressed, list changes use entry/exit and layout animations, and checkmarks animate in. These effects use Reanimated; there is no implemented haptic/vibration feedback for ordinary button presses.

The web HTML includes mobile home-screen metadata and an Apple touch icon. This does not provide offline caching, a service worker, or web push.

## Development

### Commands in `package.json`

| Command | What it does |
| --- | --- |
| `npm start` | Runs `expo start --dev-client`. |
| `npm run web` | Starts Expo for web. |
| `npm run android` | Starts Expo with the Android launch option. |
| `npm run ios` | Starts Expo with the iOS launch option. |
| `npm run lint` | Runs `expo lint`; see the tooling note below. |
| `npm run reset-project` | Replaces the app with a blank starter, moving or deleting `src` and `scripts` according to the prompt. This is not a normal build/cleanup step. |

The repository has no `build` or `test` package script. Export web assets with:

```sh
npx expo export -p web
```

Check TypeScript with:

```sh
npx tsc --noEmit
```

The lint script is present, but ESLint and an ESLint configuration are not checked in as a complete configured lint toolchain. `expo lint` may require setting up/installing that tooling. Do not interpret the presence of the script as evidence of a passing lint run.

No application test suite or test-result file was found. The dependency lock contains testing-related transitive packages, but those do not establish that Ruby has its own tests. Build, type-check, browser, native-device, and push-delivery checks were not run for this documentation review.

### Web deployment

`vercel.json` sets:

- Build command: `npx expo export -p web`.
- Output directory: `dist`.
- A catch-all rewrite to `/index.html`.

Set both `EXPO_PUBLIC_SUPABASE_*` variables in the deployment's build environment and configure Supabase Auth URLs for its domain. The result is a static frontend that talks to Supabase; Vercel does not host a custom Ruby API server in this repository. Dynamic list URLs must resolve through the host's configured routing fallback.

### Native builds

`eas.json` declares EAS CLI `>=20.5.1` and three build profiles:

| Profile | Configuration |
| --- | --- |
| `development` | Development client with internal distribution. |
| `preview` | Internal distribution; Android output is an APK. |
| `production` | Automatic build-number/version increment behavior through EAS; app-version source is remote. |

After associating the checkout with the intended Expo project and configuring platform credentials, the corresponding EAS commands include:

```sh
npx eas-cli build --platform android --profile development
npx eas-cli build --platform android --profile preview
npx eas-cli build --platform ios --profile production
```

These invoke a build service and are not part of the documentation review. Review the checked-in `owner`, EAS project ID, Android package name, `google-services.json`, and build-profile environment values before building a separate deployment. There is no iOS bundle identifier explicitly set in the inspected `app.json`; configure one for an iOS app. The empty production submit profile does not mean an app has been submitted to a store.

## Technologies

Version ranges below come from `package.json`. `package-lock.json` supplies exact installed versions; for example, it locks Expo to **54.0.35**, Supabase JS to **2.110.2**, and TypeScript to **5.9.3**.

| Technology | Version declared | Role |
| --- | --- | --- |
| TypeScript | `~5.9.2` | Types for screens, records, hooks, and query functions. |
| React / React DOM | `19.1.0` | Component state/context and browser rendering. |
| React Native | `0.81.5` | Cross-platform views, text inputs, lists, alerts, and layout. |
| React Native Web | `~0.21.0` | Runs React Native components in the browser. |
| Expo | `^54.0.0` | Development, bundling/export, native modules, and app configuration. |
| Expo Router | `~6.0.24` | File-based routes and stack navigation. |
| React Navigation | Lockfile: `7.3.8` for `@react-navigation/native` | Navigation theme provider, imported directly in the root layout; resolved through the dependency tree rather than listed as a direct root dependency. |
| Supabase JS | `^2.110.2` | Auth, Postgres queries, database functions, Realtime subscriptions, and Storage uploads. |
| Supabase Postgres | Hosted service | Persistent tables, foreign keys, triggers, and Row-Level Security. |
| Postgres `pg_net` | Database extension | Sends the trigger's HTTP request to Expo's push service. |
| AsyncStorage | `2.2.0` | Persists native authentication sessions. |
| React Native URL Polyfill | `^3.0.0` | URL API compatibility for the Supabase client. |
| Reanimated | `~4.1.1` | Press feedback, list transitions, checkbox animation, and confetti. |
| Gesture Handler | `~2.28.0` | Native swipe-to-reveal list deletion and gesture root. |
| Safe Area Context / Screens | `~5.6.0` / `~4.16.0` | Safe-area layout and navigation screen support. |
| React Native SVG | `15.12.1` | Draws the Ruby gem logo. |
| Expo Image | `~3.0.11` | Profile image display. |
| Expo Image Picker | `~17.0.11` | Selects profile photos. |
| `base64-arraybuffer` | `^1.0.2` | Converts image-picker base64 into bytes for Storage upload. |
| Expo Notifications | `~0.32.17` | Notification permission, Expo push tokens, and foreground presentation settings. |
| Expo Device / Constants | `~8.0.10` / `~18.0.13` | Physical-device detection and access to the configured EAS project ID. |
| Expo Dev Client / Splash Screen | `~6.0.21` / `~31.0.13` | Development-build support and splash-screen configuration. |
| Vercel | Hosting configuration | Hosts the exported web frontend. |

The dependency set also includes Expo Font, Linking, Status Bar, System UI, Web Browser, and React Native Worklets. Some support framework/native behavior or retained starter components; they do not imply additional product screens. For example, the retained external-link and animated-icon components are not the core shared-list workflow.

Ruby uses React Native styles and a small web stylesheet. It does not use Rails, the Ruby programming language, Tailwind, a custom REST server, or an AI model. The project name is Ruby; its implementation is TypeScript/JavaScript and SQL.

## Data flow

```text
Sign in or create an account
   |
   v
Supabase Auth returns a session
   |
   v
Screens call query helpers with that session
   |
   v
Supabase Postgres checks Row-Level Security and stores the change
   |
   +----> Realtime event ----> open clients update their screens
   |
   +----> item-insert trigger ----> Expo Push API ----> registered devices

Profile photo picker ----> Supabase Storage ----> public avatar URL
```

Devices communicate through Supabase, not directly with one another. The app uses event-driven subscriptions rather than a polling loop. Delivery speed depends on the connection and backend; the source does not establish a guaranteed sub-second service level.

## File guide

### Source and configuration

| File | What it contains |
| --- | --- |
| `src/app/_layout.tsx` | Gesture/navigation providers, authentication gate, profile provider, route stack, and notification center. |
| `src/app/index.tsx` | List creation, list rows, owner-only delete controls, and profile navigation. |
| `src/app/list/[id].tsx` | Item composer, checkboxes, removal, sharing panel, remaining count, and completion celebration. |
| `src/app/profile.tsx` | Display-name editing, photo selection/upload, and sign-out. |
| `src/app/+html.tsx` | Web document title, metadata, home-screen support, and Apple touch icon link. |
| `src/lib/supabase.ts` | Environment validation, client creation, and session-persistence configuration. |
| `src/lib/auth.tsx` | Auth context, session restoration, and sign-in/sign-up/sign-out methods. |
| `src/lib/profile.tsx` | Current-user profile context and refresh helper. |
| `src/lib/queries.ts` | Database reads/writes, sharing RPC, profile operations, and avatar upload. |
| `src/lib/types.ts` | `List` and `Item` TypeScript data shapes. |
| `src/lib/push.ts` | Native push permission, token registration, and foreground notification settings. |
| `src/hooks/use-lists.ts` | Initial list fetch and list/membership event-driven refresh. |
| `src/hooks/use-items.ts` | Initial item fetch and incremental item-event handling. |
| `src/hooks/use-theme.ts`, `use-color-scheme.ts`, `use-color-scheme.web.ts` | System theme selection and web hydration handling. |
| `src/components/auth-gate.tsx`, `sign-in-screen.tsx` | Loading/authentication UI and account form. |
| `src/components/share-sheet.tsx` | Member list and owner invitation form. |
| `src/components/notification-center.tsx` | Signed-in item-insert listener and transient toast. |
| `src/components/avatar.tsx`, `ruby-logo.tsx` | Photo/initials avatar and SVG brand mark. |
| `src/components/pressable-scale.tsx`, `confetti.tsx` | Reusable press animation and completion particles. |
| `src/components/themed-text.tsx`, `themed-view.tsx` | Components applying the shared theme. |
| `src/constants/theme.ts`, `src/global.css` | Color, spacing, typography, and web styling. |
| `supabase/schema.sql` | Tables, RLS policies, helper functions, triggers, Realtime setup, and push SQL. |
| `.env.example` | Names and placeholder values for the two required client environment variables. |
| `app.json` | Expo identifiers, assets, native plugins, web output, and EAS association. |
| `eas.json` | Development/preview/production native build profiles and their environment values. |
| `google-services.json` | Android Firebase client configuration for the existing app. It is not a Firebase Admin service-account credential. |
| `vercel.json` | Static web build/output settings and routing rewrite. |
| `package.json`, `package-lock.json` | Commands, declared dependencies, and resolved dependency versions. |
| `tsconfig.json` | Strict TypeScript checks and import aliases. |
| `scripts/reset-project.js` | Starter reset script that moves or deletes the application source. |
| `assets/`, `public/` | Brand/native/web images, plus retained starter assets. |
| `docs/screenshots/README.md` | Instructions for adding screenshots. The three screenshot PNGs referenced by the old README are absent from the inspected archive. |
| `LICENSE` | MIT license text with the existing Expo copyright notice. |
| `README.md` | This user and developer guide; Markdown documentation is not executed by the app. |

### Generated files and folders

| Path | Purpose |
| --- | --- |
| `node_modules/` | Installed packages, recreated by npm. |
| `.expo/` | Local Expo state and generated route types. |
| `expo-env.d.ts` | Generated Expo type declarations. |
| `dist/` | Exported web output for hosting. |
| `web-build/` | Ignored web-build output path retained in `.gitignore`. |
| `android/`, `ios/` | Generated native projects when using native-generation workflows; ignored by Git here. |
| `*.tsbuildinfo` | TypeScript incremental-check cache. |
| `example/` | Optional destination for source moved by the reset script. |

Edit source and project configuration rather than generated output. Authentication persistence is local to each client, while lists, items, profiles, and registered device tokens are stored in Supabase.

## Understanding the application startup

The following excerpts are taken from the inspected source and may be shortened or reformatted to focus on the operation being explained.

### 1. Expo Router finds the screens

`package.json` selects the entry point:

```json
"main": "expo-router/entry"
```

Expo Router uses the files under `src/app` to build routes:

| Route | Screen |
| --- | --- |
| `/` | `src/app/index.tsx` |
| `/list/<id>` | `src/app/list/[id].tsx` |
| `/profile` | `src/app/profile.tsx`, presented as a modal in the stack |

The brackets in `[id]` define a route parameter. Opening `/list/abc` supplies `abc` as the list ID; the database still decides whether the signed-in user may read it.

### 2. Providers make shared state available

The root layout nests the app's providers:

```tsx
<AuthProvider>
  <AuthGate>
    <ProfileProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="list/[id]" />
        <Stack.Screen name="profile" options={{ presentation: 'modal' }} />
      </Stack>
      <NotificationCenter />
    </ProfileProvider>
  </AuthGate>
</AuthProvider>
```

A React context lets descendants use shared values without passing them through every component as props. `useAuth()` retrieves the session and account actions; `useProfile()` retrieves the current profile and refresh function.

`AuthGate` shows a loading indicator while the session is restored, the sign-in screen when there is no session, and the actual app when signed in. This hides screens appropriately, but the database policies provide the data-access boundary.

### 3. Restoring the session

The auth provider reads the saved session and subscribes to future changes:

```ts
supabase.auth.getSession().then(({ data }) => {
  setSession(data.session);
  setLoading(false);
});

const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
  setSession(next);
});
```

Signing in or out changes the context, which causes the gate to render the appropriate screen. The effect unsubscribes when the provider unmounts so an old listener does not remain attached.

## Understanding `src/lib/queries.ts`

### 1. Data has a defined shape

The shared item type includes:

```ts
export type Item = {
  id: string;
  list_id: string;
  text: string;
  is_done: boolean;
  position: number;
  created_by: string | null;
  done_by: string | null;
  created_at: string;
};
```

`string | null` means the field can contain a string or no value. Creator/completer references may become null if their account is deleted. TypeScript types help catch development mistakes, but they do not validate a network payload at runtime by themselves.

### 2. Reading visible lists

```ts
const { data, error } = await supabase
  .from('lists')
  .select('*')
  .order('created_at', { ascending: false });
```

`from()` chooses the table, `select()` requests columns, and `order()` sorts the result. There is no client-side owner filter here because the database's read policy includes both owned and shared lists.

The helper throws when Supabase returns an error and returns an empty array if there is no result data. `await` waits for the asynchronous request without turning it into a synchronous database call.

### 3. Creating a list in two requests

`createList()` first inserts a row without requesting it back, then queries the newest list matching the owner and name. This avoids relying on a combined insert-and-return operation under the list read policy.

The trigger creates the owner's membership row. The page receives the queried list and routes to `/list/<id>`.

The lookup is by owner and name, not the UUID returned by the insert. If the same owner creates identically named lists concurrently, the follow-up query can select the other newly created row. The implementation does not impose unique list names or make those two requests atomic.

### 4. Adding an item

```ts
.insert({
  list_id: listId,
  text,
  created_by: userId,
  position: Date.now()
})
.select()
.single();
```

The client supplies the list, text, creator, and a timestamp-based ordering value. Database defaults supply the UUID, initial completion state, and creation time. `single()` asks for one returned row.

The page clears the text field before awaiting the request and restores it if adding fails. It does not append the returned row directly to the hook's local item array; live events drive that update.

### 5. Toggling completion

```ts
const nextDone = !item.is_done;
await supabase
  .from('items')
  .update({ is_done: nextDone, done_by: nextDone ? userId : null })
  .eq('id', item.id);
```

`!` reverses the current boolean. The conditional expression stores the user ID for a completed item and clears it when reopened. `eq()` limits the update to the selected item ID; RLS separately checks list access.

This computes the next state from the client's current copy. There is no special conflict-resolution or atomic toggle function for simultaneous edits.

### 6. Calling the sharing function

```ts
supabase.rpc('add_list_member', {
  _list_id: listId,
  _email: email
});
```

`rpc()` calls a Postgres function. The database performs the email lookup because the frontend cannot directly read the Auth user table. The function returns a short status string that the sharing panel converts into a message.

### 7. Uploading an avatar

```ts
const path = `${userId}/avatar.${ext}`;
await supabase.storage
  .from('avatars')
  .upload(path, decode(base64), { contentType, upsert: true });
```

The image picker returns base64 text. `decode()` converts it into an ArrayBuffer of bytes for the upload. `upsert: true` allows replacing an existing file at the same path when the Storage policies permit it.

The helper retrieves the public URL and adds `?v=<timestamp>` so the newly selected image can bypass a previously cached URL. `updateProfile()` then stores that URL in Postgres. These upload and profile-update operations are separate; a failed profile update does not roll back the uploaded object.

## Understanding live synchronization

### List-level refresh

`useLists()` fetches visible lists when it mounts, then subscribes to changes in both `lists` and `list_members`:

```ts
.on('postgres_changes', { event: '*', schema: 'public', table: 'lists' }, () => {
  refresh();
})
.on('postgres_changes', { event: '*', schema: 'public', table: 'list_members' }, () => {
  refresh();
})
```

Each delivered event triggers a fresh list query. Membership events are included so newly shared access can update the home screen. The hook removes its channel when unmounted.

### Item-level changes

`useItems(listId)` fetches a list's items once and then applies Realtime changes to its local array:

| Event | Hook behavior |
| --- | --- |
| `INSERT` | Ignore another list's row or a duplicate ID; otherwise append and sort. |
| `UPDATE` | Ignore another list's row; replace a matching existing item and sort. |
| `DELETE` | Remove an item with the ID in `payload.old`. |

An insert is handled with:

```ts
const next = payload.new as Item;
if (next.list_id !== listId) return prev;
if (prev.some((i) => i.id === next.id)) return prev;
return sortItems([...prev, next]);
```

`as Item` is a TypeScript assertion, not runtime validation. `some()` detects a duplicate. The spread expression makes a new array so React can render the new state.

The subscription intentionally has no server-side `list_id` filter. The hook checks that field for inserts/updates and only needs the primary key for deletes, whose old payload can be restricted. The SQL also sets `REPLICA IDENTITY FULL` on `items`; the hook does not depend on receiving a complete deleted row.

This is a live-update mechanism, not a durable synchronization engine. It has no persisted offline cache, queued writes, event replay, or explicit reconnect refetch. The initial fetch and channel subscription are separate operations, so the code does not establish a gap-free snapshot plus event stream. A screen can need reopening or refreshing after connection trouble.

### Notifications reuse the same event source

`NotificationCenter` has a separate app-wide `INSERT` subscription. It resolves the list and creator for the message, sets one toast in React state, and replaces its dismissal timer:

```ts
setToast({ id: Date.now(), title, body });
if (timer.current) clearTimeout(timer.current);
timer.current = setTimeout(() => setToast(null), 3800);
```

Clearing the previous timer prevents it from dismissing a newer notification prematurely. The toast is only temporary UI state; it is not stored in a notifications table.

## Understanding `supabase/schema.sql`

### Tables and relationships

| Table | Main fields | Purpose |
| --- | --- | --- |
| `profiles` | `id`, `display_name`, `avatar_url`, `created_at` | Public-facing account information; ID references `auth.users`. |
| `lists` | `id`, `name`, `emoji`, `owner_id`, `created_at` | List metadata and owner. |
| `list_members` | `list_id`, `user_id`, `role`, `created_at` | A unique membership per list/user, with `owner` or `editor` role. |
| `items` | `id`, `list_id`, `text`, `is_done`, `position`, `created_by`, `done_by`, `created_at` | Checklist content and completion state. |
| `push_tokens` | `user_id`, `token`, `updated_at` | Registered native-device tokens, unique by user/token pair. |

List deletion cascades to its items and memberships. Account deletion cascades to the account's profile, owned lists, memberships, and tokens; references to that user on other items become null. These are database relationships, not an account-deletion feature exposed in the app.

Indexes support item lookup by list and membership lookup by user. Avatar file bytes live in Supabase Storage rather than the `profiles` table.

### Row-Level Security

RLS attaches access conditions to database operations. The public client key identifies the project; the signed-in user's session determines `auth.uid()`.

| Resource | Read access | Write access in the checked-in policies |
| --- | --- | --- |
| Profiles | Any authenticated user can read profiles. | Users can insert/update their own profile row. |
| Lists | Owner or list member. | Owner creates, updates, or deletes. |
| Memberships | Members can view their list's memberships. | Owner can insert; owner or the affected member can delete. No membership-update policy is declared. |
| Items | List members. | List members can insert, update, and delete. |
| Push tokens | User's own token rows. | User's own token rows. |

Profiles are not restricted to people sharing a list. The item policies check membership rather than enforcing that `created_by` and `done_by` equal the caller; the normal application sets those fields, but they are not a tamper-proof audit trail under this schema. Similarly, the SQL checks allowed membership-role strings but does not fully encode every possible role-consistency rule.

### Avoiding recursive membership checks

Policies call `is_list_member()` to check the owner or membership table. That function is `SECURITY DEFINER`, allowing it to inspect membership rows without recursively invoking the same membership policy. It also sets `search_path = public` to make relation resolution explicit.

`SECURITY DEFINER` is a database privilege mechanism, not a replacement for authorization checks. The sharing function uses it for a specific task and explicitly verifies ownership before looking up an account.

### Automatic profile and owner rows

`handle_new_user()` runs after an Auth user is inserted. It creates a profile using `display_name` from user metadata if provided; otherwise it uses the part of the email before `@`. The current signup form sends email/password only, so the email-derived default is the normal path.

`handle_new_list()` runs after a list insert and adds an owner membership. This gives membership queries a consistent row for the owner as well as invited editors.

### Sharing without exposing the Auth table

`add_list_member()` first checks ownership:

```sql
if not exists (
  select 1 from lists
  where id = _list_id and owner_id = auth.uid()
) then
  raise exception 'Only the list owner can invite members';
end if;
```

It then looks up the target user by normalized email and inserts an editor membership. `ON CONFLICT ... DO NOTHING` makes repeat invitations harmless for an existing membership, although the response still says `added`.

The caller gets a result status, not unrestricted access to the Auth users table. The status does reveal whether the supplied email matched an account.

### Sending push messages after an insert

`notify_item_added()` reads the list name/emoji and creator name, joins membership rows to registered tokens, and excludes the creator's own user ID. It builds a JSON array of Expo messages containing `to`, `title`, `body`, and `sound`.

The send operation is:

```sql
perform net.http_post(
  url := 'https://exp.host/--/api/v2/push/send',
  headers := jsonb_build_object('Content-Type', 'application/json'),
  body := _messages
);
```

`pg_net` provides `net.http_post()`. The trigger initiates the request when there are recipients; it does not inspect Expo tickets or later delivery receipts. The push payload includes the item text and creator's display name, so native push sends that notification content through Expo's service.

## Understanding interface behavior

### Reusable button feedback

`PressableScale` stores a Reanimated shared value for scale. Pressing animates it toward `0.95`; releasing animates it back to `1`:

```ts
scale.value = withSpring(scaleTo, SPRING);
```

The animated style applies `transform: [{ scale: scale.value }]`. A spring makes the movement ease toward its destination. The component forwards ordinary press callbacks, allowing the same feedback wrapper to work with Create, Add, Invite, and Save.

### Swipe-to-reveal deletion

Native owner list rows are wrapped in `ReanimatedSwipeable`. Its left action is a `RectButton`; pressing that revealed button closes the swipeable row and opens the deletion confirmation.

Swiping alone does not delete the list. Web uses a separate row button, and editors get neither owner control. The database's delete policy still enforces ownership independently of these UI conditions.

### Completion and confetti

The detail screen calculates:

```ts
const remaining = items.filter((i) => !i.is_done).length;
const allDone = items.length > 0 && remaining === 0;
```

`filter()` selects unfinished items. The length check prevents an empty list from counting as complete. A ref tracks whether the current completed state has already triggered a burst, and a changing React key remounts the confetti component when another burst is needed.

`Confetti` renders 18 colored pieces with randomized size, rotation, and travel. A shared progress value runs from zero to one, and the vertical path is:

```ts
const y = -rise * p + fall * p * p;
```

The first term launches the piece upward; the squared term curves it downward. Pieces fade near the end and ignore pointer events, so the decoration does not block controls.

### Theme selection

`useTheme()` chooses a palette from `src/constants/theme.ts` using the current system scheme. The web-specific color-scheme hook initially returns light mode for static rendering, then reads the client preference after hydration. Hydration is the step in which React attaches interactive behavior to the rendered web output.

Themed text/view wrappers apply shared colors, while individual screens use `StyleSheet.create()` for their layout. This keeps the same component structure usable on native platforms and web.

## Understanding configuration files

### `package.json` and the lockfile

`package.json` declares commands and package ranges. `private: true` prevents accidental npm publication; it does not make a hosted app private.

`package-lock.json` records the resolved tree for reproducible npm installation. Use the installed versions when checking framework behavior. The repository's `AGENTS.md` mentions Expo 57 documentation, but the manifest and lock inspected here use Expo **54**, so this guide reports the actual dependencies.

### `app.json`

The Expo config sets the display name Ruby, the `ruby` URL scheme, portrait orientation, automatic system theme, app/splash icons, Android package settings, static web output, and router/notification plugins. Typed routes and React Compiler are enabled as experiments.

Its EAS project ID and owner associate builds with an Expo project. They are not Supabase environment variables. The `googleServicesFile` path points to the checked-in Android Firebase client configuration.

### `eas.json`

Each build profile contains explicit values for the same two Supabase public environment variables used locally. These point to the existing backend and must be replaced or managed appropriately for a separate deployment. Do not assume that copying a new `.env` file changes those profile values.

### `tsconfig.json`

The file extends Expo's base TypeScript configuration and enables strict checking. `@/*` resolves under `src`, and `@/assets/*` resolves under the repository's `assets` directory. It includes Expo-generated route declarations as well as source `.ts` and `.tsx` files.

### `.gitignore`

The ignore rules exclude dependencies, local environment files, Expo/build output, generated native projects, signing material, and common Firebase Admin service-account filename patterns. The public Firebase client configuration remains tracked. Ignore patterns do not retroactively remove files already committed.

## Verification and current limitations

The following is a suggested manual check, not a claim that these checks have already passed:

1. Configure a fresh backend and create two separate accounts after applying the schema.
2. Create a list as the first user and share it with the second.
3. Confirm both users can add, toggle, and delete items and receive live changes.
4. Confirm a third unrelated user cannot read the list or its items.
5. Check that only the owner can delete the list or invite members.
6. Verify list deletion cascades and native/web deletion controls behave as documented.
7. Test name changes and avatar replacement after configuring Storage policies.
8. Test Realtime disconnection/reconnection and refresh behavior rather than assuming missed events are recovered.
9. Test native push with a real configured build, including permissions, background delivery, delivery failures, and sign-out/account switching.
10. Check light/dark mode, keyboard layout, smaller screens, and completion animation.

The implementation does not include offline synchronization, queued writes, item-text editing, list renaming, drag reordering, search, due dates, recurring items, attachments on list items, audit history, undo, pending email invitations, member removal in the UI, a web-push service worker, or a persistent notification center.

The application records `done_by` but does not show “who checked this off” avatars. Profile photos and native push code are implemented even though parts of the old README describe an earlier feature set. The database setup is not a versioned migration sequence, and Storage provisioning remains a separate step.

List and item read errors are generally logged rather than displayed as dedicated error screens. An inaccessible/missing list can show the fallback title instead of a clear not-found screen. There is also no explicit navigation away from a list detail screen when another device deletes that list.

## Troubleshooting

| Problem | What to check |
| --- | --- |
| Missing Supabase environment-variable error | Populate the two names in `.env`, restart Expo, and check build-time settings for deployed builds. |
| Native build connects to the wrong backend | Replace the explicit values in the selected `eas.json` profile. |
| Account created but not signed in | Check whether Supabase email confirmation is enabled and whether its redirect URLs are configured. |
| Profile missing for an existing account | The new-user trigger does not backfill accounts created before schema installation. |
| Invite says no account found | The person must already have an account in the same Supabase project. |
| Schema rerun fails on a publication statement | Skip tables already registered in `supabase_realtime`; check whether later push statements executed. |
| Writes succeed but items do not appear live | Check publication membership, Realtime connection, authentication/RLS, and browser/device logs. The detail hook depends on events after its initial fetch. |
| Avatar upload fails | Create the `avatars` bucket and owner-folder object policies; check media permission and bucket restrictions. |
| In-app toast works but native push does not | Check physical-device use, notification permission, EAS association, platform push credentials, `push_tokens`, and the `pg_net`/Expo response path. |
| Notification tap does not open a list | That navigation handler is not implemented. |
| Signing out still leaves push registration | The current code does not delete the device token on sign-out. |
| Lint requests additional setup | The lint command exists without a complete checked-in ESLint toolchain. |

## Suggested reading order

1. Read Run, Workflow, and Controls and features.
2. Read `src/lib/types.ts` and the table definitions in `supabase/schema.sql`.
3. Read `src/lib/supabase.ts`, `auth.tsx`, and `src/components/auth-gate.tsx`.
4. Read `src/lib/queries.ts` to understand what each action writes or retrieves.
5. Read `src/hooks/use-lists.ts` and `use-items.ts` to understand live updates.
6. Read the three screens under `src/app` to connect data operations to controls.
7. Read `share-sheet.tsx`, `notification-center.tsx`, and `src/lib/push.ts`.
8. Finish with the RLS/functions in `supabase/schema.sql` and the build configuration.

The interface gathers actions, Supabase stores and authorizes changes, and Realtime delivers those changes to open clients.

## License and documentation basis

The repository contains an MIT `LICENSE` with the existing Expo copyright notice. Preserve the license notice when redistributing applicable code.

This guide is based on the source archive of [pascalmmk/ruby](https://github.com/pascalmmk/ruby), whose `main` page showed commit [`3252240`](https://github.com/pascalmmk/ruby/tree/32522405af15effdff3c2757747fe7e35b415a2b) during inspection. The walkthroughs describe source behavior, not independently verified deployment state. No backend configuration, account creation, build, deployment, or push test was performed while writing this README.
