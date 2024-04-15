const users = [
  {
    _id: "6615027583db8ecc131ec768",
    name: "hari",
    email: "hari@test.com",
    password: "$2b$10$TZY9Mvn/TsTAtSl53nmPb.3udfRut1m.OPnwuGnYcZyj6E88i4sc.",
    settle: [
      {
        group_id: "661616141415172958890e42",
        given: 0,
        taken: 0,
        finalSettle: 0,
      },
    ],
  },
  {
    _id: "661517bc814c66474231bfac",
    name: "pushan",
    email: "pushan@test.com",
    password: "$2b$10$CeDmJ/rSQeJpguDtwIrCauIaDWjs9Nhrns7zVhO.JSdfNXZEvTRQu",
    settle: [
      {
        group_id: "661616141415172958890e42",
        given: 0,
        taken: 0,
        finalSettle: 0,
      },
    ],
  },
  {
    _id: "661517bc814c66474231bfac",
    name: "pushan-test1",
    email: "pushan@test.com",
    password: "$2b$10$CeDmJ/rSQeJpguDtwIrCauIaDWjs9Nhrns7zVhO.JSdfNXZEvTRQu",
    settle: [
      {
        group_id: "661616141415172959990e42",
        given: 0,
        taken: 0,
        finalSettle: 0,
      },
    ],
  },
  {
    _id: "661518b8814c66474231bfd2",
    name: "harsh",
    email: "harsh@test.com",
    password: "$2b$10$gfV4s7WTBTqH0HbTzXgaduXXzJt6.d2jm..poW/oNeIUmRmYya3qC",
    settle: [
      {
        group_id: "661616141415172958890e42",
        given: 0,
        taken: 0,
        finalSettle: 0,
      },
    ],
  },
];

const groups = [
  {
    _id: "661616141415172958890e42",
    name: "Hari",
    description: "food",
    members: [
      "661518b8814c66474231bfd2",
      "661517bc814c66474231bfac",
      "6615027583db8ecc131ec768",
    ],
  },
];

const expenses = [
  {
    _id: "661666acaf5a81f44c693af8",
    description: "food",
    amount: 498,
    date: {
      $date: "2024-04-10T10:15:08.402Z",
    },
    group: "661616141415172958890e42",
    paidBy: {
      $oid: "6615027583db8ecc131ec768",
    },
    membersBalance: [
      {
        memberId: "6615027583db8ecc131ec768",
        name: "hari",
        balance: 332,
        isPaid: true,
      },
      {
        memberId: "661517bc814c66474231bfac",
        name: "pushan",
        balance: -166,
        isPaid: false,
      },
      {
        memberId: "661518b8814c66474231bfd2",
        name: "harsh",
        balance: -166,
        isPaid: false,
      },
    ],
    settledMembers: [],
    isSettled: false,
    settlements: [],
  },
  {
    _id: "661669a0af5a81f44c693b6c",
    description: "Test Project",
    amount: 600,
    date: {
      $date: "2024-04-10T10:27:44.787Z",
    },
    group: "661616141415172958890e42",
    paidBy: {
      $oid: "661517bc814c66474231bfac",
    },
    membersBalance: [
      {
        memberId: "6615027583db8ecc131ec768",
        name: "hari",
        balance: -200,
        isPaid: false,
      },
      {
        memberId: "661517bc814c66474231bfac",
        name: "pushan",
        balance: 400,
        isPaid: true,
      },
      {
        memberId: "661518b8814c66474231bfd2",
        name: "harsh",
        balance: -200,
        isPaid: false,
      },
    ],
    settledMembers: [],
    isSettled: false,
    settlements: [],
  },
  {
    _id: "66167be693bcf97d3bb99811",
    description: "Project Description",
    amount: 900,
    date: {
      $date: "2024-04-10T11:45:42.402Z",
    },
    group: "661616141415172958890e42",
    paidBy: {
      $oid: "661518b8814c66474231bfd2",
    },
    membersBalance: [
      {
        memberId: "6615027583db8ecc131ec768",
        name: "hari",
        balance: -300,
        isPaid: false,
      },
      {
        memberId: "661517bc814c66474231bfac",
        name: "pushan",
        balance: -300,
        isPaid: false,
      },
      {
        memberId: "661518b8814c66474231bfd2",
        name: "harsh",
        balance: 600,
        isPaid: true,
      },
    ],
    settledMembers: [],
    isSettled: false,
    settlements: [],
  },
];

const currentUser = "6615027583db8ecc131ec768";

expenses.forEach((expense) => {
  expense.membersBalance.forEach((expenseMember) => {
    if (!expense.settledMembers.includes(expenseMember.memberId)) {
      console.log("member is not settled!");
      if (expenseMember.balance > 0) {
        console.log("balance > 0: ", expenseMember.balance);
        // add amount to user setttle .given
        const userIndex = users.findIndex(
          (user) => user._id === expenseMember.memberId
        );
        const user = users[userIndex];
        const userSettleIndex = user.settle.findIndex(
          (settle) => settle.group_id === expense.group
        );
        const userSettle = user.settle[userSettleIndex];
        userSettle.given += expenseMember.balance;
        userSettle.finalSettle = userSettle.given + userSettle.taken;
      }

      if (expenseMember.balance < 0) {
        // add amount to user settle .taken
        const userIndex = users.findIndex(
          (user) => user._id === expenseMember.memberId
        );
        const user = users[userIndex];
        const userSettleIndex = user.settle.findIndex(
          (settle) => settle.group_id === expense.group
        );
        const userSettle = user.settle[userSettleIndex];
        userSettle.taken += expenseMember.balance;
        userSettle.finalSettle = userSettle.given + userSettle.taken;
      }
    }

    // if user is not current user and not settled users
    // if (expenseMember.memberId !== currentUser && !expense.settledMembers.includes(expenseMember.memberId)) {
    //     const userIndex = users.findIndex(user => user._id === expenseMember.memberId);
    //     const currentUserIndex = users.findIndex(user => user._id === currentUser);
    //     const user = users[userIndex];
    //     const currentUser = users[currentUserIndex];
    //     const userSettleIndex = user.settle.findIndex(settle => settle.group_id === expense.group);
    //     const currentUserSettleIndex = currentUser.settle.findIndex(settle => settle.group_id === expense.group);
    //     const userSettle = user.settle[userSettleIndex];
    //     const currentUserSettle = currentUser.settle[currentUserSettleIndex];
    //     const amount = expenseMember.balance;
    //     if (amount < 0) {
    //         userSettle.given += amount;
    //         currentUserSettle.taken += amount;
    //     } else {
    //         userSettle.taken += amount;
    //         currentUserSettle.given += amount;
    //     }
    // }
  });
});

