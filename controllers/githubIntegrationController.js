require('dotenv').config();
const Github = require('../models/GithubIntegration');
const { axiosPost, getGithubUserDetail } = require('../helpers/axios');
const querystring = require('querystring');
const { Octokit } = require('@octokit/rest');


const connect = async (req, res) => {
    try {

        const redirect_uri = 'http://localhost:4200';
        const client_id = process.env.CLIENT_ID;

        const authUrl = `https://github.com/login/oauth/authorize?${querystring.stringify({
            client_id: client_id,
            redirect_uri: redirect_uri,
            scope: 'read:org,repo'  // Add scopes here
        })}`;

        res.redirect(authUrl);
    } catch (error) {
        res.status(500).json({ message: 'Error connecting github.', error: error.message });
    }
};

const callback = async (req, res) => {
    const { code } = req.query;

    try {
        const response = await axiosPost('https://github.com/login/oauth/access_token', querystring.stringify({
            client_id: process.env.CLIENT_ID,
            client_secret: process.env.CLIENT_SECRET,
            code: code,
            redirect_uri: 'http://localhost:4200',
        }))

        const { access_token } = response.data;


        //get the authenticated user data
        const userResponse = await getGithubUserDetail(access_token);

        const { id, login, name, avatar_url, email } = userResponse.data;

        const existingUser = await Github.findOne({ githubId: id });

        let user = {};
        if (!existingUser) {

            // Create a new record if they don't exist
            user = new Github({
                githubId: id,
                name: name,
                email: email,
            });

            await user.save();
        } else {
            user = await Github.findOne({ githubId: id })
        }

        res.json({ access_token, user });
    }
    catch (error) {
        res.status(500).send(error);
    }
};

