# API contract

The frontend calls only what is listed here. Types: `src/lib/types.ts`. Paths: `src/core/api/endpoints.ts` (the only file that holds URLs). A runnable reference of every rule is the mock backend in `src/mocks` (`npm run test:api`).

## Conventions
- Base: `{API_URL}/api/v1/<app>/...`. Apps: `account`, `common`, `crm`, `gallery`. Every path ends with `/`.
- JSON, camelCase. Dates are ISO-8601 UTC. Money is a whole number of rupees. "Today" is Asia/Kolkata.
- Auth is JWT (SimpleJWT style). `POST account/auth/login/` returns `{access, refresh}`. Later calls send `Authorization: Bearer <access>`. `POST account/auth/refresh/ {refresh}` returns `{access, refresh?}`. The Next.js server holds both tokens in httpOnly cookies, sends the header, and refreshes once on a 401; the browser never sees a token.
- Lists: `{ count, page, pageSize, results }`. Query `page`, `pageSize` (max 100).
- Errors: `400 { field: ["message"] }` (nested fields use dots, `products.0.name`), everything else `{ detail: "message" }`. Used: 400, 401, 403, 404, 409. 409 = a workflow rule blocks the action.
- Any file URL the API returns (`OrderMedia.url`, `imageUrl`) must be an absolute `https://` URL the browser can open directly, or the browser blocks it on an https site.
- Behind a load balancer, forward `X-Forwarded-Proto`, and allow request bodies up to 100 MB on the upload route.
- CSV export endpoints return `text/csv` with a header row and honour the same filters as their list.
- Roles: `ADMIN`, `GALLERY_MANAGER`, or any other role id (treated as RM for data scope).
- `GET account/auth/me/` returns `{id,name,email,role,permissions}`. `permissions` = `{ inquiries|customers|masters|reports|users|sales|orders|shipments|certificates: { view, create, edit, delete, assignRm } }`. The app shows menus, buttons and routes from it; the server enforces the same and returns 403.

## account
| Endpoint | Notes |
|---|---|
| `POST auth/login/` `{email,password}` → `{access,refresh}` | 401 on bad credentials or inactive user |
| `POST auth/refresh/` `{refresh}` · `POST auth/logout/` `{refresh}` · `GET auth/me/` | logout blacklists the refresh token |
| `GET users/options/?role=` → `[{id,name}]` | active users, for dropdowns |
| `GET users/` `q,role,status` · `POST users/` · `GET/PATCH users/:id/` | `users` permission. Unique email |
| `GET roles/options/` · `GET roles/` `q,status` · `POST roles/` · `GET/PATCH roles/:id/` | `users` permission. `permissions` per module/action |

## common (masters)
| Endpoint | Notes |
|---|---|
| `GET {kind}/` · `GET {kind}/options/` · `POST {kind}/` · `GET/PATCH {kind}/:id/` | `kind` = `categories`, `subcategories`, `artists`. Duplicate name → 400. Artists carry `name`, optional `categoryId`, optional `subcategoryId` (must belong to the category when both are sent, else 400). They have no nationality or status. `options` is open to any signed-in user |

