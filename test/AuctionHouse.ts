import { expect } from "chai";
import hre from "hardhat";
import { Artifact } from "hardhat/types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { BigNumber } from "@ethersproject/bignumber";

import {
  AuctionHouse,
  MockToken,
} from "../typechain";
import { Signers } from "../types";

const { deployContract } = hre.waffle;

describe("Auction House", () => {
  // Contract artifacts
  let auctionArtifact: Artifact;
  let auctionHouseArtifact: Artifact;
  let fungibleTokenArtifact: Artifact;

  // Wallet addresses.
  const wallets = {} as Signers;

  // Deployed contracts. These get refreshed per test.
  let auctionHouse: AuctionHouse;
  let mockTokenA: MockToken;
  let mockTokenB: MockToken;

  // Shared test constants
  const oneToken = BigNumber.from("1000000000000000000");
  const tokensToTransfer: BigNumber = oneToken.mul("2000"); // two thousand
  const tokensToAuction: BigNumber = oneToken.mul("1000"); // one thousand
  const maxPrice: BigNumber = BigNumber.from("10"); // ten
  const minPrice: BigNumber = BigNumber.from("5"); // five


  before(async () => {
    let signers: SignerWithAddress[] = await hre.ethers.getSigners();

    wallets.admin = signers[0];
    wallets.auctioneer = signers[1];
    wallets.bidderX = signers[2];

    auctionArtifact = await hre.artifacts.readArtifact("FungibleAuction");
    auctionHouseArtifact = await hre.artifacts.readArtifact("AuctionHouse");
    fungibleTokenArtifact = await hre.artifacts.readArtifact('MockToken');
  });

  beforeEach(async () => {
    const mockTokenASupply: BigNumber = oneToken.mul(BigNumber.from(1e5));
    const mockTokenBSupply: BigNumber = oneToken.mul(BigNumber.from(1e8));

    auctionHouse = <AuctionHouse>await deployContract(wallets.admin, auctionHouseArtifact, []);
    mockTokenA = <MockToken>await deployContract(
      wallets.admin,
      fungibleTokenArtifact,
      ["Mock Inverse DAO", "MINV", mockTokenASupply],
    )
    mockTokenB = <MockToken>await deployContract(
      wallets.admin,
      fungibleTokenArtifact,
      ["Mock LP tokens", "MLP", mockTokenBSupply],
    );
  });

  describe("Deployments",  () => {
    it('should have zero active auctions at creation', async () => {
      expect(await auctionHouse.getActiveAuctionCount()).to.equal(0);
    });

    it('should accept new auctions', async () => {
      // Send tokens to auctioneer
      await mockTokenA.connect(wallets.admin).transfer(wallets.auctioneer.address, tokensToTransfer);
      expect(await mockTokenA.balanceOf(wallets.auctioneer.address)).to.equal(tokensToTransfer);

      // Approve token transfer
      await mockTokenA.connect(wallets.auctioneer).approve(auctionHouse.address, tokensToTransfer);

      // Create auction
      const currentTimestamp: number = Math.floor(Date.now() / 1000);
      await auctionHouse.connect(wallets.auctioneer).createFungible(
        mockTokenA.address,
        mockTokenB.address,
        tokensToAuction,
        BigNumber.from(currentTimestamp),
        BigNumber.from("600"),
        maxPrice,
        minPrice,
      );

      expect(await auctionHouse.getActiveAuctionCount()).to.equal(1);
      expect(await auctionHouse.getFungibleAuction(0)).to.not.equal('0x0000000000000000000000000000000000000000');
    });

    it('should revert if auctioneer has insufficient funds', async () => {
      const currentTimestamp: number = Math.floor(Date.now() / 1000);
      await expect(auctionHouse.connect(wallets.auctioneer).createFungible(
        mockTokenA.address,
        mockTokenB.address,
        tokensToAuction,
        BigNumber.from(currentTimestamp),
        BigNumber.from("600"),
        maxPrice,
        minPrice,
      )).to.be.revertedWith("AuctionHouse: Creator not liquid enough");
    });

    it('should revert if auctioneer has not approved', async () => {
      // Send tokens to auctioneer
      await mockTokenA.connect(wallets.admin).transfer(wallets.auctioneer.address, tokensToTransfer);
      expect(await mockTokenA.balanceOf(wallets.auctioneer.address)).to.equal(tokensToTransfer);

      const currentTimestamp: number = Math.floor(Date.now() / 1000);

      await expect(auctionHouse.connect(wallets.auctioneer).createFungible(
        mockTokenA.address,
        mockTokenB.address,
        tokensToAuction,
        BigNumber.from(currentTimestamp),
        BigNumber.from("600"),
        maxPrice,
        minPrice,
      )).to.be.revertedWith("AuctionHouse: Not approved");
    });
  });
});
