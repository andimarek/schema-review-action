const core = require('@actions/core');
const github = require('@actions/github');
import fetch from 'node-fetch'
import { introspectionQuery } from 'graphql/utilities/introspectionQuery'
import { buildClientSchema } from 'graphql/utilities/buildClientSchema'
import { printSchema } from 'graphql/utilities/schemaPrinter'


try {
    const containerPort = core.getInput('container-port');
    // const secret = core.getInput('schema-analysis-secret');
    const backendUrl = core.getInput('url');
    const dockerfilePath = core.getInput('dockerfile-path');
    console.log(`config: container port: ${containerPort}, url: ${backendUrl}, dockerfile path: ${dockerfilePath}`);

    // const payload = JSON.stringify(github.context, undefined, 2)
    const { eventName, payload, sha: mergeSha } = github.context;
    const pullRequest = payload['pull_request'];
    const prNumber = pullRequest.number;
    const action = payload.action;
    const repository = payload.repository;
    const repoId = repository.id;
    const repoName = repository.name;
    const repoOwner = repository.owner.login;

    // const base = pullRequest.base;
    const head = pullRequest.head;
    const headSha = head.sha;

    console.log(`eventName ${eventName}`);
    console.log(`action ${action}`);

    console.log(`repoId ${repoId}`);
    console.log(`repoOwner ${repoOwner}`);
    console.log(`repoName ${repoName}`);

    console.log(`prNumber ${prNumber}`);
    console.log(`mergeSha: ${mergeSha}`);
    console.log(`headSha: ${headSha}`);
    const pullRequestData = {
        repoId,
        repoOwner,
        repoName,
        prNumber,
        mergeSha,
        headSha
    };


    buildDockerImage(dockerfilePath)
        .then((imageId) => {
            return runImage(imageId, containerPort);
        })
        .then(() => {
            return new Promise(resolve => {
                console.log('waiting for docker image to come up');
                setTimeout(() => {
                    console.log('waiting finished')
                    resolve()
                },
                    5000);
            });
        })
        .then(() => {
            return querySchema('http://localhost:4000/graphql');
        })
        .then((schema) => {
            return sendSchema(schema, backendUrl, pullRequestData);
        })
        .then((success) => {
            console.log(success);
        }, (failed) => {
            console.log(failed);
        })
        .catch(error => {
            console.log(error);
        });

} catch (error) {
    core.setFailed(error.message);
}

function runImage(imageId, containerPort) {
    return execute('docker', ['run', '-d', '-p', `4000:${containerPort}`, imageId]);
}

function buildDockerImage(dockerfilePath) {
    return execute('docker', ['build', dockerfilePath, '-q']).then(
        (imageId) => {
            return imageId.trim();
        },
        (rejected) => {
            console.log(`building image failed with ${rejected} `);
        });
}

function execute(command, args) {
    console.log('executing ', command, args);
    const { spawn } = require('child_process');
    const ls = spawn(command, args);
    return new Promise((resolve, reject) => {
        let stdout = '';
        ls.stdout.on('data', data => {
            stdout += data;
        });
        let stderr = '';
        ls.stderr.on('data', data => {
            stderr += data;
        });
        ls.on('close', code => {
            console.log(`stdout: ${stdout} stderr: ${stderr} `);
            if (code == 0) {
                resolve(stdout);
            } else {
                reject(stderr);
            }
            console.log(`child process exited with code ${code} `);
        });
    });
}

async function sendSchema(schema, backendUrl, pullRequestData) {
    const body = {
        schema,
        ...pullRequestData
    }
    return await fetch(backendUrl + "?secret=na", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    }).then(res => {
        console.log('send schema response:', res);
        return res.json();
    });
}

async function querySchema(endpoint) {
    const headers = { 'Content-Type': 'application/json' };
    try {
        console.log('query:' + endpoint);
        const { data, errors } = await fetch(endpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify({ query: introspectionQuery }),
        }).then(res => res.json())

        if (errors) {
            return { status: 'err', message: JSON.stringify(errors, null, 2) }
        }
        const schema = buildClientSchema(data)
        return printSchema(schema);
    } catch (err) {
        return { status: 'err', message: err.message }
    }

}