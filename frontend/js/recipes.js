async function getContracts() {
  await WALLET.ensureSepolia();
  const signer = await WALLET.getSigner();
  const platform = new ethers.Contract(APP_CONFIG.PLATFORM_ADDRESS, ABIS.PLATFORM, signer);
  return { platform, signer };
}

async function signerAddress() {
  const signer = await WALLET.getSigner();
  return await signer.getAddress();
}

async function getChainNowSec() {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const block = await provider.getBlock("latest");
  return Number(block.timestamp);
}

function pad2(n){ return String(n).padStart(2,"0"); }
function formatCountdown(secondsLeft) {
  if (secondsLeft <= 0) return "Ended";
  const d = Math.floor(secondsLeft / 86400);
  const h = Math.floor((secondsLeft % 86400) / 3600);
  const m = Math.floor((secondsLeft % 3600) / 60);
  const s = Math.floor(secondsLeft % 60);
  if (d > 0) return `${d}d ${pad2(h)}:${pad2(m)}:${pad2(s)}`;
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
}

let __timer = null;
let __timerState = null;

function stopTimer() {
  if (__timer) clearInterval(__timer);
  __timer = null;
  __timerState = null;
}

function startTimer(items, chainNow) {
  stopTimer();
  const localStartMs = Date.now();

  __timerState = items.map(c => ({ id: c.id, deadline: Number(c.deadline) }));

  __timer = setInterval(() => {
    const elapsedSec = Math.floor((Date.now() - localStartMs) / 1000);
    const now = chainNow + elapsedSec;

    for (const t of __timerState) {
      const left = t.deadline - now;

      const tlEl = document.getElementById(`tl_${t.id}`);
      if (tlEl) tlEl.textContent = formatCountdown(left);

      const WINDOW = 10 * 60;
      const clamped = Math.max(0, Math.min(WINDOW, left));
      const pct = (clamped / WINDOW) * 100;

      const bar = document.getElementById(`tb_${t.id}`);
      if (bar) bar.style.width = `${pct}%`;
    }
  }, 1000);
}

function escapeHtml(str) {
  return (str || "").replace(/[&<>"']/g, (m) => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
  }[m]));
}

function buildImageSrc(imageURI) {
  if (!imageURI) return "";
  const s = String(imageURI).trim();
  if (!s) return "";
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  if (s.startsWith("/")) return s;
  return "/" + s;
}

function toNum(x, fallback = 0) {
  try {
    if (x === null || x === undefined) return fallback;
    return Number(x);
  } catch {
    return fallback;
  }
}

function toBig(x, fallback = 0n) {
  try {
    if (x === null || x === undefined) return fallback;
    return BigInt(x);
  } catch {
    return fallback;
  }
}

function normalizeCampaign(c) {
  const id        = (c.id        ?? c[0]);
  const title     = (c.title     ?? c[1]);
  const imageURI  = (c.imageURI  ?? c[2]);
  const goalWei   = (c.goalWei   ?? c[3] ?? 0n);
  const deadline  = (c.deadline  ?? c[4] ?? 0n);
  const raisedWei = (c.totalRaised ?? c[5] ?? 0n);
  const finalized = (c.finalized ?? c[6] ?? false);
  const successful= (c.successful?? c[7] ?? false);
  const withdrawn = (c.withdrawn ?? c[8] ?? false);
  const exists    = (c.exists    ?? c[9] ?? true);

  return {
    id: toNum(id, 0),
    title: title || "",
    imageURI: imageURI || "",
    goalWei: toBig(goalWei, 0n),
    deadline: toBig(deadline, 0n),
    totalRaised: toBig(raisedWei, 0n),
    finalized: Boolean(finalized),
    successful: Boolean(successful),
    withdrawn: Boolean(withdrawn),
    exists: Boolean(exists),
  };
}

async function loadCampaigns() {
  const { platform } = await getContracts();
  const total = await platform.nextCampaignId();
  const addr = await signerAddress();
  const isOwner = addr.toLowerCase() === APP_CONFIG.OWNER_ADDRESS.toLowerCase();
  const chainNow = await getChainNowSec();

  const items = [];
  for (let i = 0; i < Number(total); i++) {
    const raw = await platform.getCampaign(i);
    const c = normalizeCampaign(raw);
    const my = await platform.contributions(i, addr);
    const ended = (Number(c.deadline) <= chainNow);
    const progress = (c.goalWei === 0n) ? 0 : (Number(c.totalRaised) / Number(c.goalWei)) * 100;

    items.push({
      id: c.id,
      title: c.title,
      imageURI: c.imageURI,
      goalEth: ethers.formatEther(c.goalWei),
      raisedEth: ethers.formatEther(c.totalRaised),
      deadline: c.deadline,
      finalized: c.finalized,
      successful: c.successful,
      withdrawn: c.withdrawn,
      myWei: my,
      myEth: ethers.formatEther(my),
      isOwner,
      ended,
      progress
    });
  }

  render(items);
  startTimer(items, chainNow);
}

