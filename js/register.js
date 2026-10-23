document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("registerForm");
  if (!form) return;

  let isSubmitting = false;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (isSubmitting) return;
    isSubmitting = true;

    const submitButton = form.querySelector("button[type='submit']");
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Creando cuenta...";
    }

    try {
      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());

      const { data: authData, error: signUpError } = await supabaseClient.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.full_name,
            username: data.username,
            country: data.country,
            nationality: data.nationality,
            phone: data.phone,
            bio: data.bio
          }
        }
      });

      if (signUpError) {
        alert("Error al crear la cuenta: " + signUpError.message);
        return;
      }

      const userId = authData?.user?.id;

      if (userId) {
        const { error: insertError } = await supabaseClient
          .from("users")
          .upsert(
            [
              {
                id: userId,
                full_name: data.full_name,
                username: data.username,
                email: data.email,
                country: data.country,
                nationality: data.nationality,
                phone: data.phone,
                bio: data.bio,
                payment_country: data.country,
                payment_method: "",
                membership_status: "inactive",
                credits: 0,
                is_banned: false,
                is_admin: false,
                is_membership_active: false
              }
            ],
            {
              onConflict: "id"
            }
          );

        if (insertError) {
          console.error(insertError);
          alert("Hubo un error al guardar el perfil.");
          return;
        }
      }

      alert("Cuenta creada correctamente. Redirigiendo al login...");
      setTimeout(() => {
        window.location.href = "login.html";
      }, 1500);

    } finally {
      isSubmitting = false;
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Crear cuenta";
      }
    }
  });
});