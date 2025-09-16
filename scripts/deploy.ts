import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("=== Deploying FHEVM Private Audit System ===");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  
  // Get account balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");
  
  // Get network info
  const network = await ethers.provider.getNetwork();
  console.log("Network:", network.name, "Chain ID:", network.chainId.toString());
  
  // Deploy the contract
  console.log("Deploying FinancialAudit contract...");
  const FinancialAuditFactory = await ethers.getContractFactory("FinancialAudit");
  const privateAudit = await FinancialAuditFactory.deploy();
  
  console.log("Waiting for deployment confirmation...");
  await privateAudit.waitForDeployment();
  const contractAddress = await privateAudit.getAddress();
  
  console.log("✅ FinancialAudit deployed to:", contractAddress);
  console.log("✅ Auditor address:", deployer.address);
  
  // Verify deployment
  const totalAccounts = await privateAudit.getTotalAccounts();
  const auditorAddress = await privateAudit.auditor();
  console.log("Initial total accounts:", totalAccounts.toString());
  console.log("Contract auditor:", auditorAddress);
  
  // Create deployment info for frontend
  const deploymentInfo = {
    contractAddress: contractAddress,
    auditorAddress: auditorAddress,
    deployedBy: deployer.address,
    networkName: network.name,
    chainId: network.chainId.toString(),
    blockNumber: await ethers.provider.getBlockNumber(),
    timestamp: Date.now(),
    contractABI: [
      "function createAccount(bytes calldata encryptedBalance, string calldata accountType) external returns (uint256)",
      "function updateBalance(uint256 accountId, bytes calldata encryptedNewBalance, string calldata updateType) external",
      "function initiateAudit(uint256 accountId, string calldata auditType) external returns (uint256)",
      "function completeAudit(uint256 auditId, bytes calldata encryptedFlag) external",
      "function getAccountInfo(uint256 accountId) external view returns (bool isActive, uint256 lastUpdated, address accountOwner, bytes32 accountType)",
      "function getUserAccounts(address user) external view returns (uint256[])",
      "function getEncryptedBalance(uint256 accountId) external view returns (bytes memory)",
      "function getEncryptedTransactions(uint256 accountId) external view returns (bytes memory)",
      "function getAuditRecord(uint256 auditId) external view returns (uint256 accountId, uint256 auditTimestamp, bool isCompleted, bytes32 auditType)",
      "function getAuditFlag(uint256 auditId) external view returns (bytes memory)",
      "function getAccountAudits(uint256 accountId) external view returns (uint256[])",
      "function transferAuditor(address newAuditor) external",
      "function deactivateAccount(uint256 accountId) external",
      "function reactivateAccount(uint256 accountId) external",
      "function getTotalAccounts() external view returns (uint256)",
      "function auditor() external view returns (address)"
    ]
  };

  // Save deployment info to frontend
  const frontendPublicDir = path.join(__dirname, '../frontend/public');
  const contractInfoPath = path.join(frontendPublicDir, 'contract-info.json');
  
  try {
    if (!fs.existsSync(frontendPublicDir)) {
      fs.mkdirSync(frontendPublicDir, { recursive: true });
    }
    
    fs.writeFileSync(contractInfoPath, JSON.stringify(deploymentInfo, null, 2));
    console.log("📁 Contract info saved to:", contractInfoPath);
  } catch (error) {
    console.warn("⚠️ Could not save contract info:", error);
  }
  
  console.log("\n=== Deployment Summary ===");
  console.log(`📋 Contract Address: ${contractAddress}`);
  console.log(`🌐 Network: ${network.name} (Chain ID: ${network.chainId})`);
  console.log(`👤 Auditor: ${auditorAddress}`);
  console.log(`📦 Block Number: ${await ethers.provider.getBlockNumber()}`);
  console.log("========================\n");

  console.log("🚀 Next steps to test the DApp:");
  console.log(`1. Update CONTRACT_ADDRESS in frontend/src/App.tsx to: ${contractAddress}`);
  console.log("2. cd frontend && npm install");
  console.log("3. cd frontend && npm run dev");
  console.log("4. Connect MetaMask to the same network");
  console.log("5. Import deployer private key to MetaMask to test as auditor");
  console.log("6. Get test ETH for the network if needed");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });