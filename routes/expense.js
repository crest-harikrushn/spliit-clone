const { Router } = require("express");
const { authMiddleWare } = require("../middleware");
const { Expense, Group, User } = require("../models");
const {
  calculateSettlement,
  calculateSplit,
} = require("../services/expenseService");

const router = Router();

// Add New Expense in Group
router.post("/", authMiddleWare, async (req, res) => {
  try {
    const { groupId, paidBy, description, amount } = req.body;
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).send("Group not found");
    }

    // Check if the group has any members
    if (group.members.length < 2) {
      return res
        .status(400)
        .send("Cannot add expense to a group with no members");
    }

    const members = await User.find(
      { _id: { $in: group.members } },
      { name: 1, _id: 1 }
    ).lean();

    // Calculate split and create expense object
    const membersBalance = calculateSplit(paidBy, members, amount);
    const expense = new Expense({
      description,
      amount,
      date: Date.now(),
      group: groupId,
      paidBy,
      membersBalance,
      settledMembers: [],
    });

    await expense.save();
    res.send(expense);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

// Get Active and Settled Expenses of Group Member Individual
// * Working code!
// router.get(
//   "/group/:groupId/member/:memberId",
//   authMiddleWare,
//   async (req, res) => {
//     const groupId = req.params.groupId;
//     const memberId = req.params.memberId;
//     const expenses = await Expense.find({
//       group: groupId,
//     }).populate("paidBy", {
//       name: 1,
//       _id: 1,
//     });

//     const activeExpenses = expenses.filter((expense) => {
//       return (
//         expense.settledMembers.indexOf(memberId) === -1 && !expense.isSettled
//       );
//     });

//     const settledExpenses = expenses.filter((expense) => {
//       return expense.settledMembers.indexOf(memberId) > -1 || expense.isSettled;
//     });

//     res.send({
//       activeExpenses,
//       settledExpenses,
//     });
//   }
// );

// ? Testing
router.get(
  "/group/:groupId/member/:memberId",
  authMiddleWare,
  async (req, res) => {
    const groupId = req.params.groupId;
    const memberId = req.params.memberId;

    try {
      const expenses = await Expense.find({ group: groupId })
        .populate({
          path: "settledMembers",
          select: "name",
        })
        .populate({
          path: "paidBy",
          select: "name",
        });

      const activeExpenses = expenses.filter((expense) => {
        return (
          expense.settledMembers.findIndex(
            (settledMember) => settledMember._id.toString() === memberId
          ) === -1 && !expense.isSettled
        );
      });

      const settledExpenses = expenses.filter((expense) => {
        return (
          expense.settledMembers.findIndex(
            (settledMember) => settledMember._id.toString() === memberId
          ) > -1 || expense.isSettled
        );
      });

      // Add the user who paid the bill to the response if not already included
      settledExpenses.forEach((expense) => {
        if (
          !expense.settledMembers.some(
            (member) => member._id.toString() === expense.paidBy._id.toString()
          )
        ) {
          expense.settledMembers.push({
            _id: expense.paidBy._id,
            name: expense.paidBy.name,
          });
        }
      });

      // Calculate how much the authenticated user owes overall in the group
      const totalOwedToGroup = expenses.reduce((total, expense) => {
        expense.membersBalance.forEach((member) => {
          if (member.memberId.toString() === memberId && !member.isPaid) {
            total += Number(member.balance);
          }
        });
        return total;
      }, 0);

      //   fetch user details who are in groupId
      const group = await Group.findById(groupId)
        .populate("members", { name: 1, _id: 1, settle: 1 })
        .lean();

      const users = group.members.map((member) => {
        return {
          _id: member._id.toString(),
          name: member.name,
          group_id: groupId,
          settle: member.settle,
        };
      });

      console.log("users:: ", users);
      // Calculate how much the authenticated user owes to each individual member of the group
      expenses.forEach((expense) => {
        expense.membersBalance.forEach((expenseMember) => {
          console.log("expense.settledMembers:: ", expense.settledMembers);
          console.log("expenseMember.memberId:: ", expenseMember.memberId);
          if (!expense.settledMembers.includes(expenseMember.memberId)) {
            console.log("member is not settled!");
            console.log("expenseMember.balance:: ", expenseMember.balance);
            if (expenseMember.balance > 0) {
              console.log("balance > 0: ", expenseMember.balance);
              // add amount to user setttle .given
              const userIndex = users.findIndex(
                (user) =>
                  user._id.toString() === expenseMember.memberId.toString()
              );
              console.log("userIndex:: ", userIndex);
              const user = users[userIndex];
              console.log("user:: ", user);
              const userSettleIndex = user.settle.findIndex(
                (settle) =>
                  settle.group_id.toString() === expense.group.toString()
              );

              if (userSettleIndex < 0) {
                console.log("here: userSettleIndex < 0");
                // add group_id, given and taken to user settle
                user.settle.push({
                  group_id: expense.group.toString(),
                  given: expenseMember.balance,
                  taken: 0,
                  finalSettle: expenseMember.balance,
                });
              } else {
                console.log("userSettleIndex:: ", userSettleIndex);
                console.log("user.settle:: ", user.settle);
                const userSettle = user.settle[userSettleIndex];
                console.log("userSettle::: ", userSettle);
                userSettle.given += expenseMember.balance;
                userSettle.finalSettle = userSettle.given + userSettle.taken;
              }
            }

            if (expenseMember.balance < 0) {
              // add amount to user settle .taken
              const userIndex = users.findIndex(
                (user) =>
                  user._id.toString() === expenseMember.memberId.toString()
              );
              console.log("users < 0::: ", users);
              console.log("userIndex < 0::: ", userIndex);
              const user = users[userIndex];
              console.log("user < 0::: ", user);
              const userSettleIndex = user.settle.findIndex(
                (settle) =>
                  settle.group_id.toString() === expense.group.toString()
              );

              if (userSettleIndex < 0) {
                console.log("here: userSettleIndex < 0");
                // add group_id, given and taken to user settle
                user.settle.push({
                  group_id: expense.group.toString(),
                  given: 0,
                  taken: expenseMember.balance,
                  finalSettle: expenseMember.balance,
                });
              } else {
                console.log("here: userSettleIndex < 0 else part");
                console.log("userSettleIndex < 0::: ", userSettleIndex);
                const userSettle = user.settle[userSettleIndex];
                console.log("userSettle < 0::: ", userSettle);
                userSettle.taken += expenseMember.balance;
                userSettle.finalSettle = userSettle.given + userSettle.taken;
              }
            }
          }
        });
      });

      let settledTrxs = [];
      users.map((user) => {
        user.settle.map((groupSettle) => {
          settledTrxs.push({
            name: user.name,
            amount: groupSettle.finalSettle,
            user_id: user._id,
          });
        });
      });

      const sortedSettledTrxs = settledTrxs.sort((a, b) => {
        if (a.amount < 0 && b.amount < 0) {
          return a.amount - b.amount; // both values are negative, sort in ascending order
        } else if (a.amount >= 0 && b.amount >= 0) {
          return b.amount - a.amount; // both values are positive, sort in descending order
        } else {
          return a.amount < 0 ? -1 : 1; // one value is negative and the other is positive, negative value should come first
        }
      });

      console.log("sortedSettledTrxs:: ", sortedSettledTrxs);

      // * working calculations to fetch individual user owes to other members
      //   // Calculate how much the authenticated user owes to each individual member of the group
      //   const owedToMap = new Map();

      //   expenses.forEach((expense) => {
      //     if (!expense.isSettled && expense.paidBy._id.toString() !== memberId) {
      //       expense.membersBalance.forEach((member) => {
      //         if (member.memberId.toString() === memberId && !member.isPaid) {
      //           const memberId = expense.paidBy._id.toString();
      //           const amount = Number(member.balance);
      //           const name = expense.paidBy.name;

      //           if (owedToMap.has(memberId)) {
      //             // If member already exists in the map, update the owed amount
      //             const existingAmount = owedToMap.get(memberId);
      //             owedToMap.set(memberId, {
      //               name,
      //               amount: existingAmount.amount + amount,
      //             });
      //           } else {
      //             // If member doesn't exist in the map, add a new entry
      //             owedToMap.set(memberId, {
      //               name,
      //               amount,
      //             });
      //           }
      //         }
      //       });
      //     }
      //   });

      //   // Convert the Map to an array of objects
      //   const owedToIndividuals = Array.from(
      //     owedToMap,
      //     ([memberId, amount, name]) => ({
      //       memberId,
      //       amount,
      //       name,
      //     })
      //   );

      //   ? Don't know weather working or not?
      // Calculate how much the authenticated user owes to each individual member of the group
      //   const owedToIndividuals = {};
      //   expenses.forEach((expense) => {
      //     if (!expense.isSettled && expense.paidBy._id.toString() !== memberId) {
      //       expense.membersBalance.forEach((member) => {
      //         if (member.memberId.toString() === memberId && !member.isPaid) {
      //           const owedTo = expense.paidBy.name;
      //           if (!owedToIndividuals[owedTo]) {
      //             owedToIndividuals[owedTo] = 0;
      //           }
      //           owedToIndividuals[owedTo] += Number(member.balance);
      //         }
      //       });
      //     }
      //   });

      res.send({
        activeExpenses,
        settledExpenses,
        totalOwedToGroup,
        owedToIndividuals: sortedSettledTrxs,
      });
    } catch (error) {
      console.error(error);
      res.status(500).send("Internal Server Error");
    }
  }
);

// Settle Expense of Group Member Individual
router.post("/:expenseId/settle/:memberId", async (req, res) => {
  const expenseId = req.params.expenseId;
  const memberId = req.params.memberId;
  const expense = await Expense.findById(expenseId);
  if (!expense) {
    return res.status(404).send("Expense may be already settled or deleted");
  }
  const index = expense.settledMembers.indexOf(memberId);
  if (index > -1) {
    expense.settledMembers.splice(index, 1);
  } else {
    expense.settledMembers.push(memberId);
    // Update isPaid flag of that member in membersBalance array
    const memberIndex = expense.membersBalance.findIndex(
      (member) => member.memberId.toString() === memberId
    );
    if (memberIndex !== -1) {
      expense.membersBalance[memberIndex].isPaid = true;
    }
  }
  // Check if all members except paidBy are settled
  if (
    expense.settledMembers.length ===
    expense.membersBalance.filter(
      (member) => member.memberId.toString() !== expense.paidBy.toString()
    ).length
  ) {
    expense.isSettled = true;
  }
  // Mark the document as modified
  expense.markModified("membersBalance");
  await expense.save();
  res.send(expense);
});

// revert settled expense
router.post("/:expenseId/revert/:memberId", async (req, res) => {
  const expenseId = req.params.expenseId;
  const memberId = req.params.memberId;
  const expense = await Expense.findById(expenseId);
  if (!expense) {
    res.status(404).send("expense may be deleted");
  }
  const index = expense.settledMembers.indexOf(memberId);
  if (index > -1) {
    expense.settledMembers.splice(index, 1);
  } else {
    // set isPaid flag of that member in membersBalance array
    expense.membersBalance.forEach((member) => {
      if (member.memberId.toString() === memberId) {
        member.isPaid = false;
      }
    });
  }

  if (
    expense.settledMembers.length !==
    expense.membersBalance.filter(
      (member) => member.memberId.toString() !== expense.paidBy.toString()
    ).length
  ) {
    expense.isSettled = false;
  }
  await expense.save();
  res.send(expense);
});

module.exports = router;
