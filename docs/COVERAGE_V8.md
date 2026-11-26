# Design V8 coverage

Source: `Artisera UI Design - Draft - V8.0`. Checked by `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:api` and `npm run build`. The screens have not been compared side by side with the design in a browser.

| Area | Built |
|---|---|
| Login | Email and password; JWT kept in httpOnly cookies by the Next.js server |
| Repeat Prospect | Tag in contact search, customers, inquiry lists, inquiry view, detail report |
| Interaction forms | Date and time are entered by the user, no defaults; "No Email / WhatsApp / Call recorded" turns Save into Snooze |
| Status changes | One dialog from every three-dot menu; Lost needs a reason, Nurture and Active Conversations need a next follow-up date, remark optional; the inline panel enforces the same |
| Mark as Won | One page with all five V8 sections (the step header scrolls to each); certificate plan for the whole sale; commission ready date per product |
| Gallery Manager | Dashboard (six cards, two attention tables), Sales (Won), Won Sale, Create Order(s), Order (Products, Packing & Dispatch, Activity), Orders, Shipments, Certificates, CSV export on every list |
| Roles | Permission modules Sales (Won), Orders, Shipments, Certificates |
| RM | Read-only sale summary on the won inquiry; notifications for order created, shipped, delivered and certificate sent |

## Assumptions to confirm
1. **Order status list** (the design shows six but never defines them): In Preparation, Ready for Packing, Packed & Ready, Shipped, Delivered, Certificates Pending. The rules are in `docs/API.md`.
2. **"Pending With" on the dashboard:** the three labels are defined in `docs/API.md`; the design gives no rule.
3. **Create Order** builds one order per save from the selected In Stock products; the next order gets the next letter.
4. **Sale "Create Order" button** on the Sales list opens a picker of sales that still have products waiting.
5. **Shipment status and "Order Received"** are linked: Delivered sets the received date; clearing it moves the shipment back to In Transit.
6. **Certificate dispatched** is editable only for sales set to "sent separately later".
7. **Product images** are not captured in Mark as Won, so thumbnails show a placeholder until the backend supplies `imageUrl`.
8. **Reports** for the Gallery Manager are not in V8, so that role has none.
9. Status endpoint field names follow the existing contract (`nextFollowUp`, plus `remark`); the design Excel suggested `nextFollowUpAt`.
