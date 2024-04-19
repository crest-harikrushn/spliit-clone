const { required } = require("joi");
const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
  {
    description: {
      type: String,
      required: true,
      minlength: 1,
      maxlength: 100,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
    },
    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    membersBalance: {
      type: Array,
      required: true,
      default: [],
    },
    percentageShares: {
      type: [
        {
          memberId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
          percentage: Number,
        },
      ],
      required: true,
      default: [],
    },
    customAmounts: {
      type: [
        {
          memberId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
          amount: Number,
        },
      ],
      required: true,
      default: [],
    },
    splitMode: {
      type: String,
      enum: ["equal", "custom", "percentage"],
      default: "equal",
    },
    settledMembers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: [],
      },
    ],
    isSettled: {
      type: Boolean,
      default: false,
    },
    settlements: {
      type: [
        {
          memberId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
          amount: Number,
        },
      ],
      default: [],
    },
  },
  {
    versionKey: false,
    timestamps: true,
  }
);

const validateExpense = (expense) => {
  const schema = {
    description: Joi.string().min(1).max(100).required(),
    amount: Joi.number().min(0).required(),
    date: Joi.date().required(),
    group: Joi.required(),
    paidBy: Joi.required(),
  };
  return Joi.object(schema).validate(expense);
};

const Expense = mongoose.model("Expense", expenseSchema);

module.exports = { Expense, validateExpense };
