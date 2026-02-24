const { getIMEAMilhoMT } = require('./MilhoIMEASource');

(async () => {
  const val = await getIMEAMilhoMT();
  console.log('IMEA MT:', val);
})();