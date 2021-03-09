const { expect } = require("chai");

const DEPLOYER = '0x3fcb35a1cbfb6007f9bc638d388958bc4550cb28'

describe("[DUTCH AUCTION]", function() {
  let auction

  it("setup contracts", async function() {
    let Auction = await ethers.getContractFactory("Auction");
    auction = await Auction.deploy(DEPLOYER);

    await auction.deployed();
  });

  it("example test step", async function() {
    //this is only theoretical methods for example purpose
    
    //await auction.bid(1)
    //const interest = await auction.openInterest()
    //expect(interest).to.equal(1);
  });
});
