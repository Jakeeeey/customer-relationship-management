import assert from "node:assert/strict";
import { test } from "node:test";
import {
    indexCustomerProductDiscounts,
    loadCustomerProductDiscounts,
    resolveCustomerProductDiscount
} from "./customerProductDiscount";
import { calculateChainNetPrice } from "../create-sales-order/utils/priceCalc";

const parentRule = { id: 963, product_id: 23073, discount_type: 49, unit_price: null };

test("Pieces and Box inherit L10 using their own selling prices", () => {
    const rules = indexCustomerProductDiscounts([parentRule]);
    const pieces = resolveCustomerProductDiscount(rules, 23073, null, 150.38);
    const box = resolveCustomerProductDiscount(rules, 23092, 23073, 3007.50);
    assert.equal(pieces.discountTypeId, 49);
    assert.equal(box.discountTypeId, 49);
    assert.equal(calculateChainNetPrice(pieces.price, [10]).toFixed(2), "135.34");
    assert.equal(calculateChainNetPrice(box.price, [10]).toFixed(2), "2706.75");
});

test("an exact-product percentage discount takes precedence over its parent's", () => {
    const rules = indexCustomerProductDiscounts([
        parentRule,
        { id: 964, product_id: 23092, discount_type: 50 }
    ]);
    assert.equal(resolveCustomerProductDiscount(rules, 23092, 23073, 3007.50).discountTypeId, 50);
});

test("parent fixed unit prices are not inherited", () => {
    const rules = indexCustomerProductDiscounts([{ ...parentRule, unit_price: "140.00" }]);
    assert.deepEqual(resolveCustomerProductDiscount(rules, 23092, 23073, 3007.50), {
        discountTypeId: 49, price: 3007.50
    });
    assert.equal(resolveCustomerProductDiscount(rules, 23073, null, 150.38).price, 140);
});

test("an exact fixed price is retained when the parent supplies the percentage discount", () => {
    const rules = indexCustomerProductDiscounts([
        parentRule,
        { id: 964, product_id: 23092, unit_price: "2800.00" }
    ]);
    assert.deepEqual(resolveCustomerProductDiscount(rules, 23092, 23073, 3007.50), {
        discountTypeId: 49, price: 2800
    });
});

test("a parent with only a fixed price leaves the discount available for existing fallback tiers", () => {
    const rules = indexCustomerProductDiscounts([{ ...parentRule, discount_type: null, unit_price: 140 }]);
    assert.deepEqual(resolveCustomerProductDiscount(rules, 23092, 23073, 3007.50), {
        discountTypeId: null, price: 3007.50
    });
});

test("numeric strings and expanded Directus relation IDs resolve the same parent rule", () => {
    const rules = indexCustomerProductDiscounts([
        { id: "963", product_id: { product_id: "23073" }, discount_type: { id: "49" } }
    ]);
    assert.equal(resolveCustomerProductDiscount(rules, "23092", { product_id: "23073" }, 3007.50).discountTypeId, 49);
});

test("the newest active rule wins regardless of response order", () => {
    const rules = indexCustomerProductDiscounts([
        { ...parentRule, id: "965", discount_type: "51" },
        { ...parentRule, id: 966, discount_type: 52, deleted_at: "2026-11-10T00:00:00" },
        parentRule
    ]);
    assert.equal(resolveCustomerProductDiscount(rules, 23073, null, 150.38).discountTypeId, 51);
});

test("unrelated products, deleted rules and missing parents do not receive the discount", () => {
    const rules = indexCustomerProductDiscounts([
        parentRule,
        { id: 964, product_id: 500, discount_type: 50, deleted_at: "2026-11-10T00:00:00" }
    ]);
    for (const parentId of [null, 0, "0", 999]) {
        assert.deepEqual(resolveCustomerProductDiscount(rules, 500, parentId, 100), {
            discountTypeId: null, price: 100
        });
    }
});

test("inherited discounts keep the existing sequential chain calculation", () => {
    const rules = indexCustomerProductDiscounts([parentRule]);
    const box = resolveCustomerProductDiscount(rules, 23092, 23073, 100);
    assert.equal(box.discountTypeId, 49);
    assert.equal(calculateChainNetPrice(box.price, [7, 2]).toFixed(2), "91.14");
});

test("rule loading scopes every chunk to the selected customer and active products", async (context) => {
    const requests: URL[] = [];
    context.mock.method(globalThis, "fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = new URL(String(input));
        requests.push(url);
        assert.equal(url.searchParams.get("filter[customer_code][_eq]"), "CUST&A");
        assert.equal(url.searchParams.get("filter[deleted_at][_null]"), "true");
        assert.equal(url.searchParams.get("sort"), "-id");
        assert.equal(init?.cache, "no-store");
        return Response.json({ data: requests.length === 1 ? [parentRule] : [] });
    });
    const rules = await loadCustomerProductDiscounts("https://directus.test", {}, "CUST&A", Array.from({ length: 81 }, (_, i) => 23073 + i));
    assert.equal(requests.length, 2);
    assert.equal(requests[0].searchParams.get("filter[product_id][_in]")?.split(",").length, 80);
    assert.equal(requests[1].searchParams.get("filter[product_id][_in]"), "23153");
    assert.equal(rules.get(23073)?.discount_type, 49);
});

test("restricted deleted_at access uses FM's compatibility request", async (context) => {
    let requests = 0;
    context.mock.method(globalThis, "fetch", async (input: RequestInfo | URL) => {
        const url = new URL(String(input));
        requests++;
        if (requests === 1) return new Response("No permission for deleted_at", { status: 403 });
        assert.equal(url.searchParams.has("filter[deleted_at][_null]"), false);
        assert.equal(url.searchParams.get("fields")?.includes("deleted_at"), false);
        assert.equal(url.searchParams.get("filter[customer_code][_eq]"), "MAIN-31417");
        return Response.json({ data: [parentRule] });
    });
    const rules = await loadCustomerProductDiscounts("https://directus.test", {}, "MAIN-31417", [23073]);
    assert.equal(requests, 2);
    assert.equal(rules.get(23073)?.discount_type, 49);
});

test("unrelated upstream errors are not mistaken for an empty discount list", async (context) => {
    let requests = 0;
    context.mock.method(globalThis, "fetch", async () => {
        requests++;
        return new Response("No permission for product_per_customer", { status: 403 });
    });
    await assert.rejects(loadCustomerProductDiscounts("https://directus.test", {}, "MAIN-31417", [23073]), /Unable to load customer product discounts \(403\)/);
    assert.equal(requests, 1);
});
