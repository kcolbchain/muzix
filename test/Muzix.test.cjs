const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MuzixCatalog", function () {
  let catalog;
  let owner, artist, producer, publisher;

  const metadata = {
    isrc: "USRC17607839",
    iswc: "T-910.475.238-1",
    title: "Test Song",
    artist: "Test Artist",
    album: "Test Album",
    releaseDate: Math.floor(Date.now() / 1000),
    catalogType: 0,
    isExplicit: false,
  };

  beforeEach(async function () {
    [owner, artist, producer, publisher] = await ethers.getSigners();
    const MuzixCatalog = await ethers.getContractFactory("MuzixCatalog");
    catalog = await MuzixCatalog.deploy();
  });

  describe("Minting", function () {
    it("mints a catalog token with correct metadata", async function () {
      const tx = await catalog.mint(
        artist.address,
        metadata,
        "https://api.muzix.com/metadata/1",
        [artist.address, producer.address],
        [7000, 3000],
        1000
      );
      await expect(tx).to.emit(catalog, "CatalogMinted");
      expect(await catalog.ownerOf(1)).to.equal(artist.address);
    });

    it("reverts when minting to zero address", async function () {
      await expect(
        catalog.mint(ethers.ZeroAddress, metadata, "uri", [artist.address], [10000], 500)
      ).to.be.revertedWithCustomError(catalog, "ZeroAddress");
    });

    it("reverts when royalty exceeds max 20%", async function () {
      await expect(
        catalog.mint(artist.address, metadata, "uri", [artist.address], [10000], 2500)
      ).to.be.revertedWithCustomError(catalog, "RoyaltyExceedsMax");
    });

    it("reverts when splits don't sum to 10000 bps", async function () {
      await expect(
        catalog.mint(artist.address, metadata, "uri", [artist.address, producer.address], [5000, 3000], 500)
      ).to.be.revertedWithCustomError(catalog, "InvalidSplitTotal");
    });

    it("reverts on split length mismatch", async function () {
      await expect(
        catalog.mint(artist.address, metadata, "uri", [artist.address], [5000, 5000], 500)
      ).to.be.revertedWithCustomError(catalog, "SplitLengthMismatch");
    });

    it("supports ERC-721 and ERC-2981 interfaces", async function () {
      expect(await catalog.supportsInterface("0x80ac58cd")).to.be.true;
      expect(await catalog.supportsInterface("0x2a55205a")).to.be.true;
    });
  });

  describe("ERC-2981 Royalties", function () {
    beforeEach(async function () {
      await catalog.mint(artist.address, metadata, "uri", [artist.address], [10000], 1500);
    });

    it("returns correct royalty info at 15%", async function () {
      const [receiver, amount] = await catalog.royaltyInfo(1, ethers.parseEther("1"));
      expect(receiver).to.equal(artist.address);
      expect(amount).to.equal(ethers.parseEther("0.15"));
    });
  });

  describe("Royalty Splits", function () {
    beforeEach(async function () {
      await catalog.mint(
        artist.address, metadata, "uri",
        [artist.address, producer.address, publisher.address],
        [5000, 3000, 2000], 1000
      );
    });

    it("stores splits correctly", async function () {
      const splits = await catalog.getSplits(1);
      expect(splits.length).to.equal(3);
      expect(splits[0].basisPoints).to.equal(5000);
      expect(splits[1].basisPoints).to.equal(3000);
      expect(splits[2].basisPoints).to.equal(2000);
    });

    it("distributes revenue proportionally", async function () {
      await catalog.distributeRevenue(1, 0, { value: ethers.parseEther("1") });
      expect(await catalog.getPendingForPayee(1, artist.address)).to.equal(ethers.parseEther("0.5"));
      expect(await catalog.getPendingForPayee(1, producer.address)).to.equal(ethers.parseEther("0.3"));
      expect(await catalog.getPendingForPayee(1, publisher.address)).to.equal(ethers.parseEther("0.2"));
    });

    it("allows payees to claim revenue", async function () {
      await catalog.distributeRevenue(1, 0, { value: ethers.parseEther("1") });
      const balBefore = await ethers.provider.getBalance(producer.address);
      await catalog.claimRevenue(1, producer.address);
      const balAfter = await ethers.provider.getBalance(producer.address);
      expect(balAfter - balBefore).to.be.closeTo(ethers.parseEther("0.3"), ethers.parseEther("0.001"));
    });

    it("reverts claiming with no revenue", async function () {
      await expect(catalog.claimRevenue(1, artist.address)).to.be.revertedWithCustomError(catalog, "NoRevenueToClaim");
    });

    it("reports unclaimed revenue correctly", async function () {
      await catalog.distributeRevenue(1, 0, { value: ethers.parseEther("2") });
      expect(await catalog.getUnclaimedRevenue(1)).to.equal(ethers.parseEther("2"));
      await catalog.claimRevenue(1, artist.address);
      expect(await catalog.getUnclaimedRevenue(1)).to.equal(ethers.parseEther("1"));
    });
  });

  describe("Metadata", function () {
    it("allows owner to update metadata", async function () {
      await catalog.mint(artist.address, metadata, "uri", [artist.address], [10000], 500);
      const newMeta = { ...metadata, title: "Updated Song" };
      await expect(catalog.connect(artist).updateMetadata(1, newMeta)).to.emit(catalog, "MetadataUpdated");
      expect((await catalog.getMetadata(1)).title).to.equal("Updated Song");
    });

    it("reverts non-owner metadata update", async function () {
      await catalog.mint(artist.address, metadata, "uri", [artist.address], [10000], 500);
      await expect(
        catalog.connect(producer).updateMetadata(1, { ...metadata, title: "Hacked" })
      ).to.be.revertedWithCustomError(catalog, "NotTokenOwner");
    });
  });

  describe("Enumerable", function () {
    it("tracks total supply", async function () {
      await catalog.mint(artist.address, metadata, "uri1", [artist.address], [10000], 500);
      await catalog.mint(artist.address, metadata, "uri2", [artist.address], [10000], 500);
      expect(await catalog.totalSupply()).to.equal(2);
    });
  });
});

