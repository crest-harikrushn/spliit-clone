// const mongoose = require("mongoose");
// const { Expense } = require("./models/expense"); // Import the Expense model
// const User = require("./models/user"); // Import the User model
// mongoose.connect("mongodb://localhost:27017/splitwise-prod");
// async function findWhoOwesWhom(groupId) {
//   try {
//     // Fetch all expenses for the specified group
//     const expenses = await Expense.find({ group: groupId });

//     // Calculate the total amount paid and share per member
//     let totalAmountPaid = 0;
//     const paidByMap = new Map(); // To track how much each member paid
//     const memberIds = new Set(); // To track unique member IDs

//     for (const expense of expenses) {
//       totalAmountPaid += expense.amount;

//       if (!paidByMap.has(expense.paidBy)) {
//         paidByMap.set(expense.paidBy, 0);
//       }
//       paidByMap.set(
//         expense.paidBy,
//         paidByMap.get(expense.paidBy) + expense.amount
//       );

//       // Add members from the expense balance
//       expense.membersBalance.forEach((balance) =>
//         memberIds.add(balance.memberId)
//       );
//     }

//     // Calculate share per member
//     const sharePerMember = totalAmountPaid / memberIds.size;

//     // Calculate balance for each member
//     const balances = new Map();

//     // Initialize balances map
//     memberIds.forEach((memberId) => {
//       balances.set(memberId, 0);
//     });

//     // Calculate each member's balance
//     for (const [memberId, paidAmount] of paidByMap.entries()) {
//       balances.set(memberId, paidAmount - sharePerMember);
//     }

//     // Calculate members' owed amounts based on expense balances
//     for (const expense of expenses) {
//       expense.membersBalance.forEach((balance) => {
//         const currentBalance = balances.get(balance.memberId) || 0;
//         balances.set(balance.memberId, currentBalance + balance.balance);
//       });
//     }

//     // Determine who owes whom and how much
//     const transactions = [];

//     for (const [debtorId, debtorBalance] of balances.entries()) {
//       if (debtorBalance < 0) {
//         // Find creditors with positive balance
//         for (const [creditorId, creditorBalance] of balances.entries()) {
//           if (creditorId !== debtorId && creditorBalance > 0) {
//             const amountOwed = Math.min(-debtorBalance, creditorBalance);
//             if (amountOwed > 0) {
//               transactions.push({
//                 debtorId,
//                 creditorId,
//                 amount: amountOwed,
//               });

//               // Update balances after transaction
//               balances.set(debtorId, debtorBalance + amountOwed);
//               balances.set(creditorId, creditorBalance - amountOwed);
//             }
//           }
//         }
//       }
//     }

//     return transactions;
//   } catch (error) {
//     console.error(error);
//     return [];
//   }
// }

// // Example usage:
// const groupId = "66191fceb74b97ecfed2261a"; // Replace with actual group ID

// findWhoOwesWhom(groupId)
//   .then((transactions) => {
//     transactions.forEach((transaction) => {
//       console.log(
//         `User ${transaction.debtorId} owes User ${transaction.creditorId} amount ${transaction.amount}`
//       );
//     });
//   })
//   .catch((error) => {
//     console.error(error);
//   });

// const randomIndex = Math.floor(Math.random() * 3);
const amount = 100;
const equalSplit = +Number(amount / 3).toFixed(2);
const remainder = amount - equalSplit * 3;
console.log(remainder.toFixed(2));
