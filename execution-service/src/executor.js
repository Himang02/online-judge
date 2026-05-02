const { spawnSync } = require('child_process');
const fs = require('fs');
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

async function runCode(submissionId, code, language, testCases, timeLimit, memoryLimit) {
    const config = LANGUAGE_CONFIG[language];
    if (!config) throw new Error(`Unsupported language: ${language}`);

    const tempDir = path.join(os.tmpdir(), `submission-${submissionId}`);
    fs.mkdirSync(tempDir, { recursive: true });
    fs.writeFileSync(path.join(tempDir, config.filename), code);

    let verdict = 'AC';

    try {
        for (const testCase of testCases) {
            fs.writeFileSync(path.join(tempDir, 'input.txt'), testCase.input);

            const result = spawnSync('docker', [
                'run', '--rm',
                '--network', 'none',
                `--memory=${memoryLimit}m`,
                '--pids-limit', '50',
                '-v', `${tempDir}:/code`,
                '-w', '/code',
                config.image,
                'sh', '-c', `${config.runCmd} < input.txt`,
            ], {
                timeout: timeLimit,
                encoding: 'utf-8',
            });

            if (result.error && result.error.code === 'ETIMEDOUT') {
                verdict = 'TLE';
                break;
            }

            if (result.status !== 0) {
                verdict = result.stderr && result.stderr.includes('error:') ? 'CE' : 'RTE';
                break;
            }

            const testVerdict = compareOutput(result.stdout || '', testCase.expectedOutput);
            if (testVerdict !== 'AC') {
                verdict = testVerdict;
                break;
            }
        }
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }

    return verdict;
}

module.exports = { runCode };
