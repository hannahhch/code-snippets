const mongoose = require('mongoose');


const codeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  codeBody: String,
  notes: String,
  language: String,
  tags: String
})

const Code = mongoose.model("Code", codeSchema);

module.exports = {
    Code: Code,
};
