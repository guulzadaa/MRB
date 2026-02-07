async function getContracts() {
  await WALLET.ensureSepolia();
  const signer = await WALLET.getSigner();
  const platform = new ethers.Contract(APP_CONFIG.PLATFORM_ADDRESS, ABIS.PLATFORM, signer);
  const token = new ethers.Contract(APP_CONFIG.REWARD_TOKEN_ADDRESS, ABIS.ERC20, signer);
  return { platform, token, signer };
}

function escapeHtml(str) {
  return (str || "").replace(/[&<>"']/g, (m) => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
  }[m]));
}

function normalizeCampaign(cRaw) {
  const id = Number((cRaw.id ?? cRaw[0]) ?? 0);
  const title = (cRaw.title ?? cRaw[1]) || `Campaign #${id}`;
  const imageURI = (cRaw.imageURI ?? cRaw[2]) || "";
  const goalWei = (cRaw.goalWei ?? cRaw[3] ?? 0n);
  const deadline = (cRaw.deadline ?? cRaw[4] ?? 0n);
  const totalRaised = (cRaw.totalRaised ?? cRaw[5] ?? 0n);
  const finalized = Boolean(cRaw.finalized ?? cRaw[6] ?? false);
  const successful = Boolean(cRaw.successful ?? cRaw[7] ?? false);
  return { id, title, imageURI, goalWei, deadline, totalRaised, finalized, successful };
}

async function loadEthBalance(account) {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const balWei = await provider.getBalance(account);
  return ethers.formatEther(balWei);
}

async function loadProfile() {
  const account = await WALLET.getConnectedAccount();
  if (!account) {
    UI.setText("profileStatus", "Not connected. Go to Login and connect MetaMask.");
    return;
  }

  UI.setText("profileShort", UI.shortAddr(account));
  UI.setText("profileAddress", account);
  UI.setText("profileStatus", "Loading balances…");

  const { platform, token } = await getContracts();
  try {
    const eth = await loadEthBalance(account);
    UI.setText("ethBalance", `ETH: ${Number(eth).toFixed(4)}`);
  } catch {
    UI.setText("ethBalance", "ETH: —");
  }

  let sym = "RRT";
  let dec = 18;
  try { sym = await token.symbol(); } catch {}
  try { dec = Number(await token.decimals()); } catch {}

  const bal = await token.balanceOf(account);
  const balFmt = ethers.formatUnits(bal, dec);
  UI.setText("tokenBalance", `${sym}: ${Number(balFmt).toFixed(2)}`);
  UI.setText("profileStatus", "Loading your contributions…");
  const total = await platform.nextCampaignId();
  const cards = [];

  for (let i = 0; i < Number(total); i++) {
    const cRaw = await platform.getCampaign(i);
    const c = normalizeCampaign(cRaw);
    const my = await platform.contributions(c.id, account);
    if (BigInt(my) === 0n) continue;
    const statusText =
      c.finalized ? (c.successful ? "Successful!" : "Failed.")
      : "Active / Not finalized";
    const img = (c.imageURI || "").trim();
    const imgTag = img
      ? `<img src="${img.startsWith("http") ? img : img.startsWith("/") ? img : "/" + img}"
              alt="recipe"
              style="width:100%; height:140px; object-fit:cover; border-radius:12px; margin:10px 0; border:1px solid rgba(139,94,52,0.18);" />`
      : "";

    cards.push(`
      <div class="card">
        <div class="badge">Campaign #${c.id}</div>
        <h3 style="margin:10px 0 6px;">${escapeHtml(c.title)}</h3>
        ${imgTag}

        <div class="small">Your contribution: <b>${ethers.formatEther(my)} ETH</b></div>
        <div class="small">Goal: <b>${ethers.formatEther(c.goalWei)} ETH</b></div>
        <div class="small">Raised: <b>${ethers.formatEther(c.totalRaised)} ETH</b></div>
        <div class="small">Status: <b>${statusText}</b></div>

        <div style="height:10px;"></div>
        <a class="btn secondary" href="recipes.html">Open Recipes</a>
      </div>
    `);
  }

  if (cards.length === 0) {
    UI.setHTML("myCampaigns",
      `<div class="card"><p class="p">No contributions yet. Go to Recipes and contribute to a campaign.</p></div>`
    );
  } else {
    UI.setHTML("myCampaigns", `<div class="grid">${cards.join("")}</div>`);
  }
  UI.setText("profileStatus", "Loaded!");
}

window.PROFILE = { loadProfile };
