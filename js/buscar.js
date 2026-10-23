document.addEventListener("DOMContentLoaded", async () => {
  const categoryButtons = document.querySelectorAll(".option");
  const countryFilter = document.getElementById("countryFilter");
  const classFilter = document.getElementById("classFilter");
  const classFilterWrapper = document.getElementById("classFilterWrapper");
  const applyButton = document.getElementById("applyFilters");
  const listingGrid = document.getElementById("listingGrid");

  const syncCategoryUI = () => {
    const selectedCategory =
      document.querySelector(".option.active")?.dataset.category || "player";

    if (classFilterWrapper) {
      classFilterWrapper.style.display = selectedCategory === "player" ? "" : "none";
    }

    if (classFilter && selectedCategory !== "player") {
      classFilter.value = "";
    }
  };

  categoryButtons.forEach((button) => {
    button.addEventListener("click", () => {
      categoryButtons.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
      syncCategoryUI();
      loadListings();
    });
  });

  const loadListings = async () => {
    const selectedCategory =
      document.querySelector(".option.active")?.dataset.category || "player";

    let query = supabaseClient
      .from("listings")
      .select("*")
      .eq("status", "active");

    if (selectedCategory) {
      query = query.eq("category", selectedCategory);
    }

    if (selectedCategory === "player" && classFilter && classFilter.value) {
      query = query.eq("class_name", classFilter.value);
    }

    if (countryFilter && countryFilter.value) {
      query = query.eq("country", countryFilter.value);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    if (!listingGrid) return;

    if (!data || data.length === 0) {
      listingGrid.innerHTML = "<p>No hay ofertas disponibles.</p>";
      return;
    }

    listingGrid.innerHTML = data
      .map((item) => {
        const paymentMethods = getPaymentMethods(item.payment_methods);
        const paymentText = paymentMethods.length ? paymentMethods.join(", ") : "Sin métodos definidos";

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

        let extraInfo = `
          <p>Precio: ${item.price}</p>
          <p>Cantidad: ${item.amount || "No especificada"}</p>
          <p>Métodos: ${paymentText}</p>
        `;

        if (item.category === "player") {
          extraInfo = `
            <p>Clase: ${item.class_name || "General"}</p>
            <p>Roles: ${roleText}</p>
            <p>Profesiones: ${professionText}</p>
            <p>Precio: ${item.price}</p>
            <p>Cantidad: ${item.amount || "No especificada"}</p>
            <p>Métodos: ${paymentText}</p>
          `;
        }

        if (item.category === "oro") {
          extraInfo = `
            <p>Oro: ${item.amount || "No especificado"}</p>
            <p>Precio: ${item.price}</p>
            <p>Métodos: ${paymentText}</p>
          `;
        }

        if (item.category === "donacion") {
          extraInfo = `
            <p>Puntos: ${item.amount || "No especificado"}</p>
            <p>Precio: ${item.price}</p>
            <p>Métodos: ${paymentText}</p>
          `;
        }

        return `
          <article class="listing-card">
            <img src="${item.image_url || "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80"}" alt="${item.title}" />
            <div class="listing-body">
              <div class="badge-row">
                <span class="small-badge">${item.category}</span>
                ${item.category === "player" ? `<span class="small-badge">${item.class_name || "General"}</span>` : ""}
              </div>
              <h3>${item.title}</h3>
              ${extraInfo}
              <p>Nacionalidad: ${item.nationality || "No especificada"}</p>
              <a href="listing-detail.html?id=${item.id}" class="btn small primary">Ver detalles</a>
            </div>
          </article>
        `;
      })
      .join("");
  };

  applyButton?.addEventListener("click", loadListings);
  syncCategoryUI();
  loadListings();
});