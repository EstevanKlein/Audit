import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import './App.css'

// Private Audit Contract Configuration
const CONTRACT_ADDRESS = "0x1408E6bea377D2a79118a320472473b0dFC1308F"
const CONTRACT_ABI = [
  "function createAccount(bytes calldata encryptedBalance, string calldata accountType) external returns (uint256)",
  "function updateBalance(uint256 accountId, bytes calldata encryptedNewBalance, string calldata updateType) external",
  "function initiateAudit(uint256 accountId, string calldata auditType) external returns (uint256)",
  "function completeAudit(uint256 auditId, bytes calldata encryptedFlag) external",
  "function getAccountInfo(uint256 accountId) external view returns (bool isActive, uint256 lastUpdated, address accountOwner, bytes32 accountType)",
  "function getUserAccounts(address user) external view returns (uint256[])",
  "function getEncryptedBalance(uint256 accountId) external view returns (bytes32)",
  "function getEncryptedTransactions(uint256 accountId) external view returns (bytes32)",
  "function getAuditRecord(uint256 auditId) external view returns (uint256 accountId, uint256 auditTimestamp, bool isCompleted, bytes32 auditType)",
  "function getAuditFlag(uint256 auditId) external view returns (bytes32)",
  "function getAccountAudits(uint256 accountId) external view returns (uint256[])",
  "function transferAuditor(address newAuditor) external",
  "function deactivateAccount(uint256 accountId) external",
  "function reactivateAccount(uint256 accountId) external",
  "function getTotalAccounts() external view returns (uint256)",
  "function auditor() external view returns (address)",
  "event AccountCreated(uint256 indexed accountId, address indexed owner, bytes32 accountType)",
  "event BalanceUpdated(uint256 indexed accountId, uint256 timestamp, bytes32 updateType)",
  "event AuditInitiated(uint256 indexed accountId, uint256 indexed auditId, bytes32 auditType)",
  "event AuditCompleted(uint256 indexed accountId, uint256 indexed auditId)",
  "event AuditorTransferred(address indexed previousAuditor, address indexed newAuditor)"
]

interface AccountInfo {
  id: number
  isActive: boolean
  lastUpdated: number
  owner: string
  accountType: string
}

interface TransactionStatus {
  hash: string
  status: 'pending' | 'confirmed' | 'failed'
  type: string
  timestamp: number
}

interface NetworkInfo {
  chainId: string
  name: string
  isConnected: boolean
  blockNumber?: number
}

