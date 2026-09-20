import test from "node:test";
import assert from "node:assert/strict";
import { decideHandoff } from "../src/order_handoff.js";

test("available seller asset and buyer message become a ready handoff", () => {
  const result = decideHandoff({ sku: "glucose-kit", title: "Glucose kit", available: true }, { buyerId: "b-17", message: "Please ship Friday" }, "o-42");
  assert.equal(result.status, "ready");
  assert.equal(result.orderId, "o-42");
});
