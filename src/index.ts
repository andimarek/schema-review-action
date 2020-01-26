import * as core from "@actions/core";
import * as github from "@actions/github";
import * as fs from "fs";
import * as yaml from "js-yaml";
import fetch from "node-fetch";
import { spawn } from "child_process";

import { introspectionQuery } from 'graphql/utilities/introspectionQuery'
import { buildClientSchema } from 'graphql/utilities/buildClientSchema'
import { printSchema } from 'graphql/utilities/schemaPrinter'

import { CreateGitHubCheckPayload, NewSchemaVersionGitHubPayload } from './types';


const backendUrl = 'https://backend.graphql-consulting.com/graphql';

try {
    const { configData, fileContent } = readSchemaReviewConfig();
    const schemaSource = configData['schema-source'];
    assertExists(schemaSource, "invalid config file; expect schema-source")
    const introspectServer = schemaSource['introspect-server'];
    assertExists(schemaSource, "invalid config file: expect introspect-server")
    const containerPort = introspectServer['container-port'];
    assertExists(schemaSource, "invalid config file: expect introspect-server: container-port")
    let dockerfilePath = introspectServer['dockerfile-path'];
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
        handlePush(payload, dockerfilePath, containerPort);
    } else if (isPullRequest) {
        handlePullRequest(payload, dockerfilePath, containerPort, mergeSha, fileContent);
    } else {
        throw new Error(`triggered by unexpected event ${eventName}`);
    }

} catch (error) {
    core.setFailed(error.message);
}

function handlePush(payload: any, dockerfilePath: string, containerPort: string) {
    const repository = payload.repository;
    const repoId = repository.id.toString();
    const repoOwner = repository.owner.login;
    const repoName = repository.name;
    const sha = payload.after;

    const input = {
        repoId,
        repoOwner,
        repoName,
        sha
    };

    startImageAndQuerySchema(dockerfilePath, containerPort)
        .then((schema) => {
            newSchemaVersion({ ...input, schema }, backendUrl);
        });
}

function handlePullRequest(payload: any, dockerfilePath: string, containerPort: string, mergeSha: string, configFile: string) {
    const pullRequest = payload['pull_request'];
    const prNumber = pullRequest.number.toString();
    const repository = payload.repository;
    const repoId = repository.id.toString();
    const repoName = repository.name;
    const repoOwner = repository.owner.login;

    const head = pullRequest.head;
    const headSha = head.sha;
    const baseSha = pullRequest.base.sha;

    const configFileEncoded = encodeBase64(configFile);

    console.log(`repoId ${repoId}`);
    console.log(`repoOwner ${repoOwner}`);
    console.log(`repoName ${repoName}`);

    console.log(`prNumber ${prNumber}`);
    console.log(`mergeSha: ${mergeSha}`);
    console.log(`headSha: ${headSha}`);
    console.log(`baseSha: ${baseSha}`);

    const input = {
        repoId,
        repoOwner,
        repoName,
        prNumber,
        mergeSha,
        headSha,
        baseSha,
        configFile: configFileEncoded
    };

    startImageAndQuerySchema(dockerfilePath, containerPort)
        .then((schema) => {
            createGitHubCheck({ ...input, schema }, backendUrl);
        });
}

function startImageAndQuerySchema(dockerfilePath: string, containerPort: string): Promise<string> {
    return buildDockerImage(dockerfilePath)
        .then((imageId: string) => {
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
        .catch(error => {
            console.log(error);
        });
}

function runImage(imageId: string, containerPort: string) {
    return execute('docker', ['run', '-d', '-p', `4000:${containerPort}`, imageId]);
}

function buildDockerImage(dockerfilePath: string): Promise<string> {
    return execute('docker', ['build', dockerfilePath, '-q'])
        .then(
            (imageId: string) => {
                return imageId.trim();
            },
            (rejected) => {
                console.log(`building image failed with ${rejected} `);
                throw new Error(rejected);
            });
}

function execute(command: string, args: any): Promise<string> {
    console.log('executing ', command, args);
    const ls = spawn(command, args);
    return new Promise((resolve, reject) => {
        let stdout = '';
        ls.stdout.on('data', (data: any) => {
            stdout += data;
        });
        let stderr = '';
        ls.stderr.on('data', (data: any) => {
            stderr += data;
        });
        ls.on('close', (code: any) => {
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

async function createGitHubCheck(input: CreateGitHubCheckPayload, backendUrl: string) {
    const query = `mutation createGitHubCheck($input: CreateGitHubCheckPayload!){
        createGitHubCheck(input: $input) {
            success
            message
        }
    }`;
    return sendGraphQL(query, { input }, backendUrl);
}

async function newSchemaVersion(input: NewSchemaVersionGitHubPayload, backendUrl: string) {
    const query = `mutation newSchemaVersion($input: NewSchemaVersionGitHubPayload!){
        newSchemaVersionGitHub(input: $input) {
            success
            message
        }
    }`;
    return sendGraphQL(query, { input }, backendUrl);
}

async function sendGraphQL(query: string, variables: { [key: string]: any }, backendUrl: string): Promise<any> {
    const body = {
        query,
        variables
    };
    return await fetch(backendUrl + "?secret=na", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    }).then(res => {
        console.log('send graphql response:', res.json());
        return res;
    });
}

async function querySchema(endpoint: string): Promise<any> {
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
    let fileContent = fs.readFileSync('./schema-review.yml', 'utf8');
    assertExists(fileContent, "expect schema-review.yml file");
    let configData = yaml.safeLoad(fileContent);
    return { configData, fileContent };
}

function assertExists(val: any, message: string) {
    if (!val) {
        throw new Error(message);
    }
}

function encodeBase64(str: string) {
    return Buffer.from(str, 'utf8').toString('base64');
}



const { eventName, payload, sha: mergeSha } = github.context;

const action = payload.action;

console.log(`eventName ${eventName}`);
console.log(`action ${action}`);

