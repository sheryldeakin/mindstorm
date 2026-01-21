const { recomputeStaleSnapshots } = require("./services/snapshotRecompute");
const { recomputeStaleConnections } = require("./services/connectionsRecompute");
const { recomputeStaleThemeSeries } = require("./services/themeSeriesRecompute");
const { recomputeStaleCycles } = require("./services/cyclesRecompute");

/**
 * Starts the derived data recompute loop.
 * @param {{ intervalMs?: number }} [options]
 * @returns {NodeJS.Timeout}
 */
const startDerivedWorker = ({ intervalMs = 60000 } = {}) => {
  const tick = async () => {
    try {
      await recomputeStaleThemeSeries();
      await recomputeStaleConnections();
      await recomputeStaleCycles();
      await recomputeStaleSnapshots();
    } catch (error) {
      console.warn("[derived-worker] derived recompute failed", error?.message || error);
    }
  };

  tick();
  return setInterval(tick, intervalMs);
};

module.exports = { startDerivedWorker };
