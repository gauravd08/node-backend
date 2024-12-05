const mongoose = require('mongoose');

// Define user schema
const GithubIntegrationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  githubId: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    unique: true,
  }
}, { timestamps: true });

const Github = mongoose.model('githubIntegration', GithubIntegrationSchema, 'github-integration');

module.exports = Github;
