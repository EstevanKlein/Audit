const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying FinancialAudit contract to Sepolia...");
  
  // Get deployer
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);
  
  // Get balance
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");
  
  // Deploy contract
  const FinancialAudit = await ethers.getContractFactory("FinancialAudit");
  
  console.log("⏳ Deploying contract...");
  const privateAudit = await FinancialAudit.deploy();
  
  console.log("⌛ Waiting for deployment confirmation...");
  await privateAudit.waitForDeployment();
  
  const contractAddress = await privateAudit.getAddress();
  console.log("✅ FinancialAudit deployed to:", contractAddress);
  
  // Verify contract setup
  console.log("🔍 Verifying contract setup...");
  
  try {
    const auditor = await privateAudit.auditor();
    console.log("👨‍💼 Auditor address:", auditor);
    
    const totalAccounts = await privateAudit.totalAccounts();
    console.log("📊 Total accounts:", totalAccounts.toString());
    
    console.log("✅ Contract verification successful!");
    
  } catch (error) {
    console.log("⚠️ Contract setup verification failed:", error.message);
  }
  
  console.log("\n📋 Contract Deployment Summary:");
  console.log("================================");
  console.log("Contract Address:", contractAddress);
  console.log("Network: Sepolia");
  console.log("Deployer:", deployer.address);
  console.log("Contract Type: Private Financial Audit System");
  console.log("\n🔗 Add this address to your frontend:");
  console.log(`const CONTRACT_ADDRESS = "${contractAddress}";`);
  
  return contractAddress;
}

main()
  .then((address) => {
    console.log("\n🎉 Deployment successful!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });