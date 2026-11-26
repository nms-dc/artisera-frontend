# Design V10 coverage

Source: `Artisera UI Design - Draft - V10`. Checked by `npx tsc --noEmit`, `npm run lint`, `npm test` (11), `npm run test:api` (111) and `npm run build`. The screens have not been compared side by side with the design in a browser. API changes are listed in `API.md`.

| V10 item | What changed |
|---|---|
| 1.1 Admin dashboard | In Pipeline card (open count and value) beside Won. RM names were already links, with no View RM button |
| 1.2 New Inquiry | RM assignment stays Admin only. Priority is Normal or High, High by default for a repeat prospect |
| 1.3 Admin inquiries | Nurture tab, Nurture summary card, row selection with Reassign RM, Snooze and Mark as Lost in one all-or-nothing request. Address shown on the inquiry view. Budget range and art style removed. RM selector on Edit (Admin) |
| 2.1 RM dashboard | Time column removed, Source added, "Price on inquiry" when there is no value. Overdue rows show in red on the inquiry ID |
| 2.2 Touchbase | No date or time fields. Current time is recorded |
| 2.3 Follow-up | No recording date or time. Next follow-up is a date (default +2 days, reminder at 9:00 AM). Mark as Lost added. Dates show as dd-MMM-yyyy app-wide |
| 2.4 Active | Same changes. Choosing Mark as Won opens the sale form directly. Closing needs a reason |
| 2.5 Snooze | Confirmation dialog removed (toast instead). 1, 3, 7, 14 days or a custom date, each showing the resulting date |
| 2.6 Mark as Won | Commission ready date is N/A for With Artist and required for Commission. Shipment is section 5 and Payment is section 6 |
| 2.7 Nurture | Admin bulk reassign (see 1.3) |
| 3.3 Artists | Nationality and Status removed, Subcategory added, Category and Subcategory optional |
| 3.6 Customers | Types: Prospect, Repeat Prospect, Client, Repeat Client. Previous Sales Records tab. Invoices tab is a Phase 2 placeholder |
| 5.1 Gallery dashboard | Cards: Preparation, Packing, Dispatched, Delivered, Certificates. "RM Email" column (Received / Pending) on sales needing attention, with a Gallery Manager override on the sale |
| 5.3 Order creation | On the sale screen: a Select checkbox (In Stock only) and a Group dropdown per product, with one Create Order(s) button. Each group is one order. A single group on the first order is `SAL-00042`, otherwise `-A`, `-B` |
| 5.3 Orders | Product images removed. Waybill optional. Dimensions can be entered in cm or in. RM name on the sales, orders, shipments and certificates screens. Disabled Select checkboxes show the reason on hover. Order creation is blocked until the RM email is confirmed or overridden |
| 5.5 Shipments | Dispatched and In Transit are one status. Delivered means the customer confirmed |
| Orders menu | Already present for Admin and RM (RM sees only their own orders) |

## Open points to confirm with the manager
- "Include this in Dispatch tab" (5.3) was not clear enough to build.
- The "default date and time removed" notes are read as: the user no longer enters them and the system records the current time.
- The dd-MMM-yyyy format is applied everywhere, not only on the follow-up screen. It is one constant (`DATE_FORMAT` in `src/lib/formatters.ts`).
- In the mock, seeded sale SAL-00038 starts with the RM email Pending so the override can be tried; sales created through Mark as Won start as Received. In production the backend should set it when the RM's email arrives.

## Follow-up round
- Edit Inquiry: address shown when the customer has one; customer block, field order, read-only Status and required Assigned RM (for Admin) match the design.
- Admin dashboard RM table: Won (₹), In Pipeline (₹) and Total Value (₹) columns. RM dashboard: In Pipeline card.
- Mark as Closed: Closed Date field (defaults to today). Move to Nurture keeps its follow-up date.
- Nurture: RMs can Reassign RM from the row menu for their own inquiries.
- Order statuses renamed to Packing and Dispatched; leftover "shipped" wording removed; clearer message when Photo/Video Uploaded is not ticked.

## Production hardening
- Next.js upgraded to 16 (clears the known Next.js advisories); route pages read `params` asynchronously.
- Icons bundled locally; no browser calls to third-party services.
- Security headers + Content-Security-Policy; same-site-only post-login redirect; clean sign-out redirect; error and not-found pages.
- Dashboards refresh after order changes (cache tags fixed); toasts moved to the bottom-right so they never cover the profile menu or notification bell.
- Icon-only buttons have accessible names.
