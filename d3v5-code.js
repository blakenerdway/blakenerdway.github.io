async function onLoad() {
    let data = await d3.csv("average_medicare_2017.csv");
    let names = await d3.tsv("https://s3-us-west-2.amazonaws.com/vida-public/geo/us-state-names.tsv");
    let us = await d3.json("https://cdn.jsdelivr.net/npm/us-atlas@2/us/10m.json");

    let states = new Map(us.objects.states.geometries.map(d => [d.id, d.properties]));

    let data_key = "Provider State";
    let data_value = "Average_Percent_Covered_State";

    let width = 1000,
        height = 800;

    let valueById = d3.map();
    let path = d3.geoPath();

    let svg = d3.select("#map-svg").select("svg")
        .attr("width", width)
        .attr("height", height);

    console.log(names);

    // Returns the name for a code
    let codeToNameMap = new Map();
    // Returns the id for a name
    let idToName = {};

    let codeToIDMap = {};

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

    console.log(d3.max(data, function (d) {
        return +d[data_value];
    }));

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


    data.forEach(function (d) {
        let id = codeToIDMap[d[data_key]];
        valueById.set(id, d[data_value]);
    });

    let paths = svg.append("g")
        .attr("class", "states-choropleth")
        .selectAll("path")
        .data(topojson.feature(us, us.objects.states).features)
        .enter()
        .append("path")
        .attr("id", function (d, i) {
            return idToName[d.id];
        })
        .attr("d", path)
        .on("mousemove", function (d) {
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

            let map_width = $('.states-choropleth')[0].getBoundingClientRect().width;

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
        })
        .on("mouseout", function () {
            $(this).attr("fill-opacity", "1.0");
            $("#tooltip-container").hide();
        })
        .style("fill", function (d) {
            let val = valueById.get(d.id);
            if (val) {
                return colorScale(val);
            } else {
                return "";
            }
        });

    svg.attr("opacity", 0)
        .transition()
        .attr("opacity", 1)
        .delay(200)
        .duration(1500)
        .ease(d3.easeCubicInOut);



    svg.append("g").append("path")
        .datum(topojson.mesh(us, us.objects.states, (a, b) => a !== b))
        .attr("class", "states")
        .attr("d", path)
        .style("stroke", "#000");
}