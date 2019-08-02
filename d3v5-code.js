// Returns the name for a code
codeToNameMap = new Map();
// Returns the id for a name
idToName = {};
// Returns the code for an id
codeToIDMap = {};

function onLoad() {
    let width = 1000,
        height = 800;
    d3.select("#main-content-container").select("svg")
        .attr("width", width)
        .attr("height", height);

    let promise = new FirstScreen();
    promise.then(() => {
        fadeInMapDetails();
    });
}

async function buildMap() {
    console.log('Start build map');
    let svg = d3.select("#main-content-container").select("svg");
    let names = await d3.tsv("https://s3-us-west-2.amazonaws.com/vida-public/geo/us-state-names.tsv");
    let us = await d3.json("https://cdn.jsdelivr.net/npm/us-atlas@2/us/10m.json");

    let states = new Map(us.objects.states.geometries.map(d => [d.id, d.properties]));
    let path = d3.geoPath();

    for (let i = 0; i < names.length; i++) {
        codeToNameMap.set(names[i].code, names[i].name);
    }

    states.forEach(function (name, id) {
        for (var [code, name1] of codeToNameMap) {
            if (name1 === name.name) {
                codeToIDMap[code] = id;
            }
        }
        idToName[id] = name.name;
    });

    svg.append('svg').attr("id", "states-choropleth")
        .attr('x', "0%")
        .attr('y', "30px")
        .append("g").attr("id", "states-group")
        .selectAll("path")
        .data(topojson.feature(us, us.objects.states).features)
        .enter()
        .append("path")
        .attr("id", function (d, i) {
            return idToName[d.id];
        })
        .attr("class", "state")
        .attr("d", path)
        .style('stroke', "black")
        .attr("opacity", 0);

    console.log('Finished build map');
}

function fadeInMapDetails() {
    console.log("Fade in map");
    let buttons = d3.select("#movement-bar").style('opacity', 0);
    let legend = d3.select("#legend").attr('opacity', 0);
    let annotations = d3.select('#annotations').attr('opacity', 0);
    let title = d3.select("#title").style('opacity', 0);
    let paths = d3.select("#states-group").selectAll("path").attr('opacity', 0);

    title.transition()
        .style("opacity", 1)
        .duration(1500)
        .ease(d3.easeCubicInOut).on('end', function () {

        let maxWaitTime = -1;
        paths.transition()
            .attr("opacity", 1)
            .delay(function (d, i) {
                let waitTime = Math.random() * 1500 + 200;
                if (waitTime > maxWaitTime) {
                    maxWaitTime = waitTime;
                }
                return waitTime;
            })
            .duration(1000)
            .ease(d3.easeCubicInOut);

        legend.transition()
            .attr("opacity", 1)
            .delay(maxWaitTime)
            .duration(1500)
            .ease(d3.easeCubicInOut);

        annotations.transition()
            .attr("opacity", 1)
            .delay(maxWaitTime + 1000)
            .duration(1500)
            .ease(d3.easeCubicInOut);

        buttons.transition()
            .style("opacity", 1)
            .delay(maxWaitTime + 2000)
            .duration(1500)
            .ease(d3.easeCubicInOut);
    });
}

/**
 * Transition the map into viewing
 */

class FirstScreen {
    constructor() {
        console.log('Creating first screen');
        this._valueById = d3.map();
        return this.build();
    }

    async build() {
        if (d3.select("#states-choropleth").empty()){
            console.log('No map');
            await buildMap();
            console.log('After build map');
        }

        let data = await d3.csv("average_medicare_2017.csv");
        let data_key = "Provider State";
        let data_value = "Average_Percent_Covered_State";
        data.forEach((d) => {
            let id = codeToIDMap[d[data_key]];
            this._valueById.set(id, d[data_value]);
        });

        let colorScale = d3.scaleQuantize().domain(
            [
                d3.min(data,(d) => {
                    return +d[data_value];
                }),
                d3.max(data, (d) => {
                    return +d[data_value];
                })
            ])
            .range(d3.schemeRdYlGn[6]);


        let mapG = d3.select("#states-group");
        mapG.selectAll("path")
            .style("fill", (d) => {
                let val = this._valueById.get(d.id);
                if (val) {
                    return colorScale(val);
                } else {
                    return "";
                }
            })
            .on("mouseover", (d) => {
                d3.select("#states-choropleth").selectAll("path").sort(function (a, b) { // select the parent and sort the path's
                    if (a.id !== d.id) return -1;               // a is not the hovered element, send "a" to the back
                    else return 1;                             // a is the hovered element, bring "a" to the front
                });
            })
            .on("mousemove", d => {
                this.buildTooltip(d, this);
            })
            .on("mouseout", function () {
                $(this).attr("fill-opacity", "1.0");
                $("#tooltip-container").hide();
            });

        this.buildLegend(colorScale);

        const annotations = [
            {
                connector: {
                    end: "dot"
                },
                x: 285, y: 125,
                dx: 700, dy: -30,
                "subject": { "radius": 55 },
                note: {
                    label: "Montana's Medicare program covers the maximum national average amount at 27.05%",
                    wrap: 400,
                }
            },
            {
                connector: {
                    end: "dot"
                },
                x: 590, y: 195,
                dx: 500, dy: 0,
                subject: {
                    "radius": 55
                },
                "className": "lowest-medicare",
                note: {
                    label: "Medicare in Wisconsin covers the lowest average amount at only 13.25%",
                    wrap: 400,
                }
            },

        ];

        buildAnnotations(annotations);


        d3.select("#title").text("Which state gives you the Best Average Medicare Coverage?");
    }

