async function expirePremiumPromotions() {
  const nowIso = new Date().toISOString();

  const { data, error } = await supabaseClient
    .from("premium_promotions")
    .select("*")
    .eq("status", "active")
    .lt("expires_at", nowIso);

  if (error) {
    console.error("Error expirando promociones:", error);
    return;
  }

  if (!data || data.length === 0) return;

  for (const promo of data) {
    const { error: updateError } = await supabaseClient
      .from("premium_promotions")
      .update({
        status: "expired",
        updated_at: new Date().toISOString()
      })
      .eq("id", promo.id);

    if (updateError) {
      console.error("No se pudo expirar promoción:", updateError);
    }
  }
}

async function promoteQueuedItems() {
  const today = new Date().toISOString().slice(0, 10);
  const nowIso = new Date().toISOString();

  const { data: activePromos, error: activeError } = await supabaseClient
    .from("premium_promotions")
    .select("*")
    .eq("status", "active")
    .gte("expires_at", nowIso);

  if (activeError) {
    console.error("Error buscando activas:", activeError);
    return;
  }

  const activeCount = activePromos ? activePromos.length : 0;
  const freeSlots = 10 - activeCount;

  if (freeSlots <= 0) return;

  const { data: queuedPromos, error: queuedError } = await supabaseClient
    .from("premium_promotions")
    .select("*")
    .eq("status", "queued")
    .eq("slot_day", today)
    .order("queue_position", { ascending: true })
    .limit(freeSlots);

  if (queuedError) {
    console.error("Error buscando cola:", queuedError);
    return;
  }

  if (!queuedPromos || queuedPromos.length === 0) return;

  for (const promo of queuedPromos) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const { error: updateError } = await supabaseClient
      .from("premium_promotions")
      .update({
        status: "active",
        starts_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        updated_at: now.toISOString()
      })
      .eq("id", promo.id);

    if (updateError) {
      console.error("Error activando promoción desde cola:", updateError);
    }
  }
}

async function syncPremiumPromotions() {
  await expirePremiumPromotions();
  await promoteQueuedItems();
}

window.syncPremiumPromotions = syncPremiumPromotions;

if (typeof window !== "undefined") {
  syncPremiumPromotions();
  setInterval(() => {
    syncPremiumPromotions();
  }, 60000);
}