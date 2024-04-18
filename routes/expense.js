const mongoose = require("mongoose");
const { Router } = require("express");
const { authMiddleWare } = require("../middleware");
const { Expense, Group, User } = require("../models");
const minimizeTransactions = require("../helpers/minimizeTrx");
const {
  calculateSettlement,
  calculateSplit,
} = require("../services/expenseService");
const autoSettle = require("../helpers/autoSettle");

const router = Router();

// Add New Expense in Group
router.post("/", authMiddleWare, async (req, res) => {
  try {
    const { groupId, paidBy, description, amount } = req.body;

    // Fetch the group and check if it exists
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).send("Group not found");
    }

    // Check if the group has at least 2 members
    if (group.members.length < 2) {
      return res
        .status(400)
        .send("Cannot add expense to a group with no members");
    }

    // Fetch the members from the group
    const members = await User.find(
      { _id: { $in: group.members } },
      { name: 1, _id: 1, settle: 1 }
    );

    // Calculate the split of the expense
    const membersBalance = calculateSplit(paidBy, members, amount);

    // Create a new expense
    const expense = new Expense({
      description,
      amount,
      date: Date.now(),
      group: groupId,
      paidBy,
      membersBalance,
      settledMembers: [],
    });

    // Save the new expense to the database
    await expense.save();

    // Array to store update operations for bulk write
    const bulkUpdates = [];

    // Iterate over each member to update settle information
    for (const member of members) {
      // Find the settle entry for the current group
      let userSettle = member.settle.find(
        (settle) => settle.group_id.toString() === groupId.toString()
      );

      // If not found, initialize a new settle entry for the group
      if (!userSettle) {
        userSettle = {
          group_id: groupId.toString(),
          given: 0,
          taken: 0,
        };
        member.settle.push(userSettle);
      }

      // Iterate through balances to update settle information
      for (const balance of membersBalance) {
        if (balance.memberId.toString() === member._id.toString()) {
          // Update the given and taken amounts
          if (balance.balance > 0) {
            userSettle.given += balance.balance;
          } else {
            userSettle.taken += balance.balance;
          }

          // Calculate final settle
          userSettle.finalSettle = userSettle.given + userSettle.taken;
        }
      }

      // Add update operation to bulkUpdates array
      bulkUpdates.push({
        updateOne: {
          filter: { _id: member._id },
          update: {
            $set: { settle: member.settle },
          },
        },
      });
    }

    // Perform bulk updates
    await User.bulkWrite(bulkUpdates);

    // Return the saved expense object as the response
    res.send(expense);
  } catch (error) {
    console.error("Internal Server Error:", error);
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
      const expenses = await Expense.find({
        group: groupId,
        "membersBalance.memberId": new mongoose.Types.ObjectId(memberId),
      })
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
      console.log("activeExpenses:: ", activeExpenses);
      console.log("settledExpenses:: ", settledExpenses);
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
      console.log("settledExpenses after:: ", settledExpenses);
      //   fetch user details who are in groupId
      const group = await Group.findById(groupId)
        .populate("members", { name: 1, _id: 1, settle: 1 })
        .lean();
      console.log("group:: ", group);
      const users = group.members.map((member) => {
        console.log("member.settle:::", member.settle);
        return {
          _id: member._id.toString(),
          name: member.name,
          group_id: groupId,
          settle: member.settle,
        };
      });

      console.log("users:: ", users);

      //   console.log("users:: ", users);
      // Calculate how much the authenticated user owes to each individual member of the group
      expenses.forEach((expense) => {
        // check if expense is of given groupId then only process it
        if (expense.group.toString() === groupId) {
          expense.membersBalance.forEach((expenseMember) => {
            //   console.log("expense.settledMembers:: ", expense.settledMembers);
            //   console.log("expenseMember.memberId:: ", expenseMember.memberId);
            if (!expense.settledMembers.includes(expenseMember.memberId)) {
              // console.log("member is not settled!");
              // console.log("expenseMember.balance:: ", expenseMember.balance);
              if (expenseMember.balance > 0) {
                //   console.log("balance > 0: ", expenseMember.balance);
                // add amount to user setttle .given
                const userIndex = users.findIndex(
                  (user) =>
                    user._id.toString() === expenseMember.memberId.toString()
                );
                //   console.log("userIndex:: ", userIndex);
                const user = users[userIndex];
                //   console.log("user:: ", user);
                const userSettleIndex = user.settle.findIndex(
                  (settle) =>
                    settle.group_id.toString() === expense.group.toString()
                );

                if (userSettleIndex < 0) {
                  // console.log("here: userSettleIndex < 0");
                  // add group_id, given and taken to user settle
                  user.settle.push({
                    group_id: expense.group.toString(),
                    given: expenseMember.balance,
                    taken: 0,
                    finalSettle: expenseMember.balance,
                  });
                }
              }

              if (expenseMember.balance < 0) {
                // add amount to user settle .taken
                const userIndex = users.findIndex(
                  (user) =>
                    user._id.toString() === expenseMember.memberId.toString()
                );
                //   console.log("users < 0::: ", users);
                //   console.log("userIndex < 0::: ", userIndex);
                const user = users[userIndex];
                //   console.log("user < 0::: ", user);
                const userSettleIndex = user.settle.findIndex(
                  (settle) =>
                    settle.group_id.toString() === expense.group.toString()
                );

                if (userSettleIndex < 0) {
                  // console.log("here: userSettleIndex < 0");
                  // add group_id, given and taken to user settle
                  user.settle.push({
                    group_id: expense.group.toString(),
                    given: 0,
                    taken: expenseMember.balance,
                    finalSettle: expenseMember.balance,
                  });
                }
              }
            }
          });
        }
      });

      let settledTrxs = [];
      console.log("users after:: ");
      users.map((user) => console.log(user));
      users.map((user) => {
        user.settle.map((groupSettle) => {
          console.log("groupSettle:: ", groupSettle);
          // check if settle.groupId is given group id
          if (groupSettle.group_id === groupId) {
            settledTrxs.push({
              name: user.name,
              amount: groupSettle.finalSettle,
              user_id: user._id,
            });
          }
        });
      });
      console.log("settledTrxs:::: ", settledTrxs);
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

      const minimizedTrxs = minimizeTransactions(sortedSettledTrxs);
      console.log("minimizedTrxs:: ", minimizedTrxs);
      //   remove transactions where amount is 0
      const filteredTrxs = minimizedTrxs.filter((trx) => trx.amount !== 0);

      //   fetch settle entry from users table for current user and group with witch request is fetched
      const settleEntry = await User.findOne({
        _id: new mongoose.Types.ObjectId(memberId),
        "settle.group_id": groupId,
      });
      console.log("settleEntry:: ", settleEntry);
      let totalOwedToGroup = 0;
      let totalLentToGroup = 0;
      let totalToSettle = 0;
      if (settleEntry) {
        //   fetch only matching groupid object from settle of settleEntry
        const settled = settleEntry.settle.find(
          (settle) => settle.group_id === groupId
        );
        console.log("settled:: ", settled);
        totalOwedToGroup = settled.taken;
        totalLentToGroup = settled.given;
        totalToSettle = settled.finalSettle;
      }

      console.log("totalOwedToGroup:: ", totalOwedToGroup);
      console.log("totalLentToGroup:: ", totalLentToGroup);
      console.log("totalToSettle:: ", totalToSettle);

      res.send({
        activeExpenses,
        settledExpenses,
        totalOwedToGroup: totalOwedToGroup ?? 0,
        totalLentToGroup: totalLentToGroup ?? 0,
        totalToSettle: totalToSettle ?? 0,
        owedToIndividuals: filteredTrxs,
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

  //   update taken and finalSettle of memberId in settle array of that group in users collection
  const user = await User.findOne({ _id: mongoose.Types.ObjectId(memberId) });
  console.log("user:::: ", user);
  if (!user) {
    return res.status(404).send("User not found");
  }
  // find groupSettleIndex of that group in user.settle array
  const groupSettleIndex = user.settle.findIndex(
    (settle) => settle.group_id.toString() === expense.group.toString()
  );
  console.log("groupSettleIndex::: ", groupSettleIndex);
  if (groupSettleIndex < 0) {
    return res.status(404).send("Settle not found");
  }
  // update taken and finalSettle of memberId in settle array of that group in users collection
  user.settle[groupSettleIndex].taken =
    user.settle[groupSettleIndex].taken +
      -1 *
        expense.membersBalance.find(
          (member) => member.memberId.toString() === memberId
        ).balance || 0;
  user.settle[groupSettleIndex].finalSettle =
    user.settle[groupSettleIndex].given + user.settle[groupSettleIndex].taken;
  console.log(
    "user.settle[groupSettleIndex]::: ",
    user.settle[groupSettleIndex]
  );

  //   mark settle as modified in order to successfully update it
  user.markModified("settle");

  //   update taken and finalSettle of paidBy user of that expense in settle array of that group in users collection
  const paidByUser = await User.findOne({
    _id: mongoose.Types.ObjectId(expense.paidBy),
  });

  if (!paidByUser) {
    return res.status(404).send("User not found");
  }

  //   find paidByGroupSettleIndex of that group in paidByUser.settle array
  const paidByGroupSettleIndex = paidByUser.settle.findIndex(
    (settle) => settle.group_id.toString() === expense.group.toString()
  );

  if (paidByGroupSettleIndex < 0) {
    return res.status(404).send("Settle not found");
  }

  //   update given and finalSettle of paidBy user of that expense in settle array of that group in users collection
  paidByUser.settle[paidByGroupSettleIndex].given =
    paidByUser.settle[paidByGroupSettleIndex].given +
      expense.membersBalance.find(
        (member) => member.memberId.toString() === memberId
      ).balance || 0;

  paidByUser.settle[paidByGroupSettleIndex].finalSettle =
    paidByUser.settle[paidByGroupSettleIndex].given +
    paidByUser.settle[paidByGroupSettleIndex].taken;

  //  mark settle as modified in order to successfully update it
  paidByUser.markModified("settle");

  //   save user and paidByUser to update their settle
  await paidByUser.save();
  await user.save();

  return res.send(expense);
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

  //   check if all members except paidBy are settled or not and update isSettled flag accordingly
  if (
    expense.settledMembers.length !==
    expense.membersBalance.filter(
      (member) => member.memberId.toString() !== expense.paidBy.toString()
    ).length
  ) {
    expense.isSettled = false;
  }
  await expense.save();

  //   update taken and finalSettle of memberId in settle array of that group in users collection
  const user = await User.findOne({ _id: mongoose.Types.ObjectId(memberId) });
  if (!user) {
    return res.status(404).send("User not found");
  }

  // find groupSettleIndex of that group in user.settle array

  const groupSettleIndex = user.settle.findIndex(
    (settle) => settle.group_id.toString() === expense.group.toString()
  );

  if (groupSettleIndex < 0) {
    return res.status(404).send("Settle not found");
  }

  // update taken and finalSettle of memberId in settle array of that group in users collection
  user.settle[groupSettleIndex].taken =
    user.settle[groupSettleIndex].taken -
      -1 *
        expense.membersBalance.find(
          (member) => member.memberId.toString() === memberId
        ).balance || 0;

  user.settle[groupSettleIndex].finalSettle =
    user.settle[groupSettleIndex].given + user.settle[groupSettleIndex].taken;

  // mark settle as modified in order to successfully update it
  user.markModified("settle");

  // update given and finalSettle of paidBy user of that expense in settle array of that group in users collection
  const paidByUser = await User.findOne({
    _id: mongoose.Types.ObjectId(expense.paidBy),
  });

  if (!paidByUser) {
    return res.status(404).send("User not found");
  }

  // find paidByGroupSettleIndex of that group in paidByUser.settle array
  const paidByGroupSettleIndex = paidByUser.settle.findIndex(
    (settle) => settle.group_id.toString() === expense.group.toString()
  );

  if (paidByGroupSettleIndex < 0) {
    return res.status(404).send("Settle not found");
  }

  // update given and finalSettle of paidBy user of that expense in settle array of that group in users collection
  paidByUser.settle[paidByGroupSettleIndex].given =
    paidByUser.settle[paidByGroupSettleIndex].given -
      expense.membersBalance.find(
        (member) => member.memberId.toString() === memberId
      ).balance || 0;

  paidByUser.settle[paidByGroupSettleIndex].finalSettle =
    paidByUser.settle[paidByGroupSettleIndex].given +
    paidByUser.settle[paidByGroupSettleIndex].taken;

  // mark settle as modified in order to successfully update it
  paidByUser.markModified("settle");

  // save user and paidByUser to update their settle
  await paidByUser.save();
  await user.save();

  res.send(expense);
});

module.exports = router;
