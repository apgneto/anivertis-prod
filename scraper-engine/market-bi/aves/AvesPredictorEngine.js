class AvesPredictorEngine {
  constructor({ metrics, health, series }) {
    this.metrics = metrics;
    this.health = health;
    this.series = series;

    /*
      Esperado:
      series.frangoSeries -> [{ date: Date, value: number }]
      series.milhoSeries  -> [{ date: Date, value: number }]
      series.fareloSeries -> [{ date: Date, value: number }]
      series.exportSeries -> [{ date: Date, value: number }] (mensal)
    */
  }

  // ==========================================================
  // UTILITÁRIOS BÁSICOS
  // ==========================================================
  _isValidArray(arr) {
    return Array.isArray(arr) && arr.length > 1;
  }

  _mean(arr) {
    if (!arr.length) return null;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  _variance(arr) {
    if (!arr.length) return null;
    const mean = this._mean(arr);
    return arr.reduce((sum, val) => sum + (val - mean) ** 2, 0) / arr.length;
  }

  _covariance(x, y) {
    if (!x.length || x.length !== y.length) return null;
    const meanX = this._mean(x);
    const meanY = this._mean(y);
    let sum = 0;
    for (let i = 0; i < x.length; i++) {
      sum += (x[i] - meanX) * (y[i] - meanY);
    }
    return sum / x.length;
  }

  _correlation(x, y) {
    const cov = this._covariance(x, y);
    if (cov === null) return null;
    const stdX = Math.sqrt(this._variance(x));
    const stdY = Math.sqrt(this._variance(y));
    if (!stdX || !stdY) return null;
    return cov / (stdX * stdY);
  }

  _toLogReturns(series) {
    if (!this._isValidArray(series)) return [];
    const returns = [];
    for (let i = 1; i < series.length; i++) {
      const prev = series[i - 1];
      const curr = series[i];
      if (!prev || !curr) continue;
      returns.push(Math.log(curr / prev));
    }
    return returns;
  }

  // ==========================================================
  // AGREGAÇÃO MENSAL (INSTITUCIONAL)
  // ==========================================================
  _aggregateMonthly(series) {
    if (!this._isValidArray(series)) return [];

    const monthlyMap = {};

    for (const point of series) {
      const d = new Date(point.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;

      if (!monthlyMap[key]) {
        monthlyMap[key] = {
          values: [],
          lastValue: null,
          date: new Date(d.getFullYear(), d.getMonth(), 1)
        };
      }

      monthlyMap[key].values.push(point.value);
      monthlyMap[key].lastValue = point.value;
    }

    const monthlySeries = Object.values(monthlyMap)
      .sort((a, b) => a.date - b.date)
      .map(m => ({
        date: m.date,
        average: this._mean(m.values),
        last: m.lastValue
      }));

    return monthlySeries;
  }

  // ==========================================================
  // ROLLING BETA (DIÁRIO)
  // ==========================================================
  calculateRollingBeta(window = 90) {
    const { frangoSeries, milhoSeries } = this.series;

    if (!this._isValidArray(frangoSeries) || !this._isValidArray(milhoSeries)) {
      return null;
    }

    const frangoValues = frangoSeries.map(p => p.value);
    const milhoValues = milhoSeries.map(p => p.value);

    if (frangoValues.length < window + 1) return null;

    const frangoReturns = this._toLogReturns(frangoValues);
    const milhoReturns = this._toLogReturns(milhoValues);

    const frangoSlice = frangoReturns.slice(-window);
    const milhoSlice = milhoReturns.slice(-window);

    if (frangoSlice.length !== milhoSlice.length) return null;

    const cov = this._covariance(frangoSlice, milhoSlice);
    const varMilho = this._variance(milhoSlice);

    if (!varMilho) return null;

    return cov / varMilho;
  }

  // ==========================================================
  // LEAD-LAG ESTRUTURAL (MENSAL)
  // ==========================================================
  calculateExportLeadLag(window = 24, maxLag = 6) {
    const { frangoSeries, exportSeries } = this.series;

    if (!this._isValidArray(frangoSeries) || !this._isValidArray(exportSeries)) {
      return null;
    }

    const monthlyFrango = this._aggregateMonthly(frangoSeries);
    const frangoMonthlyValues = monthlyFrango.map(m => m.average);
    const exportValues = exportSeries.map(p => p.value);

    if (frangoMonthlyValues.length < window ||
        exportValues.length < window + maxLag) {
      return null;
    }

    const frangoReturns = this._toLogReturns(frangoMonthlyValues);
    const exportReturns = this._toLogReturns(exportValues);

    let bestLag = 0;
    let bestCorr = null;

    for (let lag = 0; lag <= maxLag; lag++) {
      const exportSlice = exportReturns.slice(
        exportReturns.length - window - lag,
        exportReturns.length - lag
      );

      const frangoSlice = frangoReturns.slice(-window);

      if (exportSlice.length !== frangoSlice.length) continue;

      const corr = this._correlation(exportSlice, frangoSlice);

      if (
        corr !== null &&
        (bestCorr === null || Math.abs(corr) > Math.abs(bestCorr))
      ) {
        bestCorr = corr;
        bestLag = lag;
      }
    }

    return {
      bestLag,
      correlation: bestCorr,
      classification:
        bestCorr === null
          ? "INSUFFICIENT_DATA"
          : Math.abs(bestCorr) > 0.6
          ? "STRONG_SIGNAL"
          : Math.abs(bestCorr) > 0.3
          ? "MODERATE_SIGNAL"
          : "WEAK_SIGNAL"
    };
  }

  // ==========================================================
  // MARGEM FORWARD
  // ==========================================================
  estimateForwardMargin() {
    const { frangoSeries, milhoSeries, fareloSeries } = this.series;

    if (!this._isValidArray(frangoSeries) ||
        !this._isValidArray(milhoSeries) ||
        !this._isValidArray(fareloSeries)) {
      return null;
    }

    const frango = frangoSeries.at(-1).value;
    const milho = milhoSeries.at(-1).value;
    const farelo = fareloSeries.at(-1).value;

    const feedCost = (milho * 0.65) + (farelo * 0.25);

    return frango - feedCost;
  }

  // ==========================================================
  // MOMENTUM DIÁRIO
  // ==========================================================
  _pctChange(values, window) {
    if (values.length < window + 1) return null;
    const current = values.at(-1);
    const past = values.at(-1 - window);
    return (current - past) / past;
  }

  calculateMomentum() {
    const frangoValues = this.series.frangoSeries.map(p => p.value);

    return {
      m5: this._pctChange(frangoValues, 5),
      m20: this._pctChange(frangoValues, 20),
      m60: this._pctChange(frangoValues, 60)
    };
  }

  // ==========================================================
  // CONSOLIDAÇÃO FINAL
  // ==========================================================
  buildPrediction() {
    const monthlyFrango = this._aggregateMonthly(this.series.frangoSeries);

    return {
      forwardMargin: this.estimateForwardMargin(),
      rollingBeta90: this.calculateRollingBeta(90),
      exportLeadLag: this.calculateExportLeadLag(),
      monthlyAverage: monthlyFrango.map(m => ({
        date: m.date,
        value: m.average
      })),
      monthlyLastPrice: monthlyFrango.map(m => ({
        date: m.date,
        value: m.last
      })),
      momentum: this.calculateMomentum(),
      healthScore: this.health?.score ?? null
    };
  }
}

export default AvesPredictorEngine;