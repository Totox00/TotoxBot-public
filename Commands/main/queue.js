const { Queue } = require("../../Modules/classes.js");

// Variables
const queues = [];
for (let i = 0; i < 100; i++) {
  queues.push(new Queue());
}

module.exports = {
  commands: [
    {
      name: "queue",
      category: "main",
      description: "Handles a generic queue",
      args: 0,
      usage: '<?option ("queue"/"remove")> <;;person>',
      perms: false,
      async execute(target, sender, perms, args, msg, raw, platform) {
        // Variables for convenience
        const targetQueue = queues[target];

        // Add person to queue if command is empty
        if (args.length == 0) {
          // Ignore if already in queue
          if (targetQueue.hasAuthor(sender)) {
            return;
          }

          // Add to queue
          targetQueue.add(msg, sender);

          // Output to chat
          return `added ${sender} to queue`;
        }

        // queue send
        if (args[0].toLowerCase() == "send") {
          let queueToSend = targetQueue.authors().toString();
          if (queueToSend.length > 400) {
            queueToSend = "";
            outputIsFilled = false;
            for (let i = 0; !outputIsFilled; i++) {
              queueToSend = queueToSend + ", " + targetQueue.authors()[i];
              if (queueToSend.length > 400) {
                outputIsFilled = true;
              }
            }
          }
          return `The current queue is: ${queueToSend}`;
        }

        // queue remove
        else if (args[0].toLowerCase() == "remove") {
          // Remove self if empty
          if (args.length == 1) {
            const personToRemove = sender;
            // Confirm person is in queue
            if (!targetQueue.hasAuthor(personToRemove)) {
              return `Person not in queue`;
            }

            // Find index of person in queue
            personIndex = targetQueue.indexOf(personToRemove);

            // Remove person from queue
            targetQueue.splice(personIndex, 1);
            client.log(
              `${timestamp()} Removed person ${personToRemove} at index ${personIndex} from queue`
            );
            client.log(`${timestamp()} Current queue is ${targetQueue}`);

            // Output to chat
            client.say(
              target,
              `${context.username}, ${personToRemove} has been removed from the queue`
            );
            return;
          }

          // Get person to remove
          personToRemove = args[1].toLowerCase();

          // Requires mod permissions unless they remove themselves
          if (
            !(context.permissions.mod || personToRemove == context.username)
          ) {
            return;
          }

          // Confirm person is in queue
          if (!targetQueue.includes(personToRemove)) {
            client.say(target, `${context.username}, person not in queue`);
            return;
          }

          // Find index of person in queue
          personIndex = targetQueue.indexOf(personToRemove);

          // Remove person from queue
          targetQueue.splice(personIndex, 1);
          client.log(
            `${timestamp()} Removed person ${personToRemove} at index ${personIndex} from queue`
          );
          client.log(`${timestamp()} Current queue is ${targetQueue}`);

          // Output to chat
          client.say(
            target,
            `${context.username}, ${personToRemove} has been removed from the queue`
          );
          return;
        }

        // queue clear
        else if (args[0].toLowerCase() == "clear") {
          // Requires at least mod permissions
          if (!context.permissions.mod) {
            return;
          }

          // Clear queue
          targetQueue = [];
          client.log(`${timestamp()} Cleared coop queue`);

          // Output to chat
          client.say(target, `${context.username}, cleared coop queue`);
          return;
        }

        // Ignore if already in queue
        if (targetQueue.includes(context.username)) {
          return;
        }

        // Add to queue
        targetQueue.push(context.username);

        // Output to chat
        client.say(target, `added ${context.username} to queue`);
        return;
      },
    },
  ],
};
