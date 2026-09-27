---
paths:
  - 'app/Http/Controllers/**'
---

# Controllers

## Any non-index endpoint returning ProductResource must call loadDeliveryTotals()
po.tsx merges the store/update response into the existing table row instead of refetching, so those responses must carry the list aggregates. Only index() gets total_ordered/total_delivered/challans_count/invoiced_challans_count from the withDeliveredTotals() scope + withCount; without Product::loadDeliveryTotals() in store/update/show the resource emits 0/null and the row blanks out (Ordered 0, "No Items") until a page refresh.
