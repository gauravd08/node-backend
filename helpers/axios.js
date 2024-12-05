const axios = require('axios');
const { Octokit } = require('@octokit/rest');


const axiosPost = async (url, data) => {
    const response = await axios.post(url, data, {
        headers: {
            'Accept': 'application/json'
        }
    });

    return response;
}

const getGithubUserDetail = async (token) => {

    const octokit = new Octokit({
        auth: token 
    });

    const response = await octokit.rest.users.getAuthenticated();



    return response;
}

module.exports = { axiosPost, getGithubUserDetail };