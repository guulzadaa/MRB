async function loadProfile() {
  await WALLET.ensureSepolia();
  const signer = await WALLET.getSigner();
  const address = await signer.getAddress();

  UI.setText("profileAddress", address);
  UI.setText("profileShort", UI.shortAddr(address));

  const eth = await WALLET.getEthBalance(address);
  UI.setText("ethBalance", `${eth} ETH`);

  const token = new ethers.Contract(APP_CONFIG.REWARD_TOKEN_ADDRESS, ABIS.ERC20, signer);
  const sym = await token.symbol();
  const dec = await token.decimals();
  const bal = await token.balanceOf(address);
  UI.setText("tokenBalance", `${ethers.formatUnits(bal, dec)} ${sym}`);

  const platform = new ethers.Contract(APP_CONFIG.PLATFORM_ADDRESS, ABIS.PLATFORM, signer);
  const ids = await platform.getUserCampaigns(address);

  if (!ids.length) {
    UI.setHTML("purchasedList", `<p class="p">You haven't contributed to any campaigns yet.</p>`);
    return;
  }

  const cards = [];
  for (const cid of ids) {
    const c = await platform.getCampaign(cid);
    const my = await platform.contributions(cid, address);
    cards.push(`
      <div class="card">
        <div class="badge">Your contribution</div>
        <h3 style="margin:10px 0 6px;">${c.title}</h3>
        <div class="small">Campaign ID: <span class="mono">${Number(c.id)}</span></div>
        <div class="small">Your ETH: <b>${ethers.formatEther(my)} ETH</b></div>
        <div class="small">Raised: ${ethers.formatEther(c.totalRaised)} / ${ethers.formatEther(c.goalWei)} ETH</div>
        <div class="small">Finalized: <b>${c.finalized ? "Yes" : "No"}</b> • Success: <b>${c.finalized ? (c.successful ? "Yes" : "No") : "—"}</b></div>
      </div>
    `);
  }

  UI.setHTML("purchasedList", `<div class="grid">${cards.join("")}</div>`);
}

window.PROFILE = { loadProfile };
