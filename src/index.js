// 起名服务：POST /v1/name 受 x402 保护，每次调用收取固定费用。
// 部署到 Vercel 时，默认导出的 Hono app 会被自动识别为服务入口。

import { Hono } from "hono";
import { paymentMiddleware, x402ResourceServer } from "@x402/hono";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { generateName, InputError } from "./naming.js";

const config = {
  payTo: process.env.PAY_TO || "0xF36DFB8B4c2080696e30e72F1b0E644115c8da1B",
  network: process.env.NETWORK || "eip155:84532",
  price: process.env.PRICE || "$0.01",
  facilitatorUrl: process.env.FACILITATOR_URL || "https://x402.org/facilitator",
};

const resourceServer = new x402ResourceServer(
  new HTTPFacilitatorClient({ url: config.facilitatorUrl }),
).register(config.network, new ExactEvmScheme());

const app = new Hono();

// 免费的服务说明，方便人和 Agent 了解接口
app.get("/", (c) =>
  c.json({
    service: "x402 起名 demo",
    description: "根据出生日期和性别生成一个中文名字。按次付费，通过 x402 协议付款。",
    endpoint: { method: "POST", path: "/v1/name", content_type: "application/json" },
    price: config.price,
    network: config.network,
    input: {
      birth_date: "必填，YYYY-MM-DD，1900 至 2100 年，可以是未来日期",
      gender: "必填，male 或 female",
      surname: "选填，1 到 2 个汉字",
    },
    source: "https://github.com/shaojunda/x402-naming-demo",
  }),
);

app.get("/health", (c) => c.json({ ok: true }));

// 注意顺序：中间件只对在它之后注册的路由生效。收费路由必须写在这之后，
// 否则会被免费访问且不会报错（test/payment.test.js 会检查这一点）。
app.use(
  paymentMiddleware(
    {
      "POST /v1/name": {
        accepts: {
          scheme: "exact",
          price: config.price,
          network: config.network,
          payTo: config.payTo,
        },
        description: "根据出生日期和性别生成一个中文名字",
        mimeType: "application/json",
      },
    },
    resourceServer,
  ),
);

// 返回 4xx 时中间件不会结算，所以输入错误不会扣费
app.post("/v1/name", async (c) => {
  let body;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "请求体必须是合法的 JSON" }, 400);
  }
  try {
    return c.json(generateName(body));
  } catch (err) {
    if (err instanceof InputError) return c.json({ error: err.message }, 400);
    throw err;
  }
});

export default app;
