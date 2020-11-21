/* global module */

/* Magic Mirror
 * Node Helper: MMM-JHCOVID19
 *
 * By Dave Terrell
 * MIT Licensed.
 */

var NodeHelper = require('node_helper')
var request = require('request')
const Log = require("../../js/logger");

var dataUrl = 'http://jhreader/jhdata';

module.exports = NodeHelper.create({
    start: function () {
        Log.log('Starting node helper for: ' + this.name);
        Log.log(this.name + ' using ' + dataUrl + ' for data');
    },
     
    getData: function () {
        if (this.requestInFlight) return;
        
        Log.log(this.name + ': getData()');
        
        var options = {
            method: 'GET',
            url: dataUrl
        };
        
        var self = this;

        request(options, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                var result = JSON.parse(body)
                self.sendSocketNotification('DATA_RESULT', result)
            } 
            else if (response && response.headers["retry-after"]) {
                self.sendSocketNotification('ERROR', 'Retry after ' + response.headers["retry-after"])
            }else {
                self.sendSocketNotification('ERROR', error.message)
            }
        });
    },

    socketNotificationReceived: function (notification, payload) {
        Log.log(this.name + ': socketNotificationReceived(' + notification + ')');
        if (notification === 'GET_DATA') {
            this.getData()
        }
    }
});
