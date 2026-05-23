// TEMPORARY — delete after seeding
// Usage: node scripts/seedTags.js

const tagService = require('../src/modules/problems/tagService');
const prismaClient = require('../src/shared/configs/db');

const TAGS = [
    // Data Structures
    'Array', 'String', 'Linked List', 'Stack', 'Queue', 'Deque',
    'Hash Map', 'Hash Set', 'Binary Tree', 'Binary Search Tree',
    'Segment Tree', 'Fenwick Tree (BIT)', 'Trie', 'Heap / Priority Queue',
    'Graph', 'Matrix',

    // Algorithms
    'Sorting', 'Binary Search', 'Two Pointers', 'Sliding Window',
    'Recursion', 'Backtracking', 'Divide and Conquer', 'Greedy',
    'Dynamic Programming', 'Memoization', 'Bit Manipulation',

    // Graph Algorithms
    'BFS', 'DFS', 'Topological Sort', 'Shortest Path',
    'Union Find', 'Minimum Spanning Tree',

    // Math
    'Math', 'Number Theory', 'Combinatorics', 'Geometry', 'Modular Arithmetic',

    // Miscellaneous
    'Simulation', 'Implementation', 'Brute Force',
    'Prefix Sum', 'Monotonic Stack', 'Monotonic Queue',
];

async function main() {
    console.log(`Seeding ${TAGS.length} tags...\n`);

    let created = 0;
    let skipped = 0;

    for (const name of TAGS) {
        try {
            const tag = await tagService.createTag(name);
            console.log(`  [+] ${tag.name}`);
            created++;
        } catch (err) {
            if (err.statusCode === 409) {
                console.log(`  [~] skipped (exists): ${name.toLowerCase().trim()}`);
                skipped++;
            } else {
                throw err;
            }
        }
    }

    console.log(`\nDone. Created: ${created}, Skipped: ${skipped}`);
}

main()
    .catch((err) => {
        console.error('Seed failed:', err.message);
        process.exit(1);
    })
    .finally(() => prismaClient.$disconnect());
