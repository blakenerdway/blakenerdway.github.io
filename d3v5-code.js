// Returns the name for a code
codeToNameMap = new Map();
// Returns the id for a name
idToName = {};
// Returns the code for an id
codeToIDMap = {};
valueById = d3.map();

function onLoad() {
    let width = 1000,
        height = 800;
    d3.select("#main-content-container").select("svg")
        .attr("width", width)
        .attr("height", height);

    let firstScreen = new FirstScreen();
    firstScreen.firstTransition();
}

async function buildMap() {
    console.log('start build map');
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

/**
 * Transition the map into viewing
 */

class FirstScreen {
    constructor() {
        this.build();
    }

    async build() {
        if (d3.select("#states-choropleth").empty()){
            console.log('No map');
            await buildMap();
        }

        console.log('After build map');

        let data = await d3.csv("average_medicare_2017.csv");
        let data_key = "Provider State";
        let data_value = "Average_Percent_Covered_State";
        data.forEach(function (d) {
            let id = codeToIDMap[d[data_key]];
            valueById.set(id, d[data_value]);
        });

        let colorScale = d3.scaleQuantize().domain(
            [
                d3.min(data, function (d) {
                    return +d[data_value];
                }),
                d3.max(data, function (d) {
                    return +d[data_value];
                })
            ])
            .range(d3.schemeRdYlGn[6]);


        let mapG = d3.select("#states-group");
        mapG.selectAll("path")
            .style("fill", function (d) {
                let val = valueById.get(d.id);
                if (val) {
                    return colorScale(val);
                } else {
                    return "";
                }
            })
            .on("mouseover", function (d) {
                d3.select("#states-choropleth").selectAll("path").sort(function (a, b) { // select the parent and sort the path's
                    if (a.id !== d.id) return -1;               // a is not the hovered element, send "a" to the back
                    else return 1;                             // a is the hovered element, bring "a" to the front
                });
            })
            .on("mousemove", this.buildTooltip)
            .on("mouseout", function () {
                $(this).attr("fill-opacity", "1.0");
                $("#tooltip-container").hide();
            });

        this.buildLegend(colorScale);

        const annotations = [
            {
                type: d3.annotationCalloutCircle,
                "x": 525, "y": 123,
                "dx": -110, "dy": -110,
                "subject": { "radius": 55 },
                note: {
                    label: "Medicare in Wisconsin covers the lowest average amount at only 13.25%",
                    wrap: 400,
                }
            },
        ];

        window.makeAnnotations = d3.annotation()
            .annotations(annotations);
        //Uncomment below if you want to be able to move the labels around
        // .editMode(true)

        d3.select("svg").append("g")
            .attr("transform", "translate(55, 35)")
            .attr("class", "annotation-test")
            .call(makeAnnotations)
    }

    buildTooltip(d) {
        let html = "";

        html += "<div class=\"tooltip_kv\">";
        html += "<span class=\"tooltip_key\">";
        html += idToName[d.id];
        html += "</span>";
        html += "<span class=\"tooltip_value\">";
        html += (valueById.get(d.id) ? valueById.get(d.id) : "");
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

        const x = d3.scaleLinear()
            .domain(d3.extent(colorScale.domain()))
            .rangeRound([0, 260]);

        d3.select("#main-content-container").select('svg').select('#legend').remove();

        var g = d3.select("#main-content-container").select('svg').append('g').attr('id', "legend")
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

        const format = d3.format(".0%");
        g.call(d3.axisBottom(x)
            .tickSize(13)
            .tickFormat(d => {
                return format(d);
            })
            .tickValues(colorScale.range().slice(1).map(d => colorScale.invertExtent(d)[0])))
            .select(".domain")
            .remove();

        g.attr("opacity", 0);
    }

    firstTransition() {
        d3.select("#title").text("Which state gives you the Best Average Medicare Coverage?")
            .transition()
            .style("opacity", 1)
            .duration(1500)
            .ease(d3.easeCubicInOut).on('end', function () {

            let maxWaitTime = -1;
            let paths = d3.select("#states-group").selectAll("path");
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

            let legendG = d3.select("#legend");

            legendG.transition()
                .attr("opacity", 1)
                .delay(maxWaitTime)
                .duration(1500)
                .ease(d3.easeCubicInOut);
        });
    }
}

class SecondScreen {


}

class ThirdScreen {


}


