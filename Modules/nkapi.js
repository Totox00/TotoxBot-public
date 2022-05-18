const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));
const zlib = require("zlib");

function parseChallenge(challengeInfoRaw) {
  const challengeInfoDecompressed = zlib
    .inflateSync(Buffer.from(challengeInfoRaw, "base64"))
    .toString();
  const challengeInfoJson = JSON.parse(challengeInfoDecompressed);
  return challengeInfoJson;
}

async function fetchChallengeInfo(code) {
  const challengeUrl =
    "https://static-api.nkstatic.com/appdocs/11/es/challenges/" +
    code.toUpperCase();
  const challengeInfoJson = fetch(challengeUrl)
    .then((res) => res.text())
    .then((text) => parseChallenge(text));
  return await challengeInfoJson;
}

module.exports = {
  fetchChallengeInfo: fetchChallengeInfo,
};
