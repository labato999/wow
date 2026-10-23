document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");

  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const email = formData.get("email")?.toString().trim();
    const password = formData.get("password")?.toString();

    if (!email || !password) {
      alert("Debes completar email y contraseña.");
      return;
    }

    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error(error);
        alert("Credenciales incorrectas.");
        return;
      }

      if (!data?.session) {
        alert("No se pudo iniciar sesión.");
        return;
      }

      saveUserSession(data.session);

      const { data: userProfile, error: profileError } = await supabaseClient
        .from("users")
        .select("*")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profileError) {
        console.error(profileError);
        alert("No se pudo cargar tu perfil.");
        return;
      }

      if (!userProfile) {
        alert("Tu perfil no existe en la base de datos.");
        return;
      }

      if (userProfile.is_banned) {
        alert("Tu cuenta ha sido bloqueada por fraude o incumplimiento.");
        await supabaseClient.auth.signOut();
        clearUserSession();
        return;
      }

      if (userProfile.is_admin) {
        window.location.href = "admin.html";
        return;
      }

      window.location.href = "seller-panel.html";
    } catch (err) {
      console.error("Error login:", err);
      alert("Ha ocurrido un error al iniciar sesión.");
    }
  });
});