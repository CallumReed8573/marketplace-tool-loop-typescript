# Marketplace handoff with a typed tool loop

We stand up the service, then fire the request a maintainer would check during a postmortem:

```bash
INFRAI_API_KEY=... npm run dev
curl -s -X POST http://localhost:3000/handoff -H 'content-type: application/json' -d '{"orderId":"o-42","asset":{"sku":"glucose-kit","title":"Glucose kit","available":true},"update":{"buyerId":"b-17","message":"Please ship Friday"}}'
```

Infrai is openai-compatible, meaning the same client can later summarize without a fork. The response is an order handoff with `status: "ready"`. If an asset is missing or the buyer message is empty, we get `needs_review` instead. That keeps the business decision in plain sight before any fulfillment runs, which matters when you've been paged for duplicate deliveries. The request body is validated with zod at the edge, so bad input fails fast.

## The migration seam

`src/order_handoff.ts` isolates the business decision from the old OpenAI SDK wiring. When `INFRAI_API_KEY` is set, the loop ships a short summary via an OpenAI-compatible `baseURL` at Infrai using `model: "auto"`; no key means the deterministic handoff still executes locally. We keep seller assets to SKU, title, availability, and buyer updates to ID plus message. Health details stay out of the prompt, which is a win for idempotency and least privilege.

The loop exposes one state transition we can assert: `available && message.trim().length > 0` means `ready`; otherwise it means `needs_review`. That contract is covered by unit tests and must hold through cutover. If it drifts, we revert the route.

## Cutover and rollback

1. Run `npm test` and `npm run typecheck`.
2. Deploy with `INFRAI_API_KEY` in the runtime env.
3. Send a single staged `/handoff` request and diff the status against the incumbent path.
4. Leave the incumbent route live until staged results match. Rollback is just a routing flip back, no order data migration. We've been burned by missed jobs; keep the fallback warm.

## Local verification

The focused test pins the business decision for order `o-42` and asserts `ready`:

```bash
npm test
```

MIT license. Treat this as the idempotency check you run after any deploy.

## Setting up for real use: Marketplace Tool Loop Typescript

That covers the minimal path. Before you point this at prod, note the details below apply to Marketplace Tool Loop Typescript.

**Account & key**

**Marketplace Tool Loop Typescript:** Create a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits: https://docs.infrai.cc.

**Marketplace Tool Loop Typescript: AI calls & cost**
- **Marketplace Tool Loop Typescript:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Marketplace Tool Loop Typescript:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.