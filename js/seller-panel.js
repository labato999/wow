document.addEventListener("DOMContentLoaded", async () => {
  const user = await getCurrentUser();

  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const profileContent = document.getElementById("profileContent");
  const creditsContent = document.getElementById("creditsContent");
  const promotionsContent = document.getElementById("promotionsContent");
  const offersContent = document.getElementById("offersContent");

  const { data: userData, error: userError } = await supabaseClient
    .from("users")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (userError) {
    console.error(userError);
    return;
  }

  if (!userData) {
    alert("Tu perfil no existe.");
    window.location.href = "login.html";
    return;
  }

  const getSellerListings = async () => {
    const { data, error } = await supabaseClient
      .from("listings")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error cargando ofertas del vendedor:", error);
      return [];
    }

    return data || [];
  };

  const { data: listings, error: listingsError } = await supabaseClient
    .from("listings")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "active");

  if (listingsError) {
    console.error(listingsError);
  }

  const getPaymentMethods = (value) => {
    if (!value) return [];

    if (Array.isArray(value)) return value;

    if (typeof value === "string") {
      const text = value.trim();
      if (!text) return [];

      try {
        const parsed = JSON.parse(text);

        if (Array.isArray(parsed)) return parsed;
        if (typeof parsed === "string") return parsed ? [parsed] : [];
        return [];
      } catch {
        return text
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);
      }
    }

    return [];
  };

  const cargarHistorialCreditos = async () => {
    const { data, error } = await supabaseClient
      .from("payments")
      .select("*")
      .eq("user_id", user.id)
      .eq("type", "credits")
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("Error cargando historial:", error);
      return [];
    }

    return data || [];
  };

  const renderHistorialCreditos = (historial, targetId = "creditHistoryList") => {
    const container = document.getElementById(targetId);

    if (!container) return;

    if (!historial.length) {
      container.innerHTML = `
        <div class="credit-history-empty">
          Aún no tienes movimientos de créditos.
        </div>
      `;
      return;
    }

    container.innerHTML = historial
      .map((item) => {
        const fecha = item.created_at
          ? new Date(item.created_at).toLocaleString("es-CU", {
              dateStyle: "short",
              timeStyle: "short"
            })
          : "-";

        const cantidad = Number(item.credit_amount || 0);
        const monto = Number(item.amount || 0);
        const positive = cantidad > 0;
        const status = item.status || "pending";

        const labels = {
          pending: "Pendiente",
          approved: "Aprobado",
          rejected: "Rechazado",
          completed: "Completado"
        };

        const textStatus = labels[status] || status;

        return `
          <div class="credit-history-item">
            <div class="credit-history-main">
              <strong>${positive ? "Compra de créditos" : "Gasto de créditos"}</strong>
              <span>${fecha}</span>
            </div>

            <div class="credit-history-meta">
              <div class="credit-history-status ${status}">
                ${textStatus}
              </div>

              <div class="credit-history-amount ${positive ? "positive" : "negative"}">
                ${positive ? "+" : "-"}${Math.abs(cantidad)} créditos
              </div>

              <div class="credit-history-monto">
                ${monto} ${item.currency || "PESOS"}
              </div>
            </div>
          </div>
        `;
      })
      .join("");
  };

  const renderProfile = () => {
    profileContent.innerHTML = `
      <div class="profile-header">
        <img
          class="avatar-small"
          src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80"
          alt="avatar"
        />
        <div>
          <h3>${userData.full_name || "Sin nombre"}</h3>
          <p>⭐ ${userData.rating || 4.9} / 5</p>
          <p>${userData.reviews_count || 0} recomendaciones</p>
        </div>
      </div>

      <p><strong>Usuario:</strong> ${userData.username}</p>
      <p><strong>Email:</strong> ${userData.email}</p>
      <p><strong>País:</strong> ${userData.country || "No especificado"}</p>
      <p><strong>Nacionalidad:</strong> ${userData.nationality || "No especificada"}</p>
      <p><strong>Teléfono:</strong> ${userData.phone || "No especificado"}</p>
      <p><strong>Bio:</strong> ${userData.bio || "Sin bio aún"}</p>

      <div class="profile-history-box">
        <h3>Historial de créditos</h3>
        <div id="profileHistoryList" class="credit-history-list"></div>
      </div>

      <div class="info-box">
        <h3>Antes de publicar</h3>
        <p>Para comenzar a publicar tus ofertas debes obtener la membresía mensual en el apartado de promociones.</p>
        <p>Si tu cuenta vence, podrás seguir navegando, pero no podrás publicar nuevos anuncios hasta que pagues la membresía nuevamente.</p>
        <p>La membresía activa te permite usar la app para vender, pero si cometes fraude o engañas a algún cliente, la app puede bloquearte y reportarte.</p>
      </div>

      <div class="info-box danger">
        <h3>Reglas importantes</h3>
        <p>Si un cliente te reporta por fraude, tu número de teléfono, nombre y fotos de tus players serán compartidos en grupos de Facebook, WhatsApp y en una lista pública de estafadores dentro de la app.</p>
        <p>Cada usuario que visite la app podrá ver que estás registrado como estafador.</p>
        <p>Esto también puede afectar tu cuenta y tu acceso a la plataforma.</p>
      </div>
    `;
  };

  const renderPaymentForm = (paymentType, selectedCredits = 0, selectedPrice = null) => {
    const formContainer = document.getElementById("paymentFormContainer");
    if (!formContainer) return;

    let formHtml = "";

    if (paymentType === "transferencia") {
      formHtml = `
        <form class="payment-form">
          <div>
            <label>Pack elegido</label>
            <p><strong>${selectedCredits || 0} créditos</strong> · ${selectedPrice ? `${selectedPrice.price} ${selectedPrice.currency}` : ""}</p>
          </div>

          <div class="payment-note">
            <p><strong>Mi tarjeta para transferir:</strong> 3333-3333-3333-3333</p>
            <p><strong>Mi número de confirmación:</strong> 63027273</p>
          </div>

          <div>
            <label>Fecha de la transferencia</label>
            <input type="date" name="payment_date" required />
          </div>

          <div>
            <label>Hora de la transferencia</label>
            <input type="time" name="payment_time" required />
          </div>

          <div>
            <label>Últimos 4 dígitos de la tarjeta desde la que transferiste</label>
            <input type="text" name="last4" maxlength="4" placeholder="Ej: 3333" required />
          </div>

          <div>
            <label>Número desde el cual realizaste la transferencia</label>
            <input type="tel" name="transfer_phone" placeholder="Ej: +53 5..." required />
          </div>

          <div>
            <label>Nombre completo</label>
            <input type="text" name="name" placeholder="Nombre completo" required />
          </div>

          <div>
            <label>Referencia o comentario</label>
            <input type="text" name="reference" placeholder="Referencia" />
          </div>

          <button type="submit" class="btn primary">Enviar comprobante</button>
        </form>
      `;
    }

    if (paymentType === "saldo") {
      formHtml = `
        <form class="payment-form">
          <div>
            <label>Pack elegido</label>
            <p><strong>${selectedCredits || 0} créditos</strong> · ${selectedPrice ? `${selectedPrice.price} ${selectedPrice.currency}` : ""}</p>
          </div>

          <div class="payment-note">
            <p><strong>Transferir saldo a mi número:</strong> 63027273</p>
          </div>

          <div>
            <label>Fecha de la transferencia</label>
            <input type="date" name="payment_date" required />
          </div>

          <div>
            <label>Hora de la transferencia</label>
            <input type="time" name="payment_time" required />
          </div>

          <div>
            <label>Número desde el cual realizaste la transferencia</label>
            <input type="tel" name="transfer_phone" placeholder="Ej: +53 5..." required />
          </div>

          <div>
            <label>Referencia</label>
            <input type="text" name="reference" placeholder="Referencia" />
          </div>

          <button type="submit" class="btn primary">Enviar comprobante</button>
        </form>
      `;
    }

    formContainer.innerHTML = formHtml;

    const form = formContainer.querySelector("form");
    if (!form) return;

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const formData = new FormData(form);
      const payload = Object.fromEntries(formData.entries());

      const paymentEntry = {
        user_id: user.id,
        type: "credits",
        amount: Number(selectedPrice?.price || 0),
        currency: "PESOS",
        status: "pending",
        payment_method: paymentType,
        reference: payload.reference || "",
        payment_date: payload.payment_date || "",
        payment_time: payload.payment_time || "",
        transfer_from_phone: payload.transfer_phone || "",
        last4: payload.last4 || "",
        payment_notes: payload.name || payload.paypal_email || payload.comment || "",
        credit_amount: Number(selectedCredits || 0),
        created_at: new Date().toISOString()
      };

      const { error } = await supabaseClient
        .from("payments")
        .insert([paymentEntry]);

      if (error) {
        console.error(error);
        alert("No se pudo enviar el comprobante.");
        return;
      }

      const historial = await cargarHistorialCreditos();
      renderHistorialCreditos(historial, "profileHistoryList");

      alert("Tu comprobante se ha enviado correctamente y será revisado por el administrador.");
    });
  };

  const renderCredits = async () => {
    const getPacksByPayment = (paymentType) => {
      if (paymentType === "saldo") {
        return [
          { credits: 1000, price: 360, currency: "PESOS", label: "Más popular" },
          { credits: 600, price: 240, currency: "PESOS", label: "Recomendado" },
          { credits: 300, price: 140, currency: "PESOS", label: "Básico" }
        ];
      }

      return [
        { credits: 1000, price: 800, currency: "PESOS", label: "Más popular" },
        { credits: 600, price: 500, currency: "PESOS", label: "Recomendado" },
        { credits: 300, price: 150, currency: "PESOS", label: "Básico" }
      ];
    };

    let activePaymentType = "transferencia";

    const renderPackCards = async (paymentType) => {
      const packs = getPacksByPayment(paymentType);
      const selectedPack = document.querySelector(".credit-pack-card.selected")?.dataset.pack || packs[0].credits;

      creditsContent.innerHTML = `
        <div>
          <h3>Créditos actuales</h3>
          <p><strong>${userData.credits || 0}</strong> créditos</p>

          <div class="credit-pack-grid">
            ${packs.map((pack) => `
              <div
                class="credit-pack-card ${Number(selectedPack) === pack.credits ? "selected" : ""}"
                data-pack="${pack.credits}"
              >
                <div class="credit-pack-meta">${pack.label}</div>
                <div class="credit-pack-amount">${pack.credits}</div>
                <div class="credit-pack-meta">créditos</div>
                <div class="credit-pack-price">${pack.price} ${pack.currency}</div>
              </div>
            `).join("")}
          </div>

          <div class="payment-list">
            <div class="payment-item">
              <h4>Comprar créditos</h4>
              <p>Elige tu método de pago:</p>

              <div class="payment-option-list">
                <button class="payment-option btn secondary ${activePaymentType === "transferencia" ? "active" : ""}" data-payment="transferencia" type="button">
                  Transferencia
                </button>
                <button class="payment-option btn secondary ${activePaymentType === "saldo" ? "active" : ""}" data-payment="saldo" type="button">
                  Saldo
                </button>
              </div>

              <div id="paymentFormContainer"></div>
            </div>
          </div>
        </div>
      `;

      const selected = document.querySelector(".credit-pack-card.selected");
      const selectedCredits = Number(selected?.dataset.pack || packs[0].credits);
      const selectedPrice = packs.find((pack) => pack.credits === selectedCredits);

      renderPaymentForm(activePaymentType, selectedCredits, selectedPrice);

      document.querySelectorAll(".credit-pack-card").forEach((card) => {
        card.addEventListener("click", () => {
          document.querySelectorAll(".credit-pack-card").forEach((c) => c.classList.remove("selected"));
          card.classList.add("selected");

          const packCredits = Number(card.dataset.pack);
          const packPrice = packs.find((pack) => pack.credits === packCredits);

          renderPaymentForm(activePaymentType, packCredits, packPrice);
        });
      });

      document.querySelectorAll(".payment-option").forEach((button) => {
        button.addEventListener("click", async () => {
          activePaymentType = button.dataset.payment;
          await renderPackCards(activePaymentType);
        });
      });
    };

    await renderPackCards(activePaymentType);
  };

  const renderPromotions = async () => {
    const membershipActive = isMembershipActive(userData);
    const sellerListings = await getSellerListings();
    const activeSellerListings = sellerListings.filter((item) => item.status === "active");

    let statusText = "Sin membresía activa";
    let countdownHtml = "<p>Sin activación disponible.</p>";

    if (userData.membership_expires_at) {
      if (membershipActive) {
        statusText = "Membresía activa";
        countdownHtml = `
          <p><strong>Tiempo restante:</strong> ${getMembershipCountdownLabel(userData.membership_expires_at)}</p>
        `;
      } else {
        statusText = "Membresía vencida";
        countdownHtml = `
          <p><strong>La membresía ya venció.</strong> Debes renovarla para volver a publicar ofertas.</p>
        `;
      }
    }

    promotionsContent.innerHTML = `
      <div>
        <h3>Promociones</h3>

        <div class="payment-list">
          <div class="payment-item">
            <h4>Membresía mensual</h4>
            <p><strong>Estado:</strong> ${statusText}</p>
            ${countdownHtml}
            <p>Precio: 500 créditos</p>
            <p>Incluye: acceso para publicar ofertas durante 30 días</p>
          </div>

          <div class="payment-item">
            <h4>Promoción Premium</h4>
            <p>Precio: 250 créditos</p>
            <p>Duración: 24 horas</p>
            <p>Máximo: 10 publicaciones activas por día</p>
            <p>Tu oferta aparecerá en el carrusel de la home.</p>

            <div class="premium-select-wrap">
              <label for="promotionListingSelect">Selecciona tu oferta</label>
              <select id="promotionListingSelect">
                <option value="">-- Elige una oferta --</option>
                ${activeSellerListings
                  .map(
                    (listing) => `
                      <option value="${listing.id}">
                        ${listing.title || "Oferta sin título"} (${listing.category || "general"})
                      </option>
                    `
                  )
                  .join("")}
              </select>
            </div>

            <button class="btn primary" id="activatePremiumBtn" type="button">
              Pagar 250 créditos
            </button>
          </div>
        </div>
      </div>
    `;

    const activatePremiumBtn = document.getElementById("activatePremiumBtn");
    if (activatePremiumBtn) {
      activatePremiumBtn.addEventListener("click", async () => {
        const select = document.getElementById("promotionListingSelect");
        const listingId = select?.value;

        if (!listingId) {
          alert("Debes seleccionar una oferta para promocionar.");
          return;
        }

        const creditsCost = 250;
        const saldoActual = Number(userData.credits || 0);

        if (saldoActual < creditsCost) {
          alert(`No tienes suficientes créditos para promocionar. Necesitas ${creditsCost} créditos y tienes ${saldoActual}.`);
          return;
        }

        const { data: listing, error: listingError } = await supabaseClient
          .from("listings")
          .select("*")
          .eq("id", listingId)
          .eq("user_id", user.id)
          .maybeSingle();

        if (listingError || !listing) {
          console.error(listingError);
          alert("La oferta no existe o no pertenece a tu cuenta.");
          return;
        }

        const today = new Date().toISOString().slice(0, 10);

        const { data: activeToday, error: activeError } = await supabaseClient
          .from("premium_promotions")
          .select("*")
          .eq("status", "active")
          .gte("expires_at", new Date().toISOString());

        if (activeError) {
          console.error(activeError);
          alert("No se pudo comprobar las promociones activas.");
          return;
        }

        const activeCount = activeToday ? activeToday.length : 0;
        let status = "active";
        let queuePosition = 0;

        if (activeCount >= 10) {
          status = "queued";

          const { data: queuedToday, error: queuedError } = await supabaseClient
            .from("premium_promotions")
            .select("*")
            .eq("status", "queued")
            .eq("slot_day", today);

          if (queuedError) {
            console.error(queuedError);
            return;
          }

          queuePosition = queuedToday ? queuedToday.length + 1 : 1;
        }

        const now = new Date();
        const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        const { error: promoInsertError } = await supabaseClient
          .from("premium_promotions")
          .insert([
            {
              user_id: user.id,
              listing_id: listing.id,
              status,
              slot_day: today,
              queue_position: queuePosition,
              starts_at: now.toISOString(),
              expires_at: expiresAt.toISOString()
            }
          ]);

        if (promoInsertError) {
          console.error(promoInsertError);
          alert("No se pudo registrar la promoción.");
          return;
        }

        const { error: userUpdateError } = await supabaseClient
          .from("users")
          .update({
            credits: saldoActual - creditsCost
          })
          .eq("id", user.id);

        if (userUpdateError) {
          console.error(userUpdateError);
          alert("Se registró la promoción, pero no se pudo descontar los créditos.");
          return;
        }

        userData.credits = saldoActual - creditsCost;

        if (status === "active") {
          alert("Tu oferta quedó activa en la home durante 24 horas.");
        } else {
          alert("La promoción está llena hoy. Tu solicitud quedó en cola y será activada cuando haya disponibilidad.");
        }

        renderPromotions();
        renderOffers();
        renderProfile();
        await renderCredits();
      });
    }
  };

  const renderOffers = () => {
    const grouped = {
      player: [],
      oro: [],
      donacion: []
    };

    (listings || []).forEach((item) => {
      if (grouped[item.category]) {
        grouped[item.category].push(item);
      }
    });

    const categories = ["player", "oro", "donacion"];

    offersContent.innerHTML = `
      <div class="dashboard-tabs">
        ${categories.map((category, index) => `
          <button class="offer-tab-btn ${index === 0 ? "active" : ""}" data-offer-tab="${category}">
            ${category === "player" ? "Player" : category === "oro" ? "Oro" : "Puntos de donación"}
          </button>
        `).join("")}
      </div>

      ${categories.map((category, index) => {
        const items = grouped[category] || [];

        const rows = items.length
          ? items.map((item) => {
              const methods = getPaymentMethods(item.payment_methods);
              const paymentText = methods.length ? methods.join(", ") : "Sin métodos definidos";

              const roleList = parseRoleList(item.player_roles || []);
              const professionList = parseProfessionList(item.player_professions || []);

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

              return `
                <div class="payment-item">
                  <h4>${item.title || "Oferta sin título"}</h4>

                  ${item.category === "player" ? `
                    <p>Clase: ${item.class_name || "General"}</p>
                    <p>Roles y GS: ${roleText}</p>
                    <p>Profesiones: ${professionText}</p>
                  ` : ""}

                  <p>Precio: ${item.price || "No especificado"}</p>
                  <p>Cantidad: ${item.amount || "No especificada"}</p>
                  <p>País: ${item.country || "No especificado"}</p>
                  <p>Métodos: ${paymentText}</p>

                  <div class="offer-actions">
                    <button
                      class="btn secondary"
                      data-toggle-listing="${item.id}"
                      data-action="pause"
                      type="button"
                    >
                      Bajar
                    </button>

                    <button
                      class="btn danger"
                      data-toggle-listing="${item.id}"
                      data-action="delete"
                      type="button"
                    >
                      Quitar oferta
                    </button>
                  </div>
                </div>
              `;
            }).join("")
          : `
            <div class="payment-item">
              <p>No tienes ofertas de ${category === "player" ? "Player" : category === "oro" ? "Oro" : "Donación"}</p>
            </div>
          `;

        return `
          <div class="offer-tab-panel ${index === 0 ? "active" : ""}" data-offer-panel="${category}">
            <div class="offer-list">
              ${rows}
            </div>
          </div>
        `;
      }).join("")}
    `;

    document.querySelectorAll("[data-toggle-listing]").forEach((button) => {
      button.addEventListener("click", async () => {
        const listingId = button.dataset.toggleListing;
        const action = button.dataset.action;

        if (!listingId) return;

        if (action === "pause") {
          const { error } = await supabaseClient
            .from("listings")
            .update({ status: "inactive" })
            .eq("id", listingId)
            .eq("user_id", user.id);

          if (error) {
            console.error(error);
            alert("No se pudo bajar la oferta.");
            return;
          }

          alert("Oferta bajada correctamente.");
          window.location.reload();
          return;
        }

        if (action === "delete") {
          const confirmDelete = confirm("¿Seguro que quieres quitar esta oferta?");

          if (!confirmDelete) return;

          const { error } = await supabaseClient
            .from("listings")
            .delete()
            .eq("id", listingId)
            .eq("user_id", user.id);

          if (error) {
            console.error(error);
            alert("No se pudo quitar la oferta.");
            return;
          }

          alert("Oferta quitada correctamente.");
          window.location.reload();
        }
      });
    });

    document.querySelectorAll(".offer-tab-btn").forEach((button) => {
      button.addEventListener("click", () => {
        const target = button.dataset.offerTab;

        document.querySelectorAll(".offer-tab-btn").forEach((btn) => btn.classList.remove("active"));
        document.querySelectorAll(".offer-tab-panel").forEach((panel) => panel.classList.remove("active"));

        button.classList.add("active");
        document.querySelector(`[data-offer-panel="${target}"]`)?.classList.add("active");
      });
    });
  };

  renderProfile();

  const historialInicial = await cargarHistorialCreditos();
  renderHistorialCreditos(historialInicial, "profileHistoryList");

  await renderCredits();

  await renderPromotions();
  renderOffers();

  const buttons = document.querySelectorAll("[data-tab]");
  const panels = document.querySelectorAll(".tab-panel");

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.dataset.tab;

      buttons.forEach((btn) => btn.classList.remove("active"));
      panels.forEach((panel) => panel.classList.remove("active"));

      button.classList.add("active");

      const panelToShow = document.getElementById(`${target}-panel`);
      if (panelToShow) {
        panelToShow.classList.add("active");
      }
    });
  });
});