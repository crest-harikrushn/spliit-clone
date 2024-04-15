module.exports = (sortedSettledTrxs) => {
  {
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
};
