async function requireMetaMask() {
  if (!window.ethereum) throw new Error("MetaMask not found. Install MetaMask extension.");
}

async function getProvider() {
  await requireMetaMask();
  return new window.ethers.BrowserProvider(window.ethereum);
}

async function connectWallet() {
  await requireMetaMask();
  const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
  return accounts[0];
}

async function getConnectedAccount() {
  await requireMetaMask();
  const accounts = await window.ethereum.request({ method: "eth_accounts" });
  return accounts.length ? accounts[0] : null;
}

async function getChainId() {
  await requireMetaMask();
  const chainIdHex = await window.ethereum.request({ method: "eth_chainId" });
  return parseInt(chainIdHex, 16);
}

async function ensureSepolia() {
  const chainId = await getChainId();
  if (chainId !== window.APP_CONFIG.CHAIN_ID_DEC) {
    throw new Error(`Wrong network. Switch to ${window.APP_CONFIG.CHAIN_NAME}. Current chainId=${chainId}`);
  }
}

async function getSigner() {
  const provider = await getProvider();
  return provider.getSigner();
}

async function getEthBalance(address) {
  const provider = await getProvider();
  const bal = await provider.getBalance(address);
  return window.ethers.formatEther(bal);
}

window.WALLET = {
  connectWallet,
  getConnectedAccount,
  getChainId,
  ensureSepolia,
  getSigner,
  getEthBalance
};
