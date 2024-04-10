const calculateSplit = (paidBy, members, amount) => {
  const splittedAmount = +Number(amount / members.length).toFixed(2);
  const membersBalance = members.map((member) => {
    if (member._id.toString() === paidBy.toString()) {
      return {
        memberId: member._id,
        name: member.name,
        balance: parseFloat(Number(amount - splittedAmount).toFixed(2)),
        isPaid: true,
      };
    } else {
      return {
        memberId: member._id,
        name: member.name,
        balance: parseFloat((-1 * Number(splittedAmount)).toFixed(2)),
        isPaid: false,
      };
    }
  });
  return membersBalance;
};

const updateMemberBalances = async (expenses, members) => {
  let updatedMemberBalances;
  if (expenses) {
    updatedMemberBalances = expenses.map(({ _id, paidBy, amount }) => {
      return {
        expenseId: _id,
        membersBalance: calculateSplit(paidBy, members, amount),
      };
    });
  }

  return Promise.all(updatedMemberBalances);
};

// const calculateSettlement = (expense) => {
//   const settlements = [];

//   // Logic to calculate settlements based on expense data
//   // Example:
//   // For each member, calculate how much they owe or are owed based on the expense amount
//   // Add the settlement details to the settlements array
//     // Return the settlements array
//     const { membersBalance, paidBy } = expense;
//     const paidByMember = membersBalance.find((member) => member.memberId.toString() === paidBy.toString());
//     const paidByAmount = paidByMember.balance;
//     const otherMembers = membersBalance.filter((member) => member.memberId.toString() !== paidBy.toString());
//     const totalAmount = otherMembers.reduce((acc, member) => acc + Number(member.balance), 0);
//     const totalMembers = otherMembers.length;
//     const avgAmount = totalAmount / totalMembers;
//     const paidByAmountNum = Number(paidByAmount);
//     otherMembers.forEach((member) => {
//         const amount = Number(member.balance);
//         if (amount > avgAmount) {
//             settlements.push({
//                 from: member.memberId,
//                 to: paidBy,
//                 amount: Number((amount - avgAmount).toFixed(2)),
//             });
//         } else if (amount < avgAmount) {
//             settlements.push({
//                 from: paidBy,
//                 to: member.memberId,
//                 amount: Number((avgAmount - amount).toFixed(2)),
//             });
//         }
//     });

//   return settlements;
// };

const calculateSettlement = (expense) => {
  const paidBy = expense.paidBy;
  const membersBalance = expense.membersBalance;

  const totalAmount = expense.amount;
  const totalMembers = membersBalance.length;

  // Calculate average amount per member
  const averageAmount = totalAmount / totalMembers;

  // Calculate how much each member owes or is owed
  const settlements = membersBalance.map((member) => {
    const memberId = member.memberId;
    const balance = member.balance;

    let amount = 0;
    if (memberId.toString() !== paidBy.toString()) {
      amount = averageAmount - balance;
    }

    return {
      memberId,
      amount,
    };
  });

  return settlements;
};

module.exports = { calculateSplit, updateMemberBalances, calculateSettlement };
