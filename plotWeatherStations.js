"use strict";

function setYearAndNumber(year, number) {
    d3.selectAll(".year")
        .text(year);
    d3.selectAll(".number-of-stations")
        .text(number);
    d3.select("#year-slider")
        .property("value", year);

}

function Countries(width, height, scale, geoData) {
    var svg = d3.select("div#map")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("id", "svg-map");
    var g = svg
        .append("g");
    var projection = d3.geo.mercator()
        .scale(scale*4.4)
        .translate([width / 2.6, height*1.58]);
    var path = d3.geo.path().projection(projection);

    g.selectAll("path")
        .data(geoData.features)
        .enter()
        .append("path")
        .attr("class", "countries")
        .attr('d', path);
    g.style("stroke-width", "0.9");

    this.projection = projection;
    this.g = g;
    this.svg = svg;

    this.zoom = function() {
        g.style("stroke-width", (0.9 / ((0.5*d3.event.scale) + 0.5)));
        g.attr(
            "transform",
            "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")"
        );
    };
}

function LinePlot(width, height, nStations) {
    var x = d3.scale.linear()
        .range([70, width-10])
        .domain([1900, 2015]);

    var y = d3.scale.linear()
        .range([height-25, 10])
        .domain(d3.extent(d3.values(nStations)));

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom")
        .tickFormat(d3.format("d"));

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient("left");

    var line = d3.svg.line()
        .x(function(d) { return x(d[0]); })
        .y(function(d) { return y(d[1]); });

    var svg = d3.select("div#chart")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + (height - 20) + ")")
        .call(xAxis);

    svg.append("g")
        .attr("class", "y axis")
        .attr("transform", "translate(70,0)")
        .call(yAxis)
        .append("text")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .attr("transform", "rotate(-90)")
        .text("Number of Weather Stations");

    var years = Object.keys(nStations).sort();
    var yearsAndSums = years.map(function(year){ return [year, nStations[year]]; });
    svg.append("path")
        .datum(yearsAndSums)
        .attr("class", "line")
        .attr("d", line);

    var circle = svg.append("circle")
        .attr("r", 10)
        .attr("cx", x(1900))
        .attr("cy", y(0))
        .attr("id", "line");

    this.svg = svg;
    this.nStations = nStations;

    this.update = function(year, duration) {
        circle
        .transition()
        .duration(duration)
        .ease("linear")
        .attr("cx", x(year))
        .attr("cy", y(nStations[year]));
    };

    this.mouseToYear = function(mouseCoordinate) {
        var year = Math.round(x.invert(mouseCoordinate));
        return Math.min(2015, Math.max(1900, year));
    };

}

function StationCircles(gCircles, circleRadius) {

    var tooltip = d3.select("div#map")
        .append("div")
        .attr("class", "tooltip hidden");

    function mouseIn(circle, stationName) {
         //offsets for tooltips
        var divMap = document.getElementById("map");
        var offsetL = divMap.offsetLeft+15;
        var offsetT = divMap.offsetTop+10;
        var mouse = d3.mouse(d3.select("#svg-map").node());
        var left = mouse[0]+offsetL;
        var top = mouse[1]+offsetT;

        tooltip
            .classed("hidden", false)
            .attr(
                "style",
                "left:" + left + "px;top:" + top + "px"
            )
            .html(stationName);
        d3.select(circle).attr("r", circleRadius*3);
    }

    function mouseOut(circle) {
        tooltip
            .classed("hidden", true);
        d3.select(circle).attr("r", circleRadius);

    }

    function getId(d) { return d.id; }
    function getLong(d) { return d.coordinates[0]; }
    function getLat(d) { return d.coordinates[1]; }

    this.update = function(year, duration) {
        var currentlyActiveStations = this.activeStations[year];
        var circles = gCircles.selectAll("circle")
            .data(currentlyActiveStations, getId);

        circles
            .exit()
            .remove();

        var newCircles = circles
            .enter()
            .append("circle")
            .attr("cx", getLong)
            .attr("cy", getLat);

        if (duration > 0 ) {
        newCircles
            .attr("r", 0)
            .transition()
            .duration(duration)
            .ease("linear")
            .attr("r", circleRadius*3);
        newCircles
            .transition()
            .delay(duration)
            .duration(duration)
            .ease("linear")
            .attr("r", circleRadius);
        }
        newCircles
            .attr("r", circleRadius);

        newCircles
            .on("mousemove", function(d, i) {
                mouseIn(this, d.name);
            })
            .on("mouseout", function(d, i){
                mouseOut(this);
            });
    };

    this.zoom = function() {
        circleRadius = 1.15 / ((0.5*d3.event.scale) + 0.5);
        gCircles.selectAll("circle")
            .attr("r", circleRadius);
    };
}

