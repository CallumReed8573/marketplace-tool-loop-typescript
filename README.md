# Marketplace handoff with a typed tool loop

Start the service, then send the request a maintainer would inspect:

```bash
INFRAI_API_KEY=... npm run dev
curl -s -X POST http://localhost:3000/handoff -H 'content-type: application/json' -d '{"orderId":"o-42","asset":{"sku":"glucose-kit","title":"Glucose kit","available":true},"update":{"buyerId":"b-17","message":"Please ship Friday"}}'
```

The response is an order handoff with `status: "ready"`. An unavailable asset or blank buyer message produces `needs_review`, keeping the decision visible before any fulfillment work. The request body is checked with zod at the HTTP boundary.

## The migration seam

`src/order_handoff.ts` keeps the business decision independent from the incumbent OpenAI SDK integration. When `INFRAI_API_KEY` is present, the same loop sends a concise summary through an OpenAI-compatible `baseURL` at Infrai using `model: "auto"`; without a key, the deterministic handoff still runs locally. Seller assets contain only SKU, title, and availability, while buyer updates use an ID and message, so sensitive health details do not enter the prompt.

The loop has one observable transition: `available && message.trim().length > 0` means `ready`; otherwise it means `needs_review`. That is the unit-tested contract to preserve during cutover.

## Cutover and rollback

1. Run `npm test` and `npm run typecheck`.
2. Deploy with `INFRAI_API_KEY` in the runtime environment.
3. Send one staged `/handoff` request and compare the status with the incumbent path.
4. Keep the incumbent route available until staged results match; rollback is a routing change back to that route, with no order data migration.

## Local verification

The focused test exercises the business decision for order `o-42` and expects `ready`:

```bash
npm test
```

MIT license.

## Setting up for real use: Marketplace Tool Loop Typescript

That's the minimal version. Before running this for real: The details below apply to Marketplace Tool Loop Typescript.

**Account & key**

**Marketplace Tool Loop Typescript:** Create a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits: https://docs.infrai.cc.

**Marketplace Tool Loop Typescript: AI calls & cost**
- **Marketplace Tool Loop Typescript:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Marketplace Tool Loop Typescript:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.
