/* global Module */

/* Magic Mirror
 * Module: MMM-JHCOVID19
 *
 * By Dave Terrell
 * MIT Licensed.
 */

Module.register("MMM-JHCOVID19", {
    error: false,
    payload: null,

    defaults: {
        header: "COVID-19",
        updateInterval: 60000, // update interval in milliseconds
        timeFormat: "MMMM Do YYYY, h:mm:ss a", // April 7th 2020, 03:08:10 pm
        alwaysShowState: "California",
        highlightState: "California",
        timezone: "America/Los_Angeles"
    },

    templateData: {
        updated: null,
        byNew: null,
        byTotal: null,
    },

    getTemplate: function () {
        return "MMM-JHCOVID19.njk"
    },

    getTemplateData: function () {
        return this.templateData;
    },

    start: function () {
        console.log(this.name + "[MAIN MODULE]: Starting up MMM-JHCOVID19");

        this.getInfo();

        var self = this;
        setInterval(function () {
            self.getInfo();
        }, this.config.updateInterval);
    },

    getScripts: function () {
        return ["moment.js", "moment-timezone.js"];
    },

    getStyles: function () {
        return ["MMM-JHCOVID19.css", "font-awesome.css"];
    },

    getInfo: function () {
        this.sendSocketNotification("GET_DATA");
    },

    socketNotificationReceived: function (notification, payload) {
        if (notification === "ERROR" ||
            notification === "DATA_RESULT") {
            this.error = notification === "ERROR";
            this.payload = payload;
            this.updateTemplateData();
            this.updateDom(this.config.fadeSpeed);
        }
    },

    stateTemplate: function (ellipses, rank, delta, name, total, deaths) {
        return {
            ellipses: ellipses,
            rank, rank,
            rankDelta: delta,
            name: name,
            total: this.numberWithCommas(total),
            deaths: this.numberWithCommas(deaths),
            highlight: name === this.config.highlightState
        };
    },

    numberWithCommas: function (x) {
        return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    },

    addStates: function (funcConfirmed, funcDeaths) {
        var states = this.payload.states.sort((a, b) => funcConfirmed(b) - funcConfirmed(a));
        var previous = this.payload.previous.sort((a, b) => funcConfirmed(b) - funcConfirmed(a));
        var total = states.reduce((t, n) => t + funcConfirmed(n), 0);
        var deaths = states.reduce((t, n) => t + funcDeaths(n), 0);

        var retVal = {
            total: this.numberWithCommas(total),
            deaths: this.numberWithCommas(deaths),
            states: []
        };

        var rankDelta = (state, i) => previous.findIndex(s => state.state === s.state) - i;

        for (var i = 0; i < states.length; i++) {
            var state = states[i];

            if (i < 5) {
                retVal.states.push(this.stateTemplate(false, i + 1, rankDelta(state, i), state.state, funcConfirmed(state), funcDeaths(state)));
            } else if (
                this.config.alwaysShowState !== "" &&
                state.name === this.config.alwaysShowState) {
                if (state.rank > 6) toArr.push(this.stateTemplate(true));

                retVal.states.push(this.stateTemplate(false, i + 1, rankDelta(state, i), state.state, funcConfirmed(state), funcDeaths(state)));
            }
        }

        return retVal;
    },

    updateTemplateData: function () {
        if (this.error) {
            var p = document.createElement('div');
            p.innerText = this.name + ' - ERROR: ' + this.payload;
            return p;
        } else if (Object.entries(this.payload).length === 0) {
            return null;
        }

        this.templateData.updated = moment(this.payload.lastUpdated).tz(this.config.timezone).calendar();
        this.templateData.byTotal = this.addStates((state) => state.confirmed, (state) => state.deaths);
        this.templateData.byNew = this.addStates((state) => state.confirmedDelta, (state) => state.deathsDelta);
    },
});
