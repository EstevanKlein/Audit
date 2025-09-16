import { expect } from "chai";
import { ethers } from "hardhat";
import { FinancialAudit } from "../types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("FinancialAudit", function () {
  let privateAudit: FinancialAudit;
  let auditor: HardhatEthersSigner;
  let accountOwner: HardhatEthersSigner;
  let otherUser: HardhatEthersSigner;

  beforeEach(async function () {
    [auditor, accountOwner, otherUser] = await ethers.getSigners();
    
    const FinancialAuditFactory = await ethers.getContractFactory("FinancialAudit");
    privateAudit = await FinancialAuditFactory.deploy();
    await privateAudit.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct auditor", async function () {
      expect(await privateAudit.auditor()).to.equal(auditor.address);
    });

    it("Should initialize with zero total accounts", async function () {
      expect(Number(await privateAudit.getTotalAccounts())).to.equal(0);
    });
  });

  describe("Account Management", function () {
    it("Should create a new account", async function () {
      const initialBalance = ethers.toUtf8Bytes("1000");
      const accountType = "company";
      
      const tx = await privateAudit.connect(accountOwner).createAccount(
        initialBalance,
        accountType
      );
      
      await expect(tx)
        .to.emit(privateAudit, "AccountCreated")
        .withArgs(1, accountOwner.address, ethers.keccak256(ethers.toUtf8Bytes(accountType)));
      
      expect(await privateAudit.getTotalAccounts()).to.equal(1);
    });

    it("Should get account information", async function () {
      const initialBalance = ethers.toUtf8Bytes("1000");
      const accountType = "personal";
      
      await privateAudit.connect(accountOwner).createAccount(
        initialBalance,
        accountType
      );
      
      const [isActive, lastUpdated, owner, accType] = await privateAudit.getAccountInfo(1);
      
      expect(isActive).to.be.true;
      expect(owner).to.equal(accountOwner.address);
      expect(accType).to.equal(ethers.keccak256(ethers.toUtf8Bytes(accountType)));
    });

    it("Should update account balance", async function () {
      const initialBalance = ethers.toUtf8Bytes("1000");
      const newBalance = ethers.toUtf8Bytes("1500");
      const accountType = "company";
      const updateType = "deposit";
      
      await privateAudit.connect(accountOwner).createAccount(
        initialBalance,
        accountType
      );
      
      const tx = await privateAudit.connect(accountOwner).updateBalance(
        1,
        newBalance,
        updateType
      );
      
      await expect(tx)
        .to.emit(privateAudit, "BalanceUpdated")
        .withArgs(1, await ethers.provider.getBlock("latest").then(b => b!.timestamp), ethers.keccak256(ethers.toUtf8Bytes(updateType)));
    });

    it("Should deactivate and reactivate account", async function () {
      const initialBalance = ethers.toUtf8Bytes("1000");
      const accountType = "personal";
      
      await privateAudit.connect(accountOwner).createAccount(
        initialBalance,
        accountType
      );
      
      // Deactivate
      await privateAudit.connect(accountOwner).deactivateAccount(1);
      const [isActive1] = await privateAudit.getAccountInfo(1);
      expect(isActive1).to.be.false;
      
      // Reactivate
      await privateAudit.connect(accountOwner).reactivateAccount(1);
      const [isActive2] = await privateAudit.getAccountInfo(1);
      expect(isActive2).to.be.true;
    });
  });

  describe("Audit Management", function () {
    beforeEach(async function () {
      const initialBalance = ethers.toUtf8Bytes("1000");
      const accountType = "company";
      
      await privateAudit.connect(accountOwner).createAccount(
        initialBalance,
        accountType
      );
    });

    it("Should initiate an audit", async function () {
      const auditType = "compliance";
      
      const tx = await privateAudit.connect(auditor).initiateAudit(1, auditType);
      
      await expect(tx)
        .to.emit(privateAudit, "AuditInitiated");
    });

    it("Should complete an audit", async function () {
      const auditType = "financial";
      const discrepancyFlag = ethers.toUtf8Bytes("0"); // No discrepancy
      
      const tx1 = await privateAudit.connect(auditor).initiateAudit(1, auditType);
      const receipt = await tx1.wait();
      
      // Extract audit ID from event
      const event = receipt!.logs.find(log => {
        try {
          const parsed = privateAudit.interface.parseLog({
            topics: log.topics as string[],
            data: log.data
          });
          return parsed!.name === "AuditInitiated";
        } catch {
          return false;
        }
      });
      
      if (event) {
        const parsed = privateAudit.interface.parseLog({
          topics: event.topics as string[],
          data: event.data
        });
        const auditId = parsed!.args[1];
        
        const tx2 = await privateAudit.connect(auditor).completeAudit(auditId, discrepancyFlag);
        
        await expect(tx2)
          .to.emit(privateAudit, "AuditCompleted")
          .withArgs(1, auditId);
      }
    });
  });

  describe("Access Control", function () {
    it("Should revert if non-auditor tries to initiate audit", async function () {
      const initialBalance = ethers.toUtf8Bytes("1000");
      const accountType = "company";
      
      await privateAudit.connect(accountOwner).createAccount(
        initialBalance,
        accountType
      );
      
      await expect(
        privateAudit.connect(otherUser).initiateAudit(1, "compliance")
      ).to.be.revertedWith("FinancialAudit: caller is not the auditor");
    });

    it("Should revert if non-owner tries to update balance", async function () {
      const initialBalance = ethers.toUtf8Bytes("1000");
      const newBalance = ethers.toUtf8Bytes("1500");
      const accountType = "company";
      
      await privateAudit.connect(accountOwner).createAccount(
        initialBalance,
        accountType
      );
      
      await expect(
        privateAudit.connect(otherUser).updateBalance(1, newBalance, "deposit")
      ).to.be.revertedWith("FinancialAudit: caller is not account owner");
    });

    it("Should transfer auditor role", async function () {
      const tx = await privateAudit.connect(auditor).transferAuditor(otherUser.address);
      
      await expect(tx)
        .to.emit(privateAudit, "AuditorTransferred")
        .withArgs(auditor.address, otherUser.address);
      
      expect(await privateAudit.auditor()).to.equal(otherUser.address);
    });
  });
});