## crm
| Endpoint | Notes |
|---|---|
| `GET inquiries/` `tab,q,rmId,customerId,priority,source,status,dateRange,page,pageSize,ordering` · `GET inquiries/counts/` `rmId?` | see tabs |
| `POST inquiries/` | `categoryId` and `subcategoryId` are optional (omitted when not selected; a subcategory must belong to its category). `PATCH inquiries/:id/` is a partial update; only Admin may change `rmId` and `priority`. Admin: `rmId`, optional `priority`. RM: assigned to caller. Priority is `Normal` or `High` (else 400); when omitted it is `High` if the customer has an earlier inquiry, otherwise `Normal` |
| `POST inquiries/bulk/` `{ids,action,rmId?\|remark?\|nextFollowUp?}` → `{updated}` | Admin (`inquiries.assignRm`). `action` = `reassign`, `lost` or `snooze`. Every id must be in Nurture (409), checked before anything changes, so it is all or nothing. `reassign` needs an active RM, `lost` needs `remark`, `snooze` needs a date not in the past |
| `GET inquiries/:id/` · `PATCH inquiries/:id/` | PATCH Admin only. Accepts `rmId` (reassigns, writes history and notifies). Budget range and art style no longer exist. The embedded `customer` includes `address1`, `address2`, `pin`, `country` |
| `GET inquiries/:id/activities/` | newest first |
| `POST inquiries/:id/assign/` `{rmId,priority}` | Admin. RM must be active; open inquiries only |
| `POST inquiries/:id/touchbase/` `{method,at?,notes?}` | owner RM, status Touchbase |
| `POST inquiries/:id/interactions/` `{method,at?,nextFollowUp?,notes?,remark?,moveTo?}` | owner RM, status Touchbase Follow-up or Active Conversations. `at` defaults to server time. Follow-up may move to Active, Nurture or Lost; Active to Nurture or Lost. The client sends `nextFollowUp` at 09:00 |
| `POST inquiries/:id/snooze/` `{nextFollowUp}` | owner RM, Follow-up or Active; not in the past |
| `POST inquiries/:id/status/` `{status,remark?,nextFollowUp?}` | see Status rules |
| `POST inquiries/:id/won/` `SaleInput` → `Inquiry` | Admin (`inquiries.edit`) any open inquiry; owner RM from Active Conversations |
| `GET customers/` `q,location,rmId,status,customerType` · `GET customers/locations/` | totals per customer. `customerType` is `Prospect`, `Repeat Prospect`, `Client` or `Repeat Client` |
| `GET customers/:id/sales/` → `CustomerSale[]` | Previous sales records, newest first. Admin sees all, an RM only their own sales |
| `POST customers/` · `GET/PATCH customers/:id/` · `GET customers/:id/activities/` | `name,phone,email` required; duplicate phone (last 10 digits) or email → 400 |
| `GET dashboard/admin/?range=7\|30\|90\|all` | Admin |
| `GET dashboard/rm/?range=&rmId?` | RM: own. Admin: `rmId` required (read only) |
| `GET reports/inquiry-summary/` · `GET reports/inquiry-detail/` · `GET reports/inquiry-detail/export/` | filters `from,to,rmId,categoryId,subcategoryId,status` |
| `GET notifications/` · `POST notifications/:id/read/` · `POST notifications/read-all/` | polled every 30 s |

## gallery
Permissions: `sales`, `orders`, `shipments`, `certificates` (`view`, `create`, `edit`). Filters shared by the lists: `from`, `to` (dates, yyyy-MM-dd), `customerId`, `q`.

| Endpoint | Notes |
|---|---|
| `GET customers/` → `[{id,name}]` | customers that have a sale; `sales.view` |
| `GET dashboard/` `from,to` → `GalleryDashboard` | `orders.view`. Six card counts for orders created in range; attention lists (max 5 rows, with total `count`) |
| `GET sales/` `orderStatus,certificateStatus` + shared · `GET sales/export/` | `orderStatus` = an order status or `none`; `certificateStatus` = `with-shipment`, `pending`, `sent` |
| `GET sales/:id/` → `SaleDetail` (products + orders) | `sales.view` |
| `PATCH sales/:id/products/:productId/` `{productStatus?,commissionReadyDate?,orderNotes?}` | `sales.edit`. 409 once the product is in an order |
| `POST sales/:id/orders/` `{productIds}` → `OrderDetail` | `orders.create`. One order per call, In Stock products only |
| `GET orders/` `status` + shared · `GET orders/export/` · `GET orders/:id/` | `orders.view` |
| `PATCH orders/:id/` `{readyForPacking, products:[{id,photoVideoUploaded}]}` → `OrderDetail` | `orders.edit`. Locked once shipped (409) |
| `POST orders/:id/media/` multipart `file`, `kind=product\|packing` → `OrderMedia` · `DELETE orders/:id/media/:mediaId/` | JPG, PNG, MP4, ≤ 100 MB |
| `PATCH orders/:id/dispatch/` `DispatchInput` → `OrderDetail` | `orders.edit`. Needs Ready for Packing (409) |
| `POST orders/:id/received/` `{received,date?}` · `POST orders/:id/certificate-sent/` `{sent,date?}` → `OrderDetail` | `orders.edit` / `certificates.edit` |
| `GET orders/:id/activities/` | oldest first, `{title,text,by,at}` |
| `GET shipments/` `courier,status` + shared · `GET shipments/export/` · `PATCH shipments/:id/status/` `{status}` | `:id` is the order id. `shipments.view/edit` |
| `GET certificates/` + shared (rows include `rmName`) · `GET certificates/export/` | `certificates.view` |

## Rules

**Statuses:** Touchbase → Touchbase Follow-up → Active Conversations → Nurture / Won / Lost. Won and Lost are final. An inquiry with no RM is `Touchbase` with `rm: null`.

**Touchbase:** moves to Touchbase Follow-up, `nextFollowUp = at + 2 days`, `lastContact = at`. Date and time of the interaction are always entered by the user (no defaults).

