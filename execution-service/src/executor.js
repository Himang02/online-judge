const { spawn } = require('child_process');
const fs = require('fs/promises');
const path = require('path');
const os = require('os');
const { compareOutput } = require('./verdict');

const LANGUAGE_CONFIG = {
    PYTHON: {
        image: 'python:3.11-alpine',
        filename: 'solution.py',
        runCmd: 'python solution.py',
    },
    CPP: {
        image: 'gcc:latest',
        filename: 'solution.cpp',
        runCmd: 'g++ solution.cpp -o solution && ./solution',
    },
    C: {
        image: 'gcc:latest',
        filename: 'solution.c',
        runCmd: 'gcc solution.c -o solution && ./solution',
    },
    JAVA: {
        image: 'openjdk:17-alpine',
        filename: 'Solution.java',
        runCmd: 'javac Solution.java && java Solution',
    },
};

function log(submissionId, message) {
    console.log(`[${new Date().toISOString()}] [${submissionId}] ${message}`);
}

function runDocker(args, timeoutMs) {
    return new Promise((resolve) => {
        const child = spawn('docker', args, { stdio: ['ignore', 'pipe', 'pipe'] });

        let stdout = '';
        let stderr = '';
        let timedOut = false;

        child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
        child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

        const timer = setTimeout(() => {
            timedOut = true;
            child.kill('SIGKILL');
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

    const tempDir = path.join(os.tmpdir(), `submission-${submissionId}`);
    await fs.mkdir(tempDir, { recursive: true });
    await fs.writeFile(path.join(tempDir, config.filename), code);

    log(submissionId, `Code written to ${tempDir}`);

    let verdict = 'AC';

    try {
        for (let i = 0; i < testCases.length; i++) {
            const testCase = testCases[i];
            await fs.writeFile(path.join(tempDir, 'input.txt'), testCase.input);

            log(submissionId, `Running test case ${i + 1}/${testCases.length}...`);
            const containerStart = Date.now();

            const result = await runDocker([
                'run', '--rm',
                '--network', 'none',
                `--memory=${memoryLimit}m`,
                '--pids-limit', '50',
                '-v', `${tempDir}:/code`,
                '-w', '/code',
                config.image,
                'sh', '-c', `${config.runCmd} < input.txt`,
            ], timeLimit + 5000);

            const elapsed = Date.now() - containerStart;
            log(submissionId, `Test case ${i + 1} completed in ${elapsed}ms | exit=${result.code}`);
            if (result.error) {
                log(submissionId, `Test case ${i + 1} -> IE (internal error): ${result.error.message}`);
                verdict = 'IE';
                break;
            }

            if (result.timedOut) {
                log(submissionId, `Test case ${i + 1} -> TLE (exceeded ${timeLimit}ms)`);
                verdict = 'TLE';
                break;
            }

            if (result.code !== 0) {
                const v = result.stderr && result.stderr.includes('error:') ? 'CE' : 'RTE';
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
    } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
        log(submissionId, `Temp directory cleaned up | final verdict: ${verdict}`);
    }

    return verdict;
}

module.exports = { runCode };
