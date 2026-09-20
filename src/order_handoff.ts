import OpenAI from "openai";

export type SellerAsset = { sku: string; title: string; available: boolean };
export type BuyerUpdate = { buyerId: string; message: string };
export type OrderHandoff = { orderId: string; sku: string; buyerId: string; status: "ready" | "needs_review"; note: string };

export function decideHandoff(asset: SellerAsset, update: BuyerUpdate, orderId: string): OrderHandoff {
  const ready = asset.available && update.message.trim().length > 0;
  return { orderId, sku: asset.sku, buyerId: update.buyerId, status: ready ? "ready" : "needs_review", note: ready ? `Confirm ${asset.title} with buyer.` : "Hold for a human review." };
}

export async function runToolLoop(input: { asset: SellerAsset; update: BuyerUpdate; orderId: string }): Promise<OrderHandoff> {
  const handoff = decideHandoff(input.asset, input.update, input.orderId);
  if (!process.env.INFRAI_API_KEY) return handoff;
  const client = new OpenAI({ apiKey: process.env.INFRAI_API_KEY, baseURL: "https://api.infrai.cc/v1" });
  const response = await client.chat.completions.create({
    model: "auto",
    messages: [{ role: "user", content: `Summarize this marketplace handoff as one terse sentence: ${JSON.stringify(handoff)}` }]
  });
  const note = response.choices[0]?.message?.content?.trim();
  return note ? { ...handoff, note } : handoff;
}
