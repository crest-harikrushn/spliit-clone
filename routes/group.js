const { Router } = require("express");
const { authMiddleWare } = require("../middleware");
const { Expense, Group, User } = require("../models");
const mongoose = require("mongoose");
const { updateMemberBalances } = require("../services/expenseService");
const calculateSummary = require("../helpers/calculateGroupSummary");
const moment = require("moment");

const router = Router();

router.get("/:groupId", authMiddleWare, async (req, res) => {
  const groupId = req.params.groupId;
  const group = await Group.findById(groupId)
    .populate("members", {
      password: 0,
    })
    .lean({ virtuals: true });
  if (!group) {
    return res.status(404).send("Group not found");
  }
  const totalExpenses = await Expense.countDocuments({
    group: new mongoose.Types.ObjectId(group._id),
  });
  console.log("totalExpenses:: ", totalExpenses);
  return res.send({ ...group, totalExpenses });
});

router.post("/", authMiddleWare, async (req, res) => {
  const group = new Group({
    name: req.body.name,
    description: req.body.description,
    members: req.body.members,
  });
  await group.save();

  return res.send(group);
});

router.get("/member/:memberId", authMiddleWare, async (req, res) => {
  const memberId = req.params.memberId;

  try {
    // Find groups where the member is a member
    let groups = await Group.find({ members: memberId }).lean();

    // Calculate total expenses for each group asynchronously
    await Promise.all(
      groups.map(async (group) => {
        group.totalExpenses = await Expense.countDocuments({
          group: group._id,
        });
      })
    );

    // Send the response
    return res.send(groups);
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).send("Internal Server Error");
  }
});

router.delete(
  "/:groupId/member/:memberId",
  authMiddleWare,
  async (req, res) => {
    const groupId = req.params.groupId;
    const memberId = req.params.memberId;
    const group = await Group.findById(groupId);
    if (!group) {
      return res
        .status(404)
        .send("you're not part of group or group is deleted");
    }
    const index = group.members.indexOf(memberId);
    if (index > -1) {
      group.members.splice(index, 1);
      await group.save();
    }

    const expenses = await Expense.find({ group: groupId });

    const updatedMemberBalances = await updateMemberBalances(
      expenses,
      group.members
    );

    await Promise.all(
      updatedMemberBalances.map(async (memberBalances) => {
        await Expense.updateOne(
          { _id: memberBalances.expenseId },
          { $set: { membersBalance: memberBalances.membersBalance } }
        );
      })
    );
    return res.send(group);
  }
);

// Add new member to group
router.post("/:groupId/member/:memberId", authMiddleWare, async (req, res) => {
  const groupId = req.params.groupId;
  const memberId = req.params.memberId;
  const group = await Group.findById(groupId);
  if (!group) {
    return res.status(404).send("you're not part of group or group is deleted");
  }
  const member = await User.findById(memberId);
  if (!member) {
    return res.status(404).send("Member not found");
  }
  group.members.push(memberId);

  //   const expenses = await Expense.find({ group: groupId });

  //   const updatedMemberBalances = await updateMemberBalances(
  //     expenses,
  //     group.members
  //   );

  //   await Promise.all(
  //     updatedMemberBalances.map(async (memberBalances) => {
  //       await Expense.updateOne(
  //         { _id: memberBalances.expenseId },
  //         { $set: { membersBalance: memberBalances.membersBalance } }
  //       );
  //     })
  //   );

  await group.save();
  return res.send(group);
});

router.delete("/:groupId", authMiddleWare, async (req, res) => {
  const groupId = req.params.groupId;
  const group = await Group.findById(groupId);
  if (!group) {
    return res.status(404).send("you're not part of group or group is deleted");
  }

  const expenses = await Expense.deleteMany({
    group: new mongoose.Types.ObjectId(group._id),
  });
  const result = await Group.deleteOne({ _id: groupId });

  return res.send("Group Deleted");
});

// API to fetch group summary
router.get("/:groupId/summary", authMiddleWare, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userId = req.user._id; // Assume user ID is available in the request context (e.g. from authentication middleware)
    const groupId = req.params.groupId;

    // Define the time periods using moment.js
    const currentMonthStart = moment().startOf("month").toDate();
    const lastMonthStart = moment()
      .subtract(1, "months")
      .startOf("month")
      .toDate();
    const lastMonthEnd = moment().startOf("month").toDate();

    try {
      // Function to calculate group summary for a given time range

      // Calculate summary for each time period
      const currentMonthSummary = await calculateSummary(
        groupId,
        userId,
        currentMonthStart,
        new Date()
      );
      const lastMonthSummary = await calculateSummary(
        groupId,
        userId,
        lastMonthStart,
        lastMonthEnd
      );
      const allTimeSummary = await calculateSummary(
        groupId,
        userId,
        new Date("1970-01-01"),
        new Date()
      );

      // Prepare the response data
      const groupSummary = {
        currentMonth: currentMonthSummary,
        lastMonth: lastMonthSummary,
        allTime: allTimeSummary,
      };

      // Send the response
      res.status(200).json({ summary: groupSummary, message: "success" });
    } catch (error) {
      console.error("Error fetching group summary:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = router;