function Interaction(stationCircles, linePlot){
        linePlot.svg.classed("hidden", true);
        var year = 1900;
        d3.select("#year-slider").on("mousemove", function(e){
            year = this.value;
            update(year);
        });
        var runAnimation = false;
        var animationButton = d3.select("button.animation");
        function toggleAnimation() {
            if (runAnimation === true) {
                runAnimation = false;
                animationButton.text("Start");
            }
            else if (runAnimation === false) {
                runAnimation = true;
                animationButton.text("Stop");
                animation();
            }
        }
        function toggleGraph() {
            if (linePlot.svg.classed("hidden")) {
                linePlot.svg.classed("hidden", false);
            }
            else {
                linePlot.svg.classed("hidden", true);
            }
        }
        d3.select("button.graph")
            .on("click", toggleGraph);

        //Add click and drag behaviour for red circle in graph
        function linePlotUpdate(mouseCoordinate) {
            year = linePlot.mouseToYear(mouseCoordinate);
            update(year);
        }
        var drag = d3.behavior.drag()
            .on("drag", function(d,i) {
                linePlotUpdate(d3.event.x);
            });
        linePlot.svg.select("circle").call(drag);

        linePlot.svg
            .on("click", function(d,i) {
                linePlotUpdate(d3.mouse(linePlot.svg.node())[0]);
            });

        animationButton
            .on("click", toggleAnimation);

        function update(year, duration) {
            duration = (typeof duration === 'undefined') ? 0 : duration;
            setYearAndNumber(year, linePlot.nStations[year]);
            linePlot.update(year, duration);
            stationCircles.update(year, duration*2);
        }

        function animation() {
            var duration = 300;
            if (runAnimation === true) {
                if (year <= 2015) {
                    update(year, duration);
                    year++;
                    setTimeout(animation, 300);
                } else {
                    runAnimation = false;
                    animationButton.text("Start");
                }
            }
        }

}

function nestByProperty(property, weatherStations) {
    var nest = d3.nest()
        .key(function(d) {
            return d[property];
        });
    var stationsByProperty = nest
        .map(weatherStations);
    return stationsByProperty;
}

function getNumberOfStations(stationsStarted, stationsEnded) {
    var sum = 0;
    var nStations = {};
    for(var year=1900; year<2016; year++) {
        sum += (stationsStarted[year] || []).length;
        sum -= (stationsEnded[year] || []).length;
        nStations[year]= sum;
    }
    return nStations;
}

function getActiveStations(stationsStart, stationsEnd) {
    var activeStations = {};
    var currentlyActiveStations = [];
    for(var year = 1900; year<2016; year++) {
        if(year in stationsStart) {
            Array.prototype.push.apply(
                currentlyActiveStations, stationsStart[year]
            );
        }
        if(year in stationsEnd){
            currentlyActiveStations = currentlyActiveStations.filter(
                function(d){
                    return stationsEnd[year].indexOf(d) === -1;
                }
            );
        }
        activeStations[year] = currentlyActiveStations.slice();
    }
    return activeStations;
}

function draw(geoData) {
    var scale = 115;
    var width = 750 * scale / 120,
        height = 600 * scale / 120;
    var map = new Countries(width, height, scale, geoData);
    var gCircles = map.g.append("g");
    var stationCircles = new StationCircles(gCircles, scale/100);

    function zoom() {
        stationCircles.zoom();
        map.zoom();
    }
    var zoomListener = d3.behavior.zoom()
        .translate([0, 0])
        .scale(1)
        .on("zoom", zoom);
    zoomListener(map.svg);

    d3.csv("europe.csv", function(d) {
        return {
            id : d.USAF,
            name : d["STATION NAME"],
            coordinates : map.projection([+d.LON, +d.LAT]),
            start_year : +d.BEGIN.slice(0,4),
            end_year : +d.END.slice(0,4)
        };
    },
    processData);

    function processData(weatherStations){
        var stationsStarted = nestByProperty("start_year", weatherStations);
        var stationsEnded = nestByProperty("end_year", weatherStations);
        // stations with the field END:2015 are currently running
        stationsEnded[2015] = [];
        var nStations = getNumberOfStations(stationsStarted, stationsEnded);
        var linePlot = new LinePlot(width, height, nStations);
        stationCircles.activeStations = getActiveStations(stationsStarted, stationsEnded);
        Interaction(stationCircles, linePlot);
    }
}