function render(items) {
  if (!items.length) {
    UI.setHTML("recipesList", `<div class="card"><p class="p">No recipe campaigns yet. Owner can create them.</p></div>`);
    return;
  }

  const html = items.map(c => {
    const canContribute = !c.finalized && !c.ended;
    const canFinalize = c.isOwner && c.ended && !c.finalized;
    const canWithdraw = c.isOwner && c.finalized && c.successful && !c.withdrawn;
    const hasContribution = (BigInt(c.myWei) > 0n);
    const canRefund = (!c.isOwner && c.finalized && !c.successful && hasContribution);

    const statusText =
      c.finalized ? (c.successful ? "Successful!" : "Failed.")
      : (c.ended ? "Ended (not finalized)" : "Active");

    const refundHint = (!c.isOwner && c.finalized && !c.successful && !hasContribution)
      ? `<div class="small" style="margin-top:8px;">Refund is available only if you contributed ETH.</div>`
      : "";

    const imgSrc = buildImageSrc(c.imageURI);
    const imgBlock = imgSrc
      ? `<img src="${imgSrc}" alt="recipe image"
              style="width:100%; height:160px; object-fit:cover; border-radius:12px; margin:10px 0; border:1px solid rgba(139,94,52,0.18);" />`
      : "";

    return `
      <div class="card">
        <div class="row" style="justify-content:space-between; align-items:flex-start;">
          <div style="min-width:260px;">
            <div class="badge">Recipe Campaign #${c.id}</div>
            <h3 style="margin:10px 0 6px;">${escapeHtml(c.title)}</h3>

            ${imgBlock}

            <div class="small">Goal: <b>${c.goalEth} ETH</b></div>
            <div class="small">Raised: <b>${c.raisedEth} ETH</b> (${c.progress.toFixed(1)}%)</div>
            <div class="small">Your contribution: <b>${c.myEth} ETH</b></div>
            <div class="small">Status: <b>${statusText}</b></div>

            <div class="timerbox">
              <div class="timerrow">
                <div class="timerlabel">Deadline (block time)</div>
                <div class="timervalue" id="tl_${c.id}">—</div>
              </div>
              <div class="timebar"><div id="tb_${c.id}"></div></div>
              <div class="small" style="margin-top:8px;">
                Finalize becomes available <b>after</b> the deadline.
              </div>
            </div>
          </div>

          <div style="min-width:260px;">
            <label class="label">Contribute (ETH)</label>
            <input class="input" id="amt_${c.id}" placeholder="0.01" ${canContribute ? "" : "disabled"}/>
            <div style="height:10px;"></div>

            <button class="btn" ${canContribute ? "" : "disabled"} onclick="contribute(${c.id})">Contribute</button>
            <div style="height:10px;"></div>

            ${c.isOwner ? `
              <button class="btn secondary" ${canFinalize ? "" : "disabled"} onclick="finalize(${c.id})">Finalize</button>
              <div style="height:8px;"></div>
              <button class="btn secondary" ${canWithdraw ? "" : "disabled"} onclick="withdraw(${c.id})">Withdraw</button>
            ` : `
              <button class="btn secondary" ${canRefund ? "" : "disabled"} onclick="refund(${c.id})">Refund</button>
              ${refundHint}
            `}

            <div class="small" id="tx_${c.id}" style="margin-top:10px;"></div>
          </div>
        </div>
      </div>
    `;
  }).join("");

  UI.setHTML("recipesList", `<div class="grid">${html}</div>`);
}

async function contribute(id) {
  const { platform } = await getContracts();
  const v = document.getElementById(`amt_${id}`).value.trim();
  if (!v) return UI.setText(`tx_${id}`, "Enter amount in ETH.");

  UI.setText(`tx_${id}`, "Sending transaction...");
  try {
    const tx = await platform.contribute(id, { value: ethers.parseEther(v) });
    UI.setText(`tx_${id}`, `Pending: ${tx.hash}`);
    await tx.wait();
    UI.setText(`tx_${id}`, `Success! Tx: ${tx.hash}`);
    await loadCampaigns();
  } catch (e) {
    UI.setText(`tx_${id}`, `Error: ${e.shortMessage || e.message}`);
  }
}

async function finalize(id) {
  const { platform } = await getContracts();
  UI.setText(`tx_${id}`, "Finalizing...");
  try {
    const tx = await platform.finalize(id);
    UI.setText(`tx_${id}`, `Pending: ${tx.hash}`);
    await tx.wait();
    UI.setText(`tx_${id}`, `Finalized! Tx: ${tx.hash}`);
    await loadCampaigns();
  } catch (e) {
    UI.setText(`tx_${id}`, `Error: ${e.shortMessage || e.message}`);
  }
}

async function withdraw(id) {
  const { platform } = await getContracts();
  UI.setText(`tx_${id}`, "Withdrawing...");
  try {
    const tx = await platform.ownerWithdraw(id);
    UI.setText(`tx_${id}`, `Pending: ${tx.hash}`);
    await tx.wait();
    UI.setText(`tx_${id}`, `Withdrawn! Tx: ${tx.hash}`);
    await loadCampaigns();
  } catch (e) {
    UI.setText(`tx_${id}`, `Error: ${e.shortMessage || e.message}`);
  }
}

async function refund(id) {
  const { platform } = await getContracts();
  UI.setText(`tx_${id}`, "Requesting refund...");
  try {
    const tx = await platform.refund(id);
    UI.setText(`tx_${id}`, `Pending: ${tx.hash}`);
    await tx.wait();
    UI.setText(`tx_${id}`, `Refunded! Tx: ${tx.hash}`);
    await loadCampaigns();
  } catch (e) {
    UI.setText(`tx_${id}`, `Error: ${e.shortMessage || e.message}`);
  }
}

window.RECIPES = { loadCampaigns };
window.contribute = contribute;
window.finalize = finalize;
window.withdraw = withdraw;
window.refund = refund;
