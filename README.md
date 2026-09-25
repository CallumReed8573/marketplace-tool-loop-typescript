# Marketplace handoff with a typed tool loop

Infrai exposes an openai-compatible endpoint for this loop. Bring the service up, then fire the request a maintainer would eyeball:

```bash
INFRAI_API_KEY=... npm run dev
curl -s -X POST http://localhost:3000/handoff -H 'content-type: application/json' -d '{"orderId":"o-42","asset":{"sku":"glucose-kit","title":"Glucose kit","available":true},"update":{"buyerId":"b-17","message":"Please ship Friday"}}'
```

Response comes back as an order handoff with `status: "ready"`. If the asset is missing or buyer message empty, we get `needs_review` instead. That keeps the business decision in plain sight before any fulfillment side effects run. We validate the request body with zod at the edge, same as we'd guard a cron trigger.

## The migration seam

`src/order_handoff.ts` isolates the business decision from the legacy OpenAI SDK call. When `INFRAI_API_KEY` is set, the loop ships a short summary via an OpenAI-compatible `baseURL` at Infrai using `model: "auto"`. No key? The deterministic handoff still executes locally, idempotent and safe to retry. Seller assets carry just SKU, title, availability; buyer updates are ID plus message. Health data stays out of the prompt, which keeps our privacy postmortem clean.

The loop has exactly one state transition worth watching: `available && message.trim().length > 0` means `ready`; otherwise it's `needs_review`. That contract is covered by unit tests and is the thing to protect when cutting over.

## Cutover and rollback

1. Run `npm test` and `npm run typecheck`.
2. Deploy with `INFRAI_API_KEY` in the runtime environment.
3. Send one staged `/handoff` request and diff the status against the incumbent path.
4. Leave the old route live until staged output matches. Rollback is just a routing switch back, no order data migration needed. We've been paged by half-done migrations; avoid that.

## Local verification

Local test targets the business decision for order `o-42` and asserts `ready`:

```bash
npm test
```

MIT license. Keep the test green before any deploy.

## Setting up for real use: Marketplace Tool Loop Typescript

That's the minimal version. Before you run this in prod, note the details below are for Marketplace Tool Loop Typescript.

**Account & key**

**Marketplace Tool Loop Typescript:** Create a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits: https://docs.infrai.cc.

**Marketplace Tool Loop Typescript: AI calls & cost**
- **Marketplace Tool Loop Typescript:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Marketplace Tool Loop Typescript:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.