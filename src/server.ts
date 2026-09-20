import { createServer } from "node:http";
import { z } from "zod";
import { runToolLoop } from "./order_handoff.js";

const requestSchema = z.object({ orderId: z.string().min(1), asset: z.object({ sku: z.string().min(1), title: z.string().min(1), available: z.boolean() }), update: z.object({ buyerId: z.string().min(1), message: z.string() }) });

const server = createServer(async (req, res) => {
  if (req.method !== "POST" || req.url !== "/handoff") { res.writeHead(404).end(); return; }
  let body = "";
  req.on("data", chunk => { body += chunk; });
  req.on("end", async () => {
    try {
      const input = requestSchema.parse(JSON.parse(body));
      const result = await runToolLoop(input);
      res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(result));
    } catch (error) {
      const message = error instanceof z.ZodError ? "invalid request body" : "handoff failed";
      res.writeHead(error instanceof z.ZodError ? 400 : 500, { "content-type": "application/json" }).end(JSON.stringify({ error: message }));
    }
  });
});

server.listen(3000, () => console.log("POST http://localhost:3000/handoff"));
