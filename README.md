# x402 起名 demo

一个按次付费的起名 API：输入出生日期和性别，返回一个中文名字。通过 [x402](https://www.x402.org/) 协议收费，每次 0.01 USDC（Base Sepolia 测试网），用来演示 [App Market for Agent](https://github.com/shaojunda/app-market-for-agent) 的完整流程：

```
Agent 在 App Market 搜到本服务 → 付费调用 → 得到名字
```

名字由规则生成：第一个字取自出生季节的意象，第二个字寄托品格祝愿，按输入确定性地从字库中选取。同样的输入永远得到同样的名字。仅供娱乐。

## 接口

### `GET /`

免费，返回服务说明。

### `POST /v1/name`

付费，0.01 USDC。

请求：

```json
{ "birth_date": "2024-03-15", "gender": "female", "surname": "张" }
```

| 字段 | 必填 | 说明 |
|---|---|---|
| `birth_date` | ✅ | 出生日期（可以是未来日期，如预产期），`YYYY-MM-DD`，范围 1900 至 2100 年 |
| `gender` | ✅ | `male` 或 `female` |
| `surname` | | 姓氏，1 到 2 个汉字 |

响应：

```json
{
  "name": "张芷安",
  "given_name": "芷安",
  "meaning": "生于春季。「芷」取白芷，香草，喻品行高洁；「安」寓意平安顺遂。",
  "characters": [
    { "char": "芷", "meaning": "白芷，香草，喻品行高洁", "source": "春季意象" },
    { "char": "安", "meaning": "平安顺遂", "source": "品格祝愿" }
  ],
  "season": "spring",
  "note": "基于出生季节和性别的规则生成，仅供娱乐参考。"
}
```

不带付款的请求会收到 `402 Payment Required`，支付要求在 `PAYMENT-REQUIRED` 响应头中。**输入错误返回 400，不会扣费**：只有接口成功返回时才会结算。

## 调用示例

使用 [x402-pay](https://github.com/shaojunda/x402-pay) Skill：

```bash
node pay.mjs pay --url <服务地址>/v1/name \
  --network eip155:84532 --max-amount 0.01 \
  --body '{"birth_date":"2024-03-15","gender":"female","surname":"张"}'
```

买方钱包需要有 Base Sepolia 测试网 USDC，可以从 [Circle 水龙头](https://faucet.circle.com/) 免费领取。

## 部署

部署在 Vercel 上，`src/index.js` 默认导出的 Hono app 会被自动识别为入口。

环境变量（都有默认值）：

| 变量 | 默认值 | 说明 |
|---|---|---|
| `PAY_TO` | 作者的测试地址 | 收款地址 |
| `NETWORK` | `eip155:84532` | 收款网络（Base Sepolia） |
| `PRICE` | `$0.01` | 单次价格 |
| `FACILITATOR_URL` | `https://x402.org/facilitator` | x402 官方测试 facilitator |

服务端不需要私钥：付款由 facilitator 验证并提交上链，gas 也由它支付。

## 本地开发

```bash
npm install
npm run dev      # http://localhost:3000
```
