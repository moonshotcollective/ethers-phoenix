const ethers = require("ethers");
const express = require("express");
const fs = require("fs");
const https = require("https");
const cors = require("cors");
const bodyParser = require("body-parser");
const app = express();
const mongoose = require('mongoose')

console.log("🏠 Connecting to mongodb...");
// TODO: use .env
const mongoDB = '';
mongoose.connect(mongoDB);

var Schema = mongoose.Schema;

var PoapEventSchema = new Schema({
  id: Number,
  name: String,
  points: Number
});

const PoapEvent = mongoose.model('PoapEvent', PoapEventSchema );

// MY INFURA_ID, SWAP IN YOURS FROM https://infura.io/dashboard/ethereum
const INFURA_ID = "460f40a260564ac4a4f4b3fffb032dad";

/// 📡 What chain are your contracts deployed to?

const phoenixNetwork = {
    name: "kovanOptimism",
    color: "#666666",
    chainId: 69,
    blockExplorer: "",
    rpcUrl: "https://kovan.optimism.io",
  };

const xPoapNetwork = {
    name: "xdai",
    color: "#48a9a6",
    chainId: 100,
    price: 1,
    gasPrice: 1000000000,
    rpcUrl: "https://dai.poa.network",
    faucet: "https://xdai-faucet.top/",
    blockExplorer: "https://blockscout.com/poa/xdai/",
  };

contractList = require("./hardhat_contracts.json");

const phoenixProviderUrl = phoenixNetwork.rpcUrl;
console.log("🏠 Connecting to provider:", phoenixProviderUrl);
const phoenixProvider = new ethers.providers.StaticJsonRpcProvider(phoenixProviderUrl);
const phoenixContractData = contractList[phoenixNetwork.chainId][phoenixNetwork.name].contracts.Phoenix;
const phoenixContract = new ethers.Contract(phoenixContractData.address, phoenixContractData.abi, phoenixProvider);


const xPoapProviderUrl = xPoapNetwork.rpcUrl;
console.log("🏠 Connecting to provider:", xPoapProviderUrl);
const xPoapProvider = new ethers.providers.StaticJsonRpcProvider(xPoapProviderUrl);
const xPoapContractData = contractList[xPoapNetwork.chainId][xPoapNetwork.name].contracts.xPoap;
const xPoapContract = new ethers.Contract(xPoapContractData.address, xPoapContractData.abi, xPoapProvider);

app.use(cors());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", async function (request, response) {
  response.send('Phoenix');
});

app.get("/poap-events", async function (request, response) {
  PoapEvent.find({}, 'id name points', { sort: {_id: -1 }}, function (err, events) {
    if (err) {
      console.log(err);
      response.status(500).send('Error saving poap event');
    } else {
      response.send(events);
    }
  })
});

app.post("/poap-events", async function (request, response) {
  console.log("ID, name, points: ", request.body.id, request.body.name, request.body.points);
  let poapEvent = new PoapEvent({ id: request.body.id, name: request.body.name, points: request.body.points });

  poapEvent.save(function (err) {
    if (err) {
      console.log(err);
      response.status(500).send('Error saving poap event');
    } else {
      response.send('Saved');
    }
  });
});

app.put("/poap-events/:_id", async function (request, response) {
  console.log("_ID: ", request.params._id);
  console.log("ID, name, points: ", request.body.id, request.body.name, request.body.points);
  PoapEvent.findByIdAndUpdate(request.params._id, { id: request.body.id, name: request.body.name, points: request.body.points },function (err) {
    if (err) {
      console.log(err);
      response.status(500).send('Error saving poap event');
    } else {
      response.send('Saved');
    }
  });
});

app.delete("/poap-events/:_id", async function (request, response) {
  console.log("_ID: ", request.params._id);
  PoapEvent.findByIdAndRemove(request.params._id,function (err) {
    if (err) {
      console.log(err);
      response.status(500).send('Error deleting poap event');
    } else {
      response.send('Deleted');
    }
  });
});

app.get("/phoenix/:tokenId", async function (request, response) {
  console.log("Get Phoenix tokenId image: ", request.params.tokenId);

  try {
    const owner = await phoenixContract.ownerOf(parseInt(request.params.tokenId));
    console.log("Owner: ", owner);

    const xPoapBalance = await xPoapContract.balanceOf(owner);
    console.log("xPoapBalance: ", xPoapBalance.toString());

    // Calculate NFT owner regen points
    // TODO: precalculate and save on db
    let ownerPoapEvents = [];
    for (i=0; i < xPoapBalance.toNumber(); i++) {
      const tokenDetails = await xPoapContract.tokenDetailsOfOwnerByIndex(owner, i);
      ownerPoapEvents.push(tokenDetails.eventId.toNumber());
    }
    console.log("ownerPoapEvents: ", ownerPoapEvents);

    const poapEvents = await PoapEvent.find({}, 'id points', { sort: {_id: -1 }}).exec();

    let ownerPoints = 0;

    poapEvents.forEach((event) => {
      const eventFound = ownerPoapEvents.find(ownerPoapEvent => ownerPoapEvent == event.id);
      if (eventFound) {
        ownerPoints += event.points;
      }
    });
    console.log("ownerPoints: ", ownerPoints);

    const svg = `
<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
  <style>
    .text { font-size: 50px; }
  </style>
  <g id="poap">
    <ellipse stroke-width="3" ry="150" rx="150" id="svg_1" cy="200" cx="200" stroke="#000" fill="#fff"/>
    <text x="50%" y="40%" text-anchor="middle" stroke-width="2px" dy=".3em" class="text">${xPoapBalance} POAPs</text>
    <text x="50%" y="60%" text-anchor="middle" stroke-width="2px" dy=".3em" class="text">${ownerPoints} RP</text>
  </g>
</svg>
    `;

    response.setHeader('Content-Type', 'image/svg+xml');
    response.send(svg);
  } catch (exception) {
    console.log(exception);
    response.status(500).send('Error retrieving image');
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`);
});