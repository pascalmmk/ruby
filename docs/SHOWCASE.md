# Ruby walkthrough and case study

## Two-minute walkthrough

Prepare two registered accounts in separate browser profiles and a disposable list.

| Time | Show | Explain |
| --- | --- | --- |
| 0:00–0:20 | Create a list | The app helps people coordinate a shared list. |
| 0:20–0:45 | Invite the second account | Sharing is modeled through list membership. |
| 0:45–1:15 | Add and check an item across two sessions | Realtime updates reach the other client without a page refresh. |
| 1:15–1:35 | Delete an item and observe both views | Delete handling uses the item identifier. |
| 1:35–2:00 | Show the membership policy and invitation function | Database policies enforce access independently of the UI. |

Native push is an optional separate demonstration: use a physical configured device, background the app, and add an item from another member's account. Do not claim success until a notification is actually received.

## Engineering case study

**Problem:** shared lists need both synchronized interfaces and access control.

**Implementation:** Supabase Auth identifies users, PostgreSQL stores ownership and membership, RLS policies govern data access, and subscriptions update each client's displayed items.

**Decision worth discussing:** invitations use a server-side function to find a registered user by email and check list ownership. The client does not need direct access to the authentication users table.

**Tradeoff:** service-managed authentication and Realtime simplify the application backend, while correctness depends on database policies, subscription lifecycle management, and deployment configuration.

**Verification to demonstrate:** two list members observe an update, an unrelated third account cannot read the list, and a non-owner cannot grant membership. Perform access checks through the API as well as the interface; hiding a list in the UI is not proof of authorization.

**Known boundary:** this documentation review inspected the code but did not execute those access-isolation scenarios or measure latency. Record actual outcomes before adding results to the README or CV.

## Capture plan

Capture `lists.png`, `list-detail.png`, and `completed.png` in `docs/screenshots/` using disposable example content. For the video, a split view of two browser profiles communicates the central behavior more clearly than isolated mobile screenshots. Add image links only after the files exist.
