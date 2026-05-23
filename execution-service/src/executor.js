const { spawn } = require('child_process');
const { compareOutput } = require('./verdict');

const LANGUAGE_CONFIG = {
    PYTHON: {
        image: 'python:3.11-alpine',
        filename: 'solution.py',
        compileCmd: null,
        execCmd: 'python solution.py',
    },
    CPP: {
        // Custom image with bits/stdc++.h precompiled as a PCH.
        // Must be built once on the host: see images/oj-gcc/Dockerfile.
        // The -std=c++17 flag must match the PCH build so g++ picks it up.
        image: 'oj-gcc:latest',
        filename: 'solution.cpp',
        compileCmd: 'g++ -std=c++17 solution.cpp -o solution',
        execCmd: './solution',
    },
    C: {
        image: 'gcc:latest',
        filename: 'solution.c',
        compileCmd: 'gcc solution.c -o solution',
        execCmd: './solution',
    },
    JAVA: {
        image: 'eclipse-temurin:17-alpine',
        filename: 'Solution.java',
        compileCmd: 'javac Solution.java',
        execCmd: 'java Solution',
    },
};

function log(submissionId, message) {
    console.log(`[${new Date().toISOString()}] [${submissionId}] ${message}`);
}

function runDocker(args, input, timeoutMs, containerName) {
    return new Promise((resolve) => {
        const child = spawn('docker', args, { stdio: ['pipe', 'pipe', 'pipe'] });

        child.stdin.write(input ?? '');
        child.stdin.end();

        let stdout = '';
        let stderr = '';
        let timedOut = false;

        child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
        child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

        const timer = setTimeout(() => {
            timedOut = true;
            spawn('docker', ['kill', containerName]);
        }, timeoutMs);

        child.on('close', (code) => {
            clearTimeout(timer);
            resolve({ stdout, stderr, code, timedOut });
        });

        child.on('error', (err) => {
            clearTimeout(timer);
            resolve({ stdout, stderr, code: -1, timedOut, error: err });
        });
    });
}

async function runCode(submissionId, code, language, testCases, timeLimit, memoryLimit) {
    const config = LANGUAGE_CONFIG[language];
    if (!config) throw new Error(`Unsupported language: ${language}`);

    log(submissionId, `Starting execution | language=${language} | testCases=${testCases.length} | timeLimit=${timeLimit}ms | memoryLimit=${memoryLimit}MB`);

    const timeLimitSec = Math.ceil(timeLimit / 1000);
    const b64code = Buffer.from(code).toString('base64');
    const compile = config.compileCmd ? `${config.compileCmd} && ` : '';
    const cmd = `echo '${b64code}' | base64 -d > /tmp/${config.filename} && cd /tmp && ${compile}timeout ${timeLimitSec}s ${config.execCmd}`;

    let verdict = 'AC';

    for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];
        const containerName = `oj-${submissionId}-tc${i}`;

        log(submissionId, `Running test case ${i + 1}/${testCases.length}...`);
        const containerStart = Date.now();

        const result = await runDocker([
            'run', '--rm', '-i', '--init',
            '--name', containerName,
            '--network', 'none',
            `--memory=${memoryLimit}m`,
            '--pids-limit', '50',
            config.image,
            'sh', '-c', cmd,
        ], testCase.input, timeLimit + 60000, containerName);

        const elapsed = Date.now() - containerStart;
        log(submissionId, `Test case ${i + 1} completed in ${elapsed}ms | exit=${result.code}`);

        if (result.error) {
            log(submissionId, `Test case ${i + 1} -> IE (internal error): ${result.error.message}`);
            verdict = 'IE';
            break;
        }

        const isInnerTimeout = result.code === 124 || result.code === 143;
        const isOuterKill = result.code === 137 && result.timedOut;
        if (isInnerTimeout || isOuterKill) {
            const reason = isOuterKill ? 'outer timer (SIGTERM ignored)' : `inner timeout (${timeLimit}ms)`;
            log(submissionId, `Test case ${i + 1} -> TLE (${reason})`);
            verdict = 'TLE';
            break;
        }

        if (result.code === 137) {
            log(submissionId, `Test case ${i + 1} -> MLE (OOM kill)`);
            verdict = 'MLE';
            break;
        }

        if (result.code !== 0) {
            // TODO: CE vs RTE detection is brittle — tuned for g++/javac stderr.
            // Properly fix with OJ_EXEC_START stderr marker: marker missing => CE.
            const v = result.stderr.includes('error:') ? 'CE' : 'RTE';
            log(submissionId, `Test case ${i + 1} -> ${v} | stderr: ${result.stderr.slice(0, 200)}`);
            verdict = v;
            break;
        }

        const testVerdict = compareOutput(result.stdout, testCase.expectedOutput);
        log(submissionId, `Test case ${i + 1} -> ${testVerdict}`);
        if (testVerdict !== 'AC') {
            verdict = testVerdict;
            break;
        }
    }

    log(submissionId, `Final verdict: ${verdict}`);
    return verdict;
}

module.exports = { runCode, LANGUAGE_CONFIG };
