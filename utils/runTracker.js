const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const RUN_HISTORY_FILE = path.join(DATA_DIR, 'run_history.json');
const MAX_HISTORY = 50;
const MAX_LOG_LINES = 120;

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// In-memory log buffer for dashboard tail
const logBuffer = [];

function appendLog(level, message) {
  const timestamp = new Date().toISOString();
  const entry = {
    timestamp,
    level, // 'INFO', 'WARN', 'ERROR', 'SUCCESS'
    message: String(message)
  };
  logBuffer.push(entry);
  if (logBuffer.length > MAX_LOG_LINES) {
    logBuffer.shift();
  }
}

function loadRunHistory() {
  try {
    if (!fs.existsSync(RUN_HISTORY_FILE)) {
      return [];
    }
    const raw = fs.readFileSync(RUN_HISTORY_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('[RUN-TRACKER] Failed to load run history:', err.message);
    return [];
  }
}

function saveRunHistory(history) {
  try {
    const trimmed = history.slice(-MAX_HISTORY);
    fs.writeFileSync(RUN_HISTORY_FILE, JSON.stringify(trimmed, null, 2), 'utf8');
  } catch (err) {
    console.error('[RUN-TRACKER] Failed to save run history:', err.message);
  }
}

function startRunTracker(trigger = 'cron') {
  const runId = 'run_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const run = {
    id: runId,
    trigger,
    startedAt: new Date().toISOString(),
    completedAt: null,
    status: 'RUNNING',
    stages: {
      fetch: 'PENDING',
      dedup: 'PENDING',
      eval: 'PENDING',
      sanitizer: 'PENDING',
      image: 'PENDING',
      card: 'PENDING',
      blogger: 'PENDING',
      webhook: 'PENDING'
    },
    storyTitle: null,
    bloggerUrl: null,
    cardUrl: null,
    error: null
  };

  const history = loadRunHistory();
  history.push(run);
  saveRunHistory(history);
  appendLog('INFO', `[CYCLE START] Run ${runId} triggered via ${trigger}`);

  return {
    runId,
    setStage(stage, status, detail = null) {
      if (run.stages[stage] !== undefined) {
        run.stages[stage] = status; // 'PASS', 'FAIL', 'SKIPPED'
        if (detail) {
          appendLog(status === 'FAIL' ? 'ERROR' : 'INFO', `[STAGE:${stage.toUpperCase()}] ${status} - ${detail}`);
        }
      }
    },
    setStory(title, bloggerUrl = null, cardUrl = null) {
      run.storyTitle = title;
      if (bloggerUrl) run.bloggerUrl = bloggerUrl;
      if (cardUrl) run.cardUrl = cardUrl;
    },
    finish(status = 'PASS', error = null) {
      run.completedAt = new Date().toISOString();
      run.status = status;
      if (error) {
        run.error = String(error);
        appendLog('ERROR', `[CYCLE END] Run ${runId} FAILED: ${error}`);
      } else {
        appendLog('SUCCESS', `[CYCLE END] Run ${runId} COMPLETED (${status})`);
      }
      const all = loadRunHistory();
      const idx = all.findIndex(r => r.id === runId);
      if (idx !== -1) {
        all[idx] = run;
      } else {
        all.push(run);
      }
      saveRunHistory(all);
    }
  };
}

function getRecentRuns(limit = 10) {
  const history = loadRunHistory();
  return history.slice(-limit).reverse();
}

function getLogTail(lines = 50) {
  return logBuffer.slice(-lines);
}

module.exports = {
  startRunTracker,
  getRecentRuns,
  getLogTail,
  appendLog,
  loadRunHistory
};