describe("MUSD", function () {
  let musd;
  let owner, splitter, distributor, artist, producer, platform;
  const MINT_LIMIT = ethers.parseUnits("1000000", 6);

  beforeEach(async function () {
    [owner, splitter, distributor, artist, producer, platform] = await ethers.getSigners();
    const MUSD = await ethers.getContractFactory("MUSD");
    musd = await MUSD.deploy(owner.address, MINT_LIMIT);
  });

  describe("Minting & Burning", function () {
    it("owner can mint", async function () {
      await musd.mint(artist.address, ethers.parseUnits("1000", 6));
      expect(await musd.balanceOf(artist.address)).to.equal(ethers.parseUnits("1000", 6));
    });

    it("respects mint limit", async function () {
      await expect(musd.mint(artist.address, MINT_LIMIT + 1n)).to.be.revertedWithCustomError(musd, "MintLimitExceeded");
    });

    it("users can burn", async function () {
      await musd.mint(artist.address, ethers.parseUnits("1000", 6));
      await musd.connect(artist).burn(ethers.parseUnits("500", 6));
      expect(await musd.balanceOf(artist.address)).to.equal(ethers.parseUnits("500", 6));
    });

    it("uses 6 decimals", async function () {
      expect(await musd.decimals()).to.equal(6);
    });
  });

  describe("Split Registration", function () {
    it("owner can register splits", async function () {
      await musd.registerSplit(1, [artist.address, producer.address], [7000, 3000]);
      const [payees, bps] = await musd.getSplit(1);
      expect(payees).to.deep.equal([artist.address, producer.address]);
      expect(bps).to.deep.equal([7000n, 3000n]);
    });

    it("authorized splitters can register", async function () {
      await musd.setSplitter(splitter.address, true);
      await musd.connect(splitter).registerSplit(1, [artist.address], [10000]);
      expect((await musd.getSplit(1))[0].length).to.equal(1);
    });

    it("unauthorized cannot register", async function () {
      await expect(
        musd.connect(splitter).registerSplit(1, [artist.address], [10000])
      ).to.be.revertedWithCustomError(musd, "NotDistributor");
    });

    it("reverts on invalid split totals", async function () {
      await expect(
        musd.registerSplit(1, [artist.address, producer.address], [5000, 3000])
      ).to.be.revertedWithCustomError(musd, "InvalidSplitTotal");
    });
  });

  describe("Transfer with Split", function () {
    beforeEach(async function () {
      await musd.registerSplit(1, [artist.address, producer.address], [7000, 3000]);
      await musd.mint(distributor.address, ethers.parseUnits("10000", 6));
      await musd.connect(distributor).approve(musd.target, ethers.parseUnits("10000", 6));
    });

    it("splits atomically on transfer", async function () {
      await musd.connect(distributor).transferWithSplit(1, ethers.parseUnits("1000", 6));
      expect(await musd.balanceOf(artist.address)).to.equal(ethers.parseUnits("700", 6));
      expect(await musd.balanceOf(producer.address)).to.equal(ethers.parseUnits("300", 6));
    });

    it("emits SplitExecuted event", async function () {
      await expect(
        musd.connect(distributor).transferWithSplit(1, ethers.parseUnits("1000", 6))
      ).to.emit(musd, "SplitExecuted");
    });

    it("reverts for unregistered catalog", async function () {
      await expect(
        musd.connect(distributor).transferWithSplit(999, ethers.parseUnits("100", 6))
      ).to.be.revertedWithCustomError(musd, "SplitNotRegistered");
    });

    it("reverts when insufficient allowance", async function () {
      await musd.connect(distributor).approve(musd.target, 0);
      await expect(
        musd.connect(distributor).transferWithSplit(1, ethers.parseUnits("100", 6))
      ).to.be.reverted;
    });
  });

  describe("Transfer with Split and Fee", function () {
    beforeEach(async function () {
      await musd.registerSplit(1, [artist.address], [10000]);
      await musd.mint(distributor.address, ethers.parseUnits("10000", 6));
      await musd.connect(distributor).approve(musd.target, ethers.parseUnits("10000", 6));
    });

    it("takes platform fee before split", async function () {
      await musd.connect(distributor).transferWithSplitAndFee(1, ethers.parseUnits("1000", 6), 500, platform.address);
      expect(await musd.balanceOf(platform.address)).to.equal(ethers.parseUnits("50", 6));
      expect(await musd.balanceOf(artist.address)).to.equal(ethers.parseUnits("950", 6));
    });
  });

  describe("Preview Split", function () {
    it("previews split amounts", async function () {
      await musd.registerSplit(1, [artist.address, producer.address], [7000, 3000]);
      const [, amounts] = await musd.previewSplit(1, ethers.parseUnits("1000", 6));
      expect(amounts[0]).to.equal(ethers.parseUnits("700", 6));
      expect(amounts[1]).to.equal(ethers.parseUnits("300", 6));
    });
  });
});
