/* global Module */

/* Magic Mirror
 * Module: MMM-JHCOVID19
 *
 * By Dave Terrell
 * MIT Licensed.
 */

Module.register("MMM-JHCOVID19", {
    jhdata: {},
    error: false,

    defaults: {
        header: "COVID-19",
        headerRowClass: "small", // small, medium or big
        infoRowClass: "big", // small, medium or big
        updateInterval: 60000, // update interval in milliseconds
        timeFormat: "MMMM Do YYYY, h:mm:ss a", // April 7th 2020, 03:08:10 pm
        alwaysShowState: "Florida",
        highlightState: "California",
        timezone: "America/Los_Angeles"
    },

    templateData: {
        total: null,
        new: null,
        deaths: null,
        updated: null,
        byNew: {},
        byTotal: {}
    },

    stateTemplate: function(delta, name, casesTotal, casesNew, deathsTotal, deathsNew) {
        return {
            rankDelta: delta,
            stateName: name,
            caseTotal: casesTotal,
            caseNew: casesNew,
            deathTota: deathsTotal,
            deathNew: deathsNew
        };
    },

    getTemplate: function () {
        return "MMM-CountDown.njk"
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

    getTranslations: function () {
        return false;
    },

    getInfo: function () {
        this.jhdata = {};
        this.sendSocketNotification("GET_DATA");
    },

    socketNotificationReceived: function (notification, payload) {
        if (notification === "ERROR" || 
            notification === "DATA_RESULT") {
             this.error = notification === "ERROR";
             this.jhdata = payload; 
             this.updateDom(this.config.fadeSpeed);
        }
    },

    getDom: function () {
        if (this.error){
            var p = document.createElement('div');
            p.innerText = this.name + ' - ERROR: ' + this.jhdata;
            return p;
        }
        
        this.templateData.total = this.jhdata.states.map(item => item.confirmed).reduce((p, n) => p + n);
        this.templateData.new = this.jhdata.states.map(item => item.confirmedDelta).reduce((p, n) => p + n);
        this.templateData.deaths = this.jhdata.states.map(item => item.deathsDelta).reduce((p, n) => p + n);
        var totalNew = states.map(item => item.confirmedDelta).reduce((p, n) => p + n);
        var totalDeaths = states.map(item => item.deathsDelta).reduce((p, n) => p + n);
        var total = states.map(item => item.confirmed).reduce((p, n) => p + n);



/**
 * 
 */
        var wrapper = document.createElement("table");
        if (Object.entries(this.jhdata).length === 0) return wrapper;

        newTd = function (innerData, innerClass) {
            var td = document.createElement("td");

            if (innerClass && innerClass !== "") td.className = innerClass;
            if (innerData && innerData !== "") td.innerHTML = innerData;

            return td;
        };

        totalsRow = function (states) {
            var row = document.createElement("tr");

            row.appendChild(newTd());
            row.appendChild(newTd("Totals", "state"));

            var totalNew = states.map(item => item.confirmedDelta).reduce((p, n) => p + n);
            var totalDeaths = states.map(item => item.deathsDelta).reduce((p, n) => p + n);
            var total = states.map(item => item.confirmed).reduce((p, n) => p + n);

            row.appendChild(newTd(numberWithCommas(total), "number"));
            row.appendChild(newTd(numberWithCommas(totalNew), "number"));
            row.appendChild(newTd(numberWithCommas(totalDeaths), "number deaths"));

            return row;
        };

        singleCell = function (inner, trClass, tdClass) {
            var row = document.createElement("tr");
            if (trClass && trClass !== "") row.className += " " + trClass;
            var cell = document.createElement("td");
            cell.className = "center";
            if (tdClass && tdClass !== "") cell.className += " " + tdClass;
            row.appendChild(cell);
            cell.innerHTML = inner;
            cell.colSpan = 5;
            return row;
        };

        addStates = function (states, previous) {
            for (var i = 0; i < previous.length; i++) {
                previous[i].rank = i + 1;
            }

            for (var i = 0; i < states.length; i++) {
                states[i].rank = i + 1;
                if (i < 5) {
                    wrapper.appendChild(stateRow(this.config, states[i], previous.findIndex(s => states[i].state === s.state) + 1));
                }

                if (this.config.alwaysShowState !== "") {
                    if (states[i].state === this.config.alwaysShowState && states[i].rank > 5) {
                        if (states[i].rank > 6) wrapper.appendChild(singleCell(". . ."));
                        wrapper.appendChild(stateRow(this.config, states[i], previous.findIndex(s => states[i].state === s.state) + 1));
                    }
                }
            }
        };

        stateRow = function (config, state, previousRank) {
            var row = document.createElement("tr");
            if (state === config.highlightState)
                row.className += " highlight";

            var rankDeltaIcon = null;
            var rankDelta = previousRank - state.rank;

            if (state.rank < previousRank){
                rankDeltaIcon = newTd(Math.abs(rankDelta), "rank-up fa fa-fw fa-arrow-circle-up");
            }
            else if (state.rank == previousRank) {
                rankDeltaIcon = newTd("", "rank-even fa fa-fw fa-minus-circle");
            }
            else if (state.rank > previousRank) {
                rankDeltaIcon = newTd(Math.abs(rankDelta), "rank-down fa fa-fw fa-arrow-circle-down");
            }

            row.appendChild(rankDeltaIcon);
            row.appendChild(newTd(state.rank + '. ' + state.state, "state"));
            row.appendChild(newTd(numberWithCommas(state.confirmed), "number"));
            row.appendChild(newTd(numberWithCommas(state.confirmedDelta), "number"));
            row.appendChild(newTd(numberWithCommas(state.deathsDelta), "number deaths"));

            return row;
        };

        header = function (heading) {
            var globalHeaderRow = document.createElement("tr");

            globalHeaderRow.appendChild(headerRow("")); // Rank delta
            globalHeaderRow.appendChild(headerRow(heading || ""));
            globalHeaderRow.appendChild(headerRow("Cases"));
            globalHeaderRow.appendChild(headerRow("New"));
            globalHeaderRow.appendChild(headerRow("Deaths"));

            return globalHeaderRow;
        };

        headerRow = function (inner) {
            return newTd(inner, "header");
        };

        numberWithCommas = function (x) {
            return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        }

        wrapper.className = this.config.tableClass || "covid"
        wrapper.appendChild(header('By Total'));

        addStates(
            this.jhdata.states.sort(
                (a, b) => b.confirmed - a.confirmed), 
            this.jhdata.previous.sort(
                (a, b) => b.confirmed - a.confirmed));

        wrapper.appendChild(header('By New'));
        addStates(
            this.jhdata.states.sort(
                (a, b) => b.confirmedDelta - a.confirmedDelta), 
            this.jhdata.previous.sort(
                (a, b) => b.confirmedDelta - a.confirmedDelta));

        wrapper.appendChild(header());
        wrapper.appendChild(totalsRow(this.jhdata.states));
        wrapper.appendChild(singleCell(""));
        var updated = moment(this.jhdata.lastUpdated);
        var updated = updated.tz(this.config.timezone);
        wrapper.appendChild(singleCell("Last updated: " + updated.calendar(), "", "last-update"));

        return wrapper
    }
})
