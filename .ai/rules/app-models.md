---
paths:
  - app/Models/Product.php
---

# App Models

## Report PO shortfall and over-delivery separately, never netted
Never show a PO's remaining as `total_ordered - total_delivered`; netting hides shortfalls behind over-delivery (PO-0058: 888/888 but 144 short and 144 over). Per-meal `remaining`/`over_delivered` accessors on ProductMeal and `totalRemaining()`/`totalOverDelivered()` on Product sum the gaps separately, so under- and over-delivery are always both visible.
