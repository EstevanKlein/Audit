import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

// Compilation verification script
async function compileAndVerify(hre: HardhatRuntimeEnvironment) {
  console.log("Starting compilation process...");
  
  try {
    // Clean previous artifacts
    console.log("Cleaning previous artifacts...");
    await hre.run("clean");
    
    // Compile contracts
    console.log("Compiling contracts...");
    await hre.run("compile");
    
    // Generate TypeChain types
    console.log("Generating TypeChain types...");
    await hre.run("typechain");
    
    console.log("✅ Compilation completed successfully!");
    
    // Verify contract artifacts
    const artifacts = await hre.artifacts.getAllFullyQualifiedNames();
    console.log("\nCompiled contracts:");
    artifacts.forEach(name => {
      if (name.includes("FinancialAudit")) {
        console.log(`  ✓ ${name}`);
      }
    });
    
    return true;
  } catch (error) {
    console.error("❌ Compilation failed:", error);
    return false;
  }
}

// Main execution
async function main() {
  const hre = require("hardhat");
  const success = await compileAndVerify(hre);
  
  if (!success) {
    process.exit(1);
  }
}

// Allow direct execution
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { compileAndVerify };