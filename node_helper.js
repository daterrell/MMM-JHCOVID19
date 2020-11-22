/* global module */

/* Magic Mirror
 * Node Helper: MMM-JHCOVID19
 *
 * By Dave Terrell
 * MIT Licensed.
 */

var NodeHelper = require('node_helper')
var https = require('https')
const Log = require("../../js/logger");

class JhData {
    constructor() {
      this.dailyUrl = 'https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_daily_reports_us/';
      this.hourlyUrl = 'https://raw.githubusercontent.com/CSSEGISandData/COVID-19/web-data/data/cases_state.csv';
    }
  
    getFileUrl(date) {
      let filename = `${date.getUTCMonth() + 1}-${date.getUTCDate()}-${date.getUTCFullYear()}.csv`
      return this.dailyUrl + filename;
    };
  
    csvToJson(csv) {
      const lines = csv.split('\n')
      const result = []
      const headers = lines[0].split(',')
  
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i])
          continue
        const obj = {}
        const currentline = lines[i].split(',')
  
        for (let j = 0; j < headers.length; j++) {
          obj[headers[j]] = currentline[j]
        }
        result.push(obj)
      }
  
      return result
    };
  
    gets(url) {
      return new Promise((resolve, reject) => {
        https
          .get(url, (response) => {
            let body = '';
            response.on('data', (chunk) => body += chunk);
            response.on('end', () => resolve(body));
          })
          .on('error', (e) => reject(e));
      });
    };
  
    async csvUrlToJson(url) {
      let data = await this.gets(url);
      return this.csvToJson(data)
        .filter(s => s.Country_Region === 'US')
        .map(s => {
          return {
            state: s.Province_State,
            confirmed: parseInt(s.Confirmed),
            deaths: parseInt(s.Deaths),
            updated: new Date(`${s.Last_Update} UTC`)
          }
        });
    };
  
    lastUpdated(dataSet) {
      return dataSet.reduce((a, n) => {
        let nTime = new Date(n.updated).getTime();
        if (a === nTime || a > nTime) return a;
        return nTime;
      });
    };
  
    delta(a, b) {
      return a.map(el0 => {
        let el1 = b.find(el1 => el1.state === el0.state);
        return {
          state: el0.state,
          confirmed: el0.confirmed,
          confirmedDelta: el0.confirmed - el1.confirmed,
          deaths: el0.deaths,
          deathsDelta: el0.deaths - el1.deaths,
          updated: el0.updated
        }
      });
    };
  
    async lastNDays(n = 2) {
      let now = new Date();
      let daily = [];
      while (daily.length < n) {
        let fullUrl = this.getFileUrl(now);
        let day = await this.csvUrlToJson(fullUrl);
        if (day && day.length > 0) daily.push(day);
        now.setDate(now.getDate() - 1);
      }
      return daily;
    };
  
    async hourly() {
      return await this.csvUrlToJson(this.hourlyUrl);
    };
  }

module.exports = NodeHelper.create({
    start: function () {
        Log.log('Starting node helper for: ' + this.name);
    },

    socketNotificationReceived: function (notification) {
        if (notification === 'GET_DATA') {
            Log.log(`${this.name}: socketNotificationReceived(${notification})`);
            this.getData()
                .then(data => this.sendSocketNotification("DATA_RESULT", data))
                .catch(e => this.sendSocketNotification("ERROR", e));
        }
    },

    getData: async () => {
        let jh = new JhData();

        var hourly = await jh.hourly();
        var daily = await jh.lastNDays(2);

        var previous = jh.delta(daily[0], daily[1]);
        var hourlyDelta = jh.delta(hourly, daily[0]); 
        var updated = jh.lastUpdated(hourly);

        return {
            previous: previous,
            hourlyDelta: hourlyDelta,
            updated: updated
        };
    }
});