**Status rules** (`inquiries/:id/status/` and `moveTo` on interactions):
- Allowed moves for the owner RM: Follow-up → Active Conversations, Nurture · Active → Nurture, Lost · Nurture → Active Conversations. Admin: any open inquiry → Active Conversations, Nurture, Lost. Anything else → 409.
- `Lost` (shown as "Mark as Closed" in the app) needs a reason in `remark`, on both the status endpoint and interactions (400 when empty, max 500). On interactions `notes` is the conversation note and `remark` is the reason for the status change.
- `Nurture` and `Active Conversations` need `nextFollowUp` (not before today). `remark` is optional.
- `Won` → 400. Use `inquiries/:id/won/`.
- Every change writes a Status activity that includes the remark.

**Won / sale:** `SaleInput` = `{totalValue, saleDate, notes, certificatePlan, products:[{name, artistId?, url?, listedPrice, quantity, productStatus, commissionReadyDate?, orderNotes}], shipmentPriority, requiredShipmentDate?, shipmentInstructions, paymentStatus, paymentNotes}`. The text keys (`notes`, `shipmentInstructions`, `paymentNotes`, `orderNotes`) are always sent, as `""` when empty.
- `certificatePlan` = `With Shipment` or `Send Separately` and applies to every product.
- `commissionReadyDate` (the "Ready Date") is required for `With Artist` and `Commission`, and is null for `In Stock`.
- At least one product. `requiredShipmentDate` is required for `Urgent` and `Specify Date`. Validation happens before anything changes.
- Won sets `closedAt`, converts the customer to `Client`, creates the sale numbered `SAL-00001…` and notifies Gallery Managers. `rmNotifiedAt` stays empty until the RM's email to the Gallery Manager is confirmed (see Email confirmation). `commissionReadyDate` is required for `With Artist` and `Commission` products (400) and is null for `In Stock`. `Inquiry.sale` embeds the summary for the RM.

**Numbers:** sale `SAL-00042`; its orders `SAL-00042-A`, `-B`, … (`AA` after `Z`).

**Order status (derived, never stored):** `Preparation` → `Packing` (`readyForPacking`) → `Dispatched` (`actualDispatchDate` set) → `Delivered` (`receivedAt` set). A Delivered order whose sale uses `Send Separately` and has no `certificateSentAt` shows `Certificates Pending` until the certificate is sent.

**Orders:**
- `readyForPacking = true` needs every product ticked `photoVideoUploaded` (400). It cannot be cleared once packing is saved (409).
- `dispatch` needs ≥ 1 package, each with a `packagingType`; courier (`DHL, FedEx, BlueDart, DTDC, Other`) is required. The waybill is optional. Package dimensions are always sent and stored in cm (the UI can show inches). `actualDispatchDate` is optional and date-only (`YYYY-MM-DD`); setting it ships the order and sets `shipmentStatus = In Transit`. Packing and shipment details stay editable after dispatch, but the dispatch date cannot be removed once set (400). The UI requires at least one packing photo or video before packing is saved and before dispatch.
- Shipment status: `In Transit` (shown as Dispatched / In Transit) or `Delivered` (customer confirmed). Setting `Delivered` sets `receivedAt`; any other value clears it. `received` needs a shipped order (409) and sets `shipmentStatus` to Delivered (received) or In Transit (cleared).
- `certificate-sent` is only for sales with `Send Separately` (409 otherwise).
- Certificates list: `dispatched` = sent date set (separate plan) or shipped with `certificateIncluded` (with shipment). `dispatchDate` = certificate sent date (separate) or order dispatch date.

**Gallery dashboard:** cards count orders created in range by status; `certificatesPending` counts orders whose certificate still has to be sent separately. Attention orders = every order not Delivered, newest first. Attention sales (each row also carries `emailConfirmed`) = sales with `pendingWith`:
- `RM email not received` — first, while the RM's email is not confirmed.
- `Order not created` — at least one In Stock product not yet in an order.
- `Details incomplete` — otherwise, an open With Artist/Commission product has no ready date.
- `Awaiting customer confirmation` — otherwise, open products remain and payment is Pending.

**Repeat prospect:** `Inquiry.repeatProspect` = the customer has an earlier inquiry. `Customer.repeatProspect` = the customer has two or more inquiries. In the New Inquiry contact search the tag shows when `totalInquiries` ≥ 1, because a new inquiry for that contact would be a repeat.

