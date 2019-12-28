const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');
const yaml = require('js-yaml');
import fetch from 'node-fetch'
import { introspectionQuery } from 'graphql/utilities/introspectionQuery'
import { buildClientSchema } from 'graphql/utilities/buildClientSchema'
import { printSchema } from 'graphql/utilities/schemaPrinter'


const backendUrl = 'https://backend.graphql-consulting.com/schema-review/push';

try {
    const configData = readSchemaReviewConfig();
    const schemaSource = configData['schema-source'];
    assertExists(schemaSource, "invalid config file; expect schema-source")
    const introspectServer = schemaSource['introspect-server'];
    assertExists(schemaSource, "invalid config file: expect introspect-server")
    const containerPort = introspectServer['container-port'];
    assertExists(schemaSource, "invalid config file: expect introspect-server: container-port")
    const dockerfilePath = introspectServer['dockerfile-path'];
    if (!dockerfilePath) {
        dockerfilePath = ".";
    }
    console.log(`config: container port: ${containerPort}, url: ${backendUrl}, dockerfile path: ${dockerfilePath}`);

    const { eventName, payload, sha: mergeSha } = github.context;
    const action = payload.action;
    console.log(`eventName ${eventName}`);
    console.log(`action ${action}`);

    const isPush = eventName === 'push';
    const isPullRequest = eventName === 'pull_request';
    if (isPush) {
        const context = JSON.stringify(github.context, undefined, 2)
        console.log(`payload for push ${context}`)
    } else if(isPullRequest){
        const pullRequest = payload['pull_request'];
        const prNumber = pullRequest.number;
        const repository = payload.repository;
        const repoId = repository.id;
        const repoName = repository.name;
        const repoOwner = repository.owner.login;

        const head = pullRequest.head;
        const headSha = head.sha;


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
    }else {
        throw new Error(`triggered by unexpected event ${eventName}`);
    }

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

function readSchemaReviewConfig() {
    let fileContents = fs.readFileSync('./schema-review.yml', 'utf8');
    assertExists(fileContents, "expect schema-review.yml file");
    let config = yaml.safeLoad(fileContents);
    return config;
}

function assertExists(val, message) {
    if (!val) {
        throw new Error(message);
    }
}
