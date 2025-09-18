# 🚀 Quick Setup Guide - Hello FHEVM dApp

This guide will get you up and running with the Private Financial Audit System in under 10 minutes!

## ⚡ Prerequisites Checklist

Before you begin, make sure you have:

- [ ] **Node.js** (v20.19.0+) - [Download here](https://nodejs.org/)
- [ ] **npm** (v10.2.3+) - Comes with Node.js
- [ ] **Git** - [Download here](https://git-scm.com/)
- [ ] **MetaMask** browser extension - [Install here](https://metamask.io/)
- [ ] **VS Code** (recommended) - [Download here](https://code.visualstudio.com/)

## 🔧 Step 1: Clone & Install

```bash
# Clone the repository
git clone https://github.com/your-repo/private-audit-system.git
cd private-audit-system

# Install dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

## ⚙️ Step 2: Environment Setup

Create a `.env` file in the root directory:

```bash
# .env
SEPOLIA_RPC_URL="https://sepolia.infura.io/v3/YOUR_INFURA_KEY"
PRIVATE_KEY="your_private_key_here"
ETHERSCAN_API_KEY="your_etherscan_api_key"
```

### Getting Your Environment Variables:

#### 1. Infura RPC URL
1. Go to [Infura.io](https://infura.io/)
2. Create a free account
3. Create a new project
4. Copy your Sepolia endpoint URL

#### 2. Private Key
1. Open MetaMask
2. Click on account menu → Account Details → Export Private Key
3. Enter your password and copy the private key

⚠️ **SECURITY WARNING**: Never share your private key or commit it to version control!

#### 3. Etherscan API Key (Optional)
1. Go to [Etherscan.io](https://etherscan.io/)
2. Create an account
3. Go to API Keys section
4. Generate a new API key

## 💰 Step 3: Get Test ETH

You'll need Sepolia testnet ETH for transactions:

1. **Add Sepolia to MetaMask**:
   - Network Name: Sepolia Test Network
   - RPC URL: `https://sepolia.infura.io/v3/YOUR_INFURA_KEY`
   - Chain ID: `11155111`
   - Currency Symbol: `ETH`
   - Block Explorer: `https://sepolia.etherscan.io`

2. **Get Test ETH**:
   - Visit [Sepolia Faucet](https://sepoliafaucet.com/)
   - Enter your wallet address
   - Request test ETH (you'll get 0.5 ETH)

## 🔨 Step 4: Compile & Test

```bash
# Compile smart contracts
npm run compile

# Run tests to verify everything works
npm run test
```

Expected output:
```
✓ Should create account successfully
✓ Should update balance correctly
✓ Should initiate audit properly
✓ All tests passing!
```

## 🚀 Step 5: Deploy to Sepolia

```bash
npm run deploy:sepolia
```

Expected output:
```
Deploying FinancialAudit contract...
Contract deployed to: 0x1234567890123456789012345678901234567890
Contract verified on Etherscan!
```

**Important**: Copy the contract address from the output!

## 🎨 Step 6: Configure Frontend

1. Open `frontend/src/App.tsx`
2. Find line 6: `const CONTRACT_ADDRESS = "0x1408E6bea377D2a79118a320472473b0dFC1308F"`
3. Replace with your deployed contract address

## ▶️ Step 7: Run the Application

```bash
cd frontend
npm run dev
```

Open your browser and go to `http://localhost:5173`

## 🎉 Step 8: Test Your dApp

### First Time Setup:
1. **Connect Wallet**: Click "Connect MetaMask"
2. **Switch Network**: Allow MetaMask to switch to Sepolia
3. **Authorize**: Approve the connection

### Test the Core Features:
1. **Create Account**:
   - Select "Corporate Account"
   - Enter "1.0" as initial balance
   - Click "Create Account"
   - Confirm in MetaMask

2. **Update Balance**:
   - Select your created account
   - Choose "Deposit" operation
   - Enter "0.5" amount
   - Click "Update Balance"

3. **Initiate Audit** (if you're the auditor):
   - Go to "Audit Functions" tab
   - Select "Compliance" audit type
   - Click "Initiate Audit"

## 🐛 Troubleshooting

### Common Issues:

#### MetaMask Connection Problems
```
Error: User rejected connection
```
**Solution**: Make sure MetaMask is unlocked and you approve the connection.

#### Contract Deployment Fails
```
Error: Insufficient funds for gas
```
**Solution**: Get more test ETH from the Sepolia faucet.

#### Frontend Can't Connect to Contract
```
Error: Contract not found
```
**Solution**: Double-check the contract address in `App.tsx` matches your deployment.

#### Compilation Errors
```
Error: Module not found
```
**Solution**: Run `npm install` again and ensure all dependencies are installed.

## 📱 Mobile Testing

To test on mobile devices:

1. **Find your local IP**:
   ```bash
   ipconfig  # Windows
   ifconfig  # macOS/Linux
   ```

2. **Start dev server with host**:
   ```bash
   npm run dev -- --host 0.0.0.0
   ```

3. **Access from mobile**: `http://YOUR_IP:5173`

## 🌐 Deploy to Production

### Build for Production:
```bash
cd frontend
npm run build
```

### Deploy to Vercel:
1. Install Vercel CLI: `npm install -g vercel`
2. Login: `vercel login`
3. Deploy: `vercel --prod`

### Deploy to Netlify:
1. Build the project: `npm run build`
2. Drag and drop the `dist` folder to [Netlify Drop](https://app.netlify.com/drop)

## 📊 Monitoring & Analytics

### View Transactions:
- **Sepolia Explorer**: `https://sepolia.etherscan.io/address/YOUR_CONTRACT_ADDRESS`
- **Transaction Details**: Click on any transaction hash in your dApp

### Gas Usage Tracking:
- Monitor gas costs for different operations
- Optimize transaction parameters

## 🔄 Updates & Maintenance

### Update Dependencies:
```bash
npm update
cd frontend && npm update
```

### Redeploy Contract:
```bash
npm run deploy:sepolia
# Update contract address in frontend
```

## 🎯 Quick Verification Checklist

- [ ] Node.js and npm installed correctly
- [ ] All dependencies installed without errors
- [ ] Environment variables configured
- [ ] Tests pass successfully
- [ ] Contract deployed to Sepolia
- [ ] Frontend shows correct contract address
- [ ] MetaMask connected to Sepolia
- [ ] Test ETH available in wallet
- [ ] dApp loads without errors
- [ ] Can create accounts successfully
- [ ] Can update balances
- [ ] Transaction history appears correctly

## 🆘 Get Help

If you encounter issues:

1. **Check the console**: Open browser DevTools → Console tab
2. **Verify network**: Ensure MetaMask is on Sepolia
3. **Check balance**: Make sure you have enough test ETH
4. **Review logs**: Check terminal output for error messages
5. **Ask for help**: Create an issue on the repository

## 🎊 Success!

If you've completed all steps successfully, you now have:

- ✅ A fully functional FHEVM-powered dApp
- ✅ Smart contracts deployed on Sepolia testnet
- ✅ React frontend with MetaMask integration
- ✅ Privacy-preserving financial operations
- ✅ Real-time transaction tracking

**Congratulations! You've built your first Hello FHEVM application! 🚀**

---

## 📞 Support

- **Tutorial Issues**: Check `HELLO_FHEVM_TUTORIAL.md` for detailed explanations
- **Code Issues**: Review the source code comments
- **Deployment Issues**: Verify environment configuration
- **Frontend Issues**: Check browser console for errors

Happy building with FHEVM! 🔒✨