const { recomputeStaleSnapshots } = require("./services/snapshotRecompute");
const { recomputeStaleConnections } = require("./services/connectionsRecompute");
const { recomputeStaleThemeSeries } = require("./services/themeSeriesRecompute");

const startDerivedWorker = ({ intervalMs = 60000 } = {}) => {
  const tick = async () => {
    try {
      await recomputeStaleThemeSeries();
      await recomputeStaleConnections();
      await recomputeStaleSnapshots();
    } catch (error) {
      console.warn("[derived-worker] derived recompute failed", error?.message || error);
    }
  };

  tick();
  return setInterval(tick, intervalMs);
};

module.exports = { startDerivedWorker };
