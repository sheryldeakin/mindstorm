const { recomputeStaleSnapshots } = require("./services/snapshotRecompute");
const { recomputeStaleConnections } = require("./services/connectionsRecompute");

const startDerivedWorker = ({ intervalMs = 60000 } = {}) => {
  const tick = async () => {
    try {
      await recomputeStaleSnapshots();
      await recomputeStaleConnections();
    } catch (error) {
      console.warn("[derived-worker] derived recompute failed", error?.message || error);
    }
  };

  tick();
  return setInterval(tick, intervalMs);
};

module.exports = { startDerivedWorker };
