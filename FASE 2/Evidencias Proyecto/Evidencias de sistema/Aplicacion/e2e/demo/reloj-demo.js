const desfase = Number(process.env.DEMO_DESFASE_MS || 0);
if (desfase) {
  const Real = Date;
  class Demo extends Real {
    constructor(...args) {
      if (args.length === 0) super(Real.now() + desfase);
      else super(...args);
    }
    static now() {
      return Real.now() + desfase;
    }
  }
  globalThis.Date = Demo;
}
