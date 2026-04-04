const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MUSD Stablecoin", function () {
  let musd;
  let owner;
  let artist;
  let label;
  let publisher;
  let operator;
  
  const CONTENT_ID = ethers.keccak256(ethers.toUtf8Bytes("song-123"));
  const BASIS_POINTS = 10000n;

  beforeEach(async function () {
    [owner, artist, label, publisher, operator] = await ethers.getSigners();
    
    const MUSD = await ethers.getContractFactory("MUSD");
    musd = await MUSD.deploy(owner.address);
    await musd.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right name and symbol", async function () {
      expect(await musd.name()).to.equal("Muzix USD");
      expect(await musd.symbol()).to.equal("MUSD");
    });

    it("Should set the right owner", async function () {
      expect(await musd.owner()).to.equal(owner.address);
    });

    it("Should mint initial supply to owner", async function () {
      const amount = ethers.parseEther("1000000"); // 1M MUSD
      await musd.mint(owner.address, amount);
      expect(await musd.balanceOf(owner.address)).to.equal(amount);
    });
  });

  describe("Royalty Split Configuration", function () {
    it("Should allow owner to configure royalty split", async function () {
      const recipients = [artist.address, label.address];
      const percentages = [6000n, 4000n]; // 60% / 40%
      
      await musd.configureRoyaltySplit(CONTENT_ID, recipients, percentages);
      
      const split = await musd.getRoyaltySplit(CONTENT_ID);
      expect(split.active).to.be.true;
      expect(split.recipients).to.deep.equal(recipients);
      expect(split.percentages).to.deep.equal(percentages);
    });

    it("Should allow authorized operator to configure split", async function () {
      await musd.setOperatorAuthorization(operator.address, true);
      
      const recipients = [artist.address, label.address];
      const percentages = [5000n, 5000n];
      
      await musd.connect(operator).configureRoyaltySplit(CONTENT_ID, recipients, percentages);
      
      const split = await musd.getRoyaltySplit(CONTENT_ID);
      expect(split.active).to.be.true;
    });

    it("Should reject non-authorized users", async function () {
      const recipients = [artist.address];
      const percentages = [10000n];
      
      await expect(
        musd.connect(artist).configureRoyaltySplit(CONTENT_ID, recipients, percentages)
      ).to.be.revertedWithCustomError(musd, "NotAuthorized");
    });

    it("Should reject invalid percentage totals", async function () {
      const recipients = [artist.address, label.address];
      const percentages = [6000n, 3000n]; // Only 90%
      
      await expect(
        musd.configureRoyaltySplit(CONTENT_ID, recipients, percentages)
      ).to.be.revertedWithCustomError(musd, "PercentageMismatch");
    });

    it("Should reject zero recipients", async function () {
      await expect(
        musd.configureRoyaltySplit(CONTENT_ID, [], [])
      ).to.be.revertedWithCustomError(musd, "InvalidRecipientCount");
    });

    it("Should reject more than 10 recipients", async function () {
      const recipients = Array(11).fill(artist.address);
      const percentages = Array(11).fill(909n); // ~10% each
      
      await expect(
        musd.configureRoyaltySplit(CONTENT_ID, recipients, percentages)
      ).to.be.revertedWithCustomError(musd, "InvalidRecipientCount");
    });
  });

  describe("Royalty Transfers", function () {
    beforeEach(async function () {
      // Mint tokens to owner
      await musd.mint(owner.address, ethers.parseEther("10000"));
      
      // Configure royalty split: Artist 40%, Label 30%, Publisher 30%
      await musd.configureRoyaltySplit(
        CONTENT_ID,
        [artist.address, label.address, publisher.address],
        [4000n, 3000n, 3000n]
      );
    });

    it("Should transfer with royalty split", async function () {
      const amount = ethers.parseEther("1000");
      
      await musd.transferWithRoyalty(CONTENT_ID, amount);
      
      // Check balances
      expect(await musd.balanceOf(artist.address)).to.equal(ethers.parseEther("400")); // 40%
      expect(await musd.balanceOf(label.address)).to.equal(ethers.parseEther("300"));  // 30%
      expect(await musd.balanceOf(publisher.address)).to.equal(ethers.parseEther("300")); // 30%
    });

    it("Should emit RoyaltyDistributed event", async function () {
      const amount = ethers.parseEther("1000");
      
      await expect(musd.transferWithRoyalty(CONTENT_ID, amount))
        .to.emit(musd, "RoyaltyDistributed")
        .withArgs(CONTENT_ID, owner.address, amount, 3);
    });

    it("Should handle transfer without configured split", async function () {
      const newContentId = ethers.keccak256(ethers.toUtf8Bytes("song-456"));
      const amount = ethers.parseEther("1000");
      
      // Transfer without configuring split - should work but behavior depends on implementation
      await musd.transferWithRoyalty(newContentId, amount);
      // Balance should go back to sender (no split configured)
    });

    it("Should calculate correct royalty shares", async function () {
      const amount = ethers.parseEther("1000");
      
      const artistShare = await musd.calculateRoyaltyShare(CONTENT_ID, amount, 0);
      const labelShare = await musd.calculateRoyaltyShare(CONTENT_ID, amount, 1);
      const publisherShare = await musd.calculateRoyaltyShare(CONTENT_ID, amount, 2);
      
      expect(artistShare).to.equal(ethers.parseEther("400"));
      expect(labelShare).to.equal(ethers.parseEther("300"));
      expect(publisherShare).to.equal(ethers.parseEther("300"));
    });
  });

  describe("Batch Transfers", function () {
    beforeEach(async function () {
      await musd.mint(owner.address, ethers.parseEther("10000"));
      
      // Configure splits for two content IDs
      await musd.configureRoyaltySplit(
        CONTENT_ID,
        [artist.address, label.address],
        [7000n, 3000n]
      );
      
      const contentId2 = ethers.keccak256(ethers.toUtf8Bytes("song-456"));
      await musd.configureRoyaltySplit(
        contentId2,
        [artist.address, publisher.address],
        [5000n, 5000n]
      );
    });

    it("Should handle batch transfers", async function () {
      const contentId2 = ethers.keccak256(ethers.toUtf8Bytes("song-456"));
      const amounts = [ethers.parseEther("1000"), ethers.parseEther("2000")];
      
      await musd.batchTransferWithRoyalty([CONTENT_ID, contentId2], amounts);
      
      // First transfer: 700 to artist, 300 to label
      // Second transfer: 1000 to artist, 1000 to publisher
      expect(await musd.balanceOf(artist.address)).to.equal(ethers.parseEther("1700"));
      expect(await musd.balanceOf(label.address)).to.equal(ethers.parseEther("300"));
      expect(await musd.balanceOf(publisher.address)).to.equal(ethers.parseEther("1000"));
    });
  });

  describe("Access Control", function () {
    it("Should only allow owner to mint", async function () {
      await expect(
        musd.connect(artist).mint(artist.address, ethers.parseEther("1000"))
      ).to.be.revertedWithCustomError(musd, "OwnableUnauthorizedAccount");
    });

    it("Should only allow owner to authorize operators", async function () {
      await expect(
        musd.connect(artist).setOperatorAuthorization(operator.address, true)
      ).to.be.revertedWithCustomError(musd, "OwnableUnauthorizedAccount");
    });

    it("Should only allow owner to pause/unpause", async function () {
      await expect(
        musd.connect(artist).pause()
      ).to.be.revertedWithCustomError(musd, "OwnableUnauthorizedAccount");
    });
  });

  describe("Pause Functionality", function () {
    it("Should pause and unpause transfers", async function () {
      await musd.mint(owner.address, ethers.parseEther("1000"));
      await musd.pause();
      
      await expect(
        musd.transfer(artist.address, ethers.parseEther("100"))
      ).to.be.revertedWithCustomError(musd, "EnforcedPause");
      
      await musd.unpause();
      
      await expect(musd.transfer(artist.address, ethers.parseEther("100")))
        .to.not.be.reverted;
    });

    it("Should prevent royalty transfers when paused", async function () {
      await musd.mint(owner.address, ethers.parseEther("1000"));
      await musd.configureRoyaltySplit(CONTENT_ID, [artist.address], [10000n]);
      await musd.pause();
      
      await expect(
        musd.transferWithRoyalty(CONTENT_ID, ethers.parseEther("100"))
      ).to.be.revertedWithCustomError(musd, "EnforcedPause");
    });
  });
});
