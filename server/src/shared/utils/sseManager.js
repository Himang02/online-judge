const clients = new Map();

function subscribe(submissionId, res) {
    clients.set(submissionId, res);
}

function notify(submissionId, verdict) {
    const res = clients.get(submissionId);
    if (!res) return;
    res.write(`data: ${JSON.stringify({ verdict })}\n\n`);
    unsubscribe(submissionId);
}

function unsubscribe(submissionId) {
    clients.delete(submissionId);
}

module.exports = { subscribe, notify, unsubscribe };