// users.map((user) => {
//   console.log({ user: user.name, settle: user.settle });
// });

// fetch users of given group: 661616141415172958890e42
const groupUsers = users.filter((user) => {
  const userSettle = user.settle.find(
    (settle) => settle.group_id === "661616141415172958890e42"
  );
  return userSettle;
});

groupUsers.map((user) => {
  console.log({ user: user.name, settle: user.settle });
});

let settledTrxs = [];
groupUsers.map((user) => {
  user.settle.map((groupSettle) => {
    settledTrxs.push({
      name: user.name,
      amount: groupSettle.finalSettle,
      user_id: user._id,
    });
  });
});

// sort settledTrxs based on amount
// const sortedSettledTrxs = settledTrxs.sort((a, b) => {
//   if (a.amount < 0) a.amount - b.amount;

//   if (a.amount > 0) b.amount - a.amount;
// });

// console.log(sortedSettledTrxs);
console.log("---------------------------------------------------------");

function minimizeTransactions(sortedSettledTrxs) {
  let left = 0;
  let right = sortedSettledTrxs.length - 1;
  const transactions = [];

  while (left < right) {
    const leftItem = sortedSettledTrxs[left];
    const rightItem = sortedSettledTrxs[right];

    // Calculate the amount to settle between left and right
    const amountToSettle = Math.min(
      Math.abs(leftItem.amount),
      Math.abs(rightItem.amount)
    );

    // Create transaction from leftItem to rightItem
    transactions.push({
      name: leftItem.name,
      to_pay_id: rightItem.user_id,
      to_pay_name: rightItem.name,
      user_id: leftItem.user_id,
      amount: amountToSettle,
    });

    // Adjust amounts at left and right pointers
    leftItem.amount += amountToSettle;
    rightItem.amount -= amountToSettle;

    // If leftItem amount is zero, move left pointer
    if (leftItem.amount === 0) {
      left += 1;
    }

    // If rightItem amount is zero, move right pointer
    if (rightItem.amount === 0) {
      right -= 1;
    }
  }

  return transactions;
}

// Example input
// const sortedSettledTrxs = [
//   { name: "pushan", amount: -168, user_id: "66191fbdb74b97ecfed22616" },
//   { name: "Harsh", amount: -66, user_id: "66191febb74b97ecfed22648" },
//   { name: "Hari", amount: 234, user_id: "66191f9bb74b97ecfed22611" },
// ];
const sortedSettledTrxs = [
  { name: "hari", amount: -168, user_id: "6615027583db8ecc131ec768" },
  { name: "pushan", amount: -100, user_id: "661517bc814c66474231bfac" },
  { name: "Priyam", amount: -34, user_id: "661517bc814c66474231bfabc" },
  { name: "harsh", amount: 234, user_id: "661518b8814c66474231bfd2" },
  { name: "trusha", amount: 68, user_id: "661517bc814c66474231bxyz" },
];

// Calculate the minimal number of transactions
const transactions = minimizeTransactions(sortedSettledTrxs);
console.log(transactions);

// const test = [
//   { name: "hari", amount: -168, user_id: "6615027583db8ecc131ec768" },
//   { name: "pushan", amount: -66, user_id: "661517bc814c66474231bfac" },
//   { name: "pushan", amount: -34, user_id: "661517bc814c66474231bfac" },
//   { name: "pushan", amount: 34, user_id: "661517bc814c66474231bfac" },
//   { name: "harsh", amount: 234, user_id: "661518b8814c66474231bfd2" },
// ];

// sort this array in such a way that negavie values should be in ascending order and positive values should be in descending order
// expected output:
// [
//   { name: 'hari', amount: -168, user_id: '6615027583db8ecc131ec768' },
//   { name: 'pushan', amount: -66, user_id: '661517bc814c66474231bfac' },
//   { name: 'pushan', amount: -34, user_id: '661517bc814c66474231bfac' },
//   { name: 'harsh', amount: 234, user_id: '661518b8814c66474231bfd2' },
//   { name: 'pushan', amount: 34, user_id: '661517bc814c66474231bfac' }
// ]

// const sortedTest = test.sort((a, b) => {
//   if (a.amount < 0 && b.amount < 0) {
//     return a.amount - b.amount; // both values are negative, sort in ascending order
//   } else if (a.amount >= 0 && b.amount >= 0) {
//     return b.amount - a.amount; // both values are positive, sort in descending order
//   } else {
//     return a.amount < 0 ? -1 : 1; // one value is negative and the other is positive, negative value should come first
//   }
// });

// console.log(sortedTest);
