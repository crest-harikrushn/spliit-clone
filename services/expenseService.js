const calculateSplit = (
  paidBy,
  members,
  amount,
  splitMode,
  customAmounts = [],
  percentages = []
) => {
  const membersBalance = [];

  // Validate lengths for custom and percentage split modes
  if (splitMode === "custom") {
    if (members.length !== customAmounts.length) {
      throw new Error(
        "The lengths of members and customAmounts must match for custom split mode"
      );
    }
  } else if (splitMode === "percentage") {
    if (members.length !== percentages.length) {
      throw new Error(
        "The lengths of members and percentages must match for percentage split mode"
      );
    }
  }

  switch (splitMode) {
    case "equal":
      const equalSplit = +Number(amount / members.length).toFixed(2);
      members.forEach((member) => {
        const balance =
          member._id.toString() === paidBy.toString()
            ? amount - equalSplit
            : -equalSplit;
        membersBalance.push({
          memberId: member._id,
          name: member.name,
          balance: parseFloat(balance.toFixed(2)),
          isPaid: member._id.toString() === paidBy.toString(),
        });
      });
      break;

    case "custom":
      // Calculate custom splits
      members.forEach((member, index) => {
        // Retrieve the custom amount for the current member
        const customAmount = customAmounts.find(
          (entry) => entry.memberId === member._id.toString()
        );

        // Calculate the balance for the current member
        const balance = customAmount ? -customAmount.amount : 0;

        // If the member is the one who paid, adjust their balance accordingly
        const paidByMember = member._id.toString() === paidBy.toString();
        const paidByAmount = paidByMember
          ? amount - customAmount.amount
          : balance;

        membersBalance.push({
          memberId: member._id,
          name: member.name,
          balance: parseFloat(paidByAmount.toFixed(2)),
          isPaid: paidByMember,
        });
      });
      break;

    case "percentage":
      // Validate that the sum of percentages is 100
      const totalPercentage = percentages.reduce(
        (sum, entry) => sum + entry.amount,
        0
      );
      if (totalPercentage !== 100) {
        throw new Error("The sum of the provided percentages must equal 100%");
      }

      // Percentage split logic
      members.forEach((member) => {
        // Find the percentage entry for the current member
        const percentageEntry = percentages.find(
          (entry) => entry.memberId === member._id.toString()
        );

        // Calculate the member's share of the total amount based on the provided percentage
        const memberShare = (amount * percentageEntry.amount) / 100;

        // Calculate the balance for the current member
        const balance =
          member._id.toString() === paidBy.toString()
            ? amount - memberShare
            : -memberShare;

        membersBalance.push({
          memberId: member._id,
          name: member.name,
          balance: parseFloat(balance.toFixed(2)),
          isPaid: member._id.toString() === paidBy.toString(),
        });
      });
      break;

    default:
      throw new Error("Invalid split mode");
  }

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
