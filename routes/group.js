const { Router } = require("express");
const { authMiddleWare } = require("../middleware");
const { Expense, Group, User } = require("../models");
const mongoose = require("mongoose");
const { updateMemberBalances } = require("../services/expenseService");

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
  const totalExpenses = await Expense.countDocuments({ group: group._id });
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
  let groups = await Group.find({ members: memberId }).lean();
  groups = groups.map(async (group) => {
    const totalExpenses = await Expense.countDocuments({ group: group._id });
    return {
      ...group,
      totalExpenses,
    };
  });
  groups = await Promise.all(groups);
  return res.send(groups);
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

module.exports = router;
