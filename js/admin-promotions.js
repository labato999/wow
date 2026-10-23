document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("premiumPromotionsList");

  if (!container) return;

  const { data, error } = await supabaseClient
    .from("premium_promotions")
    .select("*, listings(title, user_id)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = "<p>No hay promociones registradas.</p>";
    return;
  }

  container.innerHTML = data
    .map((promo) => `
      <div class="payment-item">
        <p><strong>Estado:</strong> ${promo.status}</p>
        <p><strong>Oferta:</strong> ${promo.listings?.title || "Sin título"}</p>
        <p><strong>Usuario:</strong> ${promo.user_id}</p>
        <p><strong>Fecha:</strong> ${promo.slot_day}</p>
        <p><strong>Inicio:</strong> ${promo.starts_at || "-"}</p>
        <p><strong>Expira:</strong> ${promo.expires_at || "-"}</p>
        <p><strong>Cola:</strong> ${promo.queue_position || 0}</p>
      </div>
    `)
    .join("");
});