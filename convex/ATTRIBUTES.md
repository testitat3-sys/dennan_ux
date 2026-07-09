# Attribute key log

Running changelog of every `attributes[].key` ever written via
`convex/attributes.ts`'s `appendAttribute`. Add a new entry here in the same
change that introduces a new key in code.

## fulfilled_via_exchange
- Table: orders
- Value: the `returnId` (string) of the exchange that produced this tag
- Added: 2026-07-09, part of the cashier exchange feature
- Meaning: this order had at least one exchange resolved against it via `returns.submitExchange`

## sold_via_exchange
- Table: products
- Value: (unset)
- Added: 2026-07-09, part of the cashier exchange feature
- Meaning: this product has been given out at least once as an exchange item rather than sold through a normal order
