document.addEventListener("DOMContentLoaded", async () => {
  const listingGrid = document.getElementById("listingGrid");

  async function loadPremiumHomeCarousel() {
    if (window.syncPremiumPromotions) {
      await window.syncPremiumPromotions();
    }

    const nowIso = new Date().toISOString();

    const { data: promos, error } = await supabaseClient
      .from("premium_promotions")
      .select("*, listings(*)")
      .eq("status", "active")
      .gte("expires_at", nowIso)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error(error);
      return;
    }

    if (!listingGrid) return;

    if (!promos || promos.length === 0) {
      listingGrid.innerHTML = "<p>No hay promociones activas por el momento.</p>";
      return;
    }

    const items = promos
      .map((promo) => promo.listings)
      .filter(Boolean);

    if (!items.length) {
      listingGrid.innerHTML = "<p>No hay promociones activas por el momento.</p>";
      return;
    }

    let index = 0;

    const renderSlide = () => {
      const item = items[index];
      if (!item) return;

      const sellerPhone = item.seller_phone || item.seller_whatsapp || "";
      const whatsappHref = sellerPhone
        ? `https://wa.me/${sellerPhone.replace(/\D/g, "")}?text=${encodeURIComponent("Hola, vi tu oferta promocionada en WoW Market. ¿Podemos hablar?")}`
        : "#";

      const methods = getPaymentMethods(item.payment_methods);
      const paymentText = methods.length ? methods.join(", ") : "Sin métodos definidos";

      const roleList = parseRoleList(item.player_roles || []);
      const professionList = parseProfessionList(item.player_professions || []);

      const roleText =
        roleList.length > 0
          ? roleList
              .map((r) => `${capitalizeRole(r.role)}${r.gs ? ` ${r.gs}` : ""}`)
              .join(" • ")
          : "Sin roles definidos";

      const professionText =
        professionList.length > 0
          ? professionList.join(", ")
          : "Sin profesiones";

      const card = `
        <article class="featured-card premium-card">
          <img
            src="${item.image_url || "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80"}"
            alt="${item.title}"
          />
          <div class="featured-body">
            <span class="premium-badge">Premium</span>
            <h3>${item.title}</h3>
            <p>${item.country || "País no especificado"}</p>
            <p>Clase: ${item.class_name || "General"}</p>
            <p>Roles: ${roleText}</p>
            <p>Profesiones: ${professionText}</p>
            <p>Precio: ${item.price}</p>
            <p>Métodos: ${paymentText}</p>

            <div class="premium-actions">
              <a href="listing-detail.html?id=${item.id}" class="btn small primary">
                Ver detalles
              </a>

              <a
                href="${whatsappHref}"
                target="_blank"
                rel="noopener noreferrer"
                class="btn small secondary"
              >
                WhatsApp
              </a>
            </div>
          </div>
        </article>
      `;

      listingGrid.innerHTML = card;
      index = (index + 1) % items.length;
    };

    renderSlide();
    setInterval(renderSlide, 5000);
  }

  await loadPremiumHomeCarousel();
});