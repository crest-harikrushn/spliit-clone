const { User, Expense } = require("../models");
const minimizeTransactions = require("./minimizeTrx");
module.exports = async (groupId, members) => {
  try {
    // Fetch expenses of the group
    const expenses = await Expense.find({ group: groupId })
      .populate({
        path: "settledMembers",
        select: "name",
      })
      .populate({
        path: "paidBy",
        select: "name",
      });

    // Calculate settled transactions
    let settledTrxs = [];
    for (const expense of expenses) {
      const settledMembers = expense.settledMembers;
      const paidBy = expense.paidBy;

      for (const member of settledMembers) {
        const memberId = member._id.toString();
        if (memberId !== paidBy._id.toString()) {
          settledTrxs.push({
            from: memberId,
            to: paidBy._id,
            amount: expense.amount,
          });
        }
      }
    }

    // Minimize transactions using minimizeTrx helper function
    const minimizedTrxs = minimizeTransactions(settledTrxs);

    // Update user balances based on minimized transactions
    for (const trx of settledTrxs) {
      const { from, to, amount } = trx;

      // Find the users involved in the transaction
      const fromUser = await User.findById(from);
      const toUser = await User.findById(to);

      // Update the settle balances
      const fromSettle = fromUser.settle.find(
        (settle) => settle.group_id.toString() === groupId.toString()
      );
      const toSettle = toUser.settle.find(
        (settle) => settle.group_id.toString() === groupId.toString()
      );

      // Adjust balances based on the transaction amount
      fromSettle.taken += amount;
      toSettle.given += amount;
      fromSettle.finalSettle = fromSettle.given + fromSettle.taken;
      toSettle.finalSettle = toSettle.given + toSettle.taken;

      // Save the updated user balances
      await fromUser.save();
      await toUser.save();
    }

    return minimizedTrxs;
  } catch (error) {
    console.error("Error during auto settle:", error);
    throw error;
  }
};
