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
function buildAnnotations(a) {
    let annotationEle = d3.select("#annotations");

    annotationEle.remove();


    annotationEle = d3.select("#svg-map").append("svg")
        .attr("id", "annotations-svg")
        .append("g").attr("id", "annotations")


    annotationEle.call(d3.annotation()
        .annotations(a));
}

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


        d3.select("#slider-form").remove();

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


        d3.select("#title").text("Which state gives you the best average Medicare coverage?");
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


        d3.select("#slider-form").remove();

        d3.select("#title").text('What are the most expensive procedures in states?');

        let data = await d3.csv("most_expensive_procedures_per_state.csv");
        let data_key = "Provider State";
        let data_charge = "Max. Submitted Charge";
        let data_description = "Max Charged HCPS Descr";

        data.forEach(d => {
            let id = codeToIDMap[d[data_key]];
            this._valueById.set(id, {
                charge: d[data_charge],
                description: d[data_description]
            });
        });

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
                x: 915, y: 120,
                dx: 50, dy: 0,
                note: {
                    label: "Maine has the lowest max expensive reported procedure, totalling at $9023.59. Medicare paid $3865 for this procedure.",
                    wrap: 400
                }
            },
            {
                connector: {
                    end: "dot"
                },
                x: 617, y: 293,
                dx: 350, dy: 0,
                note: {
                    label: "The area of Urbana-Champaign's most expensive recorded procedure cost $37,996. It was performed twice: \"A removal of plaque" +
                        " and insertion of stents into arteries in one leg, endovascular, accessed, through the skin or open procedure\"",
                    wrap: 400
                }
            },
            {
                connector: {
                    end: "dot"
                },
                x: 660, y: 505,
                dx: 350, dy: 50,
                note: {
                    label: "Performed once in Pensacola (where I'm from), a recorded \"Implantation of spinal neurostimulator electrode\"" +
                        " cost $77,850 with $10,978.51 covered by medicare",
                    wrap: 400
                }
            }

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

        const format = d3.formatPrefix(",.2", 1e4);
        legendEle.call(d3.axisBottom(x)
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
    constructor() {
        console.log('Creating third screen');
        this._valueById = d3.map();
        this.build();
    }

    async build() {
        if (d3.select("#states-choropleth").empty()) {
            console.log('No map');
            await buildMap();
        }

        let title = d3.select("#title");
        title.text('Which states have the most expensive average procedures?');

        this._data = await d3.csv("average_cost_of_procedure.csv");

        let parentEl = d3.select("#main-content-container").node();

        parentEl.insertBefore(document.createElement("form"), parentEl.childNodes[2]);
        d3.select('form')
            .attr('id', 'slider-form')
            .attr('oninput', 'sliderValue.value = slider.valueAsNumber')
            .append('input').attr('type', 'range')
            .attr('name', 'slider')
            .attr('id', "top-n-slider")
            .attr("min", 1)
            .attr("max", 50);

        d3.select('form')
            .append('output').attr('name', 'sliderValue').attr('for', 'slider').text(window.nStates);


        let slider = document.getElementById('top-n-slider');

        slider.addEventListener('change', () => {
            window.nStates = slider.value;
           this.updateTopNAnnotations(slider.value);
        });

        slider.value = window.nStates;


        this._data_key = "Provider State";
        this._data_charge = "Avg. Submitted Charge";

        this._data = this._data.sort((d1, d2) => {
            return d3.ascending(d1[this._data_charge], d2[this._data_charge]);
        });

        this._data.forEach(d => {
            let id = codeToIDMap[d[this._data_key]];
            this._valueById.set(id, d[this._data_charge]);
        });

        let colorScale = d3.scaleQuantize().domain(
            [
                d3.min(this._data, (d) => {
                    return +d[this._data_charge];
                }),
                d3.max(this._data, (d) => {
                    return +d[this._data_charge];
                })
            ])
            .range(d3.schemeYlOrRd[6]);


        let mapG = d3.select("#states-group");
        mapG.selectAll("path")
            .style("fill", (d) => {
                let maxChargeByState = this._valueById.get(d.id);
                if (maxChargeByState) {
                    return colorScale(maxChargeByState);
                } else {
                    return "";
                }
            })
            .on("mouseover", (d) => {
                d3.select("#states-choropleth").selectAll("path").sort((a, b) => { // select the parent and sort the path's
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

        this.updateTopNAnnotations(window.nStates);
    }

    updateTopNAnnotations(n){
        let newData = this._data.slice(0, n);

        let annotations = [];
        let startX = 950;
        let startY = 0;

        let title =  (parseInt(n) === 1 ? " state" : n +  " states");

        annotations[0] = {
            x: startX, y: startY,
            className: "least-expensive",
            note: {
                title: "Least expensive " + title,
                wrap: 600
            }
        };

        newData.forEach((value, index) => {
            let stateAbbr = value[this._data_key];
            let charge = value[this._data_charge];

            let xModifier = 0;
            if (index > 24){
                xModifier = 130;
            }

            let yModifier = 20 * (index + 1);
            if (index > 24){
                yModifier = 20 * (index - 24);
            }

            annotations[index + 1] = {
                x: startX + xModifier, y: startY + yModifier,
                className: "least-expensive",
                note: {
                    label: (index + 1) + "." + stateAbbr + ": " + d3.format("$,.2f")(charge),
                    wrap: 200
                }
            }
        });

        buildAnnotations(annotations);
    }

    buildTooltip(d, obj) {
        let html = "";

        let stateName = idToName[d.id];
        let charge = obj._valueById.get(d.id) ?
            this._valueById.get(d.id) : "";

        html += "<div class=\"tooltip_kv\">";
        html += "<h4 class=\"tooltip_key\">";
        html += stateName;
        html += "</h4>";
        html += "<span class=\"tooltip_value\">";
        html += "The average procedure costs " + "<b>" + d3.format("$,.2f")(charge) + "</b>";
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

        const format = d3.formatPrefix("$,.2", 1e2);
        legendEle.call(d3.axisBottom(x)
            .tickSize(13)
            .tickFormat(d => {
                return format(d);
            })
            .tickValues(colorScale.range().slice(1).map(d => colorScale.invertExtent(d)[0])))
            .select(".domain")
            .remove();
    }


}

window.nStates = 1;