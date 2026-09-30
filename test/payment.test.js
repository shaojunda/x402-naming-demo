// 收费边界测试：确认收费路由确实受 x402 保护，免费路由不受影响。
// 创建 402 响应时中间件会访问 facilitator，因此需要联网。

import { test } from "node:test";
import assert from "node:assert/strict";
import app from "../src/index.js";

const body = JSON.stringify({ birth_date: "2024-03-15", gender: "female" });

function decodePaymentRequired(res) {
  const header = res.headers.get("payment-required");
  assert.ok(header, "402 响应应包含 PAYMENT-REQUIRED 响应头");
  return JSON.parse(Buffer.from(header, "base64").toString("utf8"));
}

test("不带付款请求 POST /v1/name 返回 402，不返回名字", async () => {
  const res = await app.fetch(
    new Request("http://localhost/v1/name", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    }),
  );
  assert.equal(res.status, 402);
  const text = await res.text();
  assert.ok(!text.includes("given_name"), "未付款时不应返回起名结果");

  const { accepts } = decodePaymentRequired(res);
  const option = accepts.find((a) => a.scheme === "exact");
  assert.ok(option, "应提供 exact 付款方式");
  assert.equal(option.network, "eip155:84532");
  assert.equal(option.amount, "10000"); // 0.01 USDC
});

test("伪造的付款签名不会拿到名字", async () => {
  const res = await app.fetch(
    new Request("http://localhost/v1/name", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "payment-signature": Buffer.from('{"x402Version":2,"payload":{}}').toString("base64"),
      },
      body,
    }),
  );
  assert.notEqual(res.status, 200);
  assert.ok(!(await res.text()).includes("given_name"));
});

test("GET / 和 /health 免费访问", async () => {
  for (const path of ["/", "/health"]) {
    const res = await app.fetch(new Request(`http://localhost${path}`));
    assert.equal(res.status, 200, `${path} 应免费访问`);
  }
});
