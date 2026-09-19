---
paths:
  - 'app/Http/Controllers/** app/Models/** routes/web.php'
---

# Models

## Delivered quantity single source of truth
Delivered/remaining everywhere (PO list, purchase report, challans page, product show/print) must be derived from challan_items via Product::withDeliveredTotals() / ProductMeal::withChallanDelivered(). The product_meals.delivered_quantity column is write-only legacy (kept only to keep ChallanStatusSyncTest green) and must never be read for totals. Subquery: SUM(challan_items.quantity) where challans.status != 'cancelled' AND deleted_at IS NULL matches allocated_quantity on the challans page.
