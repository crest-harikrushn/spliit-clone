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
  const { groupId, paidBy, description, amount } = req.body;
  const group = await Group.findById(groupId);
  if (!group) {
    res.status(404).send("Group not found");
  }

  const members = await User.find(
    { _id: { $in: group.members } },
    { name: 1, _id: 1 }
  ).lean();

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
});

// Get Active and Settled Expenses of Group Member Individual
router.get(
  "/group/:groupId/member/:memberId",
  authMiddleWare,
  async (req, res) => {
    const groupId = req.params.groupId;
    const memberId = req.params.memberId;
    const expenses = await Expense.find({
      group: groupId,
    }).populate("paidBy", {
      name: 1,
      _id: 1,
    });

    const activeExpenses = expenses.filter((expense) => {
      return (
        expense.settledMembers.indexOf(memberId) === -1 && !expense.isSettled
      );
    });

    const settledExpenses = expenses.filter((expense) => {
      return expense.settledMembers.indexOf(memberId) > -1 || expense.isSettled;
    });

    res.send({
      activeExpenses,
      settledExpenses,
    });
  }
);

// active settlements calculations
// router.get(
//   "/group/:groupId/member/:memberId",
//   authMiddleWare,
//   async (req, res) => {
//     try {
//       const groupId = req.params.groupId;
//       const memberId = req.params.memberId;

//       // Find all expenses for the group
//       const expenses = await Expense.find({ group: groupId }).populate(
//         "paidBy"
//       );

//       // Initialize arrays to store active and settled expenses
//       const activeExpenses = [];
//       const settledExpenses = [];

//       // Iterate over each expense
//       expenses.forEach((expense) => {
//         const { paidBy, membersBalance, settledMembers, isSettled } =
//           expense.toObject();

//         const expenseDetails = {
//           _id: expense._id,
//           description: expense.description,
//           amount: expense.amount,
//           date: expense.date,
//           group: expense.group,
//           paidBy: {
//             _id: paidBy._id,
//             name: paidBy.name,
//           },
//           isSettled,
//         };

//         // Calculate settlements for active expenses
//         if (!isSettled) {
//           const settlements = membersBalance.map((member) => {
//             const { memberId, name, balance } = member;

//             // Calculate owed amount
//             const amountOwed = memberId.toString() === memberId ? balance : 0;

//             // Determine payment status
//             const paymentStatus = settledMembers.includes(memberId)
//               ? "Paid"
//               : "Owes";

//             return {
//               memberId,
//               name,
//               amountOwed,
//               paymentStatus,
//             };
//           });

//           expenseDetails.settlements = settlements;
//           activeExpenses.push(expenseDetails);
//         } else {
//           // For settled expenses, simply push to settledExpenses array
//           settledExpenses.push(expenseDetails);
//         }
//       });

//       res.send({
//         activeExpenses,
//         settledExpenses,
//       });
//     } catch (error) {
//       console.error(error);
//       res.status(500).send("Internal Server Error");
//     }
//   }
// );

// Get Active and Settled Expenses of Group Member Individual
// router.get(
//   "/group/:groupId/member/:memberId",
//   authMiddleWare,
//   async (req, res) => {
//     try {
//       const groupId = req.params.groupId;
//       const memberId = req.params.memberId;

//       // Find all expenses for the group
//       const expenses = await Expense.find({ group: groupId }).populate(
//         "paidBy"
//       );

//       // Filter settled expenses (settled or paid by the member)
//       const settledExpenses = expenses.filter((expense) => {
//         return (
//           expense.settledMembers.indexOf(memberId) > -1 || expense.isSettled
//         );
//       });

//       // Construct response for each settled expense
//       const settledExpensesWithDetails = settledExpenses.map((expense) => {
//         const { paidBy, membersBalance, settledMembers } = expense.toObject();

//         // Calculate how much each member owes or is owed
//         const settlements = membersBalance.map((member) => {
//           const { memberId, name, balance } = member;

//           // Calculate owed amount
//           const amountOwed = memberId.toString() === memberId ? 0 : balance;

//           // Determine payment status
//           const paymentStatus =
//             settledMembers.includes(memberId) ||
//             paidBy._id.toString() === memberId
//               ? "Paid"
//               : "Owes";

//           return {
//             memberId,
//             name,
//             amountOwed,
//             paymentStatus,
//           };
//         });

//         return {
//           _id: expense._id,
//           description: expense.description,
//           amount: expense.amount,
//           date: expense.date,
//           group: expense.group,
//           paidBy: {
//             _id: paidBy._id,
//             name: paidBy.name,
//           },
//           settlements,
//           isSettled: expense.isSettled,
//         };
//       });

//       res.send({
//         settledExpenses: settledExpensesWithDetails,
//       });
//     } catch (error) {
//       console.error(error);
//       res.status(500).send("Internal Server Error");
//     }
//   }
// );

// Settle Expense of Group Member Individual
router.post("/:expenseId/settle/:memberId", async (req, res) => {
  const expenseId = req.params.expenseId;
  const memberId = req.params.memberId;
  const expense = await Expense.findById(expenseId);
  if (!expense) {
    res.status(404).send("Expense may be already settled or deleted");
  }
  const index = expense.settledMembers.indexOf(memberId);
  if (index > -1) {
    expense.settledMembers.splice(index, 1);
  } else {
    expense.settledMembers.push(memberId);
  }
  if (
    expense.settledMembers.length ===
    expense.membersBalance.filter(
      (member) => member.memberId.toString() !== expense.paidBy.toString()
    ).length
  ) {
    expense.isSettled = true;
  }
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

// Get Settlement Details for each Transaction
router.get("/:expenseId/settlement", authMiddleWare, async (req, res) => {
  try {
    const expenseId = req.params.expenseId;
    const expense = await Expense.findById(expenseId);
    if (!expense) {
      return res.status(404).send("Expense not found");
    }

    const settlements = calculateSettlement(expense);

    res.send({ settlements });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

module.exports = router;
