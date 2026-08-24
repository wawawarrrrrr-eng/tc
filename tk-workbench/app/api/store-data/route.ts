import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;

function getClient() {
  const url = process.env.SUPABASE_URL?.trim();
  const secret = process.env.SUPABASE_SECRET_KEY?.trim();

  if (!url || !secret || secret.includes("Supabase")) {
    throw new Error("SUPABASE_NOT_CONFIGURED");
  }

  return createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function latestTimestamp(rows: Row[]) {
  const fields = ["source_updated_at", "captured_at", "updated_at", "last_detected_at", "metric_date"];
  const timestamps = rows.flatMap((row) => fields.map((field) => row[field])).filter((value): value is string => typeof value === "string");
  return timestamps.sort().at(-1) ?? null;
}

export async function GET(request: Request) {
  try {
    const supabase = getClient();
    const shopCode = new URL(request.url).searchParams.get("shop")?.trim() || "all";
    const { data: shops, error: shopsError } = await supabase
      .from("shops")
      .select("id, shop_code, shop_name, market, status, updated_at")
      .in("shop_code", ["TKZ-7", "TKZ-29"])
      .order("shop_code");

    if (shopsError) throw shopsError;
    const selectedShop = shopCode === "all" ? null : shops?.find((shop) => shop.shop_code === shopCode);
    if (shopCode !== "all" && !selectedShop) {
      return Response.json({ error: "SHOP_NOT_FOUND" }, { status: 404 });
    }
    const shopId = selectedShop?.id as string | undefined;

    const rows = async (table: string, orderBy?: string, limit = 20, ascending = false) => {
      let query = supabase.from(table).select("*");
      if (shopId) query = query.eq("shop_id", shopId);
      if (orderBy) query = query.order(orderBy, { ascending });
      const { data, error } = await query.limit(limit);
      if (error) throw error;
      return (data ?? []) as Row[];
    };

    const count = async (table: string) => {
      let query = supabase.from(table).select("*", { count: "exact", head: true });
      if (shopId) query = query.eq("shop_id", shopId) as typeof query;
      const { count: total, error } = await query;
      if (error) throw error;
      return total ?? 0;
    };

    const [dashboard, metrics, alerts, inventory, packages, refunds, products, orderCount, refundCount, packageCount, productCount, skuCount] = await Promise.all([
      rows("v_store_dashboard"),
      rows("shop_metrics_daily", "metric_date", 14),
      rows("v_open_alerts", "last_detected_at", 20),
      rows("skus", "available_stock", 30, true),
      rows("packages", "source_updated_at", 20),
      rows("returns_refunds", "source_updated_at", 20),
      rows("products", "source_updated_at", 20),
      count("orders"),
      count("returns_refunds"),
      count("packages"),
      count("products"),
      count("skus"),
    ]);

    const allRows = [...dashboard, ...metrics, ...alerts, ...inventory, ...packages, ...refunds, ...products, ...(shops ?? []) as Row[]];
    return Response.json({
      connected: true,
      source: "Supabase · 紫鸟 CLI / TikTok Seller Center 报表",
      realtime: false,
      selectedShop: shopCode,
      shops: shops ?? [],
      dashboard,
      metrics,
      alerts,
      inventory,
      packages,
      refunds,
      products,
      counts: { orders: orderCount, refunds: refundCount, packages: packageCount, products: productCount, skus: skuCount },
      updatedAt: latestTimestamp(allRows),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    const missing = message === "SUPABASE_NOT_CONFIGURED";
    return Response.json({
      connected: false,
      error: missing ? "尚未配置 Supabase Secret Key" : "Supabase 数据读取失败",
      detail: missing ? "请把 default Secret Key 写入服务端 SUPABASE_SECRET_KEY。" : message,
    }, { status: missing ? 503 : 502, headers: { "Cache-Control": "no-store" } });
  }
}
