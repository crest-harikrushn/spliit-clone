const Joi = require("joi");
const mongoose = require("mongoose");

const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      minlength: 1,
      maxlength: 50,
    },
    description: {
      type: String,
      maxlength: 512,
    },
    members: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",
    },
  },
  {
    versionKey: false,
    timestamps: true,
  }
);

const Group = mongoose.model("Group", groupSchema);

const validateGroup = (user) => {
  const schema = {
    name: Joi.string().min(1).max(50).required(),
  };
  return Joi.object(schema).validate(user);
};

module.exports = { Group, validateGroup };
