const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DecentraSpaceMVP", function () {
  let decentraSpace;
  let owner;
  let creator1;
  let creator2;
  let user1;
  let user2;

  beforeEach(async function () {
    // Get signers
    [owner, creator1, creator2, user1, user2] = await ethers.getSigners();

    // Deploy contract
    const DecentraSpace = await ethers.getContractFactory("DecentraSpaceMVP");
    decentraSpace = await DecentraSpace.deploy();
    await decentraSpace.waitForDeployment();
  });

  describe("Creator Registration", function () {
    it("Should register a new creator", async function () {
      await decentraSpace.connect(creator1).registerCreator(
        "Alice Creator",
        "Content creator specializing in tech"
      );

      const creator = await decentraSpace.getCreator(creator1.address);
      expect(creator.name).to.equal("Alice Creator");
      expect(creator.description).to.equal("Content creator specializing in tech");
      expect(creator.totalEarnings).to.equal(0);
      expect(creator.contentCount).to.equal(0);
      expect(creator.liveRoomCount).to.equal(0);
    });

    it("Should fail if creator already registered", async function () {
      await decentraSpace.connect(creator1).registerCreator(
        "Alice Creator",
        "Description"
      );

      await expect(
        decentraSpace.connect(creator1).registerCreator(
          "Alice Again",
          "New description"
        )
      ).to.be.revertedWithCustomError(decentraSpace, "AlreadyRegistered");
    });

    it("Should fail with empty name", async function () {
      await expect(
        decentraSpace.connect(creator1).registerCreator("", "Description")
      ).to.be.revertedWithCustomError(decentraSpace, "InvalidInput");
    });

    it("Should track total creators", async function () {
      await decentraSpace.connect(creator1).registerCreator("Creator 1", "Desc 1");
      await decentraSpace.connect(creator2).registerCreator("Creator 2", "Desc 2");

      const stats = await decentraSpace.getPlatformStats();
      expect(stats.creatorsCount).to.equal(2);
    });
  });

  describe("Creator Profile Update", function () {
    beforeEach(async function () {
      await decentraSpace.connect(creator1).registerCreator(
        "Original Name",
        "Original Description"
      );
    });

    it("Should update creator profile", async function () {
      await decentraSpace.connect(creator1).updateCreator(
        "New Name",
        "New Description"
      );

      const creator = await decentraSpace.getCreator(creator1.address);
      expect(creator.name).to.equal("New Name");
      expect(creator.description).to.equal("New Description");
    });

    it("Should fail if not registered", async function () {
      await expect(
        decentraSpace.connect(creator2).updateCreator("Name", "Desc")
      ).to.be.revertedWithCustomError(decentraSpace, "NotRegistered");
    });
  });

  describe("Content Upload", function () {
    beforeEach(async function () {
      await decentraSpace.connect(creator1).registerCreator("Creator", "Desc");
    });

    it("Should upload content", async function () {
      await decentraSpace.connect(creator1).uploadContent(
        "My First Video",
        "ipfs://QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco"
      );

      const content = await decentraSpace.getContent("content_1");
      expect(content.title).to.equal("My First Video");
      expect(content.creator).to.equal(creator1.address);
      expect(content.views).to.equal(0);
      expect(content.tipsReceived).to.equal(0);
    });

    it("Should increment creator's content count", async function () {
      await decentraSpace.connect(creator1).uploadContent("Video 1", "cid1");
      await decentraSpace.connect(creator1).uploadContent("Video 2", "cid2");

      const creator = await decentraSpace.getCreator(creator1.address);
      expect(creator.contentCount).to.equal(2);
    });

    it("Should fail if not registered creator", async function () {
      await expect(
        decentraSpace.connect(user1).uploadContent("Title", "cid")
      ).to.be.revertedWithCustomError(decentraSpace, "NotRegistered");
    });

    it("Should track creator's content", async function () {
      await decentraSpace.connect(creator1).uploadContent("Video 1", "cid1");
      await decentraSpace.connect(creator1).uploadContent("Video 2", "cid2");

      const contents = await decentraSpace.getCreatorContents(creator1.address);
      expect(contents.length).to.equal(2);
      expect(contents[0]).to.equal("content_1");
      expect(contents[1]).to.equal("content_2");
    });
  });

  describe("Content Viewing", function () {
    beforeEach(async function () {
      await decentraSpace.connect(creator1).registerCreator("Creator", "Desc");
      await decentraSpace.connect(creator1).uploadContent("Video", "cid");
    });

    it("Should increment view count", async function () {
      await decentraSpace.connect(user1).viewContent("content_1");
      await decentraSpace.connect(user2).viewContent("content_1");

      const content = await decentraSpace.getContent("content_1");
      expect(content.views).to.equal(2);
    });
  });

  describe("Live Rooms", function () {
    beforeEach(async function () {
      await decentraSpace.connect(creator1).registerCreator("Creator", "Desc");
    });

    it("Should create a live room", async function () {
      await decentraSpace.connect(creator1).createLiveRoom(
        "Live Coding Session",
        "Join me for live coding!",
        "https://huddle01.com/room/abc123"
      );

      const room = await decentraSpace.getLiveRoom("room_1");
      expect(room.title).to.equal("Live Coding Session");
      expect(room.creator).to.equal(creator1.address);
      expect(room.isLive).to.be.true;
      expect(room.participantCount).to.equal(0);
    });

    it("Should update live room status", async function () {
      await decentraSpace.connect(creator1).createLiveRoom(
        "Live Session",
        "Description",
        "https://huddle01.com/room/abc"
      );

      await decentraSpace.connect(creator1).updateLiveRoomStatus("room_1", false);
      
      const room = await decentraSpace.getLiveRoom("room_1");
      expect(room.isLive).to.be.false;
    });

    it("Should handle participants joining and leaving", async function () {
      await decentraSpace.connect(creator1).createLiveRoom(
        "Live Session",
        "Description",
        "https://huddle01.com/room/abc"
      );

      await decentraSpace.connect(user1).joinLiveRoom("room_1");
      await decentraSpace.connect(user2).joinLiveRoom("room_1");

      let room = await decentraSpace.getLiveRoom("room_1");
      expect(room.participantCount).to.equal(2);

      await decentraSpace.connect(user1).leaveLiveRoom("room_1");
      
      room = await decentraSpace.getLiveRoom("room_1");
      expect(room.participantCount).to.equal(1);
    });

    it("Should fail to join non-live room", async function () {
      await decentraSpace.connect(creator1).createLiveRoom(
        "Live Session",
        "Description",
        "https://huddle01.com/room/abc"
      );
      
      await decentraSpace.connect(creator1).updateLiveRoomStatus("room_1", false);

      await expect(
        decentraSpace.connect(user1).joinLiveRoom("room_1")
      ).to.be.revertedWithCustomError(decentraSpace, "RoomNotLive");
    });
  });

  describe("Tipping System", function () {
    beforeEach(async function () {
      await decentraSpace.connect(creator1).registerCreator("Creator", "Desc");
      await decentraSpace.connect(creator1).uploadContent("Video", "cid");
      await decentraSpace.connect(creator1).createLiveRoom(
        "Live Session",
        "Description",
        "https://huddle01.com/room/abc"
      );
    });

    it("Should tip creator directly", async function () {
      const tipAmount = ethers.parseEther("1");
      const initialBalance = await ethers.provider.getBalance(creator1.address);

      await decentraSpace.connect(user1).tipCreator(creator1.address, { value: tipAmount });

      const creator = await decentraSpace.getCreator(creator1.address);
      expect(creator.totalEarnings).to.equal(tipAmount);

      const finalBalance = await ethers.provider.getBalance(creator1.address);
      expect(finalBalance).to.equal(initialBalance + tipAmount);
    });

    it("Should tip content", async function () {
      const tipAmount = ethers.parseEther("0.5");

      await decentraSpace.connect(user1).tipContent("content_1", { value: tipAmount });

      const content = await decentraSpace.getContent("content_1");
      expect(content.tipsReceived).to.equal(tipAmount);

      const creator = await decentraSpace.getCreator(creator1.address);
      expect(creator.totalEarnings).to.equal(tipAmount);
    });

    it("Should tip live room", async function () {
      const tipAmount = ethers.parseEther("2");

      await decentraSpace.connect(user1).tipLiveRoom("room_1", { value: tipAmount });

      const creator = await decentraSpace.getCreator(creator1.address);
      expect(creator.totalEarnings).to.equal(tipAmount);
    });

    it("Should fail to tip yourself", async function () {
      await expect(
        decentraSpace.connect(creator1).tipCreator(creator1.address, { value: ethers.parseEther("1") })
      ).to.be.revertedWithCustomError(decentraSpace, "CannotTipYourself");
    });

    it("Should track total platform tips", async function () {
      await decentraSpace.connect(user1).tipCreator(creator1.address, { value: ethers.parseEther("1") });
      await decentraSpace.connect(user2).tipContent("content_1", { value: ethers.parseEther("0.5") });

      const stats = await decentraSpace.getPlatformStats();
      expect(stats.totalTipsAmount).to.equal(ethers.parseEther("1.5"));
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      // Register multiple creators
      await decentraSpace.connect(creator1).registerCreator("Creator 1", "Desc 1");
      await decentraSpace.connect(creator2).registerCreator("Creator 2", "Desc 2");
      
      // Upload content
      await decentraSpace.connect(creator1).uploadContent("Video 1", "cid1");
      await decentraSpace.connect(creator2).uploadContent("Video 2", "cid2");
      
      // Create live rooms
      await decentraSpace.connect(creator1).createLiveRoom("Room 1", "Desc", "link1");
      await decentraSpace.connect(creator2).createLiveRoom("Room 2", "Desc", "link2");
    });

    it("Should get featured creators", async function () {
      const featured = await decentraSpace.getFeaturedCreators();
      expect(featured.length).to.equal(2);
      expect(featured[0]).to.equal(creator2.address); // Latest first
      expect(featured[1]).to.equal(creator1.address);
    });

    it("Should get latest content", async function () {
      const latest = await decentraSpace.getLatestContent();
      expect(latest.length).to.equal(2);
      expect(latest[0]).to.equal("content_2"); // Latest first
      expect(latest[1]).to.equal("content_1");
    });

    it("Should get active live rooms", async function () {
      await decentraSpace.connect(creator1).updateLiveRoomStatus("room_1", false);
      
      const active = await decentraSpace.getActiveLiveRooms();
      expect(active.length).to.equal(1);
      expect(active[0]).to.equal("room_2"); // Only active room
    });

    it("Should check if creator is registered", async function () {
      expect(await decentraSpace.isCreatorRegistered(creator1.address)).to.be.true;
      expect(await decentraSpace.isCreatorRegistered(user1.address)).to.be.false;
    });
  });
});