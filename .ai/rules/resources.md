---
paths:
  - 'app/Http/Resources/*.php'
---

# Resources

## Cast every numeric in API Resources — SQLite tests hide Postgres string leakage
PostgreSQL returns numeric aggregates as strings ("96.00") while the test DB is SQLite (real ints), so string-typed numbers silently pass tests and then break JS arithmetic (e.g. `s + m.delivered_quantity` concatenates into "096.0096.00..."). Always cast numerics in API Resources — follow InvoiceItemResource: (int) for quantities, (float) for money. Assert `toBeNumeric()->not->toBeString()` in tests, not toBeInt()/toBeFloat() (json_encode(10.0) emits "10").
