const { fetchChallengeInfo } = require("./nkapi.js");
const fetch = require("node-fetch");

async function printChallengeInfo(code) {
  challengeInfoPromise = fetchChallengeInfo(code);
  challengeInfo = await challengeInfoPromise;
  console.log(challengeInfo);
}

printChallengeInfo("ZMHPRMU");

//console.log(challengeInfo.startRound);
//console.log(challengeInfo.endRound);
//console.log(challengeInfo.map);
