const { randomUUID } = require("crypto");

const JOB_TTL_MS = 30 * 60 * 1000;
const jobs = new Map();

const generateId = () => {
  if (typeof randomUUID === "function") return randomUUID();
  return `job_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
};

const createJob = ({ userId, rangeDays }) => {
  const id = generateId();
  const job = {
    id,
    userId: userId.toString(),
    rangeDays,
    status: "queued",
    stage: "queued",
    percent: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  jobs.set(id, job);
  setTimeout(() => {
    jobs.delete(id);
  }, JOB_TTL_MS);
  return job;
};

const updateJob = (id, updates) => {
  const job = jobs.get(id);
  if (!job) return null;
  const next = {
    ...job,
    ...updates,
    updatedAt: Date.now(),
  };
  jobs.set(id, next);
  return next;
};

const getJob = (id) => jobs.get(id) || null;

const completeJob = (id, result) =>
  updateJob(id, {
    status: "completed",
    stage: "completed",
    percent: 100,
    result,
  });

const failJob = (id, error) =>
  updateJob(id, {
    status: "failed",
    stage: "failed",
    percent: Math.min(99, Math.max(0, Number(jobs.get(id)?.percent || 0))),
    error,
  });

module.exports = {
  createJob,
  updateJob,
  getJob,
  completeJob,
  failJob,
};