const remove = async (req, res) => {
    const { token } = req.headers;

    try {
        //get user
        const userResponse = await getGithubUserDetail(token);
        console.log('userResponse', userResponse);
        const { id } = userResponse.data;

        await Github.deleteOne({ githubId: id });

        res.json({ message: 'Removed successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error during GitHub OAuth');
    }
};

const getRepos = async (req, res) => {
    const { token } = req.headers;

    try {
        const octokit = new Octokit({
            auth: token  // Replace with your GitHub token
        });

        const response = await octokit.rest.orgs.listForAuthenticatedUser({
            per_page: 100,  // Optional: control pagination
        });
        let organisatons = response.data;

        let allRepos = []
        //get all repos of organisatons
        for (let i = 0; i < organisatons.length; i++) {
            let data = await organisatonRepos(organisatons[i].login, token);

            allRepos = [...allRepos, ...data];
        }

        //add flag of isChecked
        for (let i = 0; i < allRepos.length; i++) {
            allRepos[i].isChildExpanded = false;
        }

        res.json({ data: allRepos });

    } catch (error) {
        console.error('Error fetching repositories:', error.response ? error.response.data : error.message);
        res.status(500).send('Error getting github repos.');

    }
};



const organisatonRepos = async (orgName, token) => {

    const octokit = new Octokit({
        auth: token  // Replace with your GitHub token
    });


    const response = await octokit.rest.repos.listForOrg({
        org: orgName,
        type: 'all', // Get all types of repositories (public, private, etc.)
        per_page: 100,
    });

    return response.data
}

const getUserLevelDetail = async (req, res) => {
    const { owner, name } = req.query;
    const { token } = req.headers;


    let commits = await getCommitsDetails(owner, name, token);
    let pulls = await getPullDetails(owner, name, token)
    let issues = await getIssueDetails(owner, name, token);

    let finalData = [];
    //make combined data user specific
    for (let i = 0; i < commits.length; i++) {
        let userId = commits[i]?.committer?.id;
        let userEmail = commits[i].commit.author.email;
        let userName = commits[i]?.committer?.login;

        if (!userName) {
            userName = commits[i]?.commit?.committer?.name;
        }

        let userExists = finalData.findIndex((x) => x.userId == userId);

        if (userExists > -1) {
            finalData[userExists].totalCommits++
        } else {
            finalData = [...finalData, {
                userEmail,
                userId,
                userName,
                totalCommits: 1,
                totalPulls: 0,
                totalIssues: 0
            }]
        }
    }

    //make combined data user specific
    for (let i = 0; i < pulls.length; i++) {
        console.log(pulls[i]);
        let userId = pulls[i]?.user?.id;
        let userName = pulls[i]?.user?.login;

        let userExists = finalData.findIndex((x) => x.userId == userId);

        if (userExists > -1) {
            finalData[userExists].totalPulls++
        } else {
            finalData = [...finalData, {
                userEmail: userName,
                userId,
                userName,
                totalCommits: 0,
                totalPulls: 1,
                totalIssues: 0
            }]
        }
    }

    //make combined data user specific
    for (let i = 0; i < issues.length; i++) {
        let userId = issues[i]?.user?.id;
        let userName = issues[i]?.user?.login;

        let userExists = finalData.findIndex((x) => x.userId == userId);

        if (userExists > -1) {
            finalData[userExists].totalIssues++
        } else {
            finalData = [...finalData, {
                userEmail,
                userId,
                userName,
                totalCommits: 0,
                totalPulls: 0,
                totalIssues: 1
            }]
        }
    }

    res.json({ commits, pulls, issues, finalData });

}


const getCommitsDetails = async (owner, name, token) => {
    const octokit = new Octokit({
        auth: token  // Replace with your GitHub token
    });

    let totalCommits = 0;
    let page = 1;
    const perPage = 100;  // GitHub API allows up to 100 commits per page
    let arr = [];
    while (true) {
        try {

            const response = await octokit.rest.repos.listCommits({
                owner: owner,
                repo: name,
                page: page,
                per_page: perPage, // Adjust the number of commits as needed
            });

            // If no commits are returned, break out of the loop
            if (response.data.length === 0) break;

            // Count the number of commits on this page and add to the total
            totalCommits += response.data.length;
            arr = [...arr, ...response.data]
            // Move to the next page of commits
            page++;
        } catch (error) {
            console.error('Error fetching commits:', error.message);
            break;
        }
    }

    return arr;
}

const getPullDetails = async (owner, name, token) => {
    const octokit = new Octokit({
        auth: token  // Replace with your GitHub token
    });

    let totalCommits = 0;
    let page = 1;
    const perPage = 100;  // GitHub API allows up to 100 commits per page
    let arr = [];
    while (true) {
        try {

            const response = await octokit.rest.pulls.list({
                owner: owner,
                repo: name,
                page: page,
                state: 'all', // Get open, closed, and merged PRs
                per_page: perPage, // Adjust the number of PRs as needed
            });


            // If no commits are returned, break out of the loop
            if (response.data.length === 0) break;

            // Count the number of commits on this page and add to the total
            totalCommits += response.data.length;
            arr = [...arr, ...response.data]
            // Move to the next page of commits
            page++;
        } catch (error) {
            console.error('Error fetching commits:', error.message);
            break;
        }
    }

    return arr;
}

const getIssueDetails = async (owner, name, token) => {
    const octokit = new Octokit({
        auth: token  // Replace with your GitHub token
    });

    let totalCommits = 0;
    let page = 1;
    const perPage = 100;  // GitHub API allows up to 100 commits per page
    let arr = [];
    while (true) {
        try {

            const response = await octokit.rest.issues.listForRepo({
                owner: owner,
                repo: name,
                state: 'all', // Get open and closed issues
                page: page,
                per_page: perPage, // Adjust the number of issues as needed
            });

            // If no commits are returned, break out of the loop
            if (response.data.length === 0) break;

            // Count the number of commits on this page and add to the total
            totalCommits += response.data.length;
            arr = [...arr, ...response.data]
            // Move to the next page of commits
            page++;
        } catch (error) {
            console.error('Error fetching commits:', error.message);
            break;
        }
    }

    return arr;
}

module.exports = { connect, callback, remove, getRepos, getUserLevelDetail };