    buildLegend(colorScale) {
        let legendEle = d3.select("#legend");
        if (legendEle.empty()) {
            legendEle = d3.select('#svg-map')
                .append('svg')
                .attr('id', "legend-svg").attr('x', '30px')
                .append('g')
                .attr('id', 'legend')
                .style('z-scale', 1000);
        }

        const x = d3.scaleLinear()
            .domain(d3.extent(colorScale.domain()))
            .rangeRound([0, 260]);

        legendEle.selectAll("rect")
            .data(colorScale.range().map(d => colorScale.invertExtent(d)))
            .join("rect")
            .attr("height", 8)
            .attr("x", d => x(d[0]))
            .attr("width", d => x(d[1]) - x(d[0]))
            .attr("fill", d => colorScale(d[0]));

        legendEle.append("text")
            .attr("x", x.range()[0])
            .attr("y", -6)
            .attr("fill", "currentColor")
            .attr("text-anchor", "start")
            .attr("font-weight", "bold")
            .text("% Covered by medicare");

        const format = d3.format(".0%");
        legendEle.call(d3.axisBottom(x)
            .tickSize(13)
            .tickFormat(d => {
                return format(d);
            })
            .tickValues(colorScale.range().slice(1).map(d => colorScale.invertExtent(d)[0])))
            .select(".domain")
            .remove();
    }



    buildTooltip(d, obj) {
        let html = "";

        html += "<div class=\"tooltip_kv\">";
        html += "<span class=\"tooltip_key\">";
        html += idToName[d.id];
        html += "</span>";
        html += "<span class=\"tooltip_value\">";
        html += d3.format(".02%")((obj._valueById.get(d.id) ? obj._valueById.get(d.id) : ""));
        html += " of submitted charge is covered by Medicare";
        html += "</span>";
        html += "</div>";

        const tooltipContainer = $("#tooltip-container");
        tooltipContainer.html(html);
        $(this).attr("fill-opacity", "0.8");
        tooltipContainer.show();

        let map_width = $('#states-choropleth')[0].getBoundingClientRect().width;

        if (d3.event.layerX < map_width / 2) {
            d3.select("#tooltip-container")
                .style("top", (d3.event.layerY + 15) + "px")
                .style("left", (d3.event.layerX + 15) + "px");
        } else {
            let tooltip_width = tooltipContainer.width();
            d3.select("#tooltip-container")
                .style("top", (d3.event.layerY + 15) + "px")
                .style("left", (d3.event.layerX - tooltip_width - 30) + "px");
        }
    }
}


function buildAnnotations(a){
    let annotationEle = d3.select("#annotations");
    if (annotationEle.empty()){
        annotationEle = d3.select("#svg-map").append("svg")
            .attr("id", "annotations-svg")
            .append("g").attr("id", "annotations")
    }

    annotationEle.call(d3.annotation()
        .annotations(a));
}


class SecondScreen {
    constructor() {
        console.log('Creating second screen');
        this._valueById = d3.map();
        this.build();
    }

