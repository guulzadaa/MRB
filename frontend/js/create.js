async function guardOwner() {
  await WALLET.ensureSepolia();
  const signer = await WALLET.getSigner();
  const addr = (await signer.getAddress()).toLowerCase();
  const owner = APP_CONFIG.OWNER_ADDRESS.toLowerCase();
  return { isOwner: addr === owner };
}

async function initCreatePage() {
  const { isOwner } = await guardOwner();
  if (!isOwner) {
    UI.setHTML("createGate", `
      <div class="card">
        <h2 class="h1">Access denied</h2>
        <p class="p">This page is only for the owner/admin.</p>
        <a class="btn secondary" href="recipes.html">Go to Recipes</a>
      </div>
    `);
    return;
  }

  UI.setHTML("createGate", `
    <div class="card">
      <h2 class="h1">Create recipe campaign (Owner only)</h2>
      <p class="p">Create a crowdfunding-style recipe campaign: goal + deadline.</p>

      <label class="label">Title</label>
      <input class="input" id="title" placeholder="e.g., Pasta Carbonara" />

      <label class="label">Funding goal (ETH)</label>
      <input class="input" id="goalEth" placeholder="0.05" />

      <label class="label">Duration (minutes)</label>
      <input class="input" id="durationMin" placeholder="60" />

      <div class="row" style="margin-top:12px;">
        <button class="btn" onclick="createCampaign()">Create</button>
        <span class="small" id="createStatus"></span>
      </div>
    </div>
  `);
}

async function createCampaign() {
  await WALLET.ensureSepolia();
  const signer = await WALLET.getSigner();

  const title = document.getElementById("title").value.trim();
  const goalEth = document.getElementById("goalEth").value.trim();
  const durationMin = document.getElementById("durationMin").value.trim();

  if (title.length < 3) return UI.setText("createStatus", "Title must be at least 3 chars.");
  if (!goalEth) return UI.setText("createStatus", "Enter goal in ETH.");
  if (!durationMin) return UI.setText("createStatus", "Enter duration in minutes.");

  const goalWei = ethers.parseEther(goalEth);
  const durationSeconds = BigInt(durationMin) * 60n;

  const platform = new ethers.Contract(APP_CONFIG.PLATFORM_ADDRESS, ABIS.PLATFORM, signer);

  UI.setText("createStatus", "Sending transaction...");
  try {
    const tx = await platform.createRecipeCampaign(title, goalWei, durationSeconds);
    UI.setText("createStatus", `Pending: ${tx.hash}`);
    await tx.wait();
    UI.setText("createStatus", `Created! Tx: ${tx.hash}`);
  } catch (e) {
    UI.setText("createStatus", `Error: ${e.shortMessage || e.message}`);
  }
}

window.CREATE = { initCreatePage };
window.createCampaign = createCampaign;
