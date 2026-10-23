document.addEventListener("DOMContentLoaded", async () => {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    window.location.href = "login.html";
    return;
  }

  const { data: userProfile, error: userProfileError } = await supabaseClient
    .from("users")
    .select("*")
    .eq("id", currentUser.id)
    .maybeSingle();

  if (userProfileError || !userProfile || !userProfile.is_admin) {
    console.error(userProfileError);
    window.location.href = "login.html";
    return;
  }

  const logoutBtn = document.getElementById("logoutAdminBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await supabaseClient.auth.signOut();
      clearUserSession();
      window.location.href = "login.html";
    });
  }

  const paymentsList = document.getElementById("paymentsList");

  const { data: payments, error: paymentsError } = await supabaseClient
    .from("payments")
    .select("*")
    .eq("status", "pending")
    .eq("type", "credits")
    .order("created_at", { ascending: false });

  if (paymentsError) {
    console.error(paymentsError);
  }

  if (!paymentsList) return;

  if (!payments || payments.length === 0) {
    paymentsList.innerHTML = "<p>No hay pagos pendientes de créditos.</p>";
    return;
  }

  paymentsList.innerHTML = payments
    .map((payment) => `
      <div class="payment-item">
        <p><strong>Usuario:</strong> ${payment.user_id}</p>
        <p><strong>Créditos solicitados:</strong> ${payment.credit_amount || 0}</p>
        <p><strong>Monto:</strong> ${payment.amount || 0} ${payment.currency || "PESOS"}</p>
        <p><strong>Método:</strong> ${payment.payment_method || "No indicado"}</p>
        <p><strong>Fecha:</strong> ${payment.payment_date || "No indicada"}</p>
        <p><strong>Hora:</strong> ${payment.payment_time || "No indicada"}</p>
        <p><strong>Desde:</strong> ${payment.transfer_from_phone || "No indicado"}</p>
        <p><strong>Últimos 4:</strong> ${payment.last4 || "No indicado"}</p>
        <p><strong>Referencia:</strong> ${payment.reference || "No indicada"}</p>
        <p><strong>Nombre:</strong> ${payment.payment_notes || "No indicado"}</p>

        <button
          class="btn primary"
          data-payment-id="${payment.id}"
          data-user-id="${payment.user_id}"
          data-credit-amount="${payment.credit_amount || 0}"
          type="button"
        >
          Aprobar crédito
        </button>
      </div>
    `)
    .join("");

  document.querySelectorAll("[data-payment-id]").forEach((button) => {
    button.addEventListener("click", async () => {
      const paymentId = button.dataset.paymentId;
      const userId = button.dataset.userId;
      const creditAmount = Number(button.dataset.creditAmount || 0);

      console.log("paymentId:", paymentId);
      console.log("userId:", userId);
      console.log("creditAmount:", creditAmount);

      if (!paymentId || !userId) {
        alert("Faltan datos del pago.");
        return;
      }

      const { data: userProfile, error: userProfileError } = await supabaseClient
        .from("users")
        .select("credits")
        .eq("id", userId)
        .maybeSingle();

      console.log("userProfile:", userProfile);
      console.log("userProfileError:", userProfileError);

      if (userProfileError) {
        console.error(userProfileError);
        alert("No se pudo cargar el usuario.");
        return;
      }

      if (!userProfile) {
        alert("No existe el perfil del usuario.");
        return;
      }

      const nuevoSaldo = Number(userProfile?.credits || 0) + creditAmount;

      const { error: userUpdateError } = await supabaseClient
        .from("users")
        .update({
          credits: nuevoSaldo
        })
        .eq("id", userId);

      if (userUpdateError) {
        console.error(userUpdateError);
        alert("No se pudieron acreditar los créditos.");
        return;
      }

      const { error: paymentUpdateError } = await supabaseClient
        .from("payments")
        .update({
          status: "approved",
          approved_at: new Date().toISOString(),
          approved_by: currentUser.id
        })
        .eq("id", paymentId);

      if (paymentUpdateError) {
        console.error(paymentUpdateError);
        alert("No se pudo aprobar el pago.");
        return;
      }

      alert("Créditos acreditados correctamente.");
      location.reload();
    });
  });
});