const fs = require("fs");
const bingoInfo = require("../Data/btd6Bingo.json");
const squares = bingoInfo.squares;
const groupMaxValues = bingoInfo.groupMaxValues;
const btd6Info = require("../Data/btd6Data.json");

// Returns a random integer between min (included) and max (excluded)
function getRndInteger(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

// Inserts a string into another string at the index, replacing removeCount amount of characters
Object.defineProperty(String.prototype, "splice", {
  value: function (offset, text, removeCount = 0) {
    let calculatedOffset = offset < 0 ? this.length + offset : offset;
    return (
      this.substring(0, calculatedOffset) +
      text +
      this.substring(calculatedOffset + removeCount)
    );
  },
});

function getSquare() {
  hasValidSquare = false;
  chosenSquare = null;
  while (!hasValidSquare) {
    chosenSquare = squares[getRndInteger(0, squares.length)];
    console.log(chosenSquare);
    if (
      idCount[chosenSquare.id] < chosenSquare.max &&
      groupCount[chosenSquare.group] < groupMaxValues[chosenSquare.group]
    ) {
      hasValidSquare = true;
    }
  }
  return chosenSquare;
}

function bingoParse(inputString) {
  console.log(`* Parsing ${inputString}`);
  variableType = inputString.charAt(1);
  // $pTMB000 (TMB: T/F: Top Middle Bottom)
  if (variableType == "p") {
    possiblePaths = [];
    if (inputString.charAt(2) == "T") {
      possiblePaths.push("top");
    }
    if (inputString.charAt(3) == "T") {
      possiblePaths.push("middle");
    }
    if (inputString.charAt(4) == "T") {
      possiblePaths.push("bottom");
    }
    return possiblePaths[getRndInteger(0, possiblePaths.length)];
  }
  // $nLOWUPP
  else if (variableType == "n") {
    lowerBound = parseInt(inputString.substring(2, 5), 10);
    upperBound = parseInt(inputString.substring(5, 8), 10);
    return getRndInteger(lowerBound, upperBound);
  }
  // $uP1P2P3 (Px: min/max)
  else if (variableType == "u") {
    lowerBound1 = parseInt(inputString.charAt(2), 10);
    upperBound1 = parseInt(inputString.charAt(3), 10);
    lowerBound2 = parseInt(inputString.charAt(4), 10);
    upperBound2 = parseInt(inputString.charAt(5), 10);
    lowerBound3 = parseInt(inputString.charAt(6), 10);
    upperBound3 = parseInt(inputString.charAt(7), 10);
    path1 = getRndInteger(lowerBound1, upperBound1);
    path2 = getRndInteger(lowerBound2, upperBound2);
    path3 = getRndInteger(lowerBound3, upperBound3);
    return `${path1}-${path2}-${path3}`;
  }
  // $mC00000 (C: [0-4])
  else if (variableType == "m") {
    pool = btd6Info.maps[inputString.charAt(2)];
    return pool[getRndInteger(0, pool.length)];
  }
  // $tCN0000 (C: [0-6])
  else if (variableType == "t") {
    pool = btd6Info.towers[inputString.charAt(2)];
    return pool[getRndInteger(0, pool.length)];
  }
  // $dB00000 (B: T/F: special modes)
  else if (variableType == "d") {
    if (inputString.charAt(2) == "T") {
      return btd6Info.difficultyModes[
        getRndInteger(0, btd6Info.difficultyModes.length)
      ];
    }
    return btd6Info.difficulties[
      getRndInteger(0, btd6Info.difficulties.length)
    ];
  }
}

function boardGen() {
  board = [];
  idCount = [
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  ];
  groupCount = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  prevParses = [];
  for (let current = 0; current < 25; current++) {
    currentSquare = getSquare();
    idCount[currentSquare.id]++;
    groupCount[currentSquare.group]++;
    squareName = currentSquare.name;
    while (squareName.includes("$")) {
      startIndex = squareName.indexOf("$");
      unparsedString = squareName.substring(startIndex, startIndex + 8);
      parsedString = bingoParse(unparsedString);
      console.log(`* Parsed string as: ${parsedString}`);
      if (!prevParses.includes(parsedString)) {
        squareName = squareName.splice(startIndex, parsedString, 8);
        prevParses.push(parsedString);
        console.log(`* New string is ${squareName}`);
      }
    }
    board.push({ name: squareName });
    console.log(`* Added ${squareName} to board`);
  }

  boardInJson = JSON.stringify(board);

  fs.writeFile("./bingoBoard.txt", boardInJson, function (err) {
    if (err) {
      console.log(err);
    }
  });

  return boardInJson;
}

module.exports = { boardGen };
