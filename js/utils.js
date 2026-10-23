async function getCurrentUser() {
  const { data: sessionData, error } = await supabaseClient.auth.getSession();

  if (error) {
    console.error(error);
    return null;
  }

  if (!sessionData?.session?.user) {
    return null;
  }

  return sessionData.session.user;
}

function saveUserSession(session) {
  if (!session) return;
  localStorage.setItem("supabase_session", JSON.stringify(session));
}

function getSavedSession() {
  const raw = localStorage.getItem("supabase_session");
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function clearUserSession() {
  localStorage.removeItem("supabase_session");
}

function isMembershipActive(userData) {
  if (!userData) return false;
  if (userData.is_banned) return false;

  if (!userData.membership_expires_at) return false;

  const expiresAt = new Date(userData.membership_expires_at);
  const now = new Date();

  return expiresAt > now;
}

function getMembershipCountdownLabel(dateString) {
  if (!dateString) return "Sin membresía activa";

  const expiresAt = new Date(dateString);
  const now = new Date();
  const diff = expiresAt - now;

  if (diff <= 0) {
    return "Membresía vencida";
  }

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  return `${days}d ${hours}h ${minutes}m restantes`;
}

function parseList(value) {
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
}

function parseRoleList(value) {
  const list = parseList(value);

  return list
    .map((item) => {
      if (typeof item === "string") {
        return { role: item, gs: "" };
      }

      if (item && typeof item === "object") {
        return {
          role: item.role || "",
          gs: item.gs !== undefined && item.gs !== null ? Number(item.gs) : ""
        };
      }

      return null;
    })
    .filter((item) => item && item.role);
}

function parseProfessionList(value) {
  const list = parseList(value);

  return list
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (item && typeof item === "object") return item.name || item.profession || "";
      return "";
    })
    .filter(Boolean);
}

function capitalizeRole(role) {
  if (!role) return "Rol";

  const map = {
    caster: "Caster",
    heal: "Heal",
    melee: "Melee",
    tank: "Tank"
  };

  return map[role.toLowerCase()] || role;
}

function getPaymentMethods(value) {
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
}