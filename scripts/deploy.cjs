const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Starting DecentraSpace deployment...");

  const DecentraSpace = await hre.ethers.getContractFactory("DecentraSpaceMVP");
  
  console.log("📝 Deploying contract...");
  const decentraSpace = await DecentraSpace.deploy();
  
  await decentraSpace.deployed();

  const address = decentraSpace.address;
  console.log("✅ DecentraSpace deployed to:", address);
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("👤 Deployed by:", deployer.address);
  
  // FIXED: Get ABI properly for ethers v5
  const contractABI = JSON.parse(decentraSpace.interface.format('json'));
  
  // Save deployment info
  const deploymentInfo = {
    contractName: "DecentraSpaceMVP",
    address: address,
    network: hre.network.name,
    deployer: deployer.address,
    deploymentDate: new Date().toISOString(),
    abi: contractABI
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
    abi: contractABI
  };
  
  fs.writeFileSync(
    path.join(frontendDir, "DecentraSpace.json"),
    JSON.stringify(contractData, null, 2)
  );
  
  console.log("📱 Contract data saved for frontend");
  
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
