const { Expense } = require("../models");

const calculateSummary = async (groupId, userId, startDate, endDate) => {
  const expenses = await Expense.find({
    group: groupId,
    date: { $gte: startDate, $lt: endDate },
  });

  let totalGroupSpending = 0;
  let totalUserPaid = 0;
  let userTotalShare = 0;

  expenses.forEach((expense) => {
    totalGroupSpending += expense.amount;

    // Check if the user paid for this expense
    if (String(expense.paidBy) === String(userId)) {
      totalUserPaid += expense.amount;
    }

    // Calculate user's total share
    expense.membersBalance.forEach((member) => {
      if (String(member.memberId) === String(userId)) {
        // check if user is the paidBy user, then add userTotalShare += member.balance - expense.amount
        if (String(expense.paidBy) === String(userId)) {
          userTotalShare += Math.abs(member.balance - expense.amount);
        } else {
          userTotalShare += Math.abs(member.balance);
        }
      }
    });
  });

  return {
    totalGroupSpending,
    totalUserPaid,
    userTotalShare,
  };
};

module.exports = calculateSummary;
