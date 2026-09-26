---
paths:
  - 'app/Services/**'
---

# Services

## Invoice prices come from the PO, and PO meal rows are matched by id
Invoice lines must price from product_meals.unit_price (via challan_items.product_meal_id), never from the challan_items.unit_price snapshot — a snapshot goes stale when the PO price is revised and makes the invoice disagree with its PO. ProductService::update() must match incoming meals rows by their `id` (front-end sends meals[i][id]); matching by array index silently writes quantities/prices onto the wrong product_meals rows and scrambles the PO. Use `php artisan invoices:rebuild-items [--invoice=] [--apply]` (dry-run by default) to repair historical invoices.