**Tabs** (`inquiries/?tab=`): `all`, `unassigned`, `assigned`, `touchbase`, `followup`, `active`, `nurture`, `won`, `lost`, and `today` = status Touchbase or (Follow-up/Active/Nurture with `nextFollowUp` ≤ end of today). Order: overdue first, then scheduled hour, then priority (High, Normal), then value.

**Permission map:** inquiries `create` → create · `edit` → PATCH and Admin status override · `assignRm` → assign, set RM/priority on create, view as RM · customers `view/create/edit` · masters `view`, `create`, `edit` · reports `view` · users `view/create/edit` → users and roles · sales/orders/shipments/certificates as listed above. `inquiries.view` is required for every inquiry endpoint. A role change takes effect on the next request.

**Scope:** an RM only sees their own inquiries (lists, counts, detail, activities, dashboards, reports); another RM's `rmId` → 403. Admin sees everything. Admin cannot call touchbase, interactions or snooze (403). Gallery users have no inquiry access.

**Dashboard (RM):** `touchbase`, `followUp`, `active`, `nurture` are current counts; `won`, `lost` count by `closedAt` in range. Overdue: Touchbase = assigned over 24 h ago; Follow-up = `nextFollowUp` in the past; `dueToday` = Active due today.

**History:** one activity per event (Created, Assigned, Reassigned, Touchbase, Follow-up, Conversation, Snooze, Status, Edited), written in the same transaction as the change.

**Notifications:** never for the actor.
- Admins: NEW_INQUIRY, TOUCHBASE_RECORDED, INTERACTION_RECORDED, FOLLOWUP_SNOOZED, STATUS_CHANGED (RM actions), CUSTOMER_CREATED, UNASSIGNED_INQUIRY (while unassigned), ORDER_CREATED, ORDER_SHIPPED, ORDER_DELIVERED, CERTIFICATE_SENT.
- RM: INQUIRY_ASSIGNED, INQUIRY_REASSIGNED, INQUIRY_UPDATED, STATUS_CHANGED (Admin actions), FOLLOWUP_DUE, FOLLOWUP_OVERDUE (Follow-up, Active, Nurture), plus the four order events for their own sales.
- Gallery Managers: SALE_WON (carries `saleId`).
- Each carries `inquiryId` / `customerId` / `saleId` and `tab`.

**Email confirmation (Gallery):** `SaleDetail.rmNotification` = `{status: Received|Pending, at, overridden}`; `Sale.emailConfirmed` is the list flag. `POST sales/:id/email-override/` (`sales.edit`) marks it received manually, records an `Email Override` log entry and returns `{id, emailConfirmed}`; 409 if already confirmed. `POST sales/:id/orders/` returns 409 while the email is pending. Body `{groups: string[][]}`: each inner list is one order, and the response is `OrderDetail[]` in group order. Every product must be In Stock and not already ordered (409), a product can appear in only one group, and groups cannot be empty (400). Numbering: when the sale has no orders and one group is sent, the order number is the plain sale number (`SAL-00042`); every other order gets the next letter (`SAL-00042-A`, `-B`, …). `productIds` is still accepted as a single group. The backend should also set `rmNotifiedAt` when it receives the RM's email.

**Customer type:** stored base type is `Prospect` or `Client` (the only values the form can send). The API returns `Repeat Prospect` when a prospect has two or more inquiries and `Repeat Client` when a client has more than one sale.

**Admin dashboard:** `kpis.pipelineCount` and `kpis.pipelineValue` cover all open inquiries (any status except Won and Lost).

**Gallery dashboard cards:** `preparation`, `packingDispatch`, `shipped`, `delivered`, `certificatesPending`.

## V10 follow-up changes
- **Admin dashboard `rmTable` rows** add `wonValue` (won in range) and `pipelineValue` (all open inquiries); `revenue` = `wonValue` + `pipelineValue`. `won` and `lost` count inquiries closed in the selected range, matching the KPI cards.
- **RM dashboard `kpis.pipeline`** = `{ count, value }` of the RM's open inquiries (any status except Won and Lost).
- **`POST inquiries/:id/interactions/` with `moveTo: "Lost"`** accepts `closedOn` (ISO datetime, default now, not in the future; the UI sends midday of the picked day, or the current time for today); it sets the inquiry's closed date.
- **`POST inquiries/bulk/` with `action: "reassign"`** is also allowed for an RM when every selected inquiry is their own Nurture inquiry (otherwise 403). All other bulk actions stay Admin only.
- **Order statuses** are `Preparation`, `Packing`, `Dispatched`, `Delivered`.
