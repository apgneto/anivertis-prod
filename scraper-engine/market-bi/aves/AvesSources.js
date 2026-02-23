class AvesSources {
  constructor(registry) {
    this.registry = registry;
  }

  async loadSeries() {
    return {
      frangoSeries: await this.registry.get('CEPEA').getSeries('FRANGO_CONGELADO_SP'),
      milhoSeries: await this.registry.get('CEPEA').getSeries('MILHO_CEPEA'),
      fareloSeries: await this.registry.get('CEPEA').getSeries('FARELO_SOJA'),
      exportSeries: await this.registry.get('SECEX').getSeries('NCM_0207'),
      usdbrl: await this.registry.get('YAHOO').getSeries('USD_BRL')
    };
  }
}

export default AvesSources;