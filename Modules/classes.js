class Queue extends Array {
  constructor() {
    super();
  }
  add(newItem, newAuthor) {
    this.push([newItem, newAuthor]);
    return this.length;
  }
  remove(startIndex, amount = 1) {
    return this.splice(startIndex, amount);
  }
  next(amount = 1) {
    if (amount > this.length) {
      amount = this.length;
    }
    if (amount == 1) {
      return this.splice(0, 1)[0];
    } else {
      const out = new Queue();
      for (let i = 0; i < amount; i++) {
        const current = this.splice(0, 1);
        out.add(current[0], current[1]);
      }
      return out;
    }
  }
  items() {
    const out = [];
    this.forEach((current) => {
      out.add(current[0]);
    });
    return out;
  }
  authors() {
    const out = [];
    this.forEach((current) => {
      out.push(current[1]);
    });
    return out;
  }
  hasItem(targetItem) {
    this.forEach((current) => {
      if (current[0] == targetItem) {
        return true;
      }
    });
    return false;
  }
  hasAuthor(targetAuthor) {
    this.forEach((current) => {
      if (current[1] == targetAuthor) {
        return true;
      }
    });
    return false;
  }
}

module.exports = {
  Queue: Queue,
};
