const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MUSD Stablecoin", function () {
  let musd, admin, minter, user1, user2, user3;

  beforeEach(async function () {
    [admin, minter, user1, user2, user3] = await ethers.getSigners();
    const MUSD = await ethers.getContractFactory("MUSD");
    musd = await MUSD.deploy(admin.address);
    await musd.waitForDeployment();
  });

  // ──────────────── Deployment ────────────────

  describe("Deployment", function () {
    it("1. should set name and symbol correctly", async function () {
      expect(await musd.name()).to.equal("Muzix USD");
      expect(await musd.symbol()).to.equal("MUSD");
    });

    it("2. should grant admin DEFAULT_ADMIN_ROLE", async function () {
      const role = await musd.DEFAULT_ADMIN_ROLE();
      expect(await musd.hasRole(role, admin.address)).to.be.true;
    });

    it("3. should grant admin MINTER_ROLE", async function () {
      expect(await musd.isMinter(admin.address)).to.be.true;
    });

    it("4. should revert deployment with zero admin address", async function () {
      const MUSD = await ethers.getContractFactory("MUSD");
      await expect(MUSD.deploy(ethers.ZeroAddress)).to.be.revertedWith("MUSD: zero admin");
    });
  });

  // ──────────────── Minting ────────────────

  describe("Minting", function () {
    it("5. should allow minter to mint tokens", async function () {
      await musd.connect(admin).mint(user1.address, ethers.parseEther("1000"));
      expect(await musd.balanceOf(user1.address)).to.equal(ethers.parseEther("1000"));
    });

    it("6. should emit Minted event", async function () {
      await expect(musd.connect(admin).mint(user1.address, ethers.parseEther("500")))
        .to.emit(musd, "Minted")
        .withArgs(user1.address, ethers.parseEther("500"));
    });

    it("7. should revert mint from non-minter", async function () {
      await expect(
        musd.connect(user1).mint(user1.address, ethers.parseEther("100"))
      ).to.be.reverted;
    });

    it("8. should revert mint to zero address", async function () {
      await expect(
        musd.connect(admin).mint(ethers.ZeroAddress, ethers.parseEther("100"))
      ).to.be.revertedWith("MUSD: mint to zero");
    });

    it("9. should revert mint of zero amount", async function () {
      await expect(
        musd.connect(admin).mint(user1.address, 0)
      ).to.be.revertedWith("MUSD: zero amount");
    });
  });

  // ──────────────── Burning ────────────────

  describe("Burning", function () {
    beforeEach(async function () {
      await musd.connect(admin).mint(user1.address, ethers.parseEther("1000"));
    });

    it("10. should allow a holder to burn their tokens", async function () {
      await musd.connect(user1).burn(ethers.parseEther("400"));
      expect(await musd.balanceOf(user1.address)).to.equal(ethers.parseEther("600"));
    });

    it("11. should emit Burned event", async function () {
      await expect(musd.connect(user1).burn(ethers.parseEther("100")))
        .to.emit(musd, "Burned")
        .withArgs(user1.address, ethers.parseEther("100"));
    });

    it("12. should revert burn of zero amount", async function () {
      await expect(musd.connect(user1).burn(0)).to.be.revertedWith("MUSD: zero amount");
    });

    it("13. should revert burn exceeding balance", async function () {
      await expect(
        musd.connect(user1).burn(ethers.parseEther("2000"))
      ).to.be.reverted;
    });
  });

  // ──────────────── Minter Management ────────────────

  describe("Minter Management", function () {
    it("14. should allow admin to add a minter", async function () {
      await expect(musd.connect(admin).addMinter(minter.address))
        .to.emit(musd, "MinterAdded")
        .withArgs(minter.address);
      expect(await musd.isMinter(minter.address)).to.be.true;
    });

    it("15. should allow admin to remove a minter", async function () {
      await musd.connect(admin).addMinter(minter.address);
      await expect(musd.connect(admin).removeMinter(minter.address))
        .to.emit(musd, "MinterRemoved")
        .withArgs(minter.address);
      expect(await musd.isMinter(minter.address)).to.be.false;
    });

    it("16. should revert addMinter from non-admin", async function () {
      await expect(
        musd.connect(user1).addMinter(minter.address)
      ).to.be.reverted;
    });

    it("17. should revert addMinter with zero address", async function () {
      await expect(
        musd.connect(admin).addMinter(ethers.ZeroAddress)
      ).to.be.revertedWith("MUSD: zero address");
    });
  });

  // ──────────────── Pause ────────────────

  describe("Pausable", function () {
    it("18. should allow admin to pause", async function () {
      await musd.connect(admin).pause();
      expect(await musd.paused()).to.be.true;
    });

    it("19. should block transfers when paused", async function () {
      await musd.connect(admin).mint(user1.address, ethers.parseEther("100"));
      await musd.connect(admin).pause();
      await expect(
        musd.connect(user1).transfer(user2.address, ethers.parseEther("10"))
      ).to.be.reverted;
    });

    it("20. should allow transfers after unpause", async function () {
      await musd.connect(admin).mint(user1.address, ethers.parseEther("100"));
      await musd.connect(admin).pause();
      await musd.connect(admin).unpause();
      await musd.connect(user1).transfer(user2.address, ethers.parseEther("10"));
      expect(await musd.balanceOf(user2.address)).to.equal(ethers.parseEther("10"));
    });

    it("21. should revert pause from non-admin", async function () {
      await expect(musd.connect(user1).pause()).to.be.reverted;
    });
  });

  // ──────────────── Splitter Registry ────────────────

  describe("Splitter Registry", function () {
    it("22. should register a splitter", async function () {
      await expect(musd.connect(admin).registerSplitter(user1.address))
        .to.emit(musd, "RoyaltySplitterRegistered")
        .withArgs(user1.address);
      expect(await musd.isRegisteredSplitter(user1.address)).to.be.true;
    });

    it("23. should unregister a splitter", async function () {
      await musd.connect(admin).registerSplitter(user1.address);
      await expect(musd.connect(admin).unregisterSplitter(user1.address))
        .to.emit(musd, "RoyaltySplitterUnregistered")
        .withArgs(user1.address);
      expect(await musd.isRegisteredSplitter(user1.address)).to.be.false;
    });

    it("24. should revert register from non-admin", async function () {
      await expect(
        musd.connect(user1).registerSplitter(user2.address)
      ).to.be.reverted;
    });

    it("25. should revert double registration", async function () {
      await musd.connect(admin).registerSplitter(user1.address);
      await expect(
        musd.connect(admin).registerSplitter(user1.address)
      ).to.be.revertedWith("MUSD: already registered");
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// RoyaltySplitter Tests
// ═══════════════════════════════════════════════════════════════════════════

describe("RoyaltySplitter", function () {
  let musd, splitter, admin, artist1, artist2, artist3, sender;

  beforeEach(async function () {
    [admin, artist1, artist2, artist3, sender] = await ethers.getSigners();

    const MUSD = await ethers.getContractFactory("MUSD");
    musd = await MUSD.deploy(admin.address);
    await musd.waitForDeployment();

    const Splitter = await ethers.getContractFactory("RoyaltySplitter");
    splitter = await Splitter.deploy(await musd.getAddress(), admin.address);
    await splitter.waitForDeployment();

    // Register splitter in MUSD
    await musd.connect(admin).registerSplitter(await splitter.getAddress());
  });

  // ──────────────── Beneficiary Management ────────────────

  describe("Beneficiary Management", function () {
    it("26. should set a beneficiary", async function () {
      await expect(splitter.connect(admin).setBeneficiary(artist1.address, 5000))
        .to.emit(splitter, "BeneficiarySet")
        .withArgs(artist1.address, 5000);
      expect(await splitter.getShare(artist1.address)).to.equal(5000);
    });

    it("27. should add multiple beneficiaries", async function () {
      await splitter.connect(admin).setBeneficiary(artist1.address, 5000);
      await splitter.connect(admin).setBeneficiary(artist2.address, 3000);
      await splitter.connect(admin).setBeneficiary(artist3.address, 2000);
      expect(await splitter.totalShares()).to.equal(10000);
      const beneficiaries = await splitter.getBeneficiaries();
      expect(beneficiaries.length).to.equal(3);
    });

    it("28. should update an existing beneficiary's share", async function () {
      await splitter.connect(admin).setBeneficiary(artist1.address, 5000);
      await splitter.connect(admin).setBeneficiary(artist1.address, 7000);
      expect(await splitter.getShare(artist1.address)).to.equal(7000);
      expect(await splitter.totalShares()).to.equal(7000);
    });

    it("29. should remove a beneficiary", async function () {
      await splitter.connect(admin).setBeneficiary(artist1.address, 5000);
      await expect(splitter.connect(admin).removeBeneficiary(artist1.address))
        .to.emit(splitter, "BeneficiaryRemoved")
        .withArgs(artist1.address);
      expect(await splitter.totalShares()).to.equal(0);
    });

    it("30. should revert setBeneficiary from non-owner", async function () {
      await expect(
        splitter.connect(artist1).setBeneficiary(artist1.address, 5000)
      ).to.be.reverted;
    });

    it("31. should revert if shares exceed 100%", async function () {
      await splitter.connect(admin).setBeneficiary(artist1.address, 8000);
      await expect(
        splitter.connect(admin).setBeneficiary(artist2.address, 3000)
      ).to.be.revertedWith("Splitter: exceeds 100%");
    });

    it("32. should revert setBeneficiary with zero address", async function () {
      await expect(
        splitter.connect(admin).setBeneficiary(ethers.ZeroAddress, 5000)
      ).to.be.revertedWith("Splitter: zero address");
    });

    it("33. should revert setBeneficiary with zero shares", async function () {
      await expect(
        splitter.connect(admin).setBeneficiary(artist1.address, 0)
      ).to.be.revertedWith("Splitter: zero shares");
    });

    it("34. should revert removeBeneficiary for non-beneficiary", async function () {
      await expect(
        splitter.connect(admin).removeBeneficiary(artist1.address)
      ).to.be.revertedWith("Splitter: not a beneficiary");
    });
  });

  // ──────────────── Royalty Split on Transfer ────────────────

  describe("Royalty Split on Transfer", function () {
    beforeEach(async function () {
      // Setup: 50/30/20 split
      await splitter.connect(admin).setBeneficiary(artist1.address, 5000);
      await splitter.connect(admin).setBeneficiary(artist2.address, 3000);
      await splitter.connect(admin).setBeneficiary(artist3.address, 2000);

      // Fund sender
      await musd.connect(admin).mint(sender.address, ethers.parseEther("10000"));
    });

    it("35. should atomically split royalties on transfer to splitter", async function () {
      const amount = ethers.parseEther("1000");
      const splitterAddr = await splitter.getAddress();

      await musd.connect(sender).transfer(splitterAddr, amount);

      // artist1 gets 50%, artist2 30%, artist3 20%
      expect(await musd.balanceOf(artist1.address)).to.equal(ethers.parseEther("500"));
      expect(await musd.balanceOf(artist2.address)).to.equal(ethers.parseEther("300"));
      expect(await musd.balanceOf(artist3.address)).to.equal(ethers.parseEther("200"));
    });

    it("36. should emit RoyaltySplit event", async function () {
      const amount = ethers.parseEther("1000");
      const splitterAddr = await splitter.getAddress();

      await expect(musd.connect(sender).transfer(splitterAddr, amount))
        .to.emit(splitter, "RoyaltySplit");
    });

    it("37. should emit RoyaltyDistributed events for each beneficiary", async function () {
      const amount = ethers.parseEther("1000");
      const splitterAddr = await splitter.getAddress();

      await expect(musd.connect(sender).transfer(splitterAddr, amount))
        .to.emit(splitter, "RoyaltyDistributed")
        .withArgs(artist1.address, ethers.parseEther("500"));
    });

    it("38. should handle small amounts with rounding", async function () {
      const splitterAddr = await splitter.getAddress();
      // 3 wei split 50/30/20 → 1/0/0 (dust stays in splitter)
      await musd.connect(sender).transfer(splitterAddr, 3n);

      expect(await musd.balanceOf(artist1.address)).to.equal(1n);
      expect(await musd.balanceOf(artist2.address)).to.equal(0n);
      expect(await musd.balanceOf(artist3.address)).to.equal(0n);
      // Dust remains in splitter
      expect(await musd.balanceOf(splitterAddr)).to.equal(2n);
    });

    it("39. should not trigger hook for normal (non-splitter) transfer", async function () {
      await musd.connect(sender).transfer(artist1.address, ethers.parseEther("100"));
      expect(await musd.balanceOf(artist1.address)).to.equal(ethers.parseEther("100"));
    });

    it("40. should work with transferFrom via approval", async function () {
      const splitterAddr = await splitter.getAddress();
      const amount = ethers.parseEther("600");

      await musd.connect(sender).approve(admin.address, amount);
      await musd.connect(admin).transferFrom(sender.address, splitterAddr, amount);

      expect(await musd.balanceOf(artist1.address)).to.equal(ethers.parseEther("300"));
      expect(await musd.balanceOf(artist2.address)).to.equal(ethers.parseEther("180"));
      expect(await musd.balanceOf(artist3.address)).to.equal(ethers.parseEther("120"));
    });
  });

  // ──────────────── Edge Cases ────────────────

  describe("Edge Cases", function () {
    it("41. should revert onRoyaltyReceived from non-MUSD caller", async function () {
      await expect(
        splitter.connect(admin).onRoyaltyReceived(admin.address, 100)
      ).to.be.revertedWith("Splitter: caller not MUSD");
    });

    it("42. should revert split with no beneficiaries", async function () {
      await musd.connect(admin).mint(sender.address, ethers.parseEther("100"));
      const splitterAddr = await splitter.getAddress();
      // No beneficiaries set → revert
      await expect(
        musd.connect(sender).transfer(splitterAddr, ethers.parseEther("100"))
      ).to.be.revertedWith("Splitter: no beneficiaries");
    });

    it("43. should handle single beneficiary getting 100%", async function () {
      await splitter.connect(admin).setBeneficiary(artist1.address, 10000);
      await musd.connect(admin).mint(sender.address, ethers.parseEther("500"));
      const splitterAddr = await splitter.getAddress();

      await musd.connect(sender).transfer(splitterAddr, ethers.parseEther("500"));
      expect(await musd.balanceOf(artist1.address)).to.equal(ethers.parseEther("500"));
    });

    it("44. should return correct MUSD address from splitter", async function () {
      expect(await splitter.musd()).to.equal(await musd.getAddress());
    });

    it("45. should revert deploy splitter with zero MUSD address", async function () {
      const Splitter = await ethers.getContractFactory("RoyaltySplitter");
      await expect(
        Splitter.deploy(ethers.ZeroAddress, admin.address)
      ).to.be.revertedWith("Splitter: zero MUSD");
    });
  });
});
