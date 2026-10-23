document.addEventListener("DOMContentLoaded", async () => {
  const client = window.supabaseClient || supabaseClient;

  if (!client) {
    console.error("Supabase client no está inicializado");
    alert("Hay un error de configuración de Supabase");
    return;
  }

  const user = await getCurrentUser();
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const { data: userData, error: userDataError } = await client
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (userDataError) {
    console.error(userDataError);
    alert("No se pudo cargar tu perfil.");
    return;
  }

  if (!isMembershipActive(userData)) {
    alert("Tu membresía ha vencido. Debes activarla desde Promociones para poder publicar.");
    window.location.href = "seller-panel.html";
    return;
  }

  const form = document.getElementById("publishForm");
  if (!form) {
    console.error("No se encontró publishForm");
    return;
  }

  const tabs = document.querySelectorAll(".publish-tab");
  const panels = document.querySelectorAll(".publish-panel");
  const addPaymentMethodBtn = document.getElementById("addPaymentMethodBtn");
  const paymentMethodsList = document.getElementById("paymentMethodsList");

  const addPlayerRoleBtn = document.getElementById("addPlayerRoleBtn");
  const playerRolesList = document.getElementById("playerRolesList");
  const addPlayerProfessionBtn = document.getElementById("addPlayerProfessionBtn");
  const playerProfessionsList = document.getElementById("playerProfessionsList");

  tabs.forEach((button) => {
    button.addEventListener("click", () => {
      const selectedCategory = button.dataset.category;

      tabs.forEach((btn) => btn.classList.remove("active"));
      panels.forEach((panel) => panel.classList.remove("active"));

      button.classList.add("active");
      document.querySelector(`[data-panel="${selectedCategory}"]`)?.classList.add("active");
    });
  });

  const addPaymentMethodInput = () => {
    const item = document.createElement("div");
    item.className = "payment-method-item";

    const input = document.createElement("input");
    input.type = "text";
    input.className = "payment-method-input";
    input.placeholder = "Ej: Transferencia, PayPal, Saldo...";

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.textContent = "X";
    removeBtn.addEventListener("click", () => item.remove());

    item.appendChild(input);
    item.appendChild(removeBtn);
    paymentMethodsList.appendChild(item);
  };

  const addPlayerRole = () => {
    const row = document.createElement("div");
    row.className = "player-role-row";

    const select = document.createElement("select");
    select.className = "player-role-select";
    select.innerHTML = `
      <option value="">Rol</option>
      <option value="caster">Caster</option>
      <option value="heal">Heal</option>
      <option value="melee">Melee</option>
    `;

    const gsInput = document.createElement("input");
    gsInput.type = "number";
    gsInput.className = "player-role-gs";
    gsInput.placeholder = "GS";
    gsInput.min = "0";

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.textContent = "X";
    removeBtn.className = "remove-role-btn";
    removeBtn.addEventListener("click", () => row.remove());

    row.appendChild(select);
    row.appendChild(gsInput);
    row.appendChild(removeBtn);

    playerRolesList.appendChild(row);
  };

  const addPlayerProfession = () => {
    const item = document.createElement("div");
    item.className = "player-profession-item";

    const input = document.createElement("input");
    input.type = "text";
    input.className = "player-profession-input";
    input.placeholder = "Ej: Ingeniero";

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.textContent = "X";
    removeBtn.className = "remove-profession-btn";
    removeBtn.addEventListener("click", () => item.remove());

    item.appendChild(input);
    item.appendChild(removeBtn);

    playerProfessionsList.appendChild(item);
  };

  if (addPaymentMethodBtn) {
    addPaymentMethodBtn.addEventListener("click", addPaymentMethodInput);
  }

  if (addPlayerRoleBtn) {
    addPlayerRoleBtn.addEventListener("click", addPlayerRole);
  }

  if (addPlayerProfessionBtn) {
    addPlayerProfessionBtn.addEventListener("click", addPlayerProfession);
  }

  addPaymentMethodInput();
  addPlayerRole();
  addPlayerProfession();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    const selectedCategory = document.querySelector(".publish-tab.active")?.dataset.category || "player";
    const paymentMethods = Array.from(document.querySelectorAll(".payment-method-input"))
      .map((input) => input.value.trim())
      .filter(Boolean);

    let title = payload.title;
    let price = Number(payload.price);
    let amount = payload.amount;
    let className = payload.class_name;
    let imageUrl = "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80";

    if (selectedCategory === "oro") {
      title = payload.title_oro;
      price = Number(payload.price_oro);
      amount = payload.amount_oro;
      className = "";
    }

    if (selectedCategory === "donacion") {
      title = payload.title_donacion;
      price = Number(payload.price_donacion);
      amount = payload.amount_donacion;
      className = "";
    }

    if (selectedCategory === "player") {
      const classValue = payload.class_name || "";
      const baseTitle = title || "Oferta de player";
      title = classValue ? `${classValue} - ${baseTitle}` : baseTitle;
    }

    const playerRoles = Array.from(document.querySelectorAll(".player-role-row"))
      .map((row) => {
        const role = row.querySelector(".player-role-select")?.value || "";
        const gs = Number(row.querySelector(".player-role-gs")?.value || 0);

        if (!role) return null;

        return {
          role,
          gs
        };
      })
      .filter(Boolean);

    const playerProfessions = Array.from(document.querySelectorAll(".player-profession-item input"))
      .map((input) => input.value.trim())
      .filter(Boolean);

    const fileInput = document.getElementById("playerImage");
    const file = fileInput && fileInput.files && fileInput.files[0];

    if (file && selectedCategory === "player") {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { data: uploadData, error: uploadError } = await client.storage
        .from("player-images")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false
        });

      if (uploadError) {
        console.error("Error al subir imagen:", uploadError);
        alert("No se pudo subir la imagen del player.");
        return;
      }

      const { data: publicData } = client.storage
        .from("player-images")
        .getPublicUrl(uploadData.path);

      imageUrl = publicData.publicUrl;
    }

    const { error } = await client.from("listings").insert([
      {
        user_id: user.id,
        category: selectedCategory,
        type: "sell",
        title: title || "Oferta",
        description: payload.description || "",
        price: Number(price || 0),
        amount: amount || "",
        class_name: selectedCategory === "player" ? (className || "") : "",
        nationality: payload.nationality || "",
        country: payload.country || "",
        status: "active",
        image_url: imageUrl,
        payment_methods: JSON.stringify(paymentMethods),
        player_roles: selectedCategory === "player" ? JSON.stringify(playerRoles) : null,
        player_professions: selectedCategory === "player" ? JSON.stringify(playerProfessions) : null,
        seller_phone: userData.phone || "",
        seller_whatsapp: userData.phone || "",
        featured_on_home: false,
        created_at: new Date().toISOString()
      }
    ]);

    if (error) {
      console.error("Error insertando oferta:", error);
      alert("No se pudo publicar la oferta");
      return;
    }

    alert("Oferta publicada correctamente");
    window.location.href = "seller-panel.html";
  });
});