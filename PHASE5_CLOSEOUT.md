# Phase 5 Closeout (Restaurant)

## Group/Split Settlement Classification

- Classification: P1 (advanced parity)

## Justification

- Full-table restaurant settlement is implemented and validated end-to-end.
- Payment lock lifecycle is implemented and safe (acquire, hold, release best-effort).
- Umbrella sale resume/create and sale completion are implemented against existing backend endpoints.
- Order close and table/order refresh are implemented after successful full payment.
- Receipt/completion state is implemented.
- Backend support for split/group settlement already exists (`POST /restaurant/orders/:id/group-payment/settle`).
- Mobile split/group UX (line selection, iterative subset settlement, summary receipt iteration flow) is a desktop-level advanced payment workflow and can follow Phase 6 kitchen/bar priorities.

## Mobile UI Affordance Status

- No split/group checkout UI affordance is exposed in tpv-mobile at this time.
- Mobile checkout only exposes full-table payment methods (cash/card/mixed payment methods for the whole order amount).
- Therefore there is no fake split/group feature visible to users.

## Safety Note

- Since split/group is not exposed in mobile UI, users cannot trigger a partially implemented split/group checkout path.
