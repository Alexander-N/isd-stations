"use strict";

function setYear(year) {
    d3.select("h2")
        .text(year);
    d3.select("#output-slider")
        .text(year);
    d3.select("#year-slider")
        .property("value", year);
}

function nestCount(key, weatherStations){
    var nest = d3.nest()
        .key(function(d) {
            return d[key];
        });

    var stationsByYear = nest
        .map(weatherStations);

    var nStations = nest
        .rollup(function(d){
            return d.length;
        })
        .map(weatherStations);
    //maybe put them into an object?
    return [stationsByYear, nStations];
}

function plotLine(nStarted, nEnded, width, height) {
    var sum = 0;
    var sums = [];
    var years = [];

    for(var year=1900; year<2016; year++) {
        sum += nStarted[year] || 0;
        sum -= nEnded[year] || 0;
        sums.push(sum);
        years.push(year);
    }

    var yearsAndSums = d3.zip(years, sums);

    // add the line chart
    var x = d3.time.scale()
        .range([70, width-10])
        .domain([1900, 2015]);

    var y = d3.scale.linear()
        .range([height-25, 10])
        .domain(d3.extent(sums));

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

    var svgLine = d3.select("div#chart")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    svgLine.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + (height - 20) + ")")
        .call(xAxis);

    svgLine.append("g")
        .attr("class", "y axis")
        .attr("transform", "translate(70,0)")
        .call(yAxis)
        .append("text")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .attr("transform", "rotate(-90)")
        .text("Number of Weather-Stations");

    svgLine.append("path")
        .datum(yearsAndSums)
        .attr("class", "line")
        .attr("d", line);

    svgLine.append("circle")
        .attr("r", 10)
        .attr("cx", x(1900))
        .attr("cy", y(0))
        .attr("id", "line");

    svgLine.x = x;
    svgLine.y = y;
    svgLine.nStations = sums;
    return svgLine;
}

function updateLine(svgLine, year) {
    svgLine.select("circle")
        .attr("cx", svgLine.x(year))
        .attr("cy", svgLine.y(svgLine.nStations[year-1900]));
        //.transition()
        //.duration(300)
        //.ease("linear");
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

    var svg = d3.select("div#map")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    var tooltip = d3.select("div#map")
        .append("div")
        .attr("class", "tooltip hidden");

    var gMap  = svg
        .append("g")
        .attr("class", "map");

    var circleRadius = scale/100;


    var projection = d3.geo.mercator()
                        .scale(scale*4.4)
                        .translate([width / 2.6, height*1.58]);

    var path = d3.geo.path().projection(projection);

    var map = gMap.selectAll("path")
                .data(geoData.features)
                .enter()
                .append("path")
                .attr("class", "countries")
                .attr('d', path);

    gMap.style("stroke-width", "0.9px");
    var gCircles = gMap.append("g");

    function zoom() {
        circleRadius = scale/100 / ((0.5*d3.event.scale) + 0.5);
        gCircles.selectAll("circle")
            .attr("r", circleRadius + "px");
        gMap.style("stroke-width", (0.9 / ((0.5*d3.event.scale) + 0.5)) + "px");
        gMap
            .attr(
                "transform",
                "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")"
            );
    }

    var zoomListener = d3.behavior.zoom()
        .translate([0, 0])
        .scale(1)
        .on("zoom", zoom);

    zoomListener(svg);
    d3.csv("europe.csv", function(d) {
        return {
            id : d.USAF,
            name : d["STATION NAME"],
            coordinates : projection([+d.LON, +d.LAT]),
            start_year : +d.BEGIN.slice(0,4),
            end_year : +d.END.slice(0,4)
        };
    },
    processData);

    function processData(weatherStations){
        var stations = nestCount("start_year", weatherStations);
        var stationsStart = stations[0],
        nStarted = stations[1];

        stations = nestCount("end_year", weatherStations);
        var stationsEnd = stations[0],
        nEnded = stations[1];
        stationsEnd[2015] = [];
        nEnded[2015] = 0;

        var svgLine = plotLine(nStarted, nEnded, width, height);
        svgLine.classed("hidden", true);
        var activeStations = getActiveStations(stationsStart, stationsEnd);
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
            if (svgLine.classed("hidden")) {
                svgLine.classed("hidden", false);
            }
            else {
                svgLine.classed("hidden", true);
            }
        }
        d3.select("button.graph")
            .on("click", toggleGraph);

        animationButton
            .on("click", toggleAnimation);


        function update(year) {
            setYear(year);
            updateLine(svgLine, year);
            repaint(gCircles, year, activeStations[year]);
        }

        function animation() {
            if((runAnimation === true) && (year < 2016)) {
                update(year);
                year++;
                setTimeout(animation, 300);
            }
        }

        function mouseIn(d,i) {
             //offsets for tooltips
            var offsetL = document.getElementById("map").offsetLeft+15;
            var offsetT = document.getElementById("map").offsetTop+10;

            var mouse = d3.mouse(
                svg.node()).map( function(d) { return parseInt(d); }
            );
            var left = mouse[0]+offsetL;
            var top = mouse[1]+offsetT;
            tooltip
                .classed("hidden", false)
                .attr(
                    "style",
                    "left:" + left + "px;top:" + top +"px"
                )
                .html(d.name);
            d3.select(this).attr("r", circleRadius*4 + "px");
        }

        function mouseOut(d,i) {
                    tooltip.classed("hidden", true);
                    d3.select(this).attr("r", circleRadius + "px");
        }

        function getId(d) { return d.id; }
        function getLong(d) { return d.coordinates[0]; }
        function getLat(d) { return d.coordinates[1]; }

        function repaint(gCircles, year, currentlyActiveStations) {
            var circles = gCircles.selectAll("circle")
                .data(currentlyActiveStations, getId);

            circles
                .exit()
                .remove();

            var newCircles = circles
                .enter()
                .append("circle");

            newCircles
                .attr("cx", getLong)
                .attr("cy", getLat)
                .attr("r", circleRadius + "px");

            newCircles
                .on("mousemove", mouseIn)
                .on("mouseout",  mouseOut);
        }
    }
}
