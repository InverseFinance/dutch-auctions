import { expect } from "chai";
import hre from "hardhat";
import { Artifact } from "hardhat/types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { BigNumber } from "@ethersproject/bignumber";

import { AuctionHouse } from "../typechain";
import { MockToken } from "../typechain";
import { Signers } from "../types";

const { deployContract } = hre.waffle;

describe("Unit tests", function () {
  before(async function () {
    this.signers = {} as Signers;

    const signers: SignerWithAddress[] = await hre.ethers.getSigners();
    this.signers.admin = signers[0];
    this.signers.auctioneer = signers[1];
    this.signers.bidderX = signers[2];
  });

  describe("AuctionHouse", function () {
    beforeEach(async function () {
      const auctionHouseArtifact: Artifact = await hre.artifacts.readArtifact("AuctionHouse");
      const erc20Artifact: Artifact = await hre.artifacts.readArtifact('MockToken');
      const tokenCount: BigNumber = BigNumber.from("1000000000000000000000000"); // one million

      this.auctionHouse = <AuctionHouse>await deployContract(this.signers.admin, auctionHouseArtifact, []);
      this.tokenA = <MockToken>await deployContract(this.signers.admin, erc20Artifact, ["Test Token A", "TTA", tokenCount]);
      this.tokenB = <MockToken>await deployContract(this.signers.admin, erc20Artifact, ["Test Token B", "TTB", tokenCount]);
    });

    it('should have zero active auctions at creation', async function () {
      expect(await this.auctionHouse.connect(this.signers.admin).getActiveAuctionCount()).to.equal(0);
    });

    it('should accept new auctions', async function () {
      const oneToken = BigNumber.from("1000000000000000000");
      const tokensToTransfer: BigNumber = oneToken.mul("2000"); // two thousand
      const tokensToAuction: BigNumber = oneToken.mul("1000"); // one thousand
      const maxPrice: BigNumber = oneToken.mul("10"); // ten
      const minPrice: BigNumber = oneToken.mul("5"); // five

      // Send tokens to auctioneer
      await this.tokenA.connect(this.signers.admin).transfer(this.signers.auctioneer.getAddress(), tokensToTransfer);
      expect(await this.tokenA.connect(this.signers.auctioneer).balanceOf(this.signers.auctioneer.getAddress())).to.equal(tokensToTransfer);

      // Approve token transfer
      await this.tokenA.connect(this.signers.auctioneer).approve(this.auctionHouse.address, tokensToTransfer);

      // Create auction
      const currentTimestamp: number = Math.floor(Date.now() / 1000);
      await this.auctionHouse.connect(this.signers.auctioneer).createFungible(
        this.tokenA.address,
        this.tokenB.address,
        tokensToAuction,
        BigNumber.from(currentTimestamp),
        BigNumber.from("600"),
        maxPrice,
        minPrice,
      );

      expect(await this.auctionHouse.connect(this.signers.admin).getActiveAuctionCount()).to.equal(1);
    });

    it('should allow bid to buy everything', async function () {
      const oneToken = BigNumber.from("1000000000000000000");
      const tokensToTransfer: BigNumber = oneToken.mul("2000"); // two thousand
      const tokensToAuction: BigNumber = oneToken.mul("1000"); // one thousand
      const maxPrice: BigNumber = BigNumber.from("10"); // ten
      const minPrice: BigNumber = BigNumber.from("5"); // five
      const tokensToBid: BigNumber = tokensToAuction.mul(maxPrice);

      // Send tokens to auctioneer
      await this.tokenA.connect(this.signers.admin).transfer(this.signers.auctioneer.getAddress(), tokensToTransfer);

      // Approve token transfer
      await this.tokenA.connect(this.signers.auctioneer).approve(this.auctionHouse.address, tokensToAuction);

      // Create auction
      const currentTimestamp: number = Math.floor(Date.now() / 1000);
      await this.auctionHouse.connect(this.signers.auctioneer).createFungible(
        this.tokenA.address,
        this.tokenB.address,
        tokensToAuction,
        BigNumber.from(currentTimestamp),
        BigNumber.from("600"),
        maxPrice,
        minPrice,
      );

      // Send tokens to bidder
      await this.tokenB.connect(this.signers.admin).transfer(this.signers.bidderX.getAddress(), tokensToBid);

      // Approve bid tokens
      await this.tokenB.connect(this.signers.bidderX).approve(this.auctionHouse.getFungibleAuction(0), tokensToBid);

      const auctionContract = await hre.ethers.getContractAt('FungibleAuction', this.auctionHouse.getFungibleAuction(0));
      await auctionContract.connect(this.signers.bidderX).buy(tokensToAuction);

      // Should have received the requested number of tokens
      expect(await this.tokenA.connect(this.signers.bidderX).balanceOf(this.signers.bidderX.getAddress())).to.equal(tokensToAuction);

      // Should have paid in between the maxPrice and minPrice range
      expect(await this.tokenB.connect(this.signers.bidderX).balanceOf(this.signers.bidderX.getAddress())).to.lte(tokensToBid.sub(tokensToAuction.mul(minPrice)));
      expect(await this.tokenB.connect(this.signers.bidderX).balanceOf(this.signers.bidderX.getAddress())).to.gte(tokensToBid.sub(tokensToAuction.mul(maxPrice)));
    });

    it('should allow withdrawal after completion', async function () {
      const oneToken = BigNumber.from("1000000000000000000");
      const tokensToTransfer: BigNumber = oneToken.mul("2000"); // two thousand
      const tokensToAuction: BigNumber = oneToken.mul("1000"); // one thousand
      const maxPrice: BigNumber = BigNumber.from("10"); // ten
      const minPrice: BigNumber = BigNumber.from("5"); // five
      const tokensToBid: BigNumber = tokensToAuction.mul(maxPrice);

      // Send tokens to auctioneer
      await this.tokenA.connect(this.signers.admin).transfer(this.signers.auctioneer.getAddress(), tokensToTransfer);

      // Approve token transfer
      await this.tokenA.connect(this.signers.auctioneer).approve(this.auctionHouse.address, tokensToAuction);

      // Create auction
      const currentTimestamp: number = Math.floor(Date.now() / 1000);
      await this.auctionHouse.connect(this.signers.auctioneer).createFungible(
        this.tokenA.address,
        this.tokenB.address,
        tokensToAuction,
        BigNumber.from(currentTimestamp),
        BigNumber.from("600"),
        maxPrice,
        minPrice,
      );

      // Send tokens to bidder
      await this.tokenB.connect(this.signers.admin).transfer(this.signers.bidderX.getAddress(), tokensToBid);

      // Approve bid tokens
      await this.tokenB.connect(this.signers.bidderX).approve(this.auctionHouse.getFungibleAuction(0), tokensToBid);

      const auctionContract = await hre.ethers.getContractAt('FungibleAuction', this.auctionHouse.getFungibleAuction(0));
      await auctionContract.connect(this.signers.bidderX).buy(tokensToAuction);

      // Withdraw tokens
      const expectedBalance = tokensToBid.sub(await this.tokenB.balanceOf(this.signers.bidderX.getAddress()));
      await auctionContract.connect(this.signers.auctioneer).withdraw();
      expect(await this.tokenB.balanceOf(this.signers.auctioneer.getAddress())).to.equal(expectedBalance);

      // Number of active auction should be zero
      expect(await this.auctionHouse.getActiveAuctionCount()).to.equal(0);
    });
  });
});
