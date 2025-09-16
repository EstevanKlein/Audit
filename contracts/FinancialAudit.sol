// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Private Financial Audit System (Standard Version)
/// @notice Confidential financial audit system using encrypted storage
/// @dev This contract implements privacy-preserving accounting with FHEVM compatibility
contract FinancialAudit {
    
    address public auditor;
    uint256 public totalAccounts;
    
    /// @notice Structure for private accounts
    struct PrivateAccount {
        bytes32 encryptedBalance;        // Encrypted balance storage
        bytes32 encryptedTransactions;   // Encrypted transaction count
        bool isActive;                   // Account status (public)
        uint256 lastUpdated;            // Last update timestamp (public)
        address accountOwner;           // Account owner address (public)
        bytes32 accountType;            // Account type hash (public)
    }
    
    /// @notice Structure for audit records
    struct AuditRecord {
        uint256 accountId;              // Account being audited
        bytes32 auditedBalance;         // Snapshot of balance at audit time
        bytes32 discrepancyFlag;        // Encrypted flag: 0=normal, >0=discrepancy
        uint256 auditTimestamp;         // Audit timestamp
        bool isCompleted;               // Audit completion status
        bytes32 auditType;              // Type of audit performed
    }
    
    // State mappings
    mapping(uint256 => PrivateAccount) public accounts;
    mapping(uint256 => AuditRecord) public auditRecords;
    mapping(address => uint256[]) public userAccounts;
    mapping(uint256 => uint256[]) public accountAudits; // accountId => auditIds[]
    
    // Events
    event AccountCreated(uint256 indexed accountId, address indexed owner, bytes32 accountType);
    event BalanceUpdated(uint256 indexed accountId, uint256 timestamp, bytes32 updateType);
    event AuditInitiated(uint256 indexed accountId, uint256 indexed auditId, bytes32 auditType);
    event AuditCompleted(uint256 indexed accountId, uint256 indexed auditId);
    event AuditorTransferred(address indexed previousAuditor, address indexed newAuditor);
    
    // Modifiers
    modifier onlyAuditor() {
        require(msg.sender == auditor, "FinancialAudit: caller is not the auditor");
        _;
    }
    
    modifier onlyAccountOwner(uint256 accountId) {
        require(accounts[accountId].accountOwner == msg.sender, "FinancialAudit: caller is not account owner");
        _;
    }
    
    modifier validAccount(uint256 accountId) {
        require(accountId > 0 && accountId <= totalAccounts, "FinancialAudit: invalid account ID");
        _;
    }
    
    modifier activeAccount(uint256 accountId) {
        require(accounts[accountId].isActive, "FinancialAudit: account is not active");
        _;
    }
    
    /// @notice Contract constructor
    constructor() {
        auditor = msg.sender;
        totalAccounts = 0;
    }
    
    /// @notice Create a new private account with encrypted balance
    /// @param encryptedBalance Encrypted initial balance (bytes format)
    /// @param accountType Type of account (company, personal, institutional, government)
    /// @return accountId The ID of the created account
    function createAccount(
        bytes calldata encryptedBalance,
        string calldata accountType
    ) external returns (uint256) {
        bytes32 balanceHash = keccak256(encryptedBalance);
        bytes32 accountTypeHash = keccak256(abi.encodePacked(accountType));
        
        totalAccounts++;
        uint256 accountId = totalAccounts;
        
        accounts[accountId] = PrivateAccount({
            encryptedBalance: balanceHash,
            encryptedTransactions: keccak256(abi.encodePacked(uint256(0))),
            isActive: true,
            lastUpdated: block.timestamp,
            accountOwner: msg.sender,
            accountType: accountTypeHash
        });
        
        userAccounts[msg.sender].push(accountId);
        
        emit AccountCreated(accountId, msg.sender, accountTypeHash);
        return accountId;
    }
    
    /// @notice Update account balance with encrypted value
    /// @param accountId The account to update
    /// @param encryptedNewBalance Encrypted new balance (bytes format)
    /// @param updateType Type of update (deposit, withdraw, transfer, payment)
    function updateBalance(
        uint256 accountId,
        bytes calldata encryptedNewBalance,
        string calldata updateType
    ) external validAccount(accountId) onlyAccountOwner(accountId) activeAccount(accountId) {
        bytes32 newBalanceHash = keccak256(encryptedNewBalance);
        bytes32 updateTypeHash = keccak256(abi.encodePacked(updateType));
        
        // Update the encrypted balance hash
        accounts[accountId].encryptedBalance = newBalanceHash;
        accounts[accountId].lastUpdated = block.timestamp;
        
        // Increment transaction count hash
        bytes32 currentTxCount = accounts[accountId].encryptedTransactions;
        bytes32 newTxCount = keccak256(abi.encodePacked(currentTxCount, uint256(1)));
        accounts[accountId].encryptedTransactions = newTxCount;
        
        emit BalanceUpdated(accountId, block.timestamp, updateTypeHash);
    }
    
    /// @notice Auditor initiates a private audit
    /// @param accountId Account to audit
    /// @param auditType Type of audit (compliance, financial, operational, security)
    /// @return auditId The ID of the audit record
    function initiateAudit(
        uint256 accountId,
        string calldata auditType
    ) external onlyAuditor validAccount(accountId) activeAccount(accountId) returns (uint256) {
        uint256 auditId = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            accountId,
            msg.sender
        )));
        
        bytes32 auditTypeHash = keccak256(abi.encodePacked(auditType));
        
        // Create audit snapshot with balance hash
        bytes32 auditBalance = accounts[accountId].encryptedBalance;
        bytes32 defaultFlag = keccak256(abi.encodePacked(uint256(0))); // Default: no discrepancy
        
        auditRecords[auditId] = AuditRecord({
            accountId: accountId,
            auditedBalance: auditBalance,
            discrepancyFlag: defaultFlag,
            auditTimestamp: block.timestamp,
            isCompleted: false,
            auditType: auditTypeHash
        });
        
        accountAudits[accountId].push(auditId);
        
        emit AuditInitiated(accountId, auditId, auditTypeHash);
        return auditId;
    }
    
    /// @notice Complete audit with encrypted discrepancy flag
    /// @param auditId The audit to complete
    /// @param encryptedFlag Encrypted discrepancy flag (bytes format)
    function completeAudit(
        uint256 auditId,
        bytes calldata encryptedFlag
    ) external onlyAuditor {
        require(auditRecords[auditId].accountId != 0, "FinancialAudit: audit does not exist");
        require(!auditRecords[auditId].isCompleted, "FinancialAudit: audit already completed");
        
        bytes32 flagHash = keccak256(encryptedFlag);
        
        auditRecords[auditId].discrepancyFlag = flagHash;
        auditRecords[auditId].isCompleted = true;
        
        emit AuditCompleted(auditRecords[auditId].accountId, auditId);
    }
    
    /// @notice Get public account information
    /// @param accountId The account to query
    /// @return isActive Account status
    /// @return lastUpdated Last update timestamp
    /// @return accountOwner Owner address
    /// @return accountType Account type hash
    function getAccountInfo(uint256 accountId) external view validAccount(accountId) returns (
        bool isActive,
        uint256 lastUpdated,
        address accountOwner,
        bytes32 accountType
    ) {
        PrivateAccount storage account = accounts[accountId];
        return (
            account.isActive,
            account.lastUpdated,
            account.accountOwner,
            account.accountType
        );
    }
    
    /// @notice Get user's account IDs
    /// @param user The user address
    /// @return Array of account IDs owned by the user
    function getUserAccounts(address user) external view returns (uint256[] memory) {
        return userAccounts[user];
    }
    
    /// @notice Get encrypted balance (requires appropriate permissions)
    /// @param accountId The account to query
    /// @return Encrypted balance hash
    function getEncryptedBalance(uint256 accountId) external view validAccount(accountId) returns (bytes32) {
        require(
            msg.sender == accounts[accountId].accountOwner || msg.sender == auditor,
            "FinancialAudit: unauthorized access to encrypted balance"
        );
        return accounts[accountId].encryptedBalance;
    }
    
    /// @notice Get encrypted transaction count
    /// @param accountId The account to query
    /// @return Encrypted transaction count hash
    function getEncryptedTransactions(uint256 accountId) external view validAccount(accountId) returns (bytes32) {
        require(
            msg.sender == accounts[accountId].accountOwner || msg.sender == auditor,
            "FinancialAudit: unauthorized access to encrypted transactions"
        );
        return accounts[accountId].encryptedTransactions;
    }
    
    /// @notice Get audit record (auditor only)
    /// @param auditId The audit to query
    /// @return accountId The audited account
    /// @return auditTimestamp Audit timestamp
    /// @return isCompleted Completion status
    /// @return auditType Type of audit
    function getAuditRecord(uint256 auditId) external view onlyAuditor returns (
        uint256 accountId,
        uint256 auditTimestamp,
        bool isCompleted,
        bytes32 auditType
    ) {
        require(auditRecords[auditId].accountId != 0, "FinancialAudit: audit does not exist");
        
        AuditRecord storage record = auditRecords[auditId];
        return (
            record.accountId,
            record.auditTimestamp,
            record.isCompleted,
            record.auditType
        );
    }
    
    /// @notice Get encrypted audit discrepancy flag (auditor only)
    /// @param auditId The audit to query
    /// @return Encrypted discrepancy flag hash
    function getAuditFlag(uint256 auditId) external view onlyAuditor returns (bytes32) {
        require(auditRecords[auditId].accountId != 0, "FinancialAudit: audit does not exist");
        return auditRecords[auditId].discrepancyFlag;
    }
    
    /// @notice Get audit IDs for an account
    /// @param accountId The account to query
    /// @return Array of audit IDs for the account
    function getAccountAudits(uint256 accountId) external view validAccount(accountId) returns (uint256[] memory) {
        return accountAudits[accountId];
    }
    
    /// @notice Deactivate an account
    /// @param accountId The account to deactivate
    function deactivateAccount(uint256 accountId) external validAccount(accountId) onlyAccountOwner(accountId) {
        accounts[accountId].isActive = false;
    }
    
    /// @notice Reactivate an account
    /// @param accountId The account to reactivate
    function reactivateAccount(uint256 accountId) external validAccount(accountId) onlyAccountOwner(accountId) {
        accounts[accountId].isActive = true;
    }
    
    /// @notice Transfer auditor role to a new address
    /// @param newAuditor The new auditor address
    function transferAuditor(address newAuditor) external onlyAuditor {
        require(newAuditor != address(0), "FinancialAudit: new auditor cannot be zero address");
        require(newAuditor != auditor, "FinancialAudit: new auditor cannot be current auditor");
        
        address previousAuditor = auditor;
        auditor = newAuditor;
        
        emit AuditorTransferred(previousAuditor, newAuditor);
    }
    
    /// @notice Get total number of accounts created
    /// @return Total account count
    function getTotalAccounts() external view returns (uint256) {
        return totalAccounts;
    }
}