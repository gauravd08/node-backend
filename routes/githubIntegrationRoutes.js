const express = require('express');
const { connect, callback, remove, getRepos, getUserLevelDetail} = require('../controllers/githubIntegrationController');

const router = express.Router();
router.get('/connect', connect);
router.get('/callback', callback);  
router.get('/remove', remove);   
router.get('/getRepos', getRepos);   
router.get('/getUserLevelDetail', getUserLevelDetail);   




module.exports = router;
