class AvesBacktestEngine {
  constructor(series, predictor) {
    this.series = series;
    this.predictor = predictor;
  }

  run(window=90){
    const results=[];

    for(let i=window;i<this.series.frangoSeries.length;i++){
      const subSeries={
        frangoSeries:this.series.frangoSeries.slice(0,i),
        milhoSeries:this.series.milhoSeries.slice(0,i),
        exportSeries:this.series.exportSeries.slice(0,i)
      };

      const pred=new this.predictor({series:subSeries});
      const beta=pred.rollingBeta();

      results.push({index:i,beta});
    }

    return results;
  }
}

export default AvesBacktestEngine;