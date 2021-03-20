import { expect } from "chai";
import hre from "hardhat";
import { Artifact } from "hardhat/types";
import { BigNumber } from "@ethersproject/bignumber";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";

import {
  AuctionHouse,
  FungibleAuction,
  MockToken,
} from "../typechain";
import { Signers } from "../types";

const { deployContract } = hre.waffle;

describe("Fungible Auction", () => {
  // Contract artifacts
  let auctionArtifact: Artifact;
  let auctionHouseArtifact: Artifact;
  let fungibleTokenArtifact: Artifact;

  // Wallet addresses.
  const wallets = {} as Signers;

  // Deployed contracts. These get refreshed per test.
  let auction: FungibleAuction;
  let auctionHouse: AuctionHouse;
  let mockTokenA: MockToken;
  let mockTokenB: MockToken;

  // Shared test constants
  const oneToken = BigNumber.from("1000000000000000000");
  const amount = oneToken.mul(100);
  const startTimestamp = BigNumber.from(Math.floor(Date.now() / 1000));
  const duration = BigNumber.from(600);
  const maxPrice = BigNumber.from(10);
  const minPrice = BigNumber.from(1);
  const tokensToTransfer: BigNumber = oneToken.mul("2000"); // two thousand
  const tokensToAuction: BigNumber = oneToken.mul("1000"); // one thousand
  const tokensToBid: BigNumber = tokensToAuction.mul(maxPrice);

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

  describe('Deployments', () => {
    it('should allow construction by user', async () => {
      const contract = <FungibleAuction>await deployContract(
        wallets.auctioneer,
        auctionArtifact,
        [
          mockTokenA.address,
          mockTokenB.address,
          amount,
          wallets.auctioneer.address,
          startTimestamp,
          duration,
          maxPrice,
          minPrice,
          false,
        ],
      );

      expect(await contract.sellTokenAddress()).to.be.equal(mockTokenA.address);
      expect(await contract.buyTokenAddress()).to.be.equal(mockTokenB.address);
      expect(await contract.initialAmount()).to.be.equal(amount);
      expect(await contract.auctioneer()).to.be.equal(wallets.auctioneer.address);
      expect(await contract.startTimestamp()).to.be.equal(startTimestamp);
      expect(await contract.duration()).to.be.equal(duration);
      expect(await contract.maxPrice()).to.be.equal(maxPrice);
      expect(await contract.minPrice()).to.be.equal(minPrice);
    });

    it('should allow construction by auction house', async () => {
      // Deploying through the auction house automatically transfers the tokens.
      // Make sure those tokens are available for transfer.
      await mockTokenA.connect(wallets.admin).transfer(wallets.auctioneer.address, amount);
      await mockTokenA.connect(wallets.auctioneer).approve(auctionHouse.address, amount);

      await auctionHouse.connect(wallets.auctioneer).createFungible(
        mockTokenA.address,
        mockTokenB.address,
        amount,
        startTimestamp,
        duration,
        maxPrice,
        minPrice,
      );

      const contract: FungibleAuction = <FungibleAuction>await hre.ethers.getContractAt(
        "FungibleAuction",
        await auctionHouse.getFungibleAuction(0),
      );
      expect(await contract.sellTokenAddress()).to.be.equal(mockTokenA.address);
      expect(await contract.buyTokenAddress()).to.be.equal(mockTokenB.address);
      expect(await contract.initialAmount()).to.be.equal(amount);
      expect(await contract.auctioneer()).to.be.equal(wallets.auctioneer.address);
      expect(await contract.startTimestamp()).to.be.equal(startTimestamp);
      expect(await contract.duration()).to.be.equal(duration);
      expect(await contract.maxPrice()).to.be.equal(maxPrice);
      expect(await contract.minPrice()).to.be.equal(minPrice);
    });

    it('should revert if auction ends in the past at creation', async () => {
      await expect(deployContract(
        wallets.auctioneer,
        auctionArtifact,
        [
          mockTokenA.address,
          mockTokenB.address,
          amount,
          wallets.auctioneer.address,
          startTimestamp.sub(duration),
          duration,
          maxPrice,
          minPrice,
          false,
        ],
      )).to.be.revertedWith("Auction: Cannot end in the past");
    });
  });

  describe('Auction', () => {
    beforeEach(async () => {
      // Send tokens to auctioneer and bidder
      await mockTokenA.connect(wallets.admin).transfer(wallets.auctioneer.address, tokensToTransfer);
      await mockTokenB.connect(wallets.admin).transfer(wallets.bidderX.address, tokensToBid);

      // Approve token transfer to auction
      await mockTokenA.connect(wallets.auctioneer).approve(auctionHouse.address, tokensToAuction);

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

      // Approve bid tokens
      const auctionAddress: string = await auctionHouse.getFungibleAuction(0);
      await mockTokenB.connect(wallets.bidderX).approve(auctionAddress, tokensToBid);

      auction = <FungibleAuction>await hre.ethers.getContractAt('FungibleAuction', auctionAddress);
    });

    it('should allow first bid to buy everything', async () => {
      await auction.connect(wallets.bidderX).buy(tokensToAuction);

      // Should have received the requested number of tokens
      expect(await mockTokenA.balanceOf(wallets.bidderX.address)).to.equal(tokensToAuction);

      // Should have paid in between the maxPrice and minPrice range
      expect(await mockTokenB.balanceOf(wallets.bidderX.address)).to.lte(tokensToBid.sub(tokensToAuction.mul(minPrice)));
      expect(await mockTokenB.balanceOf(wallets.bidderX.address)).to.gte(tokensToBid.sub(tokensToAuction.mul(maxPrice)));
    });

    it ('should allow second bid to buy remainder', async () => {
      const firstBid: BigNumber = tokensToAuction.sub("100");
      const secondBid: BigNumber = tokensToAuction;

      await auction.connect(wallets.bidderX).buy(firstBid);

      // Should have received the requested number of tokens
      expect(await mockTokenA.balanceOf(wallets.bidderX.address)).to.equal(firstBid);

      await auction.connect(wallets.bidderX).buy(secondBid);

      // Should have received the remainer of what was available
      expect(await mockTokenA.balanceOf(wallets.bidderX.address)).to.equal(tokensToAuction);

      // Should have paid in between the maxPrice and minPrice range
      expect(await mockTokenB.balanceOf(wallets.bidderX.address)).to.lte(tokensToBid.sub(tokensToAuction.mul(minPrice)));
      expect(await mockTokenB.balanceOf(wallets.bidderX.address)).to.gte(tokensToBid.sub(tokensToAuction.mul(maxPrice)));
    });

    it('should allow withdrawal after completion', async () => {
      await auction.connect(wallets.bidderX).buy(tokensToAuction);

      // Withdraw tokens
      const expectedBalance = tokensToBid.sub(await mockTokenB.balanceOf(wallets.bidderX.address));
      await auction.connect(wallets.auctioneer).withdraw();
      expect(await mockTokenB.balanceOf(wallets.auctioneer.address)).to.equal(expectedBalance);

      // Number of active auction should be zero
      expect(await auctionHouse.getActiveAuctionCount()).to.equal(0);
    });

    it('should revert if maxPrice is lower than minPrice', async () => {
      // Send tokens to auctioneer
      await mockTokenA.connect(wallets.admin).transfer(wallets.auctioneer.address, tokensToTransfer);

      // Approve token transfer
      await mockTokenA.connect(wallets.auctioneer).approve(auctionHouse.address, tokensToAuction);

      // This test runs without actually having tokens, because it should fail before any token checks occur.
      const currentTimestamp: number = Math.floor(Date.now() / 1000);
      await expect(auctionHouse.connect(wallets.auctioneer).createFungible(
        mockTokenA.address,
        mockTokenB.address,
        tokensToAuction,
        BigNumber.from(currentTimestamp),
        BigNumber.from("600"),
        minPrice,
        maxPrice,
      )).to.be.revertedWith("Auction: Price must go down");
    });

    it('should revert when trying to withdraw before end', async () => {
      await auction.connect(wallets.bidderX).buy(tokensToAuction.sub("1000"));

      // Withdraw tokens
      await expect(auction.connect(wallets.auctioneer).withdraw()).to.be.revertedWith("Auction: auction has not ended yet");
    });

    it('should return maxPrice as rate if auction has not started yet', async () => {
      // Send tokens to auctioneer
      await mockTokenA.connect(wallets.admin).transfer(wallets.auctioneer.address, tokensToTransfer);

      // Approve token transfer
      await mockTokenA.connect(wallets.auctioneer).approve(auctionHouse.address, tokensToAuction);

      const futureTimestamp: number = Math.floor(Date.now() / 1000) + 600;
      await auctionHouse.connect(wallets.auctioneer).createFungible(
        mockTokenA.address,
        mockTokenB.address,
        tokensToAuction,
        BigNumber.from(futureTimestamp),
        BigNumber.from("600"),
        maxPrice,
        minPrice,
      );

      // Index 1, because the beforeEach already creates an auction.
      const auctionAddress = await auctionHouse.getFungibleAuction(1);
      const futureAuction: FungibleAuction = <FungibleAuction>await hre.ethers.getContractAt('FungibleAuction', auctionAddress);
      expect(await futureAuction.getRate()).to.be.equal(maxPrice);
    });

    // TODO: add way to simulate passage of time without requiring system to sleep.
  });
});
