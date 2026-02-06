async function updateNavbar(activeKey) {
  const ids = ["navLogin","navAbout","navRecipes","navProfile","navCreate"];
  const map = {
    login: "navLogin",
    about: "navAbout",
    recipes: "navRecipes",
    profile: "navProfile",
    create: "navCreate",
  };

  for (const id of ids) {
    const el = document.getElementById(id);
    if (el) el.classList.remove("active");
  }
  const activeId = map[activeKey];
  if (activeId) {
    const el = document.getElementById(activeId);
    if (el) el.classList.add("active");
  }

  try {
    const a = await WALLET.getConnectedAccount();
    const short = a ? UI.shortAddr(a) : "—";

    const role =
      a && a.toLowerCase() === APP_CONFIG.OWNER_ADDRESS.toLowerCase()
        ? "Owner"
        : "User";

    const roleEl = document.getElementById("navRole");
    const userEl = document.getElementById("navUser");
    if (roleEl) roleEl.textContent = role;
    if (userEl) userEl.textContent = short;
  } catch {
    const roleEl = document.getElementById("navRole");
    const userEl = document.getElementById("navUser");
    if (roleEl) roleEl.textContent = "User";
    if (userEl) userEl.textContent = "—";
  }
}

window.NAV = { updateNavbar };
