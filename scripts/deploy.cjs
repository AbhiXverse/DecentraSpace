const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Starting DecentraSpace deployment...");

  // Get the contract factory
  const DecentraSpace = await hre.ethers.getContractFactory("DecentraSpaceMVP");
  
  // Deploy the contract
  console.log("📝 Deploying contract...");
  const decentraSpace = await DecentraSpace.deploy();
  
  // Wait for deployment
  await decentraSpace.waitForDeployment();

  const address = await decentraSpace.getAddress();
  console.log("✅ DecentraSpace deployed to:", address);
  
  // Get the deployer address
  const [deployer] = await hre.ethers.getSigners();
  console.log("👤 Deployed by:", deployer.address);
  
  // Save deployment info
  const deploymentInfo = {
    contractName: "DecentraSpaceMVP",
    address: address,
    network: hre.network.name,
    deployer: deployer.address,
    deploymentDate: new Date().toISOString(),
    abi: JSON.parse(decentraSpace.interface.formatJson())
  };
  
  // Create deployments directory if it doesn't exist
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  // Save deployment info to JSON file
  const deploymentPath = path.join(deploymentsDir, `${hre.network.name}.json`);
  fs.writeFileSync(
    deploymentPath,
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log("💾 Deployment info saved to:", deploymentPath);
  
  // Save contract data for frontend
  const frontendDir = path.join(__dirname, "../src/contracts");
  if (!fs.existsSync(frontendDir)) {
    fs.mkdirSync(frontendDir, { recursive: true });
  }
  
  const contractData = {
    address: address,
    abi: JSON.parse(decentraSpace.interface.formatJson())
  };
  
  fs.writeFileSync(
    path.join(frontendDir, "DecentraSpace.json"),
    JSON.stringify(contractData, null, 2)
  );
  
  console.log("📱 Contract data saved for frontend");
  
  // Verify contract on Etherscan (if not on localhost)
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\n🔍 Waiting for block confirmations before verification...");
    await decentraSpace.deploymentTransaction().wait(6);
    
    console.log("📝 Verifying contract on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: address,
        constructorArguments: []
      });
      console.log("✅ Contract verified on Etherscan");
    } catch (error) {
      console.log("❌ Verification failed:", error.message);
    }
  }
  
  console.log("\n🎉 Deployment complete!");
  console.log("=====================================");
  console.log("Contract Address:", address);
  console.log("Network:", hre.network.name);
  console.log("=====================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
  