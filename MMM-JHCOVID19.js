/* global Module */

/* Magic Mirror
 * Module: MMM-JHCOVID19
 *
 * By Dave Terrell
 * MIT Licensed.
 */

Module.register("MMM-JHCOVID19", {
    payload: null,
    timer: null,

    defaults: {
        updateInterval: 180000, // update interval in milliseconds
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
        this.setTimer();
    },

    getStyles: function () {
        return ["MMM-JHCOVID19.css", "font-awesome.css"];
    },

    getScripts: function () {
        return ["moment.js", "moment-timezone.js"];
    },

    getInfo: function () {
        this.sendSocketNotification("GET_DATA");
    },

    setTimer: function (interval = 60000) {
        var self = this;

        if (this.timer) clearTimeout(this.timer);

        this.timer = setTimeout(() => {
            self.getInfo();
        }, interval);
    },

    socketNotificationReceived: function (notification, payload) {
        clearTimeout(this.timer);
        
        if (notification === "ERROR") {
            setTimer();
            return;
        }

        if (notification === "DATA_RESULT") {
            this.payload = payload;
            this.updateTemplateData();
            this.updateDom(this.config.fadeSpeed);
        }

        var update = new Date(this.payload.updated);
        update = new Date(update.getTime() + 65 * 60000);
        var diff = update.getTime() - new Date().getTime();
        this.setTimer(diff);
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
        if (x) return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    },

    addStates: function (funcConfirmed, funcDeaths) {
        var states = this.payload.hourlyDelta.sort((a, b) => funcConfirmed(b) - funcConfirmed(a));
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
                state.state === this.config.alwaysShowState) {

                if (i + 1 > 6) retVal.states.push(this.stateTemplate(true));

                retVal.states.push(this.stateTemplate(false, i + 1, rankDelta(state, i), state.state, funcConfirmed(state), funcDeaths(state)));
            }
        }

        return retVal;
    },

    updateTemplateData: function () {
        this.templateData.updated = moment(this.payload.updated).tz(this.config.timezone).calendar();

        this.templateData.byTotal = this.addStates((state) => state.confirmed, (state) => state.deaths);
        this.templateData.byNew = this.addStates((state) => state.confirmedDelta, (state) => state.deathsDelta);
    },
});
