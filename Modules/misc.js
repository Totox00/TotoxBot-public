// Returns true if string contains exclusively uppercase letter, and false otherwise
function onlyUppercase(inputString) {
  for (let index = inputString.length - 1; index >= 0; index--) {
    const charCode = inputString.charCodeAt(index);
    if (charCode < 65 || charCode > 90) {
      return false;
    }
  }
  return true;
}

// Returns true if string contains exclusively digits, and false otherwise
function onlyDigits(inputString) {
  for (let index = inputString.length - 1; index >= 0; index--) {
    const charCode = inputString.charCodeAt(index);
    if (charCode < 48 || charCode > 57) {
      return false;
    }
  }
  return true;
}

// Returns string in possessive form
function possessive(inputString) {
  if (inputString[-1] == "s") {
    return inputString + `'`;
  } else {
    return inputString + `'s`;
  }
}

// Returns a random integer between min (included) and max (excluded)
function getRndInteger(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

// Returns a random item from an array
function getRndItem(inputArray) {
  return inputArray[Math.floor(inputArray.length * Math.random())];
}

// Returns a random float weighted towards start
function recursiveRandom(start, spread, upChance = 0.5, downChance = 0.25) {
  let out = start;
  let hasEnded = false;
  while (!hasEnded) {
    const step = Math.random();
    if (step <= upChance) {
      out = getRndInteger(out + 1, out + spread + 1);
    } else if (step > upChance + downChance) {
      if (out < start + spread && out > start - spread) {
        if (Math.random() < 0.5) {
          hasEnded = true;
        }
      } else {
        hasEnded = true;
      }
    } else {
      out = getRndInteger(out - spread, out);
    }
  }
  if (out < 0) {
    out = 0;
  }
  return out;
}

module.exports = {
  onlyUppercase: onlyUppercase,
  onlyDigits: onlyDigits,
  possessive: possessive,
  getRndInteger: getRndInteger,
  getRndItem: getRndItem,
  recursiveRandom: recursiveRandom,
};