function App() {
  const [account, setAccount] = useState<string>('')
  const [contract, setContract] = useState<ethers.Contract | null>(null)
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null)
  const [signer, setSigner] = useState<ethers.Signer | null>(null)
  const [isAuditor, setIsAuditor] = useState<boolean>(false)
  const [userAccounts, setUserAccounts] = useState<AccountInfo[]>([])
  const [selectedAccount, setSelectedAccount] = useState<number | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [message, setMessage] = useState<string>('Connect your wallet to start using the Private Financial Audit System')
  const [activeTab, setActiveTab] = useState<'accounts' | 'audit' | 'transactions'>('accounts')
  const [transactionHistory, setTransactionHistory] = useState<TransactionStatus[]>([])
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo>({ chainId: '', name: '', isConnected: false })
  const [balance, setBalance] = useState<string>('0')
  const [gasPrice, setGasPrice] = useState<string>('0')

  // Form states
  const [accountType, setAccountType] = useState<string>('')
  const [initialBalance, setInitialBalance] = useState<string>('')
  const [updateType, setUpdateType] = useState<string>('deposit')
  const [updateAmount, setUpdateAmount] = useState<string>('')
  const [auditType, setAuditType] = useState<string>('')
  const [auditFilter, setAuditFilter] = useState<string>('all')
  const [auditAccountId, setAuditAccountId] = useState<string>("")

  const showMessage = (msg: string) => {
    setMessage(msg)
  }

  const setLoadingState = (isLoading: boolean) => {
    setLoading(isLoading)
  }

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        alert('Please install MetaMask wallet!')
        return
      }

      setLoadingState(true)
      showMessage('Connecting to MetaMask...')

      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      })

      const chainId = await window.ethereum.request({ method: 'eth_chainId' })
      const sepoliaChainId = '0xaa36a7'
      
      if (chainId !== sepoliaChainId) {
        try {
          showMessage('Switching to Sepolia Test Network...')
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: sepoliaChainId }],
          })
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            showMessage('Adding Sepolia Network...')
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: sepoliaChainId,
                chainName: 'Sepolia Test Network',
                rpcUrls: ['https://sepolia.infura.io/v3/', 'https://rpc.sepolia.org'],
                nativeCurrency: {
                  name: 'Sepolia ETH',
                  symbol: 'SepoliaETH',
                  decimals: 18
                },
                blockExplorerUrls: ['https://sepolia.etherscan.io/']
              }]
            })
          } else {
            throw switchError
          }
        }
      }

      const newProvider = new ethers.BrowserProvider(window.ethereum)
      const newSigner = await newProvider.getSigner()
      const contractInstance = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, newSigner)

      const network = await newProvider.getNetwork()
      const userBalance = await newProvider.getBalance(accounts[0])
      const currentGasPrice = await newProvider.getFeeData()
      const blockNumber = await newProvider.getBlockNumber()

      setProvider(newProvider)
      setSigner(newSigner)
      setContract(contractInstance)
      setAccount(accounts[0])
      setBalance(ethers.formatEther(userBalance))
      setGasPrice(ethers.formatUnits(currentGasPrice.gasPrice || 0, 'gwei'))
      setNetworkInfo({
        chainId: '0x' + network.chainId.toString(16),
        name: network.name,
        isConnected: true,
        blockNumber
      })

      showMessage('Successfully connected to Sepolia Test Network ✅')
      await loadUserData(contractInstance, accounts[0])
      setupEventListeners()

    } catch (error: any) {
      console.error('Wallet connection failed:', error)
      showMessage('Wallet connection failed: ' + (error.message || error))
    } finally {
      setLoadingState(false)
    }
  }

  const setupEventListeners = () => {
    if (!window.ethereum) return

    window.ethereum.on('accountsChanged', (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnectWallet()
      } else {
        setAccount(accounts[0])
        if (contract) {
          loadUserData(contract, accounts[0])
        }
      }
    })

    window.ethereum.on('chainChanged', (chainId: string) => {
      window.location.reload()
    })
  }

  const disconnectWallet = () => {
    setAccount('')
    setContract(null)
    setProvider(null)
    setSigner(null)
    setUserAccounts([])
    setSelectedAccount(null)
    setBalance('0')
    setNetworkInfo({ chainId: '', name: '', isConnected: false })
    showMessage('Wallet disconnected')
  }

  const loadUserData = async (contractInstance: ethers.Contract, userAddress: string) => {
    try {
      showMessage('Loading account data from blockchain...')

      const accountIds = await contractInstance.getUserAccounts(userAddress)
      const loadedAccounts: AccountInfo[] = []

      for (const id of accountIds) {
        try {
          const info = await contractInstance.getAccountInfo(id)
          loadedAccounts.push({
            id: Number(id),
            isActive: info[0],
            lastUpdated: Number(info[1]),
            owner: info[2],
            accountType: ethers.toUtf8String(info[3]).slice(0, 20)
          })
        } catch (error) {
          console.error(`Failed to load account ${id}:`, error)
        }
      }

      setUserAccounts(loadedAccounts)

      try {
        const auditorAddress = await contractInstance.auditor()
        setIsAuditor(auditorAddress.toLowerCase() === userAddress.toLowerCase())
      } catch (error) {
        console.error('Failed to check auditor status:', error)
        setIsAuditor(false)
      }

      showMessage('Account data loaded successfully ✅')

    } catch (error: any) {
      console.error('Failed to load user data:', error)
      showMessage('Failed to load user data: ' + error.message)
    }
  }

  const createAccount = async () => {
    if (!contract || !signer || !accountType || !initialBalance) {
      showMessage('Please select account type and enter initial balance')
      return
    }

    try {
      setLoadingState(true)
      showMessage('Estimating gas fees...')

      const balanceWei = ethers.parseEther(initialBalance)
      const encryptedBalance = ethers.toUtf8Bytes(balanceWei.toString())

      const gasEstimate = await contract.createAccount.estimateGas(
        encryptedBalance,
        accountType
      )
      
      const gasLimit = gasEstimate + (gasEstimate * 20n / 100n)
      const feeData = await provider!.getFeeData()
      const gasPrice = feeData.gasPrice!
      const estimatedCost = gasLimit * gasPrice

      showMessage(`Estimated Gas: ${gasLimit.toString()}, Fee: ${ethers.formatEther(estimatedCost)} ETH`)
      showMessage('Creating transaction, please confirm in MetaMask...')
      
      const txResponse = await contract.createAccount(
        encryptedBalance,
        accountType,
        {
          gasLimit: gasLimit,
          gasPrice: gasPrice
        }
      )

      const newTx: TransactionStatus = {
        hash: txResponse.hash,
        status: 'pending',
        type: `Create Account (${accountType})`,
        timestamp: Date.now()
      }
      setTransactionHistory(prev => [newTx, ...prev])

      showMessage(`Transaction submitted! Hash: ${txResponse.hash}`)
      showMessage('Waiting for block confirmation...')

      const receipt = await txResponse.wait()
      
      if (receipt.status === 1) {
        setTransactionHistory(prev => 
          prev.map(tx => 
            tx.hash === txResponse.hash 
              ? { ...tx, status: 'confirmed' as const }
              : tx
          )
        )
        
        showMessage(`Account created successfully! Block: ${receipt.blockNumber}`)
        
        setAccountType('')
        setInitialBalance('')
        await loadUserData(contract, account)
        
        const newBalance = await provider!.getBalance(account)
        setBalance(ethers.formatEther(newBalance))
        
      } else {
        throw new Error('Transaction failed')
      }

    } catch (error: any) {
      console.error('Account creation failed:', error)
      
      if (error.hash) {
        setTransactionHistory(prev => 
          prev.map(tx => 
            tx.hash === error.hash 
              ? { ...tx, status: 'failed' as const }
              : tx
          )
        )
      }
      
      let errorMessage = 'Account creation failed'
      if (error.code === 'ACTION_REJECTED') {
        errorMessage = 'User cancelled the transaction'
      } else if (error.code === 'INSUFFICIENT_FUNDS') {
        errorMessage = 'Insufficient ETH balance for gas fees'
      } else if (error.message) {
        errorMessage += ': ' + error.message
      }
      
      showMessage(errorMessage)
    } finally {
      setLoadingState(false)
    }
  }

  const updateAccountBalance = async () => {
    if (!contract || !signer || selectedAccount === null || !updateType || !updateAmount) {
      showMessage('Please select update type and enter amount')
      return
    }

    try {
      setLoadingState(true)
      showMessage('Estimating gas fees...')

      const amountWei = ethers.parseEther(updateAmount)
      const encryptedAmount = ethers.toUtf8Bytes(amountWei.toString())

      const gasEstimate = await contract.updateBalance.estimateGas(
        selectedAccount,
        encryptedAmount,
        updateType
      )
      
      const gasLimit = gasEstimate + (gasEstimate * 20n / 100n)
      const feeData = await provider!.getFeeData()
      const gasPrice = feeData.gasPrice!
      const estimatedCost = gasLimit * gasPrice

      showMessage(`Estimated Gas: ${gasLimit.toString()}, Fee: ${ethers.formatEther(estimatedCost)} ETH`)
      showMessage('Updating balance, please confirm in MetaMask...')
      
      const txResponse = await contract.updateBalance(
        selectedAccount,
        encryptedAmount,
        updateType,
        {
          gasLimit: gasLimit,
          gasPrice: gasPrice
        }
      )

      const newTx: TransactionStatus = {
        hash: txResponse.hash,
        status: 'pending',
        type: `Update Balance - ${updateType}`,
        timestamp: Date.now()
      }
      setTransactionHistory(prev => [newTx, ...prev])

      showMessage(`Transaction submitted! Hash: ${txResponse.hash}`)
      showMessage('Waiting for block confirmation...')

      const receipt = await txResponse.wait()
      
      if (receipt.status === 1) {
        setTransactionHistory(prev => 
          prev.map(tx => 
            tx.hash === txResponse.hash 
              ? { ...tx, status: 'confirmed' as const }
              : tx
          )
        )
        
        showMessage(`Balance updated successfully! Block: ${receipt.blockNumber}`)
        
        setUpdateType('deposit')
        setUpdateAmount('')
        await loadUserData(contract, account)
        
        const newBalance = await provider!.getBalance(account)
        setBalance(ethers.formatEther(newBalance))
        
      } else {
        throw new Error('Transaction failed')
      }

    } catch (error: any) {
      console.error('Balance update failed:', error)
      
      if (error.hash) {
        setTransactionHistory(prev => 
          prev.map(tx => 
            tx.hash === error.hash 
              ? { ...tx, status: 'failed' as const }
              : tx
          )
        )
      }
      
      let errorMessage = 'Balance update failed'
      if (error.code === 'ACTION_REJECTED') {
        errorMessage = 'User cancelled the transaction'
      } else if (error.code === 'INSUFFICIENT_FUNDS') {
        errorMessage = 'Insufficient ETH balance for gas fees'
      } else if (error.message) {
        errorMessage += ': ' + error.message
      }
      
      showMessage(errorMessage)
    } finally {
      setLoadingState(false)
    }
  }

  const initiateAudit = async (accountId: number) => {
    if (!contract || !signer || !isAuditor || !auditType) {
      showMessage('Please select audit type. Only auditors can initiate audits')
      return
    }

    try {
      setLoadingState(true)
      showMessage('Estimating gas fees...')

      const gasEstimate = await contract.initiateAudit.estimateGas(
        accountId,
        auditType
      )
      
      const gasLimit = gasEstimate + (gasEstimate * 20n / 100n)
      const feeData = await provider!.getFeeData()
      const gasPrice = feeData.gasPrice!
      const estimatedCost = gasLimit * gasPrice

      showMessage(`Estimated Gas: ${gasLimit.toString()}, Fee: ${ethers.formatEther(estimatedCost)} ETH`)
      showMessage('Initiating audit, please confirm in MetaMask...')
      
      const txResponse = await contract.initiateAudit(
        accountId,
        auditType,
        {
          gasLimit: gasLimit,
          gasPrice: gasPrice
        }
      )

      const newTx: TransactionStatus = {
        hash: txResponse.hash,
        status: 'pending',
        type: `Initiate Audit - ${auditType}`,
        timestamp: Date.now()
      }
      setTransactionHistory(prev => [newTx, ...prev])

      showMessage(`Audit transaction submitted! Hash: ${txResponse.hash}`)
      showMessage('Waiting for block confirmation...')

      const receipt = await txResponse.wait()
      
      if (receipt.status === 1) {
        setTransactionHistory(prev => 
          prev.map(tx => 
            tx.hash === txResponse.hash 
              ? { ...tx, status: 'confirmed' as const }
              : tx
          )
        )
        
        showMessage(`Audit initiated successfully! Block: ${receipt.blockNumber}`)
        
        setAuditType('')
        
        const newBalance = await provider!.getBalance(account)
        setBalance(ethers.formatEther(newBalance))
        
      } else {
        throw new Error('Transaction failed')
      }

    } catch (error: any) {
      console.error('Audit initiation failed:', error)
      
      if (error.hash) {
        setTransactionHistory(prev => 
          prev.map(tx => 
            tx.hash === error.hash 
              ? { ...tx, status: 'failed' as const }
              : tx
          )
        )
      }
      
      let errorMessage = 'Audit initiation failed'
      if (error.code === 'ACTION_REJECTED') {
        errorMessage = 'User cancelled the transaction'
      } else if (error.code === 'INSUFFICIENT_FUNDS') {
        errorMessage = 'Insufficient ETH balance for gas fees'
      } else if (error.message) {
        errorMessage += ': ' + error.message
      }
      
      showMessage(errorMessage)
    } finally {
      setLoadingState(false)
    }
  }

  return (
    <div className="app-container">
      {/* Header Section */}
      <div className="header-section">
        <div className="hero-content">
          <div className="hero-badge">
            <span className="badge-icon">🔒</span>
            <span>Privacy-First Financial Auditing</span>
          </div>
          <h1 className="hero-title">Private Financial Audit System</h1>
          <p className="hero-subtitle">
            Confidential financial auditing powered by Fully Homomorphic Encryption (FHE) technology.
            Secure, transparent, and privacy-preserving blockchain audits on Sepolia Testnet.
          </p>
          
          {!account ? (
            <div className="connect-section">
              <button 
                className="connect-btn" 
                onClick={connectWallet}
                disabled={loading}
              >
                {loading ? (
                  <div className="loading-spinner"></div>
                ) : (
                  <>
                    <span className="btn-icon">🦊</span>
                    <span>Connect MetaMask</span>
                  </>
                )}
              </button>
              <p className="connect-note">
                Connect your wallet to access encrypted financial accounts
              </p>
            </div>
          ) : (
            <div className="wallet-info">
              <div className="wallet-card">
                <div className="wallet-header">
                  <span className="wallet-icon">👤</span>
                  <div className="wallet-details">
                    <div className="wallet-address">
                      {account.slice(0, 6)}...{account.slice(-4)}
                    </div>
                    <div className="wallet-balance">
                      {parseFloat(balance).toFixed(4)} ETH
                    </div>
                  </div>
                  <button 
                    className="disconnect-btn"
                    onClick={disconnectWallet}
                    title="Disconnect Wallet"
                  >
                    ×
                  </button>
                </div>
                
                {networkInfo.isConnected && (
                  <div className="network-info">
                    <div className="network-item">
                      <span className="network-label">Network:</span>
                      <span className="network-value">{networkInfo.name}</span>
                    </div>
                    <div className="network-item">
                      <span className="network-label">Chain ID:</span>
                      <span className="network-value">{networkInfo.chainId}</span>
                    </div>
                    <div className="network-item">
                      <span className="network-label">Gas Price:</span>
                      <span className="network-value">{parseFloat(gasPrice).toFixed(2)} Gwei</span>
                    </div>
                    {networkInfo.blockNumber && (
                      <div className="network-item">
                        <span className="network-label">Block:</span>
                        <span className="network-value">{networkInfo.blockNumber}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status Message */}
      <div className="status-section">
        <div className="status-message">
          <span className="status-icon">ℹ️</span>
          <span>{message}</span>
        </div>
      </div>

      {/* Main Content */}
      {account && (
        <>
          {/* Tab Navigation */}
          <div className="tab-navigation">
            <button 
              className={`tab-button ${activeTab === 'accounts' ? 'active' : ''}`}
              onClick={() => setActiveTab('accounts')}
            >
              <span className="tab-icon">🏦</span>
              Account Management
            </button>
            <button 
              className={`tab-button ${activeTab === 'audit' ? 'active' : ''}`}
              onClick={() => setActiveTab('audit')}
            >
              <span className="tab-icon">🔍</span>
              Audit Functions
            </button>
            <button 
              className={`tab-button ${activeTab === 'transactions' ? 'active' : ''}`}
              onClick={() => setActiveTab('transactions')}
            >
              <span className="tab-icon">📊</span>
              Transaction History
            </button>
          </div>

          {/* Account Management Tab */}
          {activeTab === 'accounts' && (
            <div className="content-section">
              <div className="section-header">
                <h2 className="section-title">Account Management</h2>
                <p className="section-description">
                  Create and manage encrypted financial accounts. All data is protected using FHE technology.
                </p>
              </div>

              {/* Create Account Form */}
              <div className="form-card">
                <h3 className="form-title">Create New Account</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Account Type</label>
                    <select 
                      className="form-select" 
                      value={accountType}
                      onChange={(e) => setAccountType(e.target.value)}
                    >
                      <option value="">Select account type</option>
                      <option value="corporate">Corporate Account</option>
                      <option value="personal">Personal Account</option>
                      <option value="institutional">Institutional Account</option>
                      <option value="government">Government Account</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Initial Balance (ETH)</label>
                    <input
                      className="form-input"
                      type="number"
                      placeholder="0.000"
                      step="0.001"
                      min="0"
                      value={initialBalance}
                      onChange={(e) => setInitialBalance(e.target.value)}
                    />
                  </div>
                </div>
                
                {/* Preset Balance Options */}
                <div className="preset-section">
                  <label className="preset-label">Quick Amount:</label>
                  <div className="preset-buttons">
                    <button className="preset-btn" onClick={() => setInitialBalance('0.1')}>0.1 ETH</button>
                    <button className="preset-btn" onClick={() => setInitialBalance('0.5')}>0.5 ETH</button>
                    <button className="preset-btn" onClick={() => setInitialBalance('1.0')}>1.0 ETH</button>
                    <button className="preset-btn" onClick={() => setInitialBalance('5.0')}>5.0 ETH</button>
                  </div>
                </div>

                <button 
                  className="form-submit-btn" 
                  onClick={createAccount}
                  disabled={loading || !accountType || !initialBalance}
                >
                  {loading ? (
                    <>
                      <div className="loading-spinner"></div>
                      Creating Account...
                    </>
                  ) : (
                    <>
                      <span className="btn-icon">+</span>
                      Create Account
                    </>
                  )}
                </button>
              </div>

              {/* Account List */}
              <div className="accounts-section">
                <h3 className="section-title">My Accounts</h3>
                {userAccounts.length > 0 ? (
                  <div className="account-grid">
                    {userAccounts.map((acc) => (
                      <div key={acc.id} className={`account-card ${selectedAccount === acc.id ? 'selected' : ''}`}>
                        <div className="account-header">
                          <div className="account-id">Account #{acc.id}</div>
                          <div className={`account-status ${acc.isActive ? 'active' : 'inactive'}`}>
                            {acc.isActive ? 'Active' : 'Inactive'}
                          </div>
                        </div>
                        <div className="account-details">
                          <div className="account-detail">
                            <span className="detail-label">Type:</span>
                            <span className="detail-value">{acc.accountType || 'Unknown'}</span>
                          </div>
                          <div className="account-detail">
                            <span className="detail-label">Last Updated:</span>
                            <span className="detail-value">{new Date(acc.lastUpdated * 1000).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <button 
                          className={`select-account-btn ${selectedAccount === acc.id ? 'selected' : ''}`}
                          onClick={() => setSelectedAccount(acc.id)}
                          disabled={!acc.isActive}
                        >
                          {selectedAccount === acc.id ? '✓ Selected' : 'Select'}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <div className="empty-icon">🏦</div>
                    <div className="empty-title">No Accounts Yet</div>
                    <div className="empty-description">Create your first encrypted account to get started</div>
                  </div>
                )}
              </div>

              {/* Balance Update Section */}
              {selectedAccount !== null && (
                <div className="form-card">
                  <h3 className="form-title">Update Balance - Account #{selectedAccount}</h3>
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">Operation Type</label>
                      <select 
                        className="form-select" 
                        value={updateType}
                        onChange={(e) => setUpdateType(e.target.value)}
                      >
                        <option value="deposit">Deposit</option>
                        <option value="withdraw">Withdraw</option>
                        <option value="transfer">Transfer</option>
                        <option value="payment">Payment</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Amount (ETH)</label>
                      <input
                        className="form-input"
                        type="number"
                        placeholder="0.000"
                        step="0.001"
                        min="0"
                        value={updateAmount}
                        onChange={(e) => setUpdateAmount(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  {/* Preset Update Amounts */}
                  <div className="preset-section">
                    <label className="preset-label">Quick Amount:</label>
                    <div className="preset-buttons">
                      <button className="preset-btn" onClick={() => setUpdateAmount('0.01')}>0.01 ETH</button>
                      <button className="preset-btn" onClick={() => setUpdateAmount('0.1')}>0.1 ETH</button>
                      <button className="preset-btn" onClick={() => setUpdateAmount('1.0')}>1.0 ETH</button>
                      <button className="preset-btn" onClick={() => setUpdateAmount('10.0')}>10.0 ETH</button>
                    </div>
                  </div>

                  <button 
                    className="form-submit-btn update-btn" 
                    onClick={updateAccountBalance}
                    disabled={loading || !updateAmount}
                  >
                    {loading ? (
                      <>
                        <div className="loading-spinner"></div>
                        Updating Balance...
                      </>
                    ) : (
                      <>
                        <span className="btn-icon">💰</span>
                        Update Balance
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Audit Tab */}
          {activeTab === 'audit' && (
            <div className="content-section">
              <div className="section-header">
                <h2 className="section-title">Audit Functions</h2>
                <p className="section-description">
                  {isAuditor 
                    ? 'As an auditor, you can perform privacy-preserving audits on encrypted accounts' 
                    : 'View audit records for your accounts. Only authorized auditors can initiate new audits'
                  }
                </p>
              </div>

              {isAuditor ? (
                <>
{/* Audit Configuration */}                  <div className="form-card">                    <h3 className="form-title">Initiate Audit</h3>                    <div className="form-grid">                      <div className="form-group">                        <label className="form-label">Audit Type</label>                        <select                           className="form-select"                           value={auditType}                          onChange={(e) => setAuditType(e.target.value)}                        >                          <option value="">Select audit type</option>                          <option value="compliance">Compliance Audit</option>                          <option value="financial">Financial Audit</option>                          <option value="operational">Operational Audit</option>                          <option value="security">Security Audit</option>                        </select>                      </div>                      <div className="form-group">                        <label className="form-label">Account ID to Audit</label>                        <input                          className="form-input"                          type="number"                          placeholder="Enter account ID"                          min="0"                          value={auditAccountId}                          onChange={(e) => setAuditAccountId(e.target.value)}                        />                      </div>                    </div>                                        <button                       className="form-submit-btn audit-submit-btn"                      onClick={() => auditAccountId && initiateAudit(parseInt(auditAccountId))}                      disabled={loading || !auditType || !auditAccountId}                    >                      {loading ? (                        <>                          <div className="loading-spinner"></div>                          Initiating Audit...                        </>                      ) : (                        <>                          <span className="btn-icon">🔍</span>                          Initiate Audit                        </>                      )}                    </button>                  </div>
                  <div className="account-grid">
                    {userAccounts.map((acc) => (
                      <div key={acc.id} className="account-card audit-card">
                        <div className="account-header">
                          <div className="account-id">Account #{acc.id}</div>
                          <div className={`account-status ${acc.isActive ? 'active' : 'inactive'}`}>
                            {acc.isActive ? 'Auditable' : 'Inactive'}
                          </div>
                        </div>
                        <div className="account-details">
                          <div className="account-detail">
                            <span className="detail-label">Type:</span>
                            <span className="detail-value">{acc.accountType || 'Unknown'}</span>
                          </div>
                          <div className="account-detail">
                            <span className="detail-label">Last Updated:</span>
                            <span className="detail-value">{new Date(acc.lastUpdated * 1000).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <button 
                          className="audit-btn"
                          onClick={() => initiateAudit(acc.id)}
                          disabled={loading || !acc.isActive || !auditType}
                        >
                          <span className="btn-icon">🔍</span>
                          Initiate Audit
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  {/* Audit History Filters */}
                  <div className="form-card">
                    <h3 className="form-title">Audit History</h3>
                    <div className="form-grid">
                      <div className="form-group">
                        <label className="form-label">Filter by Status</label>
                        <select 
                          className="form-select" 
                          value={auditFilter}
                          onChange={(e) => setAuditFilter(e.target.value)}
                        >
                          <option value="all">All Audits</option>
                          <option value="pending">Pending</option>
                          <option value="completed">Completed</option>
                          <option value="failed">Failed</option>
                        </select>
                      </div>
                      <button className="form-submit-btn secondary">
                        <span className="btn-icon">🔍</span>
                        Search Records
                      </button>
                    </div>
                  </div>
                  
                  <div className="empty-state">
                    <div className="empty-icon">📋</div>
                    <div className="empty-title">No Audit Records</div>
                    <div className="empty-description">
                      Audit records will appear here when auditors review your accounts
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Transaction History Tab */}
          {activeTab === 'transactions' && (
            <div className="content-section">
              <div className="section-header">
                <h2 className="section-title">Transaction History</h2>
                <p className="section-description">
                  Track all your blockchain transactions and their status
                </p>
              </div>

              {transactionHistory.length > 0 ? (
                <div className="transaction-list">
                  {transactionHistory.map((tx, index) => (
                    <div key={index} className={`transaction-card ${tx.status}`}>
                      <div className="transaction-header">
                        <div className="transaction-type">{tx.type}</div>
                        <div className={`transaction-status status-${tx.status}`}>
                          {tx.status === 'pending' && '🔄 Pending'}
                          {tx.status === 'confirmed' && '✅ Confirmed'}
                          {tx.status === 'failed' && '❌ Failed'}
                        </div>
                      </div>
                      <div className="transaction-details">
                        <div className="transaction-detail">
                          <span className="detail-label">Transaction Hash:</span>
                          <a 
                            href={`https://sepolia.etherscan.io/tx/${tx.hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="detail-link"
                          >
                            {tx.hash.slice(0, 10)}...{tx.hash.slice(-8)}
                          </a>
                        </div>
                        <div className="transaction-detail">
                          <span className="detail-label">Timestamp:</span>
                          <span className="detail-value">
                            {new Date(tx.timestamp).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">📊</div>
                  <div className="empty-title">No Transactions Yet</div>
                  <div className="empty-description">
                    Your transaction history will appear here after you perform blockchain operations
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Footer */}
      <div className="footer-section">
        <div className="footer-content">
          <div className="footer-info">
            <p>© 2024 Private Financial Audit System</p>
            <p>Powered by Zama FHEVM • Built on Sepolia Testnet</p>
          </div>
          <div className="footer-links">
            <a href="#" className="footer-link">Documentation</a>
            <a href="#" className="footer-link">Privacy Policy</a>
            <a href="#" className="footer-link">Support</a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App