import { client } from "@/src/lib/rpc"

console.log("client.api.billing.plans:", client.api.billing.plans.$url().toString())
console.log("client.billing.plans:", client.billing.plans.$url().toString())
