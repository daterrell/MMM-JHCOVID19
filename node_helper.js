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

var dailyUrl = 'https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_daily_reports_us/';
var hourlyUrl = 'https://raw.githubusercontent.com/CSSEGISandData/COVID-19/web-data/data/cases_state.csv';

var getFileUrl = function (date) {
    var filename = `${date.getUTCMonth() + 1}-${date.getUTCDate()}-${date.getUTCFullYear()}.csv`
    return dailyUrl + filename;
};

var csvToJson = function (csv) {
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

var gets = function (url) {
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

var csvUrlToJson = async function (url) {
    var data = await gets(url);
    return csvToJson(data)
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

module.exports = NodeHelper.create({
    start: function () {
        Log.log('Starting node helper for: ' + this.name);
    },

    socketNotificationReceived: async function (notification) {
        if (notification === 'GET_DATA') {
            Log.log(`${this.name}: socketNotificationReceived(${notification})`);
            try { this.sendSocketNotification("DATA_RESULT", await this.getData()); }
            catch (e) { this.sendSocketNotification("ERROR", e); }
        }
    },

    getData: async () => {
        var hourly = await csvUrlToJson(hourlyUrl);

        var now = new Date();
        var daily = {};
        var dayDelta = 0;
        while (Object.keys(daily).length <= 0) {
            now.setDate(now.getDate() - dayDelta++);
            fullUrl = getFileUrl(now);
            daily = await csvUrlToJson(fullUrl);
        }

        var delta = hourly.map(el => {
            var day = daily.find(d => d.state === el.state);
            return {
                state: el.state,
                confirmed: el.confirmed - day.confirmed,
                deaths: el.deaths - day.deaths,
                updated: el.updated
            }
        });

        var updated = hourly.reduce((a, n) => {
            var nTime = new Date(n.updated).getTime();
            if (a === nTime || a > nTime) return a;
            return nTime;
        });

        return { previous: daily, hourly: hourly, delta: delta, updated: updated };
    }
});
