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
      console.log("equalSplit:: ", equalSplit);
      const remainingAmount = +(amount - equalSplit * members.length).toFixed(
        2
      );
      console.log("remainingAmount:: ", remainingAmount);
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

      // random number betweeen 0 to members.length
      const randomIndex = Math.floor(Math.random() * members.length);
      console.log("randomIndex:: ", randomIndex);
      if (membersBalance[randomIndex].balance > 0) {
        membersBalance[randomIndex].balance += -remainingAmount;
      } else {
        // after decimal point it should be 2 digits
        membersBalance[randomIndex].balance = parseFloat(
          (membersBalance[randomIndex].balance - remainingAmount).toFixed(2)
        );
      }
      break;

    case "custom":
      // Calculate custom splits
      members.forEach((member, index) => {
        // validate customAmounts's amount sum should match with amount
        const totalCustomAmount = customAmounts.reduce(
          (sum, entry) => sum + entry.amount,
          0
        );

        if (totalCustomAmount !== amount) {
          throw new Error(
            "The sum of the provided custom amounts must equal the total amount"
          );
        }

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