    async build() {
        if (d3.select("#states-choropleth").empty()){
            console.log('No map');
            await buildMap();
        }

        d3.select("#title").text('What are the most expensive procedures in states?');

        let data = await d3.csv("most_expensive_procedures_per_state.csv");
        let data_key = "Provider State";
        let data_charge = "Max submitted charge";
        let data_description = "Most_Expensive_Description";

        data.forEach(d => {
            let id = codeToIDMap[d[data_key]];
            this._valueById.set(id, {
                charge: d[data_charge],
                description: d[data_description]
            });
        });

        console.log(this._valueById);

        let colorScale = d3.scaleQuantize().domain(
            [
                d3.min(data, function (d) {
                    return +d[data_charge];
                }),
                d3.max(data, function (d) {
                    return +d[data_charge];
                })
            ])
            .range(d3.schemeYlOrRd[6]);


        let mapG = d3.select("#states-group");
        mapG.selectAll("path")
            .style("fill", (d) => {
                let maxChargeByState = this._valueById.get(d.id).charge;
                if (maxChargeByState) {
                    return colorScale(maxChargeByState);
                } else {
                    return "";
                }
            })
            .on("mouseover", (d) => {
                d3.select("#states-choropleth").selectAll("path").sort((a,b) => { // select the parent and sort the path's
                    if (a.id !== d.id) return -1;               // a is not the hovered element, send "a" to the back
                    else return 1;                             // a is the hovered element, bring "a" to the front
                });
            })
            .on("mousemove", d => {
                this.buildTooltip(d, this);
            })
            .on("mouseout", function () {
                $(this).attr("fill-opacity", "1.0");
                $("#tooltip-container").hide();
            });

        this.buildLegend(colorScale);

        const annotations = [
            {
                connector: {
                    end: "dot"
                },
                x: 285, y: 125,
                dx: 700, dy: -30,
                "subject": { "radius": 55 },
                note: {
                    label: "Montana's Medicare program covers the maximum national average amount at 27.05%",
                    wrap: 400,
                }
            },
            {
                connector: {
                    end: "dot"
                },
                x: 590, y: 195,
                dx: 500, dy: 0,
                subject: {
                    "radius": 55
                },
                "className": "lowest-medicare",
                note: {
                    label: "Medicare in Wisconsin covers the lowest average amount at only 13.25%",
                    wrap: 400,
                }
            },

        ];

        buildAnnotations(annotations);

    }

    buildTooltip(d, obj) {
        let html = "";

        let stateName = idToName[d.id];
        let charge = obj._valueById.get(d.id).charge ?
            this._valueById.get(d.id).charge : "";
        let description = obj._valueById.get(d.id).description ?
            this._valueById.get(d.id).description : "";

        html += "<div class=\"tooltip_kv\">";
        html += "<h4 class=\"tooltip_key\">";
        html += stateName;
        html += "</h4>";
        html += "<span class=\"tooltip_value\">";
        html += "The most expensive procedure was: " + "<b>" + d3.format("$,.2f")(charge) + "</b>" + " for: ";
        html += "</span>";
        html += "<span class=\"description\"><i>";
        html += description;
        html += "</i></span>";
        html += "</div>";

        const tooltipContainer = $("#tooltip-container");
        tooltipContainer.html(html);
        $(this).attr("fill-opacity", "0.8");
        tooltipContainer.show();

        let map_width = $('#states-choropleth')[0].getBoundingClientRect().width;

        if (d3.event.layerX < map_width / 2) {
            d3.select("#tooltip-container")
                .style("top", (d3.event.layerY + 15) + "px")
                .style("left", (d3.event.layerX + 15) + "px");
        } else {
            let tooltip_width = tooltipContainer.width();
            d3.select("#tooltip-container")
                .style("top", (d3.event.layerY + 15) + "px")
                .style("left", (d3.event.layerX - tooltip_width - 30) + "px");
        }
    }

    buildLegend(colorScale) {

        const x = d3.scaleLinear()
            .domain(d3.extent(colorScale.domain()))
            .rangeRound([0, 260]);

        d3.select("#main-content-container").select('svg').select('#legend').remove();

        var g = d3.select("#main-content-container").select('svg')
            .append('svg').attr('id', "legend-svg").attr('x', '30px')
            .append('g')
            .attr('id', 'legend')
            .style('z-scale', 1000);
        g.selectAll("rect")
            .data(colorScale.range().map(d => colorScale.invertExtent(d)))
            .join("rect")
            .attr("height", 8)
            .attr("x", d => x(d[0]))
            .attr("width", d => x(d[1]) - x(d[0]))
            .attr("fill", d => colorScale(d[0]));

        g.append("text")
            .attr("x", x.range()[0])
            .attr("y", -6)
            .attr("fill", "currentColor")
            .attr("text-anchor", "start")
            .attr("font-weight", "bold")
            .text("% Covered by medicare");

        const format = d3.formatPrefix(",.2", 1e4);
        g.call(d3.axisBottom(x)
            .tickSize(13)
            .tickFormat(d => {
                return format(d);
            })
            .tickValues(colorScale.range().slice(1).map(d => colorScale.invertExtent(d)[0])))
            .select(".domain")
            .remove();
    }
}

class ThirdScreen {


}


