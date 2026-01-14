const { recomputeStaleSnapshots } = require("./services/snapshotRecompute");

const startDerivedWorker = ({ intervalMs = 60000 } = {}) => {
  const tick = async () => {
    try {
      await recomputeStaleSnapshots();
    } catch (error) {
      console.warn("[derived-worker] snapshot recompute failed", error?.message || error);
    }
  };

  tick();
  return setInterval(tick, intervalMs);
};

module.exports = { startDerivedWorker };
