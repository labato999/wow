document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  if (!id) return;

  const { data, error } = await supabaseClient
    .from("listings")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error(error);
    return;
  }

  const methods = getPaymentMethods(data.payment_methods);
  const paymentText = methods.length ? methods.join(", ") : "Sin métodos definidos";

  const roleList = parseRoleList(data.player_roles || []);
  const professionList = parseProfessionList(data.player_professions || []);

  const roleText =
    roleList.length > 0
      ? roleList
          .map((r) => `${capitalizeRole(r.role)}${r.gs ? `: ${r.gs}` : ""}`)
          .join(" • ")
      : "Sin roles definidos";

  const professionText =
    professionList.length > 0
      ? professionList.join(", ")
      : "Sin profesiones";

  const sellerPhone = data.seller_phone || data.seller_whatsapp || "";
  const whatsappHref = sellerPhone
    ? `https://wa.me/${sellerPhone.replace(/\D/g, "")}?text=${encodeURIComponent("Hola, vi tu oferta en WoW Market. ¿Podemos hablar?")}`
    : "#";

  const container = document.getElementById("listingDetail");
  if (!container) return;

  const isPlayer = data.category === "player";

  container.innerHTML = `
    <div class="detail-grid">
      <img src="${data.image_url || "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80"}" alt="${data.title}" />
      <div>
        <h2>${data.title}</h2>
        <p><strong>Categoría:</strong> ${data.category}</p>
        ${isPlayer ? `<p><strong>Clase:</strong> ${data.class_name || "General"}</p>` : ""}
        <p><strong>Precio:</strong> ${data.price}</p>
        <p><strong>Cantidad:</strong> ${data.amount || "No especificada"}</p>
        <p><strong>País:</strong> ${data.country || "No especificado"}</p>
        <p><strong>Nacionalidad:</strong> ${data.nationality || "No especificada"}</p>
        ${isPlayer ? `<p><strong>Roles y GS:</strong> ${roleText}</p>` : ""}
        ${isPlayer ? `<p><strong>Profesiones:</strong> ${professionText}</p>` : ""}
        <p><strong>Métodos de pago:</strong> ${paymentText}</p>
        <p><strong>Descripción:</strong> ${data.description || "Sin descripción"}</p>

        <div class="premium-actions">
          <button class="btn primary">Contactar vendedor</button>
          <a
            href="${whatsappHref}"
            target="_blank"
            rel="noopener noreferrer"
            class="btn secondary"
          >
            WhatsApp
          </a>
        </div>
      </div>
    </div>
  `;
});