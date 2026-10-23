document.addEventListener("DOMContentLoaded", async () => {
  const user = await getCurrentUser();
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const container = document.getElementById("profileContainer");
  if (!container) return;

  const { data, error } = await supabaseClient
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error(error);
    return;
  }

  container.innerHTML = `
    <img
      class="avatar"
      src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80"
      alt="avatar"
    />
    <h3>${data.full_name}</h3>
    <p>Usuario: ${data.username}</p>
    <p>Nacionalidad: ${data.nationality || "No especificada"}</p>
    <p>País: ${data.country || "No especificado"}</p>
    <p>Bio: ${data.bio || "Sin bio aún"}</p>
    <p>Teléfono: ${data.phone || "No especificado"}</p>
  `;
